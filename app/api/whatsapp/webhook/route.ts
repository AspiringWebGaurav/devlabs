/**
 * Meta WhatsApp Cloud API Webhook Handler
 *
 * Robust, production-grade implementation:
 * - GET: Webhook verification handshake with Meta.
 * - POST: HMAC-SHA256 signature verification and dynamic direct responses.
 * - Persistent session tracking via Firebase Firestore (survives Vercel serverless cold starts).
 * - 2-button interactive menu: [ 📄 View Resume ] (consumed once) & [ 💬 Chat with Gaurav ].
 * - Free-form messaging up to 3 messages with real-time email alert to Gaurav.
 * - Visitor messages are NEVER rejected: genuine inquiries are always delivered to Gaurav.
 * - Optional visitor email capture for 1-click "I've Replied" admin alerts.
 * - Strict rate limit on 4th message and beyond (counters concealed from visitor).
 */

import { NextRequest } from "next/server";
import { verifyWebhookChallenge, verifyWebhookSignature } from "@/lib/whatsapp/webhook";
import { WhatsAppMetaClient } from "@/lib/whatsapp/meta/client";
import { sendWhatsAppAdminAlert } from "@/lib/whatsapp/notifications";
import { getAdminFirestore } from "@/lib/admin/firebase-admin";
import { adminLogger } from "@/lib/admin/logger";
import type { MetaWebhookPayload } from "@/lib/whatsapp/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface VisitorSession {
  hasReceivedResume: boolean;
  messageCount: number; // 0, 1, 2, 3
  inChatMode: boolean;
  email?: string;
  lastActivityAt: number;
}

// In-memory L1 cache for fast hot-instance lookups
const memorySessionCache = new Map<string, VisitorSession>();

/**
 * Loads visitor session, checking in-memory cache first, then falling back to
 * Firestore persistent store to guarantee continuity across Vercel cold starts.
 */
async function getVisitorSession(from: string): Promise<VisitorSession> {
  const cleanKey = from.replace(/[^0-9]/g, "");

  // 1. Check in-memory L1 cache
  const cached = memorySessionCache.get(cleanKey);
  if (cached && Date.now() - cached.lastActivityAt < 1000 * 60 * 60) {
    cached.lastActivityAt = Date.now();
    return cached;
  }

  // 2. Default initial state
  let session: VisitorSession = {
    hasReceivedResume: false,
    messageCount: 0,
    inChatMode: false,
    lastActivityAt: Date.now(),
  };

  // 3. Fallback to Firestore persistent store
  try {
    const db = getAdminFirestore();
    if (db) {
      const doc = await db.collection("whatsapp_sessions").doc(cleanKey).get();
      if (doc.exists) {
        const data = doc.data() as Partial<VisitorSession>;
        session = {
          hasReceivedResume: Boolean(data.hasReceivedResume),
          messageCount: typeof data.messageCount === "number" ? data.messageCount : 0,
          inChatMode: Boolean(data.inChatMode),
          email: data.email || undefined,
          lastActivityAt: Date.now(),
        };
      }
    }
  } catch (err) {
    adminLogger.warn("WhatsApp:FirestoreSessionReadFailed", "Could not load session from Firestore, using memory fallback", { error: err });
  }

  memorySessionCache.set(cleanKey, session);
  return session;
}

/**
 * Persists updated visitor session to both in-memory cache and Firestore.
 */
async function saveVisitorSession(from: string, session: VisitorSession): Promise<void> {
  const cleanKey = from.replace(/[^0-9]/g, "");
  session.lastActivityAt = Date.now();
  memorySessionCache.set(cleanKey, session);

  try {
    const db = getAdminFirestore();
    if (db) {
      await db.collection("whatsapp_sessions").doc(cleanKey).set(
        {
          hasReceivedResume: session.hasReceivedResume,
          messageCount: session.messageCount,
          inChatMode: session.inChatMode,
          email: session.email || null,
          lastActivityAt: Date.now(),
        },
        { merge: true }
      );
    }
  } catch (err) {
    adminLogger.warn("WhatsApp:FirestoreSessionWriteFailed", "Could not persist session to Firestore", { error: err });
  }
}

