/**
 * Organic End-to-End Live Chat & Magic Room Test Suite
 * Directly invokes the Next.js API Route Handlers using authentic NextRequest objects,
 * verifying all authentication, database persistence, turn-locking, magic tokens, and multi-message lifecycles.
 */

import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { NextRequest } from "next/server";
import { signVisitorSession, LIVE_CHAT_SESSION_MAX_AGE_SECONDS, LIVE_CHAT_COOKIE_NAME } from "../lib/assistant/auth";
import { liveChatSessionsRepository } from "../lib/dal/repositories/live-chat-sessions.repository";
import { GET as getMessagesHandler, POST as postMessagesHandler } from "../app/api/assistant/chat/messages/route";
import { GET as getAdminRoomHandler } from "../app/api/assistant/chat/admin/room/route";
import { POST as postAdminReplyHandler } from "../app/api/assistant/chat/admin/reply/route";

interface TestStepResult {
  step: string;
  passed: boolean;
  details: string;
  error?: string;
}

const stepResults: TestStepResult[] = [];

function recordStep(step: string, passed: boolean, details: string, error?: string) {
  stepResults.push({ step, passed, details, error });
  const icon = passed ? "✅" : "❌";
  console.log(`${icon} [${step}] - ${details}`);
  if (error) {
    console.error(`   Error details: ${error}`);
  }
}

