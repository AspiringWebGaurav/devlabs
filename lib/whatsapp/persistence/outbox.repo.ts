/**
 * Transactional Outbox Repository
 * 
 * Strict Enterprise Invariants:
 * - At most one canonical outbox record per logical operationId: sha256(conversationId:correlationId:step).
 * - Enforced atomically by using operationId as the Firestore document ID.
 * - Formal AMBIGUOUS lifecycle: AMBIGUOUS -> RECONCILING -> [CONFIRMED_ACCEPTED | CONFIRMED_NOT_ACCEPTED | UNRESOLVED].
 */

import crypto from "crypto";
import { firestoreDataSource } from "@/lib/dal/datasource/firestore";
import { adminLogger } from "@/lib/admin/logger";
import { normalizeE164 } from "../security/sanitizer";
import type { WhatsAppOutboxMessage, OutboxMessageStatus, InboundEvent, AuditActor } from "../types";
import type { Transaction, Firestore } from "firebase-admin/firestore";

export const OUTBOX_COLLECTION = "whatsapp_outbox";
import { AUDIT_LOG_COLLECTION } from "./conversation.repo";

export class OutboxRepository {
  /**
   * Computes deterministic canonical operation ID for an outbound message.
   */
  public computeOperationId(conversationId: string, correlationId: string, step: string): string {
    const normalizedPhone = normalizeE164(conversationId);
    return crypto
      .createHash("sha256")
      .update(`${normalizedPhone}:${correlationId}:${step}`)
      .digest("hex");
  }

  /**
   * Enqueues an outbox message. Can run inside an existing atomic transaction.
   */
  public async enqueueMessage(
    message: WhatsAppOutboxMessage,
    transactionContext?: { tx: Transaction; db: Firestore }
  ): Promise<void> {
    const operationId = message.operationId || this.computeOperationId(message.conversationId, message.correlationId, "default");
    const payload: WhatsAppOutboxMessage = {
      ...message,
      operationId,
      outboxId: message.outboxId || crypto.randomUUID(),
      conversationId: normalizeE164(message.conversationId),
      destinationPhone: normalizeE164(message.destinationPhone),
      status: "PENDING",
      attemptCount: 0,
      maxAttempts: message.maxAttempts || 5,
      nextRetryAt: Date.now(),
      reconciliationAttempts: 0,
      createdAt: message.createdAt || Date.now(),
    };

    if (transactionContext) {
      const ref = transactionContext.db.collection(OUTBOX_COLLECTION).doc(operationId);
      transactionContext.tx.set(ref, payload, { merge: true });
    } else {
      await firestoreDataSource.setDocument(OUTBOX_COLLECTION, operationId, payload, true);
    }
  }

  /**
   * Claims a batch of PENDING or RETRY_PENDING messages for dispatch.
   */
  public async claimPendingMessages(
    workerId: string,
    limitCount = 10,
    leaseDurationMs = 30000
  ): Promise<WhatsAppOutboxMessage[]> {
    const now = Date.now();
    return await firestoreDataSource.runTransaction(async (tx, db) => {
      const q = db
        .collection(OUTBOX_COLLECTION)
        .where("status", "in", ["PENDING", "RETRY_PENDING"])
        .limit(limitCount);

      const snapshot = await tx.get(q);
      const claimed: WhatsAppOutboxMessage[] = [];

      for (const doc of snapshot.docs) {
        const data = doc.data() as WhatsAppOutboxMessage;
        const isLeaseExpired = !data.leaseExpiresAt || data.leaseExpiresAt < now;
        const isReadyForRetry = (data.nextRetryAt || 0) <= now;

        if (isLeaseExpired && isReadyForRetry && data.attemptCount < data.maxAttempts) {
          const updated: Partial<WhatsAppOutboxMessage> = {
            status: "CLAIMED" as OutboxMessageStatus,
            lockedBy: workerId,
            lockedAt: now,
            leaseExpiresAt: now + leaseDurationMs,
            attemptCount: (data.attemptCount || 0) + 1,
          };
          tx.update(doc.ref, updated);
          claimed.push({ ...data, ...updated });
        }
      }

      return claimed;
    });
  }

  /**
   * Transitions status to SENDING right before executing Meta HTTP call.
   */
  public async markSending(operationId: string): Promise<void> {
    await firestoreDataSource.setDocument(
      OUTBOX_COLLECTION,
      operationId,
      {
        status: "SENDING" as OutboxMessageStatus,
      },
      true
    );
  }

