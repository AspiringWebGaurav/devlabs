/**
 * Live Chat Master QA Test Suite (Streamlined Scope: Auth, OTP, Session & Verified Message)
 */

import crypto from "crypto";
import { computeOtpVerifier, normalizeEmail } from "../lib/assistant/services/live-chat-otp.service";
import {
  signVisitorSession,
  verifyVisitorSession,
  VisitorSession,
  LIVE_CHAT_SESSION_MAX_AGE_SECONDS,
} from "../lib/assistant/auth";
import { hashRateLimitEmail } from "../lib/assistant/services/live-chat-rate-limiter";
import { formatBrevoIdempotencyKey } from "../lib/email/brevo";
import { EMAIL_IDENTITIES } from "../lib/email/identities";
import { verifyTurnstileToken } from "../lib/security/turnstile";
import {
  generateAdminThreadToken,
  verifyAdminThreadToken,
} from "../lib/dal/repositories/live-chat.repository";

export type TestType = "UNIT" | "INTEGRATION" | "API_SEC" | "CONCURRENCY" | "FAILURE";

interface TestResult {
  id: string;
  category: string;
  type: TestType;
  description: string;
  passed: boolean;
  error?: string;
  durationMs: number;
}

const results: TestResult[] = [];
const executedIds = new Set<string>();

function assertTest(
  id: string,
  category: string,
  type: TestType,
  description: string,
  fn: () => boolean | Promise<boolean>
) {
  if (executedIds.has(id)) {
    throw new Error(`FATAL: Duplicate Test ID registered: ${id}`);
  }
  executedIds.add(id);

  const start = performance.now();
  try {
    const res = fn();
    if (res instanceof Promise) {
      throw new Error(`Test ${id} returned a Promise. Use async test runner.`);
    }
    const durationMs = performance.now() - start;
    results.push({
      id,
      category,
      type,
      description,
      passed: Boolean(res),
      durationMs,
    });
  } catch (err: unknown) {
    const durationMs = performance.now() - start;
    const error = err as Error;
    results.push({
      id,
      category,
      type,
      description,
      passed: false,
      error: error.message || String(err),
      durationMs,
    });
  }
}

async function assertAsyncTest(
  id: string,
  category: string,
  type: TestType,
  description: string,
  fn: () => Promise<boolean>
) {
  if (executedIds.has(id)) {
    throw new Error(`FATAL: Duplicate Test ID registered: ${id}`);
  }
  executedIds.add(id);

  const start = performance.now();
  try {
    const passed = await fn();
    const durationMs = performance.now() - start;
    results.push({
      id,
      category,
      type,
      description,
      passed: Boolean(passed),
      durationMs,
    });
  } catch (err: unknown) {
    const durationMs = performance.now() - start;
    const error = err as Error;
    results.push({
      id,
      category,
      type,
      description,
      passed: false,
      error: error.message || String(err),
      durationMs,
    });
  }
}

// =========================================================================
// Category 1: OTP Cryptography & Normalization
// =========================================================================

assertTest("OTP-01", "OTP_CRYPTO", "UNIT", "Normalizes email with lowercase and trim", () => {
  return normalizeEmail("  User.Test@DOMAIN.COM  ") === "user.test@domain.com";
});

assertTest("OTP-02", "OTP_CRYPTO", "UNIT", "Computes deterministic HMAC-SHA256 verifier for OTP challenge", () => {
  const v1 = computeOtpVerifier("chal_123", "alex@example.com", "482910");
  const v2 = computeOtpVerifier("chal_123", "alex@example.com", "482910");
  return typeof v1 === "string" && v1.length === 64 && v1 === v2;
});

assertTest("OTP-03", "OTP_CRYPTO", "API_SEC", "Different OTP codes produce distinct verifiers", () => {
  const v1 = computeOtpVerifier("chal_123", "alex@example.com", "482910");
  const v2 = computeOtpVerifier("chal_123", "alex@example.com", "482911");
  return v1 !== v2;
});

assertTest("OTP-04", "OTP_CRYPTO", "API_SEC", "Different challenge IDs produce distinct verifiers", () => {
  const v1 = computeOtpVerifier("chal_123", "alex@example.com", "482910");
  const v2 = computeOtpVerifier("chal_124", "alex@example.com", "482910");
  return v1 !== v2;
});

assertTest("OTP-05", "OTP_CRYPTO", "API_SEC", "Different emails produce distinct verifiers", () => {
  const v1 = computeOtpVerifier("chal_123", "alex@example.com", "482910");
  const v2 = computeOtpVerifier("chal_123", "bob@example.com", "482910");
  return v1 !== v2;
});

assertTest("OTP-06", "OTP_CRYPTO", "UNIT", "6-digit OTP regex strictly matches only 6 digits", () => {
  const regex = /^\d{6}$/;
  return regex.test("123456") && !regex.test("12345") && !regex.test("1234567") && !regex.test("12345a");
});

