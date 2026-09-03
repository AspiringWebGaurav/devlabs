/**
 * Authoritative Conversation & Flow State Machine Repository
 * 
 * Strict Enterprise Invariants:
 * - Authoritative OCC via stateVersion and sessionGeneration inside Firestore transactions.
 * - Concurrency-safe first-contact initialization guard.
 * - Invariant 8: RESET preserves all history, archives active flow, increments sessionGeneration.
 * - Invariant 12: Only this transactional engine may mutate authoritative state.
 */

import crypto from "crypto";
import { firestoreDataSource } from "@/lib/dal/datasource/firestore";
import { normalizeE164 } from "../security/sanitizer";
import { outboxRepository } from "./outbox.repo";
import { notificationRepository } from "./notification.repo";
import type {
  WhatsAppConversation,
  WhatsAppFlow,
  WhatsAppAuditEvent,
  OpportunityFlowStep,
  ConversationState,
  WhatsAppOpportunityLead,
  DraftOpportunityLead,
  WhatsAppOutboxMessage,
  WhatsAppNotificationJob,
} from "../types";

export const CONVERSATIONS_COLLECTION = "whatsapp_conversations";
export const FLOWS_COLLECTION = "whatsapp_flows";
export const LEADS_COLLECTION = "whatsapp_leads";
export const AUDIT_LOG_COLLECTION = "whatsapp_audit_log";

export class ConversationRepository {
  /**
   * Retrieves conversation by normalized E.164 phone.
   */
  public async getConversation(phone: string): Promise<WhatsAppConversation | null> {
    const conversationId = normalizeE164(phone);
    return await firestoreDataSource.getDocument<WhatsAppConversation>(CONVERSATIONS_COLLECTION, conversationId);
  }

  /**
   * Retrieves active flow document by flowId.
   */
  public async getFlow(flowId: string): Promise<WhatsAppFlow | null> {
    return await firestoreDataSource.getDocument<WhatsAppFlow>(FLOWS_COLLECTION, flowId);
  }

  /**
   * Concurrency-safe initialization guard for first-contact events.
   * Concurrent events for a brand new phone converge to exactly one conversation root
   * and one canonical welcome outbox operation.
   */
  public async initializeFirstContact(
    phone: string,
    senderName?: string,
    correlationId = crypto.randomUUID()
  ): Promise<{ conversation: WhatsAppConversation; isNew: boolean }> {
    const conversationId = normalizeE164(phone);
    const now = Date.now();

    return await firestoreDataSource.runTransaction(async (tx, db) => {
      const convRef = db.collection(CONVERSATIONS_COLLECTION).doc(conversationId);
      const convSnap = await tx.get(convRef);

      if (convSnap.exists) {
        return { conversation: convSnap.data() as WhatsAppConversation, isNew: false };
      }

      // 1. Create root conversation with state IDLE
      const newConversation: WhatsAppConversation = {
        conversationId,
        waPhoneNumber: conversationId,
        contactName: senderName || "Recruiter",
        currentState: "IDLE",
        stateVersion: 1,
        sessionGeneration: 1,
        lastInboundAt: now,
        lastOutboundAt: 0,
        lastActivityAt: now,
        customerServiceWindowOpenedAt: now,
        customerServiceWindowExpiresAt: now + 24 * 60 * 60 * 1000,
        humanRequested: false,
        optedOut: false,
        unreadByAdmin: true,
        archived: false,
        createdAt: now,
        updatedAt: now,
      };

      tx.set(convRef, newConversation);

      // 2. Canonical INITIAL_WELCOME operation guard (idempotent doc ID)
      const initialWelcomeOpId = crypto
        .createHash("sha256")
        .update(`${conversationId}:initial_welcome:v1`)
        .digest("hex");

      const welcomeOutboxMessage: WhatsAppOutboxMessage = {
        outboxId: crypto.randomUUID(),
        operationId: initialWelcomeOpId,
        conversationId,
        destinationPhone: conversationId,
        messageType: "quick_reply",
        payload: {
          bodyText:
            `Hello ${senderName || "there"}! Welcome to Gaurav Patil's Portfolio WhatsApp.\n\n` +
            "I'm Gaurav's automated assistant. How can I help you today?",
          footerText: "Gaurav Portfolio • Type MENU anytime",
          buttons: [
            { id: "btn_resume", title: "📄 View Resume" },
            { id: "btn_opportunity", title: "💼 Opportunities" },
            { id: "btn_human", title: "🤝 Talk to Gaurav" },
          ],
        },
        correlationId,
        status: "PENDING",
        attemptCount: 0,
        maxAttempts: 5,
        nextRetryAt: now,
        reconciliationAttempts: 0,
        createdAt: now,
      };

      await outboxRepository.enqueueMessage(welcomeOutboxMessage, { tx, db });

      // 3. Audit event
      const auditRef = db.collection(AUDIT_LOG_COLLECTION).doc(`aud_${conversationId}_v1_CONVERSATION_INITIALIZED`);
      const auditPayload: WhatsAppAuditEvent = {
        auditId: auditRef.id,
        eventType: "CONVERSATION_INITIALIZED",
        conversationId,
        sessionGeneration: 1,
        newState: "IDLE",
        operationId: initialWelcomeOpId,
        correlationId,
        timestamp: now,
        actor: "WEBHOOK",
        metadata: { senderName },
      };
      tx.set(auditRef, auditPayload);

      return { conversation: newConversation, isNew: true };
    });
  }

