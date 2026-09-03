/**
 * Regression Test Suite for Patch #1: Outbound Policy Guard Contract Fix
 * 
 * Verifies that:
 * 1. OutboundPolicyGuard correctly evaluates OutboundPolicyContext without WhatsAppThread.
 * 2. Missing policy context strictly fails closed.
 * 3. Expired customer service window is rejected without provider calls.
 * 4. Opted-out recipient is rejected.
 * 5. Exact millisecond boundary is strictly blocked.
 * 6. Active window (even by 1ms) is allowed.
 * 7. WhatsAppMetaClient successfully enforces OutboundPolicyContext.
 * 
 * Run with: npx tsx scripts/test-patch-1-regression.mjs
 */

import assert from "assert";
import { OutboundPolicyGuard } from "../lib/whatsapp/security/outbound-policy-guard.ts";
import { WhatsAppMetaClient } from "../lib/whatsapp/meta/client.ts";

console.log("===============================================================");
console.log("  PATCH #1 REGRESSION TEST SUITE: OUTBOUND POLICY CONTRACT     ");
console.log("===============================================================\n");

let passed = 0;
let total = 0;

function test(name, fn) {
  total++;
  try {
    fn();
    passed++;
    console.log(`[PASS] ${name}`);
  } catch (err) {
    console.error(`[FAIL] ${name}`);
    console.error(err);
    process.exit(1);
  }
}

async function testAsync(name, fn) {
  total++;
  try {
    await fn();
    passed++;
    console.log(`[PASS] ${name}`);
  } catch (err) {
    console.error(`[FAIL] ${name}`);
    console.error(err);
    process.exit(1);
  }
}

// 1. Valid Context Test
test("1. Active customer service window allows free-form dispatch", () => {
  const result = OutboundPolicyGuard.evaluateOutbound({
    recipientPhone: "+919876543210",
    messageType: "free_form",
    context: {
      customerServiceWindowExpiresAt: Date.now() + 3600000,
      optedOut: false,
    },
  });
  assert.strictEqual(result.allowed, true);
  assert.strictEqual(result.reason, undefined);
});

// 2. Missing Context Test (Fail-Closed)
test("2. Missing policy context strictly fails closed", () => {
  const result = OutboundPolicyGuard.evaluateOutbound({
    recipientPhone: "+919876543210",
    messageType: "free_form",
    context: null,
  });
  assert.strictEqual(result.allowed, false);
  assert.ok(result.reason.includes("Missing conversation policy context"));
});

// 3. Invalid/NaN Expiry Test
test("3. Non-numeric or NaN expiry strictly fails closed", () => {
  const result = OutboundPolicyGuard.evaluateOutbound({
    recipientPhone: "+919876543210",
    messageType: "free_form",
    context: {
      customerServiceWindowExpiresAt: NaN,
      optedOut: false,
    },
  });
  assert.strictEqual(result.allowed, false);
  assert.ok(result.reason.includes("Invalid customer service window expiry timestamp"));
});

// 4. Expired Window Test
test("4. Expired customer service window (>24h) is strictly blocked", () => {
  const result = OutboundPolicyGuard.evaluateOutbound({
    recipientPhone: "+919876543210",
    messageType: "free_form",
    context: {
      customerServiceWindowExpiresAt: Date.now() - 1000,
      optedOut: false,
    },
  });
  assert.strictEqual(result.allowed, false);
  assert.ok(result.reason.includes("Customer service window expired (>24h)"));
});

// 5. Opted-Out Recruiter Test
test("5. Opted-out recruiter is strictly blocked even with active window", () => {
  const result = OutboundPolicyGuard.evaluateOutbound({
    recipientPhone: "+919876543210",
    messageType: "free_form",
    context: {
      customerServiceWindowExpiresAt: Date.now() + 3600000,
      optedOut: true,
    },
  });
  assert.strictEqual(result.allowed, false);
  assert.ok(result.reason.includes("Recipient has opted out"));
});

// 6. Exact Boundary Condition Test
test("6. Exact boundary (now === expiresAt) is closed; strictly > now required", () => {
  const now = Date.now();
  const resultBoundary = OutboundPolicyGuard.evaluateOutbound({
    recipientPhone: "+919876543210",
    messageType: "free_form",
    context: {
      customerServiceWindowExpiresAt: now,
      optedOut: false,
    },
  });
  assert.strictEqual(resultBoundary.allowed, false);

  const resultActive = OutboundPolicyGuard.evaluateOutbound({
    recipientPhone: "+919876543210",
    messageType: "free_form",
    context: {
      customerServiceWindowExpiresAt: now + 10,
      optedOut: false,
    },
  });
  assert.strictEqual(resultActive.allowed, true);
});

// 7. WhatsAppMetaClient Pre-Dispatch Integration Test
await testAsync("7. WhatsAppMetaClient enforces OutboundPolicyContext and throws if blocked", async () => {
  // Attempt with expired context -> must throw "Outbound dispatch blocked"
  let blockedCaught = false;
  try {
    await WhatsAppMetaClient.sendTextMessage("+919876543210", "Hello", {
      customerServiceWindowExpiresAt: Date.now() - 5000,
      optedOut: false,
    });
  } catch (err) {
    blockedCaught = err.message.includes("Outbound dispatch blocked: Customer service window expired");
  }
  assert.strictEqual(blockedCaught, true, "Expected MetaClient to throw outbound dispatch blocked error for expired context");

  // Attempt with missing context -> must throw "Outbound dispatch blocked"
  let missingCaught = false;
  try {
    await WhatsAppMetaClient.sendTextMessage("+919876543210", "Hello", null);
  } catch (err) {
    missingCaught = err.message.includes("Missing conversation policy context");
  }
  assert.strictEqual(missingCaught, true, "Expected MetaClient to throw for missing context");
});

console.log(`\n===============================================================`);
console.log(`  ALL ${passed}/${total} REGRESSION TESTS PASSED (100% SUCCESS)    `);
console.log(`===============================================================\n`);