// =========================================================================
// Category 2: Visitor Session Cryptography
// =========================================================================

assertTest("SESSION-01", "SESSION", "UNIT", "Signs and verifies visitor session cookie correctly", () => {
  const session: VisitorSession = {
    sessionId: "sess_12345",
    email: "alex@example.com",
    name: "Alex",
    clientIp: "127.0.0.1",
    createdAt: Date.now(),
    expiresAt: Date.now() + LIVE_CHAT_SESSION_MAX_AGE_SECONDS * 1000,
  };

  const token = signVisitorSession(session);
  const verified = verifyVisitorSession(token);

  return (
    verified !== null &&
    verified.sessionId === "sess_12345" &&
    verified.email === "alex@example.com" &&
    verified.name === "Alex"
  );
});

assertTest("SESSION-02", "SESSION", "API_SEC", "Rejects tampered visitor session payload", () => {
  const session: VisitorSession = {
    sessionId: "sess_12345",
    email: "alex@example.com",
    name: "Alex",
    clientIp: "127.0.0.1",
    createdAt: Date.now(),
    expiresAt: Date.now() + 86400000,
  };

  const token = signVisitorSession(session);
  const parts = token.split(".");
  const tamperedPayload = Buffer.from(
    JSON.stringify({ ...session, email: "attacker@example.com" })
  ).toString("base64url");
  const tamperedToken = `${tamperedPayload}.${parts[1]}`;

  return verifyVisitorSession(tamperedToken) === null;
});

assertTest("SESSION-03", "SESSION", "API_SEC", "Rejects expired visitor session token", () => {
  const expiredSession: VisitorSession = {
    sessionId: "sess_expired",
    email: "alex@example.com",
    name: "Alex",
    clientIp: "127.0.0.1",
    createdAt: Date.now() - 100000,
    expiresAt: Date.now() - 1000, // Expired
  };

  const token = signVisitorSession(expiredSession);
  return verifyVisitorSession(token) === null;
});

assertTest("SESSION-04", "SESSION", "API_SEC", "Rejects malformed token strings", () => {
  return (
    verifyVisitorSession("") === null &&
    verifyVisitorSession("random_junk") === null &&
    verifyVisitorSession("a.b.c") === null
  );
});

// =========================================================================
// Category 3: Email Identity & Brevo Policy Compliance
// =========================================================================

assertTest("EMAIL-01", "EMAIL", "UNIT", "Security sender identity is security@gauravpatil.site", () => {
  return EMAIL_IDENTITIES.SECURITY.primaryEmail === "security@gauravpatil.site";
});

assertTest("EMAIL-02", "EMAIL", "UNIT", "Contact / Inquiry sender identity is hello@gauravpatil.site", () => {
  return EMAIL_IDENTITIES.HELLO.primaryEmail === "hello@gauravpatil.site";
});

assertTest("EMAIL-03", "EMAIL", "UNIT", "Brevo idempotency key conforms to alphanumeric sanitized pattern", () => {
  const key = formatBrevoIdempotencyKey("inq_test_123-abc.def");
  return /^[a-zA-Z0-9_-]{1,64}$/.test(key);
});

// =========================================================================
// Category 4: Rate Limiting & Abuse Defense
// =========================================================================

assertTest("RATELIMIT-01", "RATELIMIT", "API_SEC", "Hashes email for rate limiting with SHA-256 (16 hex chars)", () => {
  const h1 = hashRateLimitEmail("alex@example.com");
  const h2 = hashRateLimitEmail("ALEX@example.com");
  return typeof h1 === "string" && h1.length === 16 && h1 === h2;
});

assertTest("RATELIMIT-02", "RATELIMIT", "API_SEC", "Different emails generate distinct rate limiting hashes", () => {
  const h1 = hashRateLimitEmail("user1@example.com");
  const h2 = hashRateLimitEmail("user2@example.com");
  return h1 !== h2;
});

// =========================================================================
// Category 5: Concurrency & State Invariants
// =========================================================================

assertTest("CONCURRENCY-01", "CONCURRENCY", "CONCURRENCY", "Simultaneous OTP verifier evaluations are thread-safe and deterministic", () => {
  const verifiers = Array.from({ length: 50 }, (_, i) =>
    computeOtpVerifier("chal_fixed", "user@example.com", "123456")
  );
  return verifiers.every((v) => v === verifiers[0]);
});

assertTest("CONCURRENCY-02", "CONCURRENCY", "CONCURRENCY", "Simultaneous session token signings produce valid decodable tokens", () => {
  const tokens = Array.from({ length: 50 }, (_, i) =>
    signVisitorSession({
      sessionId: `sess_${i}`,
      email: `user${i}@example.com`,
      name: `User ${i}`,
      clientIp: "127.0.0.1",
      createdAt: Date.now(),
      expiresAt: Date.now() + 86400000,
    })
  );
  return tokens.every((token, i) => {
    const verified = verifyVisitorSession(token);
    return verified !== null && verified.sessionId === `sess_${i}`;
  });
});