  /**
   * Initializes a new opportunity intake flow.
   */
  public async startOpportunityFlow(
    conversation: WhatsAppConversation,
    outboxMessage: WhatsAppOutboxMessage,
    correlationId: string
  ): Promise<WhatsAppFlow> {
    const now = Date.now();
    const flowId = `flow_${crypto.randomUUID()}`;

    return await firestoreDataSource.runTransaction(async (tx, db) => {
      const convRef = db.collection(CONVERSATIONS_COLLECTION).doc(conversation.conversationId);
      const convSnap = await tx.get(convRef);
      const currentConv = convSnap.data() as WhatsAppConversation;

      // OCC check
      if (currentConv.stateVersion !== conversation.stateVersion) {
        throw new Error(`OCC conflict: expected version ${conversation.stateVersion}, found ${currentConv.stateVersion}`);
      }

      // If existing active flow, mark ABANDONED
      if (currentConv.activeFlowId) {
        const oldFlowRef = db.collection(FLOWS_COLLECTION).doc(currentConv.activeFlowId);
        tx.update(oldFlowRef, { status: "ABANDONED", updatedAt: now });
      }

      // Create new flow
      const newFlow: WhatsAppFlow = {
        flowId,
        conversationId: conversation.conversationId,
        flowType: "OPPORTUNITY_INTAKE",
        currentStep: "awaiting_name",
        status: "ACTIVE",
        version: 1,
        collectedData: {},
        startedAt: now,
        updatedAt: now,
        expiresAt: now + 24 * 60 * 60 * 1000,
      };

      const flowRef = db.collection(FLOWS_COLLECTION).doc(flowId);
      tx.set(flowRef, newFlow);

      // Update conversation root
      tx.update(convRef, {
        currentState: "INTAKE_ACTIVE" as ConversationState,
        activeFlowId: flowId,
        stateVersion: currentConv.stateVersion + 1,
        lastActivityAt: now,
        updatedAt: now,
      });

      // Enqueue prompt outbox
      await outboxRepository.enqueueMessage(outboxMessage, { tx, db });

      // Audit event
      const auditRef = db
        .collection(AUDIT_LOG_COLLECTION)
        .doc(`aud_${conversation.conversationId}_v${currentConv.stateVersion + 1}_FLOW_STARTED`);
      tx.set(auditRef, {
        auditId: auditRef.id,
        eventType: "FLOW_STARTED",
        conversationId: conversation.conversationId,
        flowId,
        sessionGeneration: currentConv.sessionGeneration,
        newState: "INTAKE_ACTIVE",
        newStep: "awaiting_name",
        correlationId,
        timestamp: now,
        actor: "RECRUITER",
      });

      return newFlow;
    });
  }