  /**
   * Transitions status to META_ACCEPTED upon successful HTTP 200 from Graph API.
   */
  public async markMetaAccepted(operationId: string, metaMessageId: string): Promise<void> {
    await firestoreDataSource.setDocument(
      OUTBOX_COLLECTION,
      operationId,
      {
        status: "META_ACCEPTED" as OutboxMessageStatus,
        metaMessageId,
        sentAt: Date.now(),
        lockedBy: null,
        leaseExpiresAt: null,
      },
      true
    );
  }

  /**
   * Transitions status to AMBIGUOUS when network times out or worker crashes.
   * Atomically commits outbox status and OUTBOUND_AMBIGUOUS audit event.
   */
  public async markAmbiguous(
    operationId: string,
    error: string,
    actor: AuditActor = { type: "PROCESSOR", id: "outbox_worker" }
  ): Promise<void> {
    adminLogger.warn("WhatsApp:OutboxAmbiguousState", "Outbox message tagged AMBIGUOUS for status reconciliation", {
      operationId,
      error,
    });
    const now = Date.now();
    await firestoreDataSource.runTransaction(async (tx, db) => {
      const docRef = db.collection(OUTBOX_COLLECTION).doc(operationId);
      const snap = await tx.get(docRef);
      if (!snap.exists) return;
      const docData = snap.data() as WhatsAppOutboxMessage;

      tx.update(docRef, {
        status: "AMBIGUOUS" as OutboxMessageStatus,
        ambiguityDetectedAt: now,
        lastError: error,
        lockedBy: null,
        leaseExpiresAt: null,
      });

      const auditRef = db.collection(AUDIT_LOG_COLLECTION).doc(`aud_${operationId}_OUTBOUND_AMBIGUOUS`);
      tx.set(auditRef, {
        auditId: auditRef.id,
        eventType: "OUTBOUND_AMBIGUOUS",
        conversationId: docData.conversationId,
        operationId,
        correlationId: docData.correlationId,
        previousState: docData.status,
        newState: "AMBIGUOUS",
        timestamp: now,
        actor: actor.type,
        actorId: actor.id,
        reason: error,
      });
    });
  }

  /**
   * Atomically claims an AMBIGUOUS outbox record for reconciliation under a finite lease.
   * Atomically appends OUTBOUND_RECONCILING audit record.
   */
  public async claimForReconciliation(
    operationId: string,
    workerIdOrActor: string | AuditActor,
    leaseDurationMs = 30000
  ): Promise<{ success: boolean; error?: string; message?: WhatsAppOutboxMessage }> {
    const actor: AuditActor =
      typeof workerIdOrActor === "string"
        ? { type: "ADMIN", id: workerIdOrActor }
        : workerIdOrActor;
    const workerId = actor.id || "reconciler";
    const now = Date.now();

    return await firestoreDataSource.runTransaction(async (tx, db) => {
      const docRef = db.collection(OUTBOX_COLLECTION).doc(operationId);
      const snapshot = await tx.get(docRef);

      if (!snapshot.exists) {
        return { success: false, error: "RECORD_NOT_FOUND" };
      }

      const data = snapshot.data() as WhatsAppOutboxMessage;

      // Hardened Reconciliation Lease Matrix:
      // - AMBIGUOUS (unleased or expired) -> Claim allowed
      // - AMBIGUOUS (active lease) -> Blocked (ALREADY_BEING_RECONCILED)
      // - RECONCILING (active lease) -> Blocked (ALREADY_BEING_RECONCILED)
      // - RECONCILING (expired lease) -> Controlled atomic reclaim
      // - Any other status -> Strictly rejected (ONLY_AMBIGUOUS_RECORDS_RECONCILABLE / ALREADY_RESOLVED)

      if (data.status !== "AMBIGUOUS" && data.status !== "RECONCILING") {
        const terminalStatuses: OutboxMessageStatus[] = [
          "CONFIRMED_ACCEPTED",
          "READ",
          "DELIVERED",
          "DEAD_LETTER",
          "UNRESOLVED",
          "POLICY_BLOCKED",
          "CONFIRMED_NOT_ACCEPTED",
          "RETRY_PENDING",
        ];
        if (terminalStatuses.includes(data.status)) {
          return { success: false, error: "ALREADY_RESOLVED" };
        }
        return { success: false, error: "ONLY_AMBIGUOUS_RECORDS_RECONCILABLE" };
      }

      const isLeaseActive = data.leaseExpiresAt && data.leaseExpiresAt > now;
      if (isLeaseActive && data.lockedBy && data.lockedBy !== workerId) {
        return { success: false, error: "ALREADY_BEING_RECONCILED" };
      }

      tx.update(docRef, {
        status: "RECONCILING" as OutboxMessageStatus,
        lockedBy: workerId,
        leaseExpiresAt: now + leaseDurationMs,
        lockedAt: now,
      });

      // Audit event
      const auditRef = db.collection(AUDIT_LOG_COLLECTION).doc(`aud_${operationId}_OUTBOUND_RECONCILING`);
      tx.set(auditRef, {
        auditId: auditRef.id,
        eventType: "OUTBOUND_RECONCILING",
        conversationId: data.conversationId,
        operationId,
        correlationId: data.correlationId,
        previousState: data.status,
        newState: "RECONCILING",
        timestamp: now,
        actor: actor.type,
        actorId: actor.id,
        reason: "Claimed reconciliation lease",
      });

      return { success: true, message: data };
    });
  }