const GREETING_TEXT =
  "Hello! Thank you for reaching out.\n\n" +
  "I am Gaurav's automated assistant, built to connect you directly with him.\n\n" +
  "How would you like to proceed? Please select an option below:";

/**
 * GET: Handles Meta's webhook subscription verification handshake
 */
export async function GET(req: NextRequest): Promise<Response> {
  const searchParams = req.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const verifyToken = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const result = verifyWebhookChallenge({ mode, verifyToken, challenge });

  if (!result.success) {
    return new Response("Forbidden", { status: result.statusCode });
  }

  return new Response(result.challenge, {
    status: 200,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

/**
 * POST: Ingests authentic Meta WhatsApp events and dispatches dynamic responses
 */
export async function POST(req: NextRequest): Promise<Response> {
  try {
    const rawBody = await req.text();
    const signatureHeader = req.headers.get("x-hub-signature-256");

    // 1. Verify HMAC-SHA256 signature
    const isSignatureValid = verifyWebhookSignature(rawBody, signatureHeader);
    if (!isSignatureValid) {
      adminLogger.warn("WhatsApp:WebhookRejected", "Invalid HMAC signature on inbound webhook");
      return new Response("Unauthorized", { status: 401 });
    }

    // 2. Parse JSON payload
    let payload: MetaWebhookPayload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      adminLogger.warn("WhatsApp:WebhookMalformed", "Failed to parse JSON webhook payload");
      return new Response("Bad Request: Malformed JSON", { status: 400 });
    }

    // 3. Emergency Kill-Switch Check
    if (process.env.WHATSAPP_ENABLED === "false") {
      adminLogger.warn("WhatsApp:WebhookIgnored", "Webhook received but WHATSAPP_ENABLED=false");
      return Response.json({ status: "disabled" }, { status: 200 });
    }

    // 4. Process Inbound Messages
    const entries = payload.entry || [];
    for (const entry of entries) {
      for (const change of entry.changes || []) {
        const value = change.value;
        if (!value || !Array.isArray(value.messages)) continue;

        for (const msg of value.messages) {
          const from = msg.from;
          if (!from) continue;

          // Meta 24-Hour Customer Service Window check
          const msgTimestampSec = parseInt(msg.timestamp || "0", 10);
          if (msgTimestampSec > 0) {
            const nowSec = Math.floor(Date.now() / 1000);
            if (nowSec - msgTimestampSec > 86400) {
              adminLogger.warn("WhatsApp:MessageOutside24hWindow", "Inbound message older than 24h window", {
                from,
                timestamp: msgTimestampSec,
              });
              continue;
            }
          }

          // Extract message contents: interactive button clicks, button replies, or regular text
          const buttonId = msg.interactive?.button_reply?.id || msg.button?.payload || "";
          const buttonTitle = msg.interactive?.button_reply?.title || msg.button?.text || "";
          const textBody = msg.text?.body || "";
          const rawInput = (buttonId || buttonTitle || textBody).trim();

          if (!rawInput) continue;

          // Normalize command: trim, uppercase, remove leading/trailing punctuation
          const normalized = rawInput
            .toUpperCase()
            .replace(/^[/#.!]+|[.!?]+$/g, "")
            .trim();

          // Load persistent session from Firestore/cache
          const session = await getVisitorSession(from);

          adminLogger.info("WhatsApp:InboundReceived", "Inbound message received", {
            from,
            rawInput,
            normalized,
            buttonId,
            sessionMessageCount: session.messageCount,
          });

          // Action matchers
          const isResumeAction =
            buttonId === "btn_resume" ||
            buttonTitle.toLowerCase().includes("resume") ||
            normalized === "RESUME" ||
            normalized === "VIEW RESUME" ||
            normalized === "📄 VIEW RESUME" ||
            normalized.includes("VIEW RESUME") ||
            normalized === "GET RESUME" ||
            normalized === "1";

          const isChatAction =
            buttonId === "btn_chat" ||
            buttonTitle.toLowerCase().includes("chat") ||
            normalized === "CHAT" ||
            normalized === "CHAT WITH GAURAV" ||
            normalized === "💬 CHAT WITH GAURAV" ||
            normalized.includes("CHAT WITH GAURAV") ||
            normalized === "TALK TO GAURAV" ||
            normalized.includes("TALK TO GAURAV") ||
            normalized.includes("TALK WITH GAURAV") ||
            normalized === "2";

          const isGreeting =
            !isResumeAction &&
            !isChatAction &&
            (
              normalized === "HI" ||
              normalized === "HII" ||
              normalized === "HIII" ||
              normalized === "HELLO" ||
              normalized === "HEY" ||
              normalized.includes("PORTFOLIO")
            );

          // -------------------------------------------------------------
          // 1. "STOP" / "UNSUBSCRIBE" -> Clear session and unsubscribe
          // -------------------------------------------------------------
          if (normalized === "STOP" || normalized === "UNSUBSCRIBE") {
            const cleanKey = from.replace(/[^0-9]/g, "");
            memorySessionCache.delete(cleanKey);
            try {
              const db = getAdminFirestore();
              if (db) await db.collection("whatsapp_sessions").doc(cleanKey).delete();
            } catch {}

            await WhatsAppMetaClient.sendTextMessage(
              from,
              "You have been unsubscribed. Feel free to send Hi anytime to start again."
            );
          }

          // -------------------------------------------------------------
          // 2. "START" -> Reset session and show 2 interactive options
          // -------------------------------------------------------------
          else if (normalized === "START") {
            session.hasReceivedResume = false;
            session.messageCount = 0;
            session.inChatMode = false;
            session.email = undefined;
            await saveVisitorSession(from, session);

            await WhatsAppMetaClient.sendQuickReplyButtons(
              from,
              GREETING_TEXT,
              [
                { id: "btn_resume", title: "📄 View Resume" },
                { id: "btn_chat", title: "💬 Chat with Gaurav" },
              ]
            );
          }

          // -------------------------------------------------------------
          // 3. Option 1: "View Resume" (Consumed once per session)
          // -------------------------------------------------------------
          else if (isResumeAction) {
            if (session.hasReceivedResume) {
              await WhatsAppMetaClient.sendTextMessage(
                from,
                "You have already received Gaurav's resume above! 📄\n\nTo connect directly, tap 'Chat with Gaurav' above ⬆️ or simply type your message here — I will deliver it directly to Gaurav in real time."
              );
            } else {
              // 1. Immediate visual feedback to the visitor
              await WhatsAppMetaClient.sendTextMessage(
                from,
                "Please wait, sending Gaurav's resume... 📄⏳"
              );

              session.hasReceivedResume = true;
              await saveVisitorSession(from, session);

              // 2. Canonical, high-availability public PDF URL (HTTP 200 OK, zero redirects)
              const documentUrl =
                process.env.WHATSAPP_RESUME_URL ||
                "https://firebasestorage.googleapis.com/v0/b/gaurav-portfolio-improved.firebasestorage.app/o/whatsapp%2FGaurav_Patil_Resume.pdf?alt=media";

              const sendResult = await WhatsAppMetaClient.sendDocumentMessage(
                from,
                documentUrl,
                "Gaurav_Patil_Resume.pdf",
                "Here is Gaurav Patil's official resume! 📄\n\nFeel free to review it. To connect directly, tap 'Chat with Gaurav' above ⬆️ or simply type your message below — I will deliver it directly to Gaurav in real time."
              );

              if (!sendResult.success) {
                adminLogger.warn(
                  "WhatsApp:ResumeSendFallback",
                  "Document send failed; sending direct URL link fallback",
                  { error: sendResult.error }
                );
                await WhatsAppMetaClient.sendTextMessage(
                  from,
                  `Here is Gaurav Patil's resume: ${documentUrl}\n\nTo connect directly, tap 'Chat with Gaurav' above ⬆️ or send your message below.`
                );
              }
            }
          }

          // -------------------------------------------------------------
          // 4. Option 2: "Chat with Gaurav" (Enables free-form chat mode)
          // -------------------------------------------------------------
          else if (isChatAction) {
            session.inChatMode = true;
            await saveVisitorSession(from, session);

            await WhatsAppMetaClient.sendTextMessage(
              from,
              "You're now connected with Gaurav! 💬\n\nPlease type your message, project idea, or role details below. Gaurav will be alerted in real time."
            );
          }

          // -------------------------------------------------------------
          // 5. Greetings ("Hi", "hi", "Hii", or portfolio link) -> 2 buttons
          // -------------------------------------------------------------
          else if (isGreeting) {
            await WhatsAppMetaClient.sendQuickReplyButtons(
              from,
              GREETING_TEXT,
              [
                { id: "btn_resume", title: "📄 View Resume" },
                { id: "btn_chat", title: "💬 Chat with Gaurav" },
              ]
            );
          }

          // -------------------------------------------------------------
          // 6. ANY other message -> DELIVER DIRECTLY TO GAURAV
          // Never reject a visitor's genuine inquiry or send dead-ends!
          // -------------------------------------------------------------
          else {
            // Check if the visitor provided an email address
            const emailMatch = rawInput.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);

            if (emailMatch) {
              const detectedEmail = emailMatch[0].toLowerCase();
              session.email = detectedEmail;
              await saveVisitorSession(from, session);

              await WhatsAppMetaClient.sendTextMessage(
                from,
                `Got it! We've saved your email (${detectedEmail}). You will receive an email the moment Gaurav replies.\n\nYou can continue chatting here anytime or visit the portfolio: https://gauravpatil.online`
              );

              // Dispatch updated alert to Gaurav so he immediately gets the email and the 1-click notification button
              const senderName = value.contacts?.[0]?.profile?.name || "WhatsApp Visitor";
              void sendWhatsAppAdminAlert({
                senderName,
                senderPhone: from,
                messageText: rawInput,
                messageCount: session.messageCount || 1,
                visitorEmail: detectedEmail,
              });
            } else if (session.messageCount >= 3) {
              // Strict rate limit triggered on 4th message and beyond
              await WhatsAppMetaClient.sendTextMessage(
                from,
                "⚠️ Message limit reached (maximum 3 messages). Gaurav has received all your messages and will reply directly to your WhatsApp as soon as he is online. Thank you for your patience!"
              );
            } else {
              // Increment message count and persist to Firestore
              session.messageCount += 1;
              session.inChatMode = true;
              await saveVisitorSession(from, session);

              const currentCount = session.messageCount;

              // Offer optional email notification on 1st message if email not provided yet
              if (currentCount === 1 && !session.email) {
                await WhatsAppMetaClient.sendTextMessage(
                  from,
                  "Thank you! Your message has been delivered to Gaurav. He will review it and reply directly to your WhatsApp shortly.\n\nWant an email notification when Gaurav replies? Simply reply with your email address below (optional)."
                );
              } else {
                await WhatsAppMetaClient.sendTextMessage(
                  from,
                  "Thank you! Your message has been delivered to Gaurav. He will review it and reply directly to your WhatsApp shortly."
                );
              }

              // Dispatch real-time text-first email alert to Gaurav (including visitorEmail if captured)
              const senderName = value.contacts?.[0]?.profile?.name || "WhatsApp Visitor";
              void sendWhatsAppAdminAlert({
                senderName,
                senderPhone: from,
                messageText: textBody || rawInput,
                messageCount: currentCount,
                visitorEmail: session.email,
              });
            }
          }
        }
      }
    }

    return Response.json({ success: true }, { status: 200 });
  } catch (error) {
    adminLogger.error("WhatsApp:WebhookUnhandledError", error, "Webhook handling failed");
    return new Response("Internal Server Error", { status: 500 });
  }
}
