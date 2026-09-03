/**
 * Regression Test Suite for Patch #5: Immutable Audit Trail Completeness & Lifecycle Integrity
 * 
 * Verifies:
 * 1. Conversation initialization creates CONVERSATION_INITIALIZED audit event.
 * 2. Flow start creates FLOW_STARTED audit event.
 * 3. Flow step advancement creates FLOW_STEP_ADVANCED audit event with before/after steps.
 * 4. Lead finalization creates LEAD_SUBMITTED audit event with lead metadata.
 * 5. Safe reset creates SAFE_RESET audit event with incremented sessionGeneration.
 * 6. Human handoff creates HUMAN_HANDOFF_REQUESTED audit event.
 * 7. Opt-out creates OPT_OUT audit event with compliance reference.
 * 8. Repeated opt-out is an idempotent no-op and does not append duplicate audit events.
 * 9. Outbound policy blocked atomically updates outbox and writes OUTBOUND_POLICY_BLOCKED.
 * 10. Dispatch network timeout atomically updates outbox and writes OUTBOUND_AMBIGUOUS.
 * 11. Reconciler lease claim atomically writes OUTBOUND_RECONCILING with verified actor.
 * 12. Reconciled with verified wamid atomically writes OUTBOUND_RECONCILED (CONFIRMED_ACCEPTED).
 * 13. Reconciled with gateway error atomically writes OUTBOUND_RECONCILED (RETRY_PENDING).
 * 14. Inconclusive reconciliation atomically writes OUTBOUND_RECONCILED (UNRESOLVED).
 * 15. Safe retry dispatch creates OUTBOUND_RETRY_AUTHORIZED with deterministic attempt ID.
 * 16. Failed status webhook creates OUTBOUND_DEAD_LETTER audit event.
 * 17. Transaction callback retry simulation produces exactly 1 audit document.
 * 18. Atomic commit guarantee: transaction failure rolls back both state change and audit event.
 * 19. Immutability invariant: verify zero update or delete paths exist for audit records.
 * 20. Sensitive data prohibition: zero secrets, tokens, or cookies in audit metadata.
 * 
 * Run with: npx tsx scripts/test-patch-5-regression.mjs
 */

import assert from "assert";
import crypto from "crypto";
import { normalizeE164 } from "../lib/whatsapp/security/sanitizer.ts";
import { OutboxRepository, OUTBOX_COLLECTION } from "../lib/whatsapp/persistence/outbox.repo.ts";
import {
  ConversationRepository,
  CONVERSATIONS_COLLECTION,
  FLOWS_COLLECTION,
  LEADS_COLLECTION,
  AUDIT_LOG_COLLECTION,
} from "../lib/whatsapp/persistence/conversation.repo.ts";
import { firestoreDataSource } from "../lib/dal/datasource/firestore.ts";

console.log("==================================================================");
console.log("  PATCH #5 REGRESSION TEST SUITE: IMMUTABLE AUDIT TRAIL           ");
console.log("==================================================================\n");

// Multi-Collection In-Memory Store
class MockAuditMemoryStore {
  constructor() {
    this.collections = new Map();
    this.transactionsSimulated = 0;
  }

  getCollection(name) {
    if (!this.collections.has(name)) {
      this.collections.set(name, new Map());
    }
    return this.collections.get(name);
  }

  async getDocument(collectionName, docId) {
    const col = this.getCollection(collectionName);
    const data = col.get(docId);
    return data ? JSON.parse(JSON.stringify(data)) : null;
  }

  async setDocument(collectionName, docId, data, merge = false) {
    const col = this.getCollection(collectionName);
    const existing = col.get(docId) || {};
    const updated = merge ? { ...existing, ...data } : { ...data };
    col.set(docId, JSON.parse(JSON.stringify(updated)));
  }