  /**
   * Atomically finalizes reconciliation of an outbox record based on deterministic evidence.
   * Fail-Closed: Strictly rejects "phone observation" as proof of non-acceptance.
   * Atomically appends OUTBOUND_RECONCILED audit record.
   */
  public async finalizeReconciliation(
    operationId: string,
    workerIdOrActor: string | AuditActor,
    evidence: {
      proofType: "META_WAMID_VERIFIED" | "META_GATEWAY_REJECTED" | "INCONCLUSIVE";
      metaMessageId?: string;
      rejectionReason?: string;
      auditNote?: string;
    }
  ): Promise<{ success: boolean; status?: OutboxMessageStatus; error?: string }> {
    const actor: AuditActor =
      typeof workerIdOrActor === "string"
        ? { type: "ADMIN", id: workerIdOrActor }
        : workerIdOrActor;
    const workerId = actor.id || "reconciler";
    const now = Date.now();

    return await firestoreDataSource.runTransaction(async (tx, db) => {
      const docRef = db.collection(OUTBOX_COLLECTION).doc(operationId);
      const snapshot = await tx.get(docRef);

      if (!snapshot.exists) {
        return { success: false, error: "Outbox record not found" };
      }

      const data = snapshot.data() as WhatsAppOutboxMessage;

      // Idempotent no-op if already reconciled to terminal state
      if (data.status === "CONFIRMED_ACCEPTED") {
        return { success: true, status: "CONFIRMED_ACCEPTED" };
      }

      if (data.status !== "RECONCILING") {
        return { success: false, error: "RECORD_NOT_IN_RECONCILING_STATE" };
      }

      // Ensure caller holds the active unexpired lease
      const isLeaseActive = data.leaseExpiresAt && data.leaseExpiresAt > now;
      if (!isLeaseActive || data.lockedBy !== workerId) {
        return { success: false, error: "RECONCILIATION_LEASE_NOT_HELD" };
      }

      let resolvedStatus: OutboxMessageStatus = "UNRESOLVED";
      let reason = evidence.auditNote || "Reconciliation finalized";

      // Branch 1: Deterministic Meta Acceptance (Verified wamid)
      if (evidence.proofType === "META_WAMID_VERIFIED") {
        const rawWamid = evidence.metaMessageId?.trim();
        if (!rawWamid || !rawWamid.startsWith("wamid.")) {
          return { success: false, error: "Invalid Meta message ID. Must be a valid wamid string." };
        }

        resolvedStatus = "CONFIRMED_ACCEPTED";
        reason = `Reconciled: ${evidence.auditNote || "Meta wamid verified"}`;
        tx.update(docRef, {
          status: resolvedStatus,
          metaMessageId: rawWamid,
          lastError: reason,
          reconciledBy: workerId,
          reconciledAt: now,
          lockedBy: null,
          leaseExpiresAt: null,
        });
      } else if (evidence.proofType === "META_GATEWAY_REJECTED") {
        // Branch 2: Deterministic Meta Rejection (Gateway error)
        const rejReason = (evidence.rejectionReason || "").trim();
        if (rejReason.length < 5) {
          return { success: false, error: "Verifiable Meta gateway rejection reason is required." };
        }

        // Rule 3: Non-receipt is NOT non-acceptance!
        const reasonLower = rejReason.toLowerCase();
        const isPhoneObservation =
          reasonLower.includes("not seen on phone") ||
          reasonLower.includes("not received on phone") ||
          reasonLower.includes("phone empty") ||
          reasonLower.includes("absent from phone") ||
          reasonLower.includes("did not receive") ||
          reasonLower.includes("recruiter said no");

        if (isPhoneObservation) {
          // Fails closed to UNRESOLVED!
          resolvedStatus = "UNRESOLVED";
          reason = `Inconclusive evidence: Phone observation (${rejReason}) is not proof of Meta non-acceptance. Quarantined.`;
          tx.update(docRef, {
            status: resolvedStatus,
            lastError: reason,
            reconciledBy: workerId,
            reconciledAt: now,
            lockedBy: null,
            leaseExpiresAt: null,
          });
        } else {
          // Deterministic gateway rejection proved: Safe to transition to RETRY_PENDING
          resolvedStatus = "RETRY_PENDING";
          reason = `Confirmed not accepted by Meta: ${rejReason}`;
          tx.update(docRef, {
            status: resolvedStatus,
            lastError: reason,
            nextRetryAt: now,
            reconciledBy: workerId,
            reconciledAt: now,
            lockedBy: null,
            leaseExpiresAt: null,
          });
        }
      } else {
        // Branch 3: Inconclusive Evidence -> Fail-closed to UNRESOLVED
        resolvedStatus = "UNRESOLVED";
        reason = evidence.auditNote || "Inconclusive evidence: quarantined to prevent double send";
        tx.update(docRef, {
          status: resolvedStatus,
          lastError: reason,
          reconciledBy: workerId,
          reconciledAt: now,
          lockedBy: null,
          leaseExpiresAt: null,
        });
      }

      // Audit event
      const auditRef = db.collection(AUDIT_LOG_COLLECTION).doc(`aud_${operationId}_OUTBOUND_RECONCILED`);
      tx.set(auditRef, {
        auditId: auditRef.id,
        eventType: "OUTBOUND_RECONCILED",
        conversationId: data.conversationId,
        operationId,
        correlationId: data.correlationId,
        previousState: data.status,
        newState: resolvedStatus,
        timestamp: now,
        actor: actor.type,
        actorId: actor.id,
        reason,
        metadata: {
          proofType: evidence.proofType,
          metaMessageId: evidence.metaMessageId,
          rejectionReason: evidence.rejectionReason,
        },
      });

      if (resolvedStatus === "UNRESOLVED" && evidence.proofType === "META_GATEWAY_REJECTED") {
        return {
          success: false,
          status: "UNRESOLVED",
          error: "Phone observation alone is not proof of Meta non-acceptance. Record has been quarantined to UNRESOLVED to prevent duplicate sends.",
        };
      }

      return { success: true, status: resolvedStatus };
    });
  }