async function runOrganicTestSuite() {
  console.log("\n===================================================================");
  console.log("🌐 ORGANIC END-TO-END LIVE CHAT & MAGIC ROOM TEST SUITE");
  console.log("🎯 Mode: Direct Next.js Server Route Handlers Execution");
  console.log("===================================================================\n");

  const testEmail = `neha.organic.${Date.now()}@example.com`;
  const testName = "Neha Mali";
  const sessionId = `sess_organic_${Date.now()}`;
  const now = Date.now();
  const expiresAt = now + LIVE_CHAT_SESSION_MAX_AGE_SECONDS * 1000;

  // 1. Register authentic session in Firestore registry (identical to OTP pass)
  await liveChatSessionsRepository.createSession({
    sessionId,
    email: testEmail,
    name: testName,
    clientIp: "127.0.0.1",
    status: "ACTIVE",
    createdAt: now,
    expiresAt,
  });

  // 2. Generate signed HMAC-SHA256 session token
  const sessionToken = signVisitorSession({
    sessionId,
    email: testEmail,
    name: testName,
    clientIp: "127.0.0.1",
    createdAt: now,
    expiresAt,
  });

  const cookieHeader = `${LIVE_CHAT_COOKIE_NAME}=${sessionToken}`;
  let activeThreadId = "";
  let activeAdminToken = "";

  // -----------------------------------------------------------------
  // STEP 1: Fetch Initial Blank/Empty Conversation
  // -----------------------------------------------------------------
  try {
    const req = new NextRequest("http://localhost:3000/api/assistant/chat/messages", {
      method: "GET",
      headers: {
        Cookie: cookieHeader,
        "x-requested-with": "XMLHttpRequest",
      },
    });

    const res = await getMessagesHandler(req);
    const data = await res.json();
    const passed = res.status === 200 && data.ok === true && data.isVisitorLocked === false;
    activeThreadId = data.thread?.id || "";
    activeAdminToken = data.thread?.adminToken || "";

    recordStep(
      "STEP-01-INITIAL_FETCH",
      passed,
      `Initial conversation initialized. Thread ID: ${activeThreadId}, Locked: ${data.isVisitorLocked}`
    );
  } catch (err: unknown) {
    const error = err as Error;
    recordStep("STEP-01-INITIAL_FETCH", false, "Failed initial GET /messages", error.message);
  }

  // -----------------------------------------------------------------
  // STEP 2: Neha Sends First Message
  // -----------------------------------------------------------------
  const visitorMsg1 = "Hi Gaurav, I am testing the live chat system to make sure messages are delivered.";
  try {
    const req = new NextRequest("http://localhost:3000/api/assistant/chat/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookieHeader,
        Origin: "http://localhost:3000",
        "x-requested-with": "XMLHttpRequest",
      },
      body: JSON.stringify({ body: visitorMsg1 }),
    });

    const res = await postMessagesHandler(req);
    const data = await res.json();
    const passed = res.status === 200 && data.ok === true && data.isVisitorLocked === true;
    if (data.thread?.adminToken) activeAdminToken = data.thread.adminToken;
    if (data.thread?.id) activeThreadId = data.thread.id;

    recordStep(
      "STEP-02-VISITOR_SEND_1",
      passed,
      `Neha sent message 1. Message recorded. isVisitorLocked: ${data.isVisitorLocked}`
    );
  } catch (err: unknown) {
    const error = err as Error;
    recordStep("STEP-02-VISITOR_SEND_1", false, "Failed visitor message 1", error.message);
  }

  // -----------------------------------------------------------------
  // STEP 3: Anti-Spam / Turn-Lock Invariant (Neha cannot send 2nd message while locked)
  // -----------------------------------------------------------------
  try {
    const req = new NextRequest("http://localhost:3000/api/assistant/chat/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookieHeader,
        Origin: "http://localhost:3000",
        "x-requested-with": "XMLHttpRequest",
      },
      body: JSON.stringify({ body: "Trying to send second message while awaiting reply..." }),
    });

    const res = await postMessagesHandler(req);
    const data = await res.json();
    const passed = res.status === 429 && data.ok === false && data.code === "AWAITING_REPLY";

    recordStep(
      "STEP-03-TURN_LOCK_REJECTION",
      passed,
      `Turn lock strictly enforced: HTTP 429 returned as expected when visitor attempts to double-send.`
    );
  } catch (err: unknown) {
    const error = err as Error;
    recordStep("STEP-03-TURN_LOCK_REJECTION", false, "Failed turn lock test", error.message);
  }

  // -----------------------------------------------------------------
  // STEP 4: Verify Visitor Transcript & Lock Persistence
  // -----------------------------------------------------------------
  try {
    const req = new NextRequest("http://localhost:3000/api/assistant/chat/messages", {
      method: "GET",
      headers: {
        Cookie: cookieHeader,
        "x-requested-with": "XMLHttpRequest",
      },
    });

    const res = await getMessagesHandler(req);
    const data = await res.json();
    const passed =
      res.status === 200 &&
      data.ok === true &&
      data.isVisitorLocked === true &&
      Array.isArray(data.messages) &&
      data.messages.some((m: { text: string }) => m.text === visitorMsg1);

    recordStep(
      "STEP-04-VISITOR_PERSISTENCE",
      passed,
      `Visitor transcript persisted in Firestore. Total messages: ${data.messages?.length || 0}, Locked: ${data.isVisitorLocked}`
    );
  } catch (err: unknown) {
    const error = err as Error;
    recordStep("STEP-04-VISITOR_PERSISTENCE", false, "Failed visitor persistence GET", error.message);
  }

  // -----------------------------------------------------------------
  // STEP 5: Gaurav Opens Admin Magic Room with Valid Token
  // -----------------------------------------------------------------
  try {
    const roomUrl = `http://localhost:3000/api/assistant/chat/admin/room?threadId=${encodeURIComponent(activeThreadId)}&token=${encodeURIComponent(activeAdminToken)}`;
    const req = new NextRequest(roomUrl, { method: "GET" });
    const res = await getAdminRoomHandler(req);
    const data = await res.json();

    const passed =
      res.status === 200 &&
      data.ok === true &&
      data.thread?.id === activeThreadId &&
      Array.isArray(data.messages) &&
      data.messages.some((m: { text: string }) => m.text === visitorMsg1);

    recordStep(
      "STEP-05-ADMIN_ROOM_AUTHENTICATION",
      passed,
      `Admin magic link validated. Neha's message visible in admin room transcript (${data.messages?.length} messages).`
    );
  } catch (err: unknown) {
    const error = err as Error;
    recordStep("STEP-05-ADMIN_ROOM_AUTHENTICATION", false, "Failed admin room GET", error.message);
  }

  // -----------------------------------------------------------------
  // STEP 6: Admin Room Security (Rejects Invalid/Tampered Token)
  // -----------------------------------------------------------------
  try {
    const badUrl = `http://localhost:3000/api/assistant/chat/admin/room?threadId=${encodeURIComponent(activeThreadId)}&token=invalid_forged_token`;
    const req = new NextRequest(badUrl, { method: "GET" });
    const res = await getAdminRoomHandler(req);
    const data = await res.json();

    const passed = res.status === 403 && data.ok === false;

    recordStep(
      "STEP-06-ADMIN_ROOM_TAMPER_DEFENSE",
      passed,
      `Tampered token correctly blocked with HTTP 403 Forbidden.`
    );
  } catch (err: unknown) {
    const error = err as Error;
    recordStep("STEP-06-ADMIN_ROOM_TAMPER_DEFENSE", false, "Failed tamper defense test", error.message);
  }

  // -----------------------------------------------------------------
  // STEP 7: Gaurav Sends Reply from Admin Room
  // -----------------------------------------------------------------
  const gauravReply1 = "Hello Neha! Thanks for reaching out. Yes, I received your message loud and clear.";
  try {
    const req = new NextRequest("http://localhost:3000/api/assistant/chat/admin/reply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        threadId: activeThreadId,
        token: activeAdminToken,
        message: gauravReply1,
      }),
    });

    const res = await postAdminReplyHandler(req);
    const data = await res.json();
    const passed =
      res.status === 200 &&
      data.ok === true &&
      data.thread?.status === "REPLIED" &&
      data.thread?.isVisitorLocked === false;

    recordStep(
      "STEP-07-GAURAV_REPLY_1",
      passed,
      `Gaurav sent reply. Thread status: ${data.thread?.status}, Visitor Unlocked: ${!data.thread?.isVisitorLocked}`
    );
  } catch (err: unknown) {
    const error = err as Error;
    recordStep("STEP-07-GAURAV_REPLY_1", false, "Failed Gaurav reply 1", error.message);
  }

  // -----------------------------------------------------------------
  // STEP 8: Gaurav Multi-Message Freedom (Gaurav sends 2nd consecutive reply)
  // -----------------------------------------------------------------
  const gauravReply2 = "Feel free to share the project timeline and key requirements.";
  try {
    const req = new NextRequest("http://localhost:3000/api/assistant/chat/admin/reply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        threadId: activeThreadId,
        token: activeAdminToken,
        message: gauravReply2,
      }),
    });

    const res = await postAdminReplyHandler(req);
    const data = await res.json();
    const passed = res.status === 200 && data.ok === true;

    recordStep(
      "STEP-08-GAURAV_MULTI_REPLY",
      passed,
      `Gaurav multi-message freedom verified: Sent 2nd consecutive reply without restriction.`
    );
  } catch (err: unknown) {
    const error = err as Error;
    recordStep("STEP-08-GAURAV_MULTI_REPLY", false, "Failed Gaurav multi-reply", error.message);
  }

  // -----------------------------------------------------------------
  // STEP 9: Visitor Receives Real-time Updates & Unlocked Input
  // -----------------------------------------------------------------
  try {
    const req = new NextRequest("http://localhost:3000/api/assistant/chat/messages", {
      method: "GET",
      headers: {
        Cookie: cookieHeader,
        "x-requested-with": "XMLHttpRequest",
      },
    });

    const res = await getMessagesHandler(req);
    const data = await res.json();
    const hasVisitorMsg = data.messages?.some((m: { text: string }) => m.text === visitorMsg1);
    const hasGauravReply1 = data.messages?.some((m: { text: string }) => m.text === gauravReply1);
    const hasGauravReply2 = data.messages?.some((m: { text: string }) => m.text === gauravReply2);

    const passed =
      res.status === 200 &&
      data.ok === true &&
      data.isVisitorLocked === false &&
      hasVisitorMsg &&
      hasGauravReply1 &&
      hasGauravReply2;

    recordStep(
      "STEP-09-VISITOR_SYNC_AND_UNLOCK",
      passed,
      `Visitor synced all 3 messages. isVisitorLocked: ${data.isVisitorLocked} (Input unlocked for Neha's next turn).`
    );
  } catch (err: unknown) {
    const error = err as Error;
    recordStep("STEP-09-VISITOR_SYNC_AND_UNLOCK", false, "Failed visitor sync & unlock", error.message);
  }

  // -----------------------------------------------------------------
  // STEP 10: Neha Can Now Reply Back (2nd Turn)
  // -----------------------------------------------------------------
  const visitorMsg2 = "Awesome! The project timeline is 3 weeks starting next Monday.";
  try {
    const req = new NextRequest("http://localhost:3000/api/assistant/chat/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookieHeader,
        Origin: "http://localhost:3000",
        "x-requested-with": "XMLHttpRequest",
      },
      body: JSON.stringify({ body: visitorMsg2 }),
    });

    const res = await postMessagesHandler(req);
    const data = await res.json();
    const passed = res.status === 200 && data.ok === true && data.isVisitorLocked === true;

    recordStep(
      "STEP-10-VISITOR_SEND_2",
      passed,
      `Neha replied back successfully on turn 2. isVisitorLocked re-engaged: ${data.isVisitorLocked}`
    );
  } catch (err: unknown) {
    const error = err as Error;
    recordStep("STEP-10-VISITOR_SEND_2", false, "Failed visitor turn 2 send", error.message);
  }

  // -----------------------------------------------------------------
  // Summary Matrix
  // -----------------------------------------------------------------
  console.log("\n===================================================================");
  console.log("📊 ORGANIC E2E TEST SUMMARY");
  console.log("===================================================================");
  const total = stepResults.length;
  const passedCount = stepResults.filter((s) => s.passed).length;
  const failedCount = total - passedCount;

  console.log(`TOTAL STEPS:     ${total}`);
  console.log(`PASSED:          ${passedCount}`);
  console.log(`FAILED:          ${failedCount}`);
  console.log(`SUCCESS RATE:    ${((passedCount / total) * 100).toFixed(1)}%`);
  console.log("===================================================================\n");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runOrganicTestSuite();