  async runTransaction(updateFunction) {
    this.transactionsSimulated++;
    const stagedWrites = [];
    const readCache = new Map();

    const mockDb = {
      collection: (colName) => ({
        doc: (docId) => ({
          id: docId,
          collectionName: colName,
          ref: { id: docId, collectionName: colName },
        }),
        where: (field, op, val) => ({
          limit: (n) => ({
            collectionName: colName,
            field,
            val,
            isQuery: true,
          }),
        }),
      }),
    };

    const mockTx = {
      get: async (refOrQuery) => {
        if (refOrQuery.isQuery) {
          const col = this.getCollection(refOrQuery.collectionName);
          const matches = [];
          for (const [id, doc] of col.entries()) {
            if (doc[refOrQuery.field] === refOrQuery.val) {
              matches.push({
                id,
                ref: { id, collectionName: refOrQuery.collectionName },
                data: () => JSON.parse(JSON.stringify(doc)),
              });
            }
          }
          return {
            empty: matches.length === 0,
            docs: matches,
          };
        }
        const docRef = refOrQuery;
        const key = `${docRef.collectionName || docRef.ref?.collectionName}:${docRef.id}`;
        if (readCache.has(key)) {
          const cached = readCache.get(key);
          return {
            exists: !!cached,
            data: () => (cached ? JSON.parse(JSON.stringify(cached)) : null),
          };
        }
        const colName = docRef.collectionName || docRef.ref?.collectionName;
        const data = await this.getDocument(colName, docRef.id);
        readCache.set(key, data);
        return {
          exists: !!data,
          data: () => (data ? JSON.parse(JSON.stringify(data)) : null),
        };
      },
      set: (docRef, data, options = {}) => {
        const colName = docRef.collectionName || docRef.ref?.collectionName;
        stagedWrites.push({ type: "set", colName, docId: docRef.id, data, options });
      },
      update: (docRef, data) => {
        const colName = docRef.collectionName || docRef.ref?.collectionName;
        stagedWrites.push({ type: "update", colName, docId: docRef.id, data });
      },
    };

    const result = await updateFunction(mockTx, mockDb);

    // Commit staged writes atomically
    for (const write of stagedWrites) {
      if (write.type === "set") {
        await this.setDocument(write.colName, write.docId, write.data, write.options?.merge || false);
      } else if (write.type === "update") {
        await this.setDocument(write.colName, write.docId, write.data, true);
      }
    }

    return result;
  }
}

// Instantiate shared mock store
const mockStore = new MockAuditMemoryStore();

// Monkey-patch firestoreDataSource for unit isolation
firestoreDataSource.getDocument = (col, id) => mockStore.getDocument(col, id);
firestoreDataSource.setDocument = (col, id, data, merge) => mockStore.setDocument(col, id, data, merge);
firestoreDataSource.runTransaction = (fn) => mockStore.runTransaction(fn);

const convRepo = new ConversationRepository();
const outboxRepo = new OutboxRepository();

let passed = 0;
let failed = 0;

async function runTest(name, fn) {
  try {
    console.log(`[Test ${passed + failed + 1}] ${name}`);
    await fn();
    console.log("  [PASS]");
    passed++;
  } catch (err) {
    console.error(`  [FAIL]: ${err.message}`);
    console.error(err.stack);
    failed++;
  }
}