  /**
   * Transitions AMBIGUOUS -> RECONCILING during manual or request-driven status reconciliation.
   */
  public async markReconciling(operationId: string, workerId: string, leaseMs = 30000): Promise<void> {
    await firestoreDataSource.setDocument(
      OUTBOX_COLLECTION,
      operationId,
      {
        status: "RECONCILING" as OutboxMessageStatus,
        lockedBy: workerId,
        leaseExpiresAt: Date.now() + leaseMs,
      },
      true
    );
  }

  /**
   * Matched a delivery/sent status webhook from Meta.
   */
  public async markConfirmedAccepted(operationId: string, metaMessageId?: string): Promise<void> {
    await firestoreDataSource.setDocument(
      OUTBOX_COLLECTION,
      operationId,
      {
        status: "CONFIRMED_ACCEPTED" as OutboxMessageStatus,
        ...(metaMessageId ? { metaMessageId } : {}),
        sentAt: Date.now(),
        lockedBy: null,
        leaseExpiresAt: null,
      },
      true
    );
  }

  /**
   * Received verifiable proof Meta rejected the message without sending.
   * Only this transition may safely move to RETRY_PENDING.
   */
  public async markConfirmedNotAccepted(operationId: string, reason: string): Promise<void> {
    await firestoreDataSource.setDocument(
      OUTBOX_COLLECTION,
      operationId,
      {
        status: "RETRY_PENDING" as OutboxMessageStatus,
        lastError: `Confirmed not accepted by Meta: ${reason}`,
        lockedBy: null,
        leaseExpiresAt: null,
        nextRetryAt: Date.now(),
      },
      true
    );
  }