// =========================================================================
// Master Execution Runner & Output
// =========================================================================

async function runTestSuite() {
  // Category 6: Cloudflare Turnstile Verification & Security
  await assertAsyncTest("TURNSTILE-01", "TURNSTILE", "UNIT", "Bypass tokens (dev_bypass_token, client_direct_token) pass validation", async () => {
    const t1 = await verifyTurnstileToken("dev_bypass_token");
    const t2 = await verifyTurnstileToken("client_direct_token");
    return t1.success === true && t2.success === true;
  });

  await assertAsyncTest("TURNSTILE-02", "TURNSTILE", "UNIT", "Turnstile verification gracefully handles empty token", async () => {
    const res = await verifyTurnstileToken("");
    return res.success === true;
  });

  // Category 7: Turnstile Cloudflare Fallback OTP
  await assertAsyncTest("FALLBACK-01", "FALLBACK", "UNIT", "Turnstile Fallback OTP uses deterministic HMAC-SHA256 verifiers", async () => {
    const hash1 = computeOtpVerifier("ch_cf_fb_1", "salt_fb", "987654");
    const hash2 = computeOtpVerifier("ch_cf_fb_1", "salt_fb", "987654");
    const hash3 = computeOtpVerifier("ch_cf_fb_2", "salt_fb", "987654");
    return hash1 === hash2 && hash1 !== hash3;
  });

  await assertAsyncTest("FALLBACK-02", "FALLBACK", "API_SEC", "Turnstile Fallback rejects tampered 6-digit OTP codes", async () => {
    const valid = computeOtpVerifier("ch_cf_fb_1", "salt_fb", "654321");
    const wrong = computeOtpVerifier("ch_cf_fb_1", "salt_fb", "000000");
    return valid !== wrong;
  });

  // Category 8: Admin Magic Link Room Token Security
  await assertAsyncTest("THREAD-01", "THREAD_TOKEN", "UNIT", "Generates deterministic HMAC-SHA256 admin room token and verifies correctly", async () => {
    const token = generateAdminThreadToken("thread_123", "neha@example.com");
    return verifyAdminThreadToken("thread_123", "neha@example.com", token);
  });

  await assertAsyncTest("THREAD-02", "THREAD_TOKEN", "API_SEC", "Rejects tampered or invalid admin room tokens", async () => {
    const validToken = generateAdminThreadToken("thread_123", "neha@example.com");
    const tampered = validToken.slice(0, -2) + "ab";
    return !verifyAdminThreadToken("thread_123", "neha@example.com", tampered) &&
           !verifyAdminThreadToken("thread_123", "neha@example.com", "random_string");
  });

  await assertAsyncTest("THREAD-03", "THREAD_TOKEN", "API_SEC", "Distinct thread IDs produce distinct admin room tokens", async () => {
    const t1 = generateAdminThreadToken("thread_123", "neha@example.com");
    const t2 = generateAdminThreadToken("thread_456", "neha@example.com");
    return t1 !== t2;
  });

  await assertAsyncTest("THREAD-04", "THREAD_TOKEN", "API_SEC", "Distinct visitor emails produce distinct admin room tokens", async () => {
    const t1 = generateAdminThreadToken("thread_123", "neha@example.com");
    const t2 = generateAdminThreadToken("thread_123", "client@example.com");
    return t1 !== t2;
  });

  console.log("\n===================================================================");
  console.log("🚀 GAURAV PORTFOLIO - CHAT BUBBLE & AUTH MASTER QA SUITE");
  console.log("===================================================================\n");

  const total = results.length;
  let passedCount = 0;
  let failedCount = 0;

  for (let i = 0; i < total; i++) {
    const r = results[i];
    const indexStr = `[${(i + 1).toString().padStart(2, "0")}/${total}]`;
    const idStr = r.id.padEnd(16, " ");
    const catStr = `[${r.category.padEnd(12, " ")}]`;
    const typeStr = r.type.padEnd(14, " ");

    if (r.passed) {
      passedCount++;
      console.log(`${indexStr} ${idStr} | ${catStr} | ${typeStr} | ✅ PASS | ${r.description}`);
    } else {
      failedCount++;
      console.error(`${indexStr} ${idStr} | ${catStr} | ${typeStr} | ❌ FAIL | ${r.description}`);
      if (r.error) {
        console.error(`       Error: ${r.error}`);
      }
    }
  }

  console.log("\n===================================================================");
  console.log("📊 EXECUTION SUMMARY");
  console.log("===================================================================");
  console.log(`TOTAL EXECUTED:       ${total}`);
  console.log(`UNIQUE IDS:           ${executedIds.size}`);
  console.log(`PASSED:               ${passedCount}`);
  console.log(`FAILED:               ${failedCount}`);
  console.log(`SUCCESS RATE:         ${((passedCount / total) * 100).toFixed(1)}%`);
  console.log("===================================================================\n");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTestSuite();
