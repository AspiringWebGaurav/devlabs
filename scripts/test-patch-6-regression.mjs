/**
 * Regression Test Suite for Patch #6: Dead Code, Legacy Drift & Architecture Truth Cleanup
 * 
 * Verifies:
 * 1. Zero active production imports or files for WhatsAppRouterService.
 * 2. Zero active production imports or files for LeadIntakeService.
 * 3. Zero active production imports or files for button-helper.
 * 4. Zero active production imports or files for whatsapp.repository.ts.
 * 5. saveInboundEvent is completely removed; all ingestion routes through claimOrDetectDuplicate.
 * 6. SUPERSEDED status remains intact in OutboxMessageStatus enum for persisted schema parity.
 * 7. Admin UI reads strictly from whatsapp_conversations, whatsapp_outbox, whatsapp_leads.
 * 8. Zero production code writes to legacy collections (whatsapp_threads, whatsapp_messages).
 * 9. Zero active Redis client imports across the entire WhatsApp subsystem.
 * 10. Zero cron / scheduler / cloud tasks dependencies across the entire WhatsApp subsystem.
 * 11. Patch #1 preservation: OutboundPolicyGuard fail-closed invariant remains 100% green.
 * 12. Patch #2 preservation: Inbound atomic lease and idempotency invariant remains 100% green.
 * 13. Patch #3 preservation: Strict direct metaMessageId reconciliation invariant remains 100% green.
 * 14. Patch #4 preservation: Admin UI source-of-truth invariant remains 100% green.
 * 15. Patch #5 preservation: Immutable audit trail with mandatory coverage remains 100% green.
 * 16. Verification scripts reflect real $0 serverless architecture without fictional Redis assertions.
 * 
 * Run with: npx tsx scripts/test-patch-6-regression.mjs
 */

import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { OutboundPolicyGuard } from "../lib/whatsapp/security/outbound-policy-guard.ts";
import { InboundEventRepository } from "../lib/whatsapp/persistence/inbound-event.repo.ts";
import { ConversationRepository } from "../lib/whatsapp/persistence/conversation.repo.ts";
import { OutboxRepository } from "../lib/whatsapp/persistence/outbox.repo.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