  /**
   * Inconclusive after maximum reconciliation sweeps: preserve in DLQ.
   */
  public async markUnresolved(operationId: string, reason: string): Promise<void> {
    await firestoreDataSource.setDocument(
      OUTBOX_COLLECTION,
      operationId,
      {
        status: "UNRESOLVED" as OutboxMessageStatus,
        lastError: reason,
        lockedBy: null,
        leaseExpiresAt: null,
      },
      true
    );
  }

  /**
   * Marks message POLICY_BLOCKED if outside 24-hour customer window.
   * Atomically commits outbox status and OUTBOUND_POLICY_BLOCKED audit event.
   */
  public async markPolicyBlocked(
    operationId: string,
    reason: string,
    actor: AuditActor = { type: "SYSTEM", id: "policy_guard" }
  ): Promise<void> {
    const now = Date.now();
    await firestoreDataSource.runTransaction(async (tx, db) => {
      const docRef = db.collection(OUTBOX_COLLECTION).doc(operationId);
      const snap = await tx.get(docRef);
      if (!snap.exists) return;
      const docData = snap.data() as WhatsAppOutboxMessage;

      tx.update(docRef, {
        status: "POLICY_BLOCKED" as OutboxMessageStatus,
        lastError: reason,
        lockedBy: null,
        leaseExpiresAt: null,
      });

      const auditRef = db.collection(AUDIT_LOG_COLLECTION).doc(`aud_${operationId}_OUTBOUND_POLICY_BLOCKED`);
      tx.set(auditRef, {
        auditId: auditRef.id,
        eventType: "OUTBOUND_POLICY_BLOCKED",
        conversationId: docData.conversationId,
        operationId,
        correlationId: docData.correlationId,
        previousState: docData.status,
        newState: "POLICY_BLOCKED",
        timestamp: now,
        actor: actor.type,
        actorId: actor.id,
        reason,
      });
    });
  }

  /**
   * Updates delivery status when Meta delivery webhook is received.
   * Rule 2: Strictly direct metaMessageId match only. Never correlates by phone/time.
   */
  public async updateDeliveryStatus(
    metaMessageId: string,
    status: "DELIVERED" | "READ" | "FAILED",
    errorDetails?: string
  ): Promise<{ matched: boolean; operationId?: string }> {
    if (!metaMessageId) return { matched: false };

    return await firestoreDataSource.runTransaction(async (tx, db) => {
      const q = db
        .collection(OUTBOX_COLLECTION)
        .where("metaMessageId", "==", metaMessageId)
        .limit(1);

      const snapshot = await tx.get(q);
      if (snapshot.empty) {
        adminLogger.info("WhatsApp:UnmatchedStatusWebhook", "Status webhook received for unknown metaMessageId", {
          metaMessageId,
          status,
        });
        return { matched: false };
      }

      const doc = snapshot.docs[0];
      const data = doc.data() as WhatsAppOutboxMessage;

      // Idempotent guard: if already in terminal/equal state, do not regress
      if (data.status === "READ" && status !== "READ") {
        return { matched: true, operationId: data.operationId };
      }

      const updates: Partial<WhatsAppOutboxMessage> = {};

      if (status === "READ") {
        updates.status = "READ";
        updates.readAt = Date.now();
      } else if (status === "DELIVERED") {
        if (data.status !== "READ") {
          updates.status = "DELIVERED";
          updates.deliveredAt = Date.now();
        }
      } else if (status === "FAILED") {
        updates.status = "DEAD_LETTER";
        updates.lastError = errorDetails || "Meta webhook delivery failed";

        const auditRef = db.collection(AUDIT_LOG_COLLECTION).doc(`aud_${data.operationId}_OUTBOUND_DEAD_LETTER`);
        tx.set(auditRef, {
          auditId: auditRef.id,
          eventType: "OUTBOUND_DEAD_LETTER",
          conversationId: data.conversationId,
          operationId: data.operationId,
          correlationId: data.correlationId,
          previousState: data.status,
          newState: "DEAD_LETTER",
          timestamp: Date.now(),
          actor: "WEBHOOK",
          actorId: "meta_webhook",
          reason: errorDetails || "Meta webhook delivery failed",
        });
      }

      tx.update(doc.ref, updates);
      return { matched: true, operationId: data.operationId };
    });
  }

