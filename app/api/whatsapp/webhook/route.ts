/**
 * Meta WhatsApp Cloud API Webhook Handler
 *
 * Clean, baseline implementation:
 * - GET: Webhook verification handshake with Meta.
 * - POST: HMAC-SHA256 signature verification and direct message replies.
 * - In-memory session tracking with zero Redis, zero DB, and zero circuit breakers.
 * - 2-button interactive menu: [ 📄 View Resume ] (consumed once) & [ 💬 Chat with Gaurav ].
 * - Free-form messaging up to 3 messages with real-time email alert to Gaurav.
 * - Optional visitor email capture for "I've Replied" notifications.
 * - Strict rate limit on 4th message and beyond (counters concealed from visitor).
 */

import { NextRequest } from "next/server";
import { verifyWebhookChallenge, verifyWebhookSignature } from "@/lib/whatsapp/webhook";
import { WhatsAppMetaClient } from "@/lib/whatsapp/meta/client";
import { sendWhatsAppAdminAlert } from "@/lib/whatsapp/notifications";
import { adminLogger } from "@/lib/admin/logger";
import type { MetaWebhookPayload } from "@/lib/whatsapp/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Ephemeral in-memory visitor session tracker (per process instance, zero backend/database)
interface VisitorSession {
  hasReceivedResume: boolean;
  messageCount: number; // 0, 1, 2, 3
  inChatMode: boolean;
  email?: string;
  lastActivityAt: number;
}

const visitorSessions = new Map<string, VisitorSession>();

function getVisitorSession(from: string): VisitorSession {
  let session = visitorSessions.get(from);
  if (!session) {
    session = {
      hasReceivedResume: false,
      messageCount: 0,
      inChatMode: false,
      lastActivityAt: Date.now(),
    };
    visitorSessions.set(from, session);
  }
  session.lastActivityAt = Date.now();

  // Housekeeping: purge inactive sessions older than 24h if map exceeds 500 entries
  if (visitorSessions.size > 500) {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    for (const [key, s] of visitorSessions.entries()) {
      if (s.lastActivityAt < cutoff) {
        visitorSessions.delete(key);
      }
    }
  }

  return session;
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

          const session = getVisitorSession(from);

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
              normalized.includes("PORTFOLIO") ||
              (!session.inChatMode &&
                (normalized.startsWith("HI ") ||
                  normalized.startsWith("HELLO ") ||
                  normalized.startsWith("HEY ")))
            );

          // -------------------------------------------------------------
          // 1. "STOP" / "UNSUBSCRIBE" -> Clear session and unsubscribe
          // -------------------------------------------------------------
          if (normalized === "STOP" || normalized === "UNSUBSCRIBE") {
            visitorSessions.delete(from);
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
          // 6. Free-form text / Chat messages & Email capture
          // -------------------------------------------------------------
          else {
            const isEngaged =
              session.inChatMode ||
              session.messageCount > 0 ||
              session.hasReceivedResume;

            if (isEngaged) {
              // Check if the message contains an email address (visitor providing contact email)
              const emailMatch = rawInput.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);

              if (emailMatch) {
                const detectedEmail = emailMatch[0].toLowerCase();
                session.email = detectedEmail;

                await WhatsAppMetaClient.sendTextMessage(
                  from,
                  `Got it! We've saved your email (${detectedEmail}). You will receive an email the moment Gaurav replies.\n\nYou can continue chatting here anytime or visit the portfolio: https://gauravpatil.online`
                );

                // Dispatch updated alert to Gaurav so he gets the email and the 1-click notification button
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
                session.messageCount += 1;
                session.inChatMode = true;
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
            } else {
              // Unrecognized message before greeting or selecting an option
              await WhatsAppMetaClient.sendTextMessage(
                from,
                'Hi there! Please send "Hi" to start.'
              );
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