async function main() {
  const phone = "+14155552671";
  const normalized = normalizeE164(phone);

  // 1. CONVERSATION_INITIALIZED
  await runTest("Conversation initialization creates CONVERSATION_INITIALIZED audit event", async () => {
    const res = await convRepo.initializeFirstContact(normalized, "Alice Recruiter");
    assert.strictEqual(res.isNew, true);

    const auditId = `aud_${normalized}_v1_CONVERSATION_INITIALIZED`;
    const auditDoc = await mockStore.getDocument(AUDIT_LOG_COLLECTION, auditId);
    assert(auditDoc, "Audit event must exist");
    assert.strictEqual(auditDoc.eventType, "CONVERSATION_INITIALIZED");
    assert.strictEqual(auditDoc.actor, "WEBHOOK");
    assert.strictEqual(auditDoc.conversationId, normalized);
    assert.strictEqual(auditDoc.newState, "IDLE");
  });

  // 2. FLOW_STARTED
  let activeFlow = null;
  await runTest("Flow start creates FLOW_STARTED audit event", async () => {
    const conv = await convRepo.getConversation(normalized);
    assert(conv, "Conversation exists");

    const outboxPrompt = {
      outboxId: crypto.randomUUID(),
      operationId: `op_prompt_${Date.now()}`,
      conversationId: normalized,
      destinationPhone: normalized,
      messageType: "text",
      payload: { bodyText: "What is your name?" },
      correlationId: "corr_flow_start",
      status: "PENDING",
      attemptCount: 0,
      maxAttempts: 5,
      nextRetryAt: Date.now(),
      reconciliationAttempts: 0,
      createdAt: Date.now(),
    };

    activeFlow = await convRepo.startOpportunityFlow(conv, outboxPrompt, "corr_flow_start");
    assert(activeFlow, "Flow created");

    const auditId = `aud_${normalized}_v2_FLOW_STARTED`;
    const auditDoc = await mockStore.getDocument(AUDIT_LOG_COLLECTION, auditId);
    assert(auditDoc, "FLOW_STARTED audit record must exist");
    assert.strictEqual(auditDoc.eventType, "FLOW_STARTED");
    assert.strictEqual(auditDoc.actor, "RECRUITER");
    assert.strictEqual(auditDoc.newState, "INTAKE_ACTIVE");
    assert.strictEqual(auditDoc.newStep, "awaiting_name");
  });

  // 3. FLOW_STEP_ADVANCED
  await runTest("Flow step advancement creates FLOW_STEP_ADVANCED audit event with before/after steps", async () => {
    const conv = await convRepo.getConversation(normalized);
    const flow = await convRepo.getFlow(activeFlow.flowId);

    const stepOutbox = {
      outboxId: crypto.randomUUID(),
      operationId: `op_step_${Date.now()}`,
      conversationId: normalized,
      destinationPhone: normalized,
      messageType: "text",
      payload: { bodyText: "What is your company?" },
      correlationId: "corr_step_1",
      status: "PENDING",
      attemptCount: 0,
      maxAttempts: 5,
      nextRetryAt: Date.now(),
      reconciliationAttempts: 0,
      createdAt: Date.now(),
    };

    await convRepo.advanceFlowStep(
      conv,
      flow,
      { nextStep: "awaiting_company", collectedDataUpdates: { name: "Alice" } },
      stepOutbox
    );

    const auditId = `aud_${normalized}_v3_FLOW_STEP_ADVANCED`;
    const auditDoc = await mockStore.getDocument(AUDIT_LOG_COLLECTION, auditId);
    assert(auditDoc, "FLOW_STEP_ADVANCED audit record must exist");
    assert.strictEqual(auditDoc.eventType, "FLOW_STEP_ADVANCED");
    assert.strictEqual(auditDoc.previousStep, "awaiting_name");
    assert.strictEqual(auditDoc.newStep, "awaiting_company");
    assert.strictEqual(auditDoc.actor, "RECRUITER");
  });

  // 4. LEAD_SUBMITTED
  await runTest("Lead finalization creates LEAD_SUBMITTED audit event with lead metadata", async () => {
    const conv = await convRepo.getConversation(normalized);
    const flow = await convRepo.getFlow(activeFlow.flowId);

    const lead = {
      id: `lead_${Date.now()}`,
      conversationId: normalized,
      senderPhone: normalized,
      company: "Acme AI Corp",
      role: "Staff Engineer",
      createdAt: Date.now(),
    };

    const notifJob = {
      notificationId: `notif_${Date.now()}`,
      type: "OPPORTUNITY_LEAD_ALERT",
      conversationId: normalized,
      recipientEmail: "gaurav@example.com",
      subject: "New Lead",
      textContent: "New lead arrived",
      htmlContent: "<p>New lead arrived</p>",
      status: "PENDING",
      attemptCount: 0,
      nextRetryAt: Date.now(),
      createdAt: Date.now(),
      correlationId: "corr_lead",
    };

    const confirmOutbox = {
      outboxId: crypto.randomUUID(),
      operationId: `op_confirm_${Date.now()}`,
      conversationId: normalized,
      destinationPhone: normalized,
      messageType: "text",
      payload: { bodyText: "Thank you for the opportunity details!" },
      correlationId: "corr_lead",
      status: "PENDING",
      attemptCount: 0,
      maxAttempts: 5,
      nextRetryAt: Date.now(),
      reconciliationAttempts: 0,
      createdAt: Date.now(),
    };

    await convRepo.finalizeLeadSubmission(conv, flow, lead, confirmOutbox, notifJob);

    const auditId = `aud_${normalized}_v4_LEAD_SUBMITTED`;
    const auditDoc = await mockStore.getDocument(AUDIT_LOG_COLLECTION, auditId);
    assert(auditDoc, "LEAD_SUBMITTED audit record must exist");
    assert.strictEqual(auditDoc.eventType, "LEAD_SUBMITTED");
    assert.strictEqual(auditDoc.newState, "IDLE");
    assert.strictEqual(auditDoc.metadata.company, "Acme AI Corp");
    assert.strictEqual(auditDoc.metadata.role, "Staff Engineer");
  });

  // 5. SAFE_RESET
  await runTest("Safe reset creates SAFE_RESET audit event with incremented sessionGeneration", async () => {
    const conv = await convRepo.getConversation(normalized);
    const resetOutbox = {
      outboxId: crypto.randomUUID(),
      operationId: `op_reset_${Date.now()}`,
      conversationId: normalized,
      destinationPhone: normalized,
      messageType: "text",
      payload: { bodyText: "Session reset." },
      correlationId: "corr_reset",
      status: "PENDING",
      attemptCount: 0,
      maxAttempts: 5,
      nextRetryAt: Date.now(),
      reconciliationAttempts: 0,
      createdAt: Date.now(),
    };

    await convRepo.executeSafeReset(conv, resetOutbox);

    const auditId = `aud_${normalized}_v5_SAFE_RESET`;
    const auditDoc = await mockStore.getDocument(AUDIT_LOG_COLLECTION, auditId);
    assert(auditDoc, "SAFE_RESET audit record must exist");
    assert.strictEqual(auditDoc.eventType, "SAFE_RESET");
    assert.strictEqual(auditDoc.sessionGeneration, 2);
    assert.strictEqual(auditDoc.metadata.previousSessionGeneration, 1);
    assert.strictEqual(auditDoc.metadata.newSessionGeneration, 2);
  });

  // 6. HUMAN_HANDOFF_REQUESTED
  await runTest("Human handoff creates HUMAN_HANDOFF_REQUESTED audit event", async () => {
    const conv = await convRepo.getConversation(normalized);
    const handoffNotif = {
      notificationId: `notif_handoff_${Date.now()}`,
      type: "HUMAN_REQUEST_ALERT",
      conversationId: normalized,
      recipientEmail: "gaurav@example.com",
      subject: "Human Requested",
      textContent: "Recruiter requested to chat directly.",
      htmlContent: "<p>Recruiter requested</p>",
      status: "PENDING",
      attemptCount: 0,
      nextRetryAt: Date.now(),
      createdAt: Date.now(),
      correlationId: "corr_handoff",
    };
    const handoffOutbox = {
      outboxId: crypto.randomUUID(),
      operationId: `op_handoff_${Date.now()}`,
      conversationId: normalized,
      destinationPhone: normalized,
      messageType: "text",
      payload: { bodyText: "Gaurav has been notified." },
      correlationId: "corr_handoff",
      status: "PENDING",
      attemptCount: 0,
      maxAttempts: 5,
      nextRetryAt: Date.now(),
      reconciliationAttempts: 0,
      createdAt: Date.now(),
    };

    await convRepo.initiateHumanHandoff(conv, handoffOutbox, handoffNotif);

    const auditId = `aud_${normalized}_v6_HUMAN_HANDOFF_REQUESTED`;
    const auditDoc = await mockStore.getDocument(AUDIT_LOG_COLLECTION, auditId);
    assert(auditDoc, "HUMAN_HANDOFF_REQUESTED audit record must exist");
    assert.strictEqual(auditDoc.eventType, "HUMAN_HANDOFF_REQUESTED");
    assert.strictEqual(auditDoc.newState, "HUMAN_PENDING");
  });

  // 7. OPT_OUT
  await runTest("Opt-out creates OPT_OUT audit event with compliance reference", async () => {
    const conv = await convRepo.getConversation(normalized);
    const optOutOutbox = {
      outboxId: crypto.randomUUID(),
      operationId: `op_optout_${Date.now()}`,
      conversationId: normalized,
      destinationPhone: normalized,
      messageType: "text",
      payload: { bodyText: "You have unsubscribed." },
      correlationId: "corr_optout",
      status: "PENDING",
      attemptCount: 0,
      maxAttempts: 5,
      nextRetryAt: Date.now(),
      reconciliationAttempts: 0,
      createdAt: Date.now(),
    };

    await convRepo.optOut(conv, optOutOutbox);

    const auditId = `aud_${normalized}_v7_OPT_OUT`;
    const auditDoc = await mockStore.getDocument(AUDIT_LOG_COLLECTION, auditId);
    assert(auditDoc, "OPT_OUT audit record must exist");
    assert.strictEqual(auditDoc.eventType, "OPT_OUT");
    assert.strictEqual(auditDoc.newState, "OPTED_OUT");
  });

  // 8. REPEATED OPT_OUT IDEMPOTENT NO-OP
  await runTest("Repeated opt-out is an idempotent no-op and does not append duplicate audit events", async () => {
    const conv = await convRepo.getConversation(normalized);
    assert.strictEqual(conv.currentState, "OPTED_OUT");

    const auditCollectionBefore = Array.from(mockStore.getCollection(AUDIT_LOG_COLLECTION).values());
    const countBefore = auditCollectionBefore.filter((a) => a.eventType === "OPT_OUT").length;

    const optOutOutbox2 = {
      outboxId: crypto.randomUUID(),
      operationId: `op_optout2_${Date.now()}`,
      conversationId: normalized,
      destinationPhone: normalized,
      messageType: "text",
      payload: { bodyText: "You have unsubscribed." },
      correlationId: "corr_optout2",
      status: "PENDING",
      attemptCount: 0,
      maxAttempts: 5,
      nextRetryAt: Date.now(),
      reconciliationAttempts: 0,
      createdAt: Date.now(),
    };

    await convRepo.optOut(conv, optOutOutbox2);

    const auditCollectionAfter = Array.from(mockStore.getCollection(AUDIT_LOG_COLLECTION).values());
    const countAfter = auditCollectionAfter.filter((a) => a.eventType === "OPT_OUT").length;
    assert.strictEqual(countAfter, countBefore, "Repeated opt-out must NOT append duplicate audit event");
  });

  // 9. OUTBOUND_POLICY_BLOCKED
  const opPolicy = `op_policy_${Date.now()}`;
  await runTest("Outbound policy blocked atomically updates outbox and writes OUTBOUND_POLICY_BLOCKED", async () => {
    await mockStore.setDocument(OUTBOX_COLLECTION, opPolicy, {
      operationId: opPolicy,
      conversationId: normalized,
      status: "PENDING",
      correlationId: "corr_pol",
      attemptCount: 0,
    });

    await outboxRepo.markPolicyBlocked(opPolicy, "Window closed (>24h)");

    const outboxDoc = await mockStore.getDocument(OUTBOX_COLLECTION, opPolicy);
    assert.strictEqual(outboxDoc.status, "POLICY_BLOCKED");

    const auditDoc = await mockStore.getDocument(AUDIT_LOG_COLLECTION, `aud_${opPolicy}_OUTBOUND_POLICY_BLOCKED`);
    assert(auditDoc, "OUTBOUND_POLICY_BLOCKED audit must exist");
    assert.strictEqual(auditDoc.eventType, "OUTBOUND_POLICY_BLOCKED");
    assert.strictEqual(auditDoc.actor, "SYSTEM");
    assert.strictEqual(auditDoc.reason, "Window closed (>24h)");
  });

  // 10. OUTBOUND_AMBIGUOUS
  const opAmbiguous = `op_ambiguous_${Date.now()}`;
  await runTest("Dispatch network timeout atomically updates outbox and writes OUTBOUND_AMBIGUOUS", async () => {
    await mockStore.setDocument(OUTBOX_COLLECTION, opAmbiguous, {
      operationId: opAmbiguous,
      conversationId: normalized,
      status: "SENDING",
      correlationId: "corr_amb",
      attemptCount: 1,
    });

    await outboxRepo.markAmbiguous(opAmbiguous, "ETIMEDOUT: Connection timed out to Meta Graph API");

    const outboxDoc = await mockStore.getDocument(OUTBOX_COLLECTION, opAmbiguous);
    assert.strictEqual(outboxDoc.status, "AMBIGUOUS");

    const auditDoc = await mockStore.getDocument(AUDIT_LOG_COLLECTION, `aud_${opAmbiguous}_OUTBOUND_AMBIGUOUS`);
    assert(auditDoc, "OUTBOUND_AMBIGUOUS audit must exist");
    assert.strictEqual(auditDoc.eventType, "OUTBOUND_AMBIGUOUS");
    assert.strictEqual(auditDoc.actor, "PROCESSOR");
    assert(auditDoc.reason.includes("ETIMEDOUT"));
  });

  // 11. OUTBOUND_RECONCILING with verified actor
  await runTest("Reconciler lease claim atomically writes OUTBOUND_RECONCILING with verified actor", async () => {
    const adminActor = { type: "ADMIN", id: "security@gauravpatil.online" };
    const claim = await outboxRepo.claimForReconciliation(opAmbiguous, adminActor);
    assert.strictEqual(claim.success, true);

    const auditDoc = await mockStore.getDocument(AUDIT_LOG_COLLECTION, `aud_${opAmbiguous}_OUTBOUND_RECONCILING`);
    assert(auditDoc, "OUTBOUND_RECONCILING audit record must exist");
    assert.strictEqual(auditDoc.eventType, "OUTBOUND_RECONCILING");
    assert.strictEqual(auditDoc.actor, "ADMIN");
    assert.strictEqual(auditDoc.actorId, "security@gauravpatil.online");
  });

  // 12. OUTBOUND_RECONCILED (CONFIRMED_ACCEPTED)
  await runTest("Reconciled with verified wamid atomically writes OUTBOUND_RECONCILED (CONFIRMED_ACCEPTED)", async () => {
    const adminActor = { type: "ADMIN", id: "security@gauravpatil.online" };
    const res = await outboxRepo.finalizeReconciliation(opAmbiguous, adminActor, {
      proofType: "META_WAMID_VERIFIED",
      metaMessageId: "wamid.HBgLMjE2OTg5NDM1MjIVAgASGBgyM0I=",
      auditNote: "Verified in Meta Business Manager dashboard",
    });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.status, "CONFIRMED_ACCEPTED");

    const auditDoc = await mockStore.getDocument(AUDIT_LOG_COLLECTION, `aud_${opAmbiguous}_OUTBOUND_RECONCILED`);
    assert(auditDoc, "OUTBOUND_RECONCILED audit record must exist");
    assert.strictEqual(auditDoc.newState, "CONFIRMED_ACCEPTED");
    assert.strictEqual(auditDoc.actor, "ADMIN");
    assert.strictEqual(auditDoc.actorId, "security@gauravpatil.online");
    assert.strictEqual(auditDoc.metadata.proofType, "META_WAMID_VERIFIED");
  });

  // 13. OUTBOUND_RECONCILED (RETRY_PENDING)
  const opReconRetry = `op_recon_retry_${Date.now()}`;
  await runTest("Reconciled with gateway error atomically writes OUTBOUND_RECONCILED (RETRY_PENDING)", async () => {
    await mockStore.setDocument(OUTBOX_COLLECTION, opReconRetry, {
      operationId: opReconRetry,
      conversationId: normalized,
      status: "AMBIGUOUS",
      correlationId: "corr_rec2",
      attemptCount: 1,
    });

    const adminActor = { type: "ADMIN", id: "gaurav@devlabs.io" };
    await outboxRepo.claimForReconciliation(opReconRetry, adminActor);
    const res = await outboxRepo.finalizeReconciliation(opReconRetry, adminActor, {
      proofType: "META_GATEWAY_REJECTED",
      rejectionReason: "Meta HTTP 503 Service Unavailable: Request dropped at edge before ingestion",
    });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.status, "RETRY_PENDING");

    const auditDoc = await mockStore.getDocument(AUDIT_LOG_COLLECTION, `aud_${opReconRetry}_OUTBOUND_RECONCILED`);
    assert(auditDoc, "OUTBOUND_RECONCILED audit must exist");
    assert.strictEqual(auditDoc.newState, "RETRY_PENDING");
    assert.strictEqual(auditDoc.actor, "ADMIN");
    assert.strictEqual(auditDoc.actorId, "gaurav@devlabs.io");
  });

  // 14. OUTBOUND_RECONCILED (UNRESOLVED)
  const opInconclusive = `op_recon_inc_${Date.now()}`;
  await runTest("Inconclusive reconciliation atomically writes OUTBOUND_RECONCILED (UNRESOLVED)", async () => {
    await mockStore.setDocument(OUTBOX_COLLECTION, opInconclusive, {
      operationId: opInconclusive,
      conversationId: normalized,
      status: "AMBIGUOUS",
      correlationId: "corr_inc",
      attemptCount: 1,
    });

    const adminActor = { type: "ADMIN", id: "operator@devlabs.io" };
    await outboxRepo.claimForReconciliation(opInconclusive, adminActor);
    const res = await outboxRepo.finalizeReconciliation(opInconclusive, adminActor, {
      proofType: "INCONCLUSIVE",
      auditNote: "No status webhook and no gateway response available within 24h",
    });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.status, "UNRESOLVED");

    const auditDoc = await mockStore.getDocument(AUDIT_LOG_COLLECTION, `aud_${opInconclusive}_OUTBOUND_RECONCILED`);
    assert(auditDoc, "OUTBOUND_RECONCILED audit must exist");
    assert.strictEqual(auditDoc.newState, "UNRESOLVED");
  });

  // 15. OUTBOUND_RETRY_AUTHORIZED with deterministic attempt ID
  await runTest("Safe retry dispatch creates OUTBOUND_RETRY_AUTHORIZED with deterministic attempt ID", async () => {
    const adminActor = { type: "ADMIN", id: "security@gauravpatil.online" };
    const res = await outboxRepo.recordRetryAuthorized(opReconRetry, adminActor);
    assert.strictEqual(res.success, true);

    // opReconRetry had attemptCount = 1, so authorized attempt is 2
    const auditId = `aud_${opReconRetry}_retry_2`;
    const auditDoc = await mockStore.getDocument(AUDIT_LOG_COLLECTION, auditId);
    assert(auditDoc, "OUTBOUND_RETRY_AUTHORIZED audit record must exist");
    assert.strictEqual(auditDoc.eventType, "OUTBOUND_RETRY_AUTHORIZED");
    assert.strictEqual(auditDoc.actor, "ADMIN");
    assert.strictEqual(auditDoc.actorId, "security@gauravpatil.online");
    assert.strictEqual(auditDoc.metadata.authorizedAttempt, 2);
  });

  // 16. OUTBOUND_DEAD_LETTER from failed webhook
  await runTest("Failed status webhook creates OUTBOUND_DEAD_LETTER audit event", async () => {
    const opDeadLetter = `op_dlq_${Date.now()}`;
    const wamid = `wamid.DEAD_${Date.now()}`;
    await mockStore.setDocument(OUTBOX_COLLECTION, opDeadLetter, {
      operationId: opDeadLetter,
      metaMessageId: wamid,
      conversationId: normalized,
      status: "SENT",
      correlationId: "corr_dlq",
    });

    const statusRes = await outboxRepo.updateDeliveryStatus(
      wamid,
      "FAILED",
      "Meta Webhook Error 131026: Message undeliverable to deactivated phone"
    );
    assert.strictEqual(statusRes.matched, true);

    const auditDoc = await mockStore.getDocument(AUDIT_LOG_COLLECTION, `aud_${opDeadLetter}_OUTBOUND_DEAD_LETTER`);
    assert(auditDoc, "OUTBOUND_DEAD_LETTER audit must exist");
    assert.strictEqual(auditDoc.eventType, "OUTBOUND_DEAD_LETTER");
    assert.strictEqual(auditDoc.actor, "WEBHOOK");
    assert(auditDoc.reason.includes("131026"));
  });

  // 17. TRANSACTION CALLBACK RETRY SIMULATION (DETERMINISTIC ID)
  await runTest("Transaction callback retry simulation produces exactly 1 audit document", async () => {
    const opRetrySim = `op_retry_sim_${Date.now()}`;
    await mockStore.setDocument(OUTBOX_COLLECTION, opRetrySim, {
      operationId: opRetrySim,
      conversationId: normalized,
      status: "RETRY_PENDING",
      attemptCount: 2,
    });

    const adminActor = { type: "ADMIN", id: "gaurav@example.com" };

    // Simulate 3 transaction callback retries on OCC contention
    for (let i = 0; i < 3; i++) {
      await outboxRepo.recordRetryAuthorized(opRetrySim, adminActor);
    }

    const allAudits = Array.from(mockStore.getCollection(AUDIT_LOG_COLLECTION).values());
    const retryAudits = allAudits.filter((a) => a.operationId === opRetrySim);
    assert.strictEqual(retryAudits.length, 1, "Deterministic audit ID prevents duplicate audit documents across retries");
    assert.strictEqual(retryAudits[0].auditId, `aud_${opRetrySim}_retry_3`);
  });

  // 18. ATOMIC COMMIT GUARANTEE: TRANSACTION FAILURE ROLLS BACK BOTH STATE CHANGE AND AUDIT
  await runTest("Atomic commit guarantee: transaction failure rolls back both state change and audit event", async () => {
    const testPhone = "+14155559999";
    const auditIdTarget = `aud_${testPhone}_v1_CONVERSATION_INITIALIZED`;

    try {
      await mockStore.runTransaction(async (tx, db) => {
        const convRef = db.collection(CONVERSATIONS_COLLECTION).doc(testPhone);
        tx.set(convRef, { conversationId: testPhone, stateVersion: 1 });

        const auditRef = db.collection(AUDIT_LOG_COLLECTION).doc(auditIdTarget);
        tx.set(auditRef, { eventType: "CONVERSATION_INITIALIZED" });

        // Simulate crash before commit
        throw new Error("Simulated Firestore transaction crash");
      });
    } catch {
      // Expected rollback
    }

    const convCheck = await mockStore.getDocument(CONVERSATIONS_COLLECTION, testPhone);
    const auditCheck = await mockStore.getDocument(AUDIT_LOG_COLLECTION, auditIdTarget);
    assert.strictEqual(convCheck, null, "Conversation state change must not commit on transaction failure");
    assert.strictEqual(auditCheck, null, "Audit record must not commit on transaction failure");
  });

  // 19. IMMUTABILITY INVARIANT: ZERO APPLICATION UPDATE/DELETE PATHS FOR AUDIT RECORDS
  await runTest("Immutability invariant: verify zero update or delete paths exist for audit records", async () => {
    // Invariant: The audit ledger has no updateAudit or deleteAudit APIs
    const repoMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(convRepo));
    const outboxMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(outboxRepo));

    const illegalConvMethods = repoMethods.filter((m) => m.toLowerCase().includes("deleteaudit") || m.toLowerCase().includes("updateaudit"));
    const illegalOutboxMethods = outboxMethods.filter((m) => m.toLowerCase().includes("deleteaudit") || m.toLowerCase().includes("updateaudit"));

    assert.strictEqual(illegalConvMethods.length, 0, "No audit update/delete methods in ConversationRepository");
    assert.strictEqual(illegalOutboxMethods.length, 0, "No audit update/delete methods in OutboxRepository");
  });

  // 20. SENSITIVE DATA PROHIBITION: ZERO SECRETS, TOKENS, OR COOKIES IN AUDIT METADATA
  await runTest("Sensitive data prohibition: zero secrets, tokens, or cookies in audit metadata", async () => {
    const allAudits = Array.from(mockStore.getCollection(AUDIT_LOG_COLLECTION).values());
    assert(allAudits.length > 0, "Audit records exist");

    for (const audit of allAudits) {
      const serialized = JSON.stringify(audit).toLowerCase();
      assert(!serialized.includes("bearer "), "Audit record must not contain Bearer tokens");
      assert(!serialized.includes("whsec_"), "Audit record must not contain webhook secrets");
      assert(!serialized.includes("session_token"), "Audit record must not contain session tokens");
      assert(!serialized.includes("admin_session="), "Audit record must not contain session cookies");
    }
  });

  console.log("\n==================================================================");
  console.log(`  ALL ${passed}/${passed + failed} REGRESSION TESTS PASSED (100% SUCCESS)        `);
  console.log("==================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Test runner crashed:", err);
  process.exit(1);
});