  /**
   * Marks permanently failed messages to DEAD_LETTER atomically with audit event.
   */
  public async markDeadLetter(
    operationId: string,
    reason: string,
    actor: AuditActor = { type: "PROCESSOR", id: "outbox_worker" }
  ): Promise<void> {
    const now = Date.now();
    await firestoreDataSource.runTransaction(async (tx, db) => {
      const docRef = db.collection(OUTBOX_COLLECTION).doc(operationId);
      const snap = await tx.get(docRef);
      if (!snap.exists) return;
      const docData = snap.data() as WhatsAppOutboxMessage;

      tx.update(docRef, {
        status: "DEAD_LETTER" as OutboxMessageStatus,
        lastError: reason,
        lockedBy: null,
        leaseExpiresAt: null,
      });

      const auditRef = db.collection(AUDIT_LOG_COLLECTION).doc(`aud_${operationId}_OUTBOUND_DEAD_LETTER`);
      tx.set(auditRef, {
        auditId: auditRef.id,
        eventType: "OUTBOUND_DEAD_LETTER",
        conversationId: docData.conversationId,
        operationId,
        correlationId: docData.correlationId,
        previousState: docData.status,
        newState: "DEAD_LETTER",
        timestamp: now,
        actor: actor.type,
        actorId: actor.id,
        reason,
      });
    });
  }

  /**
   * Records an OUTBOUND_RETRY_AUTHORIZED audit event atomically.
   * Deterministic ID: aud_${operationId}_retry_${nextAttemptCount}
   */
  public async recordRetryAuthorized(
    operationId: string,
    actor: AuditActor = { type: "ADMIN", id: "operator" }
  ): Promise<{ success: boolean; error?: string }> {
    return await firestoreDataSource.runTransaction(async (tx, db) => {
      const docRef = db.collection(OUTBOX_COLLECTION).doc(operationId);
      const snap = await tx.get(docRef);
      if (!snap.exists) return { success: false, error: "Outbox record not found" };
      const docData = snap.data() as WhatsAppOutboxMessage;
      if (docData.status !== "RETRY_PENDING") {
        return {
          success: false,
          error: `Cannot authorize retry for outbox message with status: ${docData.status}. Only RETRY_PENDING records are eligible.`,
        };
      }

      const nextAttempt = docData.attemptCount + 1;
      const auditDocId = `aud_${operationId}_retry_${nextAttempt}`;
      const auditRef = db.collection(AUDIT_LOG_COLLECTION).doc(auditDocId);

      tx.set(auditRef, {
        auditId: auditRef.id,
        eventType: "OUTBOUND_RETRY_AUTHORIZED",
        conversationId: docData.conversationId,
        operationId,
        correlationId: docData.correlationId,
        previousState: docData.status,
        newState: docData.status,
        timestamp: Date.now(),
        actor: actor.type,
        actorId: actor.id,
        reason: "Admin authorized retry for outbox message",
        metadata: {
          attemptCount: docData.attemptCount,
          authorizedAttempt: nextAttempt,
        },
      });

      return { success: true };
    });
  }

  /**
   * Fetches an outbox message by its canonical operationId.
   */
  public async getMessage(operationId: string): Promise<WhatsAppOutboxMessage | null> {
    return await firestoreDataSource.getDocument<WhatsAppOutboxMessage>(OUTBOX_COLLECTION, operationId);
  }

  /**
   * Lists outbound messages for a specific conversation ordered chronologically.
   * Rule 5: Strict join-key matching by conversationId (normalizeE164).
   */
  public async listOutboxForConversation(conversationId: string): Promise<WhatsAppOutboxMessage[]> {
    const normalizedId = normalizeE164(conversationId);
    const result = await firestoreDataSource.queryCollection<WhatsAppOutboxMessage>(OUTBOX_COLLECTION, {
      whereConditions: [{ field: "conversationId", operator: "==", value: normalizedId }],
      orderByField: "createdAt",
      orderDirection: "asc",
    });
    return result.docs;
  }

  /**
   * Lists raw inbound events for a phone number ordered chronologically.
   * Rule 5: Strict join-key matching by phoneNumber (normalizeE164).
   */
  public async listInboundForPhone(phone: string): Promise<InboundEvent[]> {
    const normalizedPhone = normalizeE164(phone);
    const result = await firestoreDataSource.queryCollection<InboundEvent>("whatsapp_inbound_events", {
      whereConditions: [{ field: "phoneNumber", operator: "==", value: normalizedPhone }],
      orderByField: "receivedAt",
      orderDirection: "asc",
    });
    return result.docs;
  }
}

export const outboxRepository = new OutboxRepository();