  /**
   * Updates the active flow with new field data and advances currentStep atomically.
   */
  public async advanceFlowStep(
    conversation: WhatsAppConversation,
    flow: WhatsAppFlow,
    stepUpdates: {
      nextStep: OpportunityFlowStep;
      collectedDataUpdates: Partial<DraftOpportunityLead>;
    },
    outboxMessage?: WhatsAppOutboxMessage
  ): Promise<void> {
    const now = Date.now();

    await firestoreDataSource.runTransaction(async (tx, db) => {
      const convRef = db.collection(CONVERSATIONS_COLLECTION).doc(conversation.conversationId);
      const flowRef = db.collection(FLOWS_COLLECTION).doc(flow.flowId);

      const convSnap = await tx.get(convRef);
      const flowSnap = await tx.get(flowRef);

      const currentConv = convSnap.data() as WhatsAppConversation;
      const currentFlow = flowSnap.data() as WhatsAppFlow;

      // Authoritative OCC checks
      if (currentConv.stateVersion !== conversation.stateVersion) {
        throw new Error(`OCC conflict on conversation: expected ${conversation.stateVersion}, found ${currentConv.stateVersion}`);
      }
      if (currentFlow.version !== flow.version) {
        throw new Error(`OCC conflict on flow: expected ${flow.version}, found ${currentFlow.version}`);
      }

      // Update flow
      const updatedData = { ...currentFlow.collectedData, ...stepUpdates.collectedDataUpdates };
      tx.update(flowRef, {
        currentStep: stepUpdates.nextStep,
        collectedData: updatedData,
        version: currentFlow.version + 1,
        updatedAt: now,
      });

      // Update conversation
      tx.update(convRef, {
        stateVersion: currentConv.stateVersion + 1,
        lastActivityAt: now,
        updatedAt: now,
      });

      if (outboxMessage) {
        await outboxRepository.enqueueMessage(outboxMessage, { tx, db });
      }

      // Audit event
      const auditRef = db
        .collection(AUDIT_LOG_COLLECTION)
        .doc(`aud_${conversation.conversationId}_v${currentConv.stateVersion + 1}_FLOW_STEP_ADVANCED`);
      tx.set(auditRef, {
        auditId: auditRef.id,
        eventType: "FLOW_STEP_ADVANCED",
        conversationId: conversation.conversationId,
        flowId: flow.flowId,
        sessionGeneration: currentConv.sessionGeneration,
        previousState: currentConv.currentState,
        newState: currentConv.currentState,
        previousStep: currentFlow.currentStep,
        newStep: stepUpdates.nextStep,
        correlationId: outboxMessage?.correlationId,
        timestamp: now,
        actor: "RECRUITER",
        actorId: conversation.conversationId,
      });
    });
  }

  /**
   * Finalizes lead submission atomically:
   * - Saves lead in LEADS_COLLECTION
   * - Marks flow COMPLETED
   * - Updates conversation to IDLE
   * - Enqueues notification job in NOTIFICATIONS_COLLECTION
   * - Enqueues confirmation outbox message in OUTBOX_COLLECTION
   */
  public async finalizeLeadSubmission(
    conversation: WhatsAppConversation,
    flow: WhatsAppFlow,
    lead: WhatsAppOpportunityLead,
    outboxConfirmation: WhatsAppOutboxMessage,
    notificationJob: WhatsAppNotificationJob
  ): Promise<void> {
    const now = Date.now();

    await firestoreDataSource.runTransaction(async (tx, db) => {
      const convRef = db.collection(CONVERSATIONS_COLLECTION).doc(conversation.conversationId);
      const flowRef = db.collection(FLOWS_COLLECTION).doc(flow.flowId);
      const leadRef = db.collection(LEADS_COLLECTION).doc(lead.id);

      const convSnap = await tx.get(convRef);
      const currentConv = convSnap.data() as WhatsAppConversation;

      // OCC validation
      if (currentConv.stateVersion !== conversation.stateVersion) {
        throw new Error(`OCC conflict during finalizeLead: expected ${conversation.stateVersion}, found ${currentConv.stateVersion}`);
      }

      // 1. Commit lead document
      tx.set(leadRef, { ...lead, createdAt: now });

      // 2. Mark flow completed
      tx.update(flowRef, {
        status: "COMPLETED",
        completedAt: now,
        updatedAt: now,
      });

      // 3. Update conversation root to IDLE
      tx.update(convRef, {
        currentState: "IDLE" as ConversationState,
        activeFlowId: null,
        leadSubmitted: true,
        stateVersion: currentConv.stateVersion + 1,
        lastActivityAt: now,
        updatedAt: now,
      });

      // 4. Atomically enqueue notification job
      await notificationRepository.enqueueNotificationJob(notificationJob, { tx, db });

      // 5. Atomically enqueue confirmation outbox message
      await outboxRepository.enqueueMessage(outboxConfirmation, { tx, db });

      // 6. Atomically append audit record
      const auditRef = db
        .collection(AUDIT_LOG_COLLECTION)
        .doc(`aud_${conversation.conversationId}_v${currentConv.stateVersion + 1}_LEAD_SUBMITTED`);
      tx.set(auditRef, {
        auditId: auditRef.id,
        eventType: "LEAD_SUBMITTED",
        conversationId: conversation.conversationId,
        flowId: flow.flowId,
        sessionGeneration: currentConv.sessionGeneration,
        previousState: currentConv.currentState,
        newState: "IDLE",
        previousStep: flow.currentStep,
        newStep: "completed",
        correlationId: outboxConfirmation.correlationId,
        timestamp: now,
        actor: "RECRUITER",
        actorId: conversation.conversationId,
        metadata: {
          leadId: lead.id,
          company: lead.company,
          role: lead.role,
        },
      });
    });
  }