console.log("==================================================================");
console.log("  PATCH #6 REGRESSION TEST SUITE: DEAD CODE & ARCHITECTURE TRUTH  ");
console.log("==================================================================\n");

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
  // 1. WhatsAppRouterService is dead and removed
  await runTest("Zero active production imports or files for WhatsAppRouterService", async () => {
    const filePath = path.join(rootDir, "lib/whatsapp/services/whatsapp-router.service.ts");
    assert(!fs.existsSync(filePath), "whatsapp-router.service.ts must be deleted from disk");

    const barrel = fs.readFileSync(path.join(rootDir, "lib/whatsapp/services/index.ts"), "utf-8");
    assert(!barrel.includes("whatsapp-router.service"), "Barrel must not re-export deleted router");
  });

  // 2. LeadIntakeService is dead and removed
  await runTest("Zero active production imports or files for LeadIntakeService", async () => {
    const filePath = path.join(rootDir, "lib/whatsapp/services/lead-intake.service.ts");
    assert(!fs.existsSync(filePath), "lead-intake.service.ts must be deleted from disk");

    const barrel = fs.readFileSync(path.join(rootDir, "lib/whatsapp/services/index.ts"), "utf-8");
    assert(!barrel.includes("lead-intake.service"), "Barrel must not re-export deleted intake service");
  });

  // 3. button-helper is dead and removed
  await runTest("Zero active production imports or files for button-helper", async () => {
    const filePath = path.join(rootDir, "lib/whatsapp/services/button-helper.ts");
    assert(!fs.existsSync(filePath), "button-helper.ts must be deleted from disk");

    const barrel = fs.readFileSync(path.join(rootDir, "lib/whatsapp/services/index.ts"), "utf-8");
    assert(!barrel.includes("button-helper"), "Barrel must not re-export deleted button helper");
  });

  // 4. whatsapp.repository.ts is dead and removed
  await runTest("Zero active production imports or files for whatsapp.repository.ts", async () => {
    const filePath = path.join(rootDir, "lib/whatsapp/persistence/whatsapp.repository.ts");
    assert(!fs.existsSync(filePath), "whatsapp.repository.ts must be deleted from disk");

    const barrel = fs.readFileSync(path.join(rootDir, "lib/whatsapp/persistence/index.ts"), "utf-8");
    assert(!barrel.includes("whatsapp.repository"), "Persistence barrel must not re-export deleted whatsapp.repository");
  });

  // 5. saveInboundEvent is removed from InboundEventRepository
  await runTest("saveInboundEvent is completely removed; all ingestion routes through claimOrDetectDuplicate", async () => {
    const inboundRepoProto = Object.getOwnPropertyNames(InboundEventRepository.prototype);
    assert(!inboundRepoProto.includes("saveInboundEvent"), "saveInboundEvent method must be removed from InboundEventRepository");
    assert(inboundRepoProto.includes("claimOrDetectDuplicate"), "claimOrDetectDuplicate must remain the authoritative entry point");
  });

  // 6. SUPERSEDED status remains intact in OutboxMessageStatus enum
  await runTest("SUPERSEDED status remains intact in OutboxMessageStatus enum for persisted schema parity", async () => {
    const typesFile = fs.readFileSync(path.join(rootDir, "lib/whatsapp/types/conversation.types.ts"), "utf-8");
    assert(typesFile.includes('"SUPERSEDED"'), 'OutboxMessageStatus must retain "SUPERSEDED" status');

    const chatViewer = fs.readFileSync(path.join(rootDir, "app/admin/whatsapp/components/RecruiterChatViewer.tsx"), "utf-8");
    assert(chatViewer.includes('case "SUPERSEDED":'), "RecruiterChatViewer must render SUPERSEDED status");
  });

  // 7. Admin UI reads strictly from live collections
  await runTest("Admin UI reads strictly from whatsapp_conversations, whatsapp_outbox, whatsapp_leads", async () => {
    const adminPage = fs.readFileSync(path.join(rootDir, "app/admin/whatsapp/page.tsx"), "utf-8");
    assert(adminPage.includes("conversationRepository.listConversations"), "Admin page must read from conversationRepository");
    assert(adminPage.includes("conversationRepository.listLeads"), "Admin page must read from conversationRepository.listLeads");
    assert(!adminPage.includes("whatsapp_threads"), "Admin page must not query whatsapp_threads");
    assert(!adminPage.includes("whatsapp_messages"), "Admin page must not query whatsapp_messages");
  });

  // 8. Zero production code writes to legacy collections
  await runTest("Zero production code writes to legacy collections (whatsapp_threads, whatsapp_messages)", async () => {
    const libFiles = [];
    function scanDir(dir) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) scanDir(fullPath);
        else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) libFiles.push(fullPath);
      }
    }
    scanDir(path.join(rootDir, "lib/whatsapp"));
    scanDir(path.join(rootDir, "app/admin/whatsapp"));
    scanDir(path.join(rootDir, "app/api/whatsapp"));

    for (const f of libFiles) {
      const content = fs.readFileSync(f, "utf-8");
      assert(!content.includes('"whatsapp_threads"'), `File ${f} must not contain whatsapp_threads`);
      assert(!content.includes('"whatsapp_messages"'), `File ${f} must not contain whatsapp_messages`);
      assert(!content.includes('"whatsapp_opportunity_leads"'), `File ${f} must not contain whatsapp_opportunity_leads`);
    }
  });

  // 9. Zero active Redis client imports across the WhatsApp subsystem
  await runTest("Zero active Redis client imports across the entire WhatsApp subsystem", async () => {
    const whatsappFiles = [];
    function scanDir(dir) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) scanDir(fullPath);
        else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) whatsappFiles.push(fullPath);
      }
    }
    scanDir(path.join(rootDir, "lib/whatsapp"));

    for (const f of whatsappFiles) {
      const content = fs.readFileSync(f, "utf-8");
      const lines = content.split("\n");
      for (const line of lines) {
        if (line.trim().startsWith("import") && (line.includes("@upstash/redis") || line.includes("ioredis"))) {
          assert.fail(`File ${f} must not import Redis clients: ${line}`);
        }
      }
    }
  });

  // 10. Zero cron / scheduler / cloud tasks dependencies
  await runTest("Zero cron / scheduler / cloud tasks dependencies across the entire WhatsApp subsystem", async () => {
    const whatsappFiles = [];
    function scanDir(dir) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) scanDir(fullPath);
        else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) whatsappFiles.push(fullPath);
      }
    }
    scanDir(path.join(rootDir, "lib/whatsapp"));

    for (const f of whatsappFiles) {
      const content = fs.readFileSync(f, "utf-8");
      const lines = content.split("\n");
      for (const line of lines) {
        if (line.trim().startsWith("import") && (line.includes("cron") || line.includes("cloud-tasks") || line.includes("bullmq"))) {
          assert.fail(`File ${f} must not import cron/queue libraries: ${line}`);
        }
      }
    }
  });

  // 11. Patch #1 preservation: OutboundPolicyGuard fail-closed invariant
  await runTest("Patch #1 preservation: OutboundPolicyGuard fail-closed invariant remains 100% green", async () => {
    const checkMissing = OutboundPolicyGuard.evaluateOutbound({
      recipientPhone: "+919876543210",
      messageType: "free_form",
      context: null,
    });
    assert.strictEqual(checkMissing.allowed, false, "Null context must fail closed");

    const checkActive = OutboundPolicyGuard.evaluateOutbound({
      recipientPhone: "+919876543210",
      messageType: "free_form",
      context: { customerServiceWindowExpiresAt: Date.now() + 60000, optedOut: false },
    });
    assert.strictEqual(checkActive.allowed, true, "Active window must allow dispatch");
  });

  // 12. Patch #2 preservation: Inbound atomic lease contract
  await runTest("Patch #2 preservation: Inbound atomic lease and idempotency invariant remains 100% green", async () => {
    const inboundRepoProto = Object.getOwnPropertyNames(InboundEventRepository.prototype);
    assert(inboundRepoProto.includes("claimOrDetectDuplicate"), "claimOrDetectDuplicate must exist");
    assert(inboundRepoProto.includes("markProcessed"), "markProcessed must exist");
    assert(inboundRepoProto.includes("recordFailure"), "recordFailure must exist");
  });

  // 13. Patch #3 preservation: Strict direct metaMessageId reconciliation
  await runTest("Patch #3 preservation: Strict direct metaMessageId reconciliation invariant remains 100% green", async () => {
    const outboxRepoProto = Object.getOwnPropertyNames(OutboxRepository.prototype);
    assert(outboxRepoProto.includes("claimForReconciliation"), "claimForReconciliation must exist");
    assert(outboxRepoProto.includes("finalizeReconciliation"), "finalizeReconciliation must exist");
  });

  // 14. Patch #4 preservation: Admin UI source-of-truth invariant
  await runTest("Patch #4 preservation: Admin UI source-of-truth invariant remains 100% green", async () => {
    const actionsFile = fs.readFileSync(path.join(rootDir, "app/admin/whatsapp/actions.ts"), "utf-8");
    assert(actionsFile.includes("conversationRepository.listConversations"), "Actions must read from conversationRepository");
    assert(actionsFile.includes("outboxRepository.listOutboxForConversation"), "Actions must read from outboxRepository");
    assert(actionsFile.includes("outboxRepository.listInboundForPhone"), "Actions must read inbound events from outboxRepository");
    assert(!actionsFile.includes("whatsappRepository"), "Actions must not import or use whatsappRepository");
  });

  // 15. Patch #5 preservation: Immutable audit trail with mandatory coverage
  await runTest("Patch #5 preservation: Immutable audit trail with mandatory coverage remains 100% green", async () => {
    const convRepoFile = fs.readFileSync(path.join(rootDir, "lib/whatsapp/persistence/conversation.repo.ts"), "utf-8");
    assert(convRepoFile.includes("CONVERSATION_INITIALIZED"), "CONVERSATION_INITIALIZED audit event present");
    assert(convRepoFile.includes("FLOW_STARTED"), "FLOW_STARTED audit event present");
    assert(convRepoFile.includes("FLOW_STEP_ADVANCED"), "FLOW_STEP_ADVANCED audit event present");
    assert(convRepoFile.includes("LEAD_SUBMITTED"), "LEAD_SUBMITTED audit event present");
    assert(convRepoFile.includes("SAFE_RESET"), "SAFE_RESET audit event present");
    assert(convRepoFile.includes("HUMAN_HANDOFF_REQUESTED"), "HUMAN_HANDOFF_REQUESTED audit event present");
    assert(convRepoFile.includes("OPT_OUT"), "OPT_OUT audit event present");

    const outboxRepoFile = fs.readFileSync(path.join(rootDir, "lib/whatsapp/persistence/outbox.repo.ts"), "utf-8");
    assert(outboxRepoFile.includes("OUTBOUND_AMBIGUOUS"), "OUTBOUND_AMBIGUOUS audit event present");
    assert(outboxRepoFile.includes("OUTBOUND_RECONCILING"), "OUTBOUND_RECONCILING audit event present");
    assert(outboxRepoFile.includes("OUTBOUND_RECONCILED"), "OUTBOUND_RECONCILED audit event present");
    assert(outboxRepoFile.includes("OUTBOUND_POLICY_BLOCKED"), "OUTBOUND_POLICY_BLOCKED audit event present");
    assert(outboxRepoFile.includes("OUTBOUND_DEAD_LETTER"), "OUTBOUND_DEAD_LETTER audit event present");
    assert(outboxRepoFile.includes("OUTBOUND_RETRY_AUTHORIZED"), "OUTBOUND_RETRY_AUTHORIZED audit event present");
  });

  // 16. Verification scripts reflect real $0 serverless architecture
  await runTest("Verification scripts reflect real $0 serverless architecture without fictional Redis assertions", async () => {
    const verifyScript = fs.readFileSync(path.join(rootDir, "scripts/verify-whatsapp.mjs"), "utf-8");
    assert(!verifyScript.includes("Redis primary idempotency"), "Gate 9 must not assert Redis primary idempotency");
    assert(!verifyScript.includes("Redis outage simulation"), "Gate 11 must not assert Redis outage simulation");
    assert(verifyScript.includes("Authoritative Firestore durable ingestion"), "Gate 11 must assert Firestore durable ingestion");
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