  /**
   * Safe Reset: Archives active flow, increments sessionGeneration, sets currentState = IDLE.
   * Invariant 8: Never deletes candidate drafts or history.
   */
  public async executeSafeReset(
    conversation: WhatsAppConversation,
    outboxMessage: WhatsAppOutboxMessage
  ): Promise<void> {
    const now = Date.now();

    await firestoreDataSource.runTransaction(async (tx, db) => {
      const convRef = db.collection(CONVERSATIONS_COLLECTION).doc(conversation.conversationId);
      const convSnap = await tx.get(convRef);
      const currentConv = convSnap.data() as WhatsAppConversation;

      // OCC validation
      if (currentConv.stateVersion !== conversation.stateVersion) {
        throw new Error(`OCC conflict on reset: expected ${conversation.stateVersion}, found ${currentConv.stateVersion}`);
      }

      // Archive active flow if present
      if (currentConv.activeFlowId) {
        const flowRef = db.collection(FLOWS_COLLECTION).doc(currentConv.activeFlowId);
        tx.update(flowRef, { status: "ABANDONED", updatedAt: now });
      }

      // Update conversation: increment sessionGeneration and stateVersion
      tx.update(convRef, {
        currentState: "IDLE" as ConversationState,
        activeFlowId: null,
        sessionGeneration: currentConv.sessionGeneration + 1,
        stateVersion: currentConv.stateVersion + 1,
        lastActivityAt: now,
        updatedAt: now,
      });

      await outboxRepository.enqueueMessage(outboxMessage, { tx, db });

      // Audit event
      const auditRef = db
        .collection(AUDIT_LOG_COLLECTION)
        .doc(`aud_${conversation.conversationId}_v${currentConv.stateVersion + 1}_SAFE_RESET`);
      tx.set(auditRef, {
        auditId: auditRef.id,
        eventType: "SAFE_RESET",
        conversationId: conversation.conversationId,
        flowId: currentConv.activeFlowId || undefined,
        sessionGeneration: currentConv.sessionGeneration + 1,
        previousState: currentConv.currentState,
        newState: "IDLE",
        correlationId: outboxMessage.correlationId,
        timestamp: now,
        actor: "RECRUITER",
        actorId: conversation.conversationId,
        metadata: {
          previousSessionGeneration: currentConv.sessionGeneration,
          newSessionGeneration: currentConv.sessionGeneration + 1,
        },
      });
    });
  }

  /**
   * Initiates human handoff: updates conversation to HUMAN_PENDING and enqueues alert job atomically.
   */
  public async initiateHumanHandoff(
    conversation: WhatsAppConversation,
    outboxMessage: WhatsAppOutboxMessage,
    notificationJob: WhatsAppNotificationJob
  ): Promise<void> {
    const now = Date.now();

    await firestoreDataSource.runTransaction(async (tx, db) => {
      const convRef = db.collection(CONVERSATIONS_COLLECTION).doc(conversation.conversationId);
      const convSnap = await tx.get(convRef);
      const currentConv = convSnap.data() as WhatsAppConversation;

      if (currentConv.stateVersion !== conversation.stateVersion) {
        throw new Error(`OCC conflict on human handoff: expected ${conversation.stateVersion}, found ${currentConv.stateVersion}`);
      }

      tx.update(convRef, {
        currentState: "HUMAN_PENDING" as ConversationState,
        humanRequested: true,
        humanRequestedAt: now,
        stateVersion: currentConv.stateVersion + 1,
        lastActivityAt: now,
        updatedAt: now,
      });

      await notificationRepository.enqueueNotificationJob(notificationJob, { tx, db });
      await outboxRepository.enqueueMessage(outboxMessage, { tx, db });

      // Audit event
      const auditRef = db
        .collection(AUDIT_LOG_COLLECTION)
        .doc(`aud_${conversation.conversationId}_v${currentConv.stateVersion + 1}_HUMAN_HANDOFF_REQUESTED`);
      tx.set(auditRef, {
        auditId: auditRef.id,
        eventType: "HUMAN_HANDOFF_REQUESTED",
        conversationId: conversation.conversationId,
        sessionGeneration: currentConv.sessionGeneration,
        previousState: currentConv.currentState,
        newState: "HUMAN_PENDING",
        correlationId: outboxMessage.correlationId,
        timestamp: now,
        actor: "RECRUITER",
        actorId: conversation.conversationId,
      });
    });
  }

  /**
   * Opts out recruiter from automated communication.
   */
  public async optOut(
    conversation: WhatsAppConversation,
    complianceAckOutbox: WhatsAppOutboxMessage
  ): Promise<void> {
    const now = Date.now();

    await firestoreDataSource.runTransaction(async (tx, db) => {
      const convRef = db.collection(CONVERSATIONS_COLLECTION).doc(conversation.conversationId);
      const convSnap = await tx.get(convRef);
      const currentConv = convSnap.data() as WhatsAppConversation;

      if (currentConv.optedOut || currentConv.currentState === "OPTED_OUT") {
        // Idempotent no-op: already opted out, avoid duplicate state transition audit event
        return;
      }

      tx.update(convRef, {
        currentState: "OPTED_OUT" as ConversationState,
        optedOut: true,
        optedOutAt: now,
        stateVersion: currentConv.stateVersion + 1,
        nextHumanReminderAt: null,
        lastActivityAt: now,
        updatedAt: now,
      });

      await outboxRepository.enqueueMessage(complianceAckOutbox, { tx, db });

      // Audit event
      const auditRef = db
        .collection(AUDIT_LOG_COLLECTION)
        .doc(`aud_${conversation.conversationId}_v${currentConv.stateVersion + 1}_OPT_OUT`);
      tx.set(auditRef, {
        auditId: auditRef.id,
        eventType: "OPT_OUT",
        conversationId: conversation.conversationId,
        sessionGeneration: currentConv.sessionGeneration,
        previousState: currentConv.currentState,
        newState: "OPTED_OUT",
        correlationId: complianceAckOutbox.correlationId,
        timestamp: now,
        actor: "RECRUITER",
        actorId: conversation.conversationId,
      });
    });
  }

  /**
   * Lists active recruiter conversations ordered by last activity descending.
   */
  public async listConversations(limitCount = 50): Promise<WhatsAppConversation[]> {
    const result = await firestoreDataSource.queryCollection<WhatsAppConversation>(CONVERSATIONS_COLLECTION, {
      orderByField: "lastActivityAt",
      orderDirection: "desc",
      limit: limitCount,
    });
    return result.docs;
  }

  /**
   * Lists structured opportunity leads ordered by creation timestamp descending.
   */
  public async listLeads(limitCount = 50): Promise<WhatsAppOpportunityLead[]> {
    const result = await firestoreDataSource.queryCollection<WhatsAppOpportunityLead>(LEADS_COLLECTION, {
      orderByField: "createdAt",
      orderDirection: "desc",
      limit: limitCount,
    });
    return result.docs;
  }

  /**
   * Marks a conversation as read by the admin.
   */
  public async markConversationRead(conversationId: string): Promise<void> {
    const normalizedId = normalizeE164(conversationId);
    await firestoreDataSource.setDocument(
      CONVERSATIONS_COLLECTION,
      normalizedId,
      {
        unreadByAdmin: false,
        updatedAt: Date.now(),
      },
      true
    );
  }
}

export const conversationRepository = new ConversationRepository();
