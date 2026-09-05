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
import { createExportSignature } from "@/lib/whatsapp/export/generator";
import { getWhatsAppBaseUrl } from "@/lib/whatsapp/config/whatsapp.config";
import { sanitizeText } from "@/lib/whatsapp/security/sanitizer";
import type { MetaWebhookPayload } from "@/lib/whatsapp/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface VisitorSession {
  hasReceivedResume: boolean;
  messageCount: number; // 0, 1, 2, 3
  inChatMode: boolean;
  chatModeActivatedAt?: number;
  email?: string;
  lastActivityAt: number;
}

// Bounded L1 Cache with LRU eviction and TTL cleanup to prevent heap memory leaks
const MAX_SESSION_CACHE_SIZE = 500;
const SESSION_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const memorySessionCache = new Map<string, VisitorSession>();

function pruneSessionCache(): void {
  const now = Date.now();
  // 1. Evict expired entries
  for (const [key, session] of memorySessionCache.entries()) {
    if (now - session.lastActivityAt > SESSION_CACHE_TTL_MS) {
      memorySessionCache.delete(key);
    }
  }
  // 2. Enforce hard size ceiling (evict oldest entries if exceeded)
  if (memorySessionCache.size > MAX_SESSION_CACHE_SIZE) {
    const keysToDelete = Array.from(memorySessionCache.keys()).slice(
      0,
      memorySessionCache.size - MAX_SESSION_CACHE_SIZE
    );
    for (const k of keysToDelete) {
      memorySessionCache.delete(k);
    }
  }
}

function setCachedSession(cleanKey: string, session: VisitorSession): void {
  memorySessionCache.delete(cleanKey); // Refresh insertion order for LRU
  memorySessionCache.set(cleanKey, session);
  if (memorySessionCache.size > MAX_SESSION_CACHE_SIZE) {
    pruneSessionCache();
  }
}

// Sliding-window deduplication store for Meta msg.id (prevents retry double-counting & replay attacks)
const MAX_DEDUP_CACHE_SIZE = 2000;
const DEDUP_TTL_MS = 15 * 60 * 1000; // 15 minutes
const processedMessageIds = new Map<string, number>();

function isDuplicateMessage(msgId: string): boolean {
  if (!msgId) return false;
  const processedAt = processedMessageIds.get(msgId);
  if (processedAt && Date.now() - processedAt < DEDUP_TTL_MS) {
    return true;
  }
  return false;
}

function markMessageProcessed(msgId: string): void {
  if (!msgId) return;
  processedMessageIds.set(msgId, Date.now());
  if (processedMessageIds.size > MAX_DEDUP_CACHE_SIZE) {
    const now = Date.now();
    for (const [id, time] of processedMessageIds.entries()) {
      if (now - time > DEDUP_TTL_MS) {
        processedMessageIds.delete(id);
      }
    }
    if (processedMessageIds.size > MAX_DEDUP_CACHE_SIZE) {
      const keysToDrop = Array.from(processedMessageIds.keys()).slice(
        0,
        processedMessageIds.size - MAX_DEDUP_CACHE_SIZE
      );
      for (const k of keysToDrop) {
        processedMessageIds.delete(k);
      }
    }
  }
}

/**
 * Loads visitor session, checking in-memory cache first, then falling back to
 * Firestore persistent store to guarantee continuity across Vercel cold starts.
 */
async function getVisitorSession(from: string): Promise<VisitorSession> {
  const cleanKey = from.replace(/[^0-9]/g, "");

  // 1. Check in-memory L1 cache
  let session = memorySessionCache.get(cleanKey);

  // 2. Fallback to Firestore persistent store if not in memory
  if (!session) {
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
            chatModeActivatedAt: typeof data.chatModeActivatedAt === "number" ? data.chatModeActivatedAt : undefined,
            email: data.email || undefined,
            lastActivityAt: typeof data.lastActivityAt === "number" ? data.lastActivityAt : Date.now(),
          };
        }
      }
    } catch (err) {
      adminLogger.warn("WhatsApp:FirestoreSessionReadFailed", "Could not load session from Firestore, using memory fallback", { error: err });
    }
  }

  // 3. Default initial state if neither memory nor Firestore had it
  if (!session) {
    session = {
      hasReceivedResume: false,
      messageCount: 0,
      inChatMode: false,
      lastActivityAt: Date.now(),
    };
  }

  // 4. Inactivity window: auto-refresh counters if visitor was inactive > 15 minutes (prevents stale sessions)
  const now = Date.now();
  if (session.lastActivityAt > 0 && now - session.lastActivityAt > 15 * 60 * 1000) {
    session.messageCount = 0;
    session.inChatMode = false;
    session.chatModeActivatedAt = undefined;
    session.hasReceivedResume = false;
  }

  // 5. Auto-expire chat connection prompt if older than 3 minutes without sending inquiry
  if (session.inChatMode && session.chatModeActivatedAt && now - session.chatModeActivatedAt > 3 * 60 * 1000) {
    session.inChatMode = false;
    session.chatModeActivatedAt = undefined;
  }

  setCachedSession(cleanKey, session);
  return session;
}

/**
 * Persists updated visitor session to both in-memory cache and Firestore.
 */
async function saveVisitorSession(from: string, session: VisitorSession): Promise<void> {
  const cleanKey = from.replace(/[^0-9]/g, "");
  session.lastActivityAt = Date.now();
  setCachedSession(cleanKey, session);

  try {
    const db = getAdminFirestore();
    if (db) {
      await db.collection("whatsapp_sessions").doc(cleanKey).set(
        {
          hasReceivedResume: session.hasReceivedResume,
          messageCount: session.messageCount,
          inChatMode: session.inChatMode,
          chatModeActivatedAt: session.chatModeActivatedAt || null,
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

/**
 * Appends a message to the visitor's Firestore message log for GDPR export capability.
 */
async function recordChatMessage(
  from: string,
  sender: "visitor" | "assistant",
  text: string
): Promise<void> {
  const cleanPhone = from.replace(/[^0-9]/g, "");
  if (!cleanPhone || !text) return;

  try {
    const db = getAdminFirestore();
    if (db) {
      const now = Date.now();
      const timestampIST = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
      const msgId = `msg_${now}_${Math.random().toString(36).slice(2, 7)}`;

      await db
        .collection("whatsapp_sessions")
        .doc(cleanPhone)
        .collection("messages")
        .doc(msgId)
        .set({
          id: msgId,
          sender,
          text,
          timestamp: timestampIST,
          createdAt: now,
        });
    }
  } catch (err) {
    adminLogger.warn("WhatsApp:RecordMessageFailed", "Could not persist chat message log", { error: err });
  }
}

const GREETING_TEXT =
  "Hello! Thank you for reaching out.\n\n" +
  "I am Gaurav's automated assistant, built to connect you directly with him.\n\n" +
  "How would you like to proceed? Please select an option below:";

// Native WhatsApp interactive button footer (strict <= 60 characters limit by Meta API)
const GREETING_FOOTER = "STOP to clear data • START to reset • /guidelines";

// Standard italicized footer for outbound text messages and document captions
const STANDARD_MESSAGE_FOOTER =
  "\n\n_• Reply STOP to clear data & opt out | START to restart fresh • /guidelines_";

function getGuidelinesText(): string {
  const baseUrl = getWhatsAppBaseUrl();
  return (
    "📜 *GAURAV PATIL PORTFOLIO — CHAT GUIDELINES & RULES*\n\n" +
    "1. 💬 *Direct Inquiries*\n" +
    "   You can send up to 3 direct inquiries. Each message is delivered straight to Gaurav in real time with an instant alert.\n\n" +
    "2. 📄 *Verified Resume*\n" +
    "   Tap \"View Resume\" to receive Gaurav's verified official PDF resume directly in this chat.\n\n" +
    "3. 🛑 *Opt-Out & Opt-In*\n" +
    "   • Type *STOP* to unsubscribe and clear your session anytime.\n" +
    "   • Type *START* or *HI* to restart the conversation anytime.\n\n" +
    "4. ✉️ *Reply Notifications*\n" +
    "   Share your email when prompted to receive an alert the moment Gaurav replies.\n\n" +
    "5. 📜 *Terms & Conditions*\n" +
    "   Read the official WhatsApp Channel Terms:\n" +
    `   👉 ${baseUrl}/terms?focus=whatsapp#whatsapp-terms\n\n` +
    "6. 📦 *Data Portability & Export Rights*\n" +
    "   Under GDPR Art. 20, you have the full right to export your entire chat data (.zip).\n" +
    "   • You can simply type *EXPORT* (or */exportmydata*) — Gaurav has developed this feature with smart typo tolerance so terms like *EXPORT*, *EXPROT*, *MYDATA*, or *DOWNLOAD DATA* work directly.\n" +
    `   • Or visit the portfolio portal: ${baseUrl}/privacy?focus=whatsapp#whatsapp-data-export\n\n` +
    "💡 *Select an option below or send your message to begin:*"
  );
}

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

          // Deduplication: Meta message ID check (prevents replay attacks & retry double-charging)
          const msgId = msg.id;
          if (msgId && isDuplicateMessage(msgId)) {
            adminLogger.info("WhatsApp:DuplicateIgnored", "Ignored retried Meta message ID", { msgId, from });
            continue;
          }
          if (msgId) {
            markMessageProcessed(msgId);
          }

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
          const extracted = (buttonId || buttonTitle || textBody).trim();
          const rawInput = sanitizeText(extracted, 4000);

          if (!rawInput) continue;

          // Record incoming visitor message to Firestore log for data portability archive
          void recordChatMessage(from, "visitor", rawInput);

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

          // Action matchers with smart typo-tolerance
          const isResumeAction =
            buttonId === "btn_resume" ||
            buttonTitle.toLowerCase().includes("resume") ||
            normalized === "RESUME" ||
            normalized === "CV" ||
            normalized === "BIO" ||
            normalized === "VIEW RESUME" ||
            normalized === "📄 VIEW RESUME" ||
            normalized.includes("VIEW RESUME") ||
            normalized === "GET RESUME" ||
            normalized.includes("RESUME") ||
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
            normalized === "CONNECT" ||
            normalized === "2";

          const isGuidelinesAction =
            normalized === "GUIDELINES" ||
            normalized === "GUIDELINE" ||
            normalized === "GUIDLINES" ||
            normalized === "GUIDLINE" ||
            normalized === "GUIDELIN" ||
            normalized === "GUIDELINS" ||
            normalized.includes("GUIDELINE") ||
            normalized.includes("GUIDLINE") ||
            normalized === "RULES" ||
            normalized === "RULE" ||
            normalized === "HELP" ||
            normalized === "INFO" ||
            normalized === "FAQ" ||
            normalized === "GUIDE" ||
            normalized === "COMMANDS" ||
            normalized === "COMMAND" ||
            normalized === "INSTRUCTIONS";

          const isExportAction =
            normalized === "EXPORTMYDATA" ||
            normalized === "EXPORT" ||
            normalized === "MYDATA" ||
            normalized === "EXPORTDATA" ||
            normalized === "DOWNLOADMYDATA" ||
            normalized === "DATAEXPORT" ||
            normalized === "GDPR" ||
            normalized === "EXPROT" ||
            normalized === "EXPRT" ||
            normalized === "EXPOR" ||
            normalized === "EXPOERT" ||
            normalized.includes("EXPORT") ||
            normalized.includes("EXPROT") ||
            normalized.includes("EXPRT") ||
            normalized.includes("MYDATA");

          const isTermsAction =
            normalized === "TERMS" ||
            normalized === "TERM" ||
            normalized === "TOC" ||
            normalized === "TOS" ||
            normalized === "TERMSOFSERVICE" ||
            normalized === "CONDITION" ||
            normalized === "CONDITIONS" ||
            normalized.includes("TERMS");

          const isFreshChatConnection = Boolean(
            session.inChatMode &&
            session.chatModeActivatedAt &&
            Date.now() - session.chatModeActivatedAt < 3 * 60 * 1000
          );

          const isGreeting =
            !isFreshChatConnection &&
            !isResumeAction &&
            !isChatAction &&
            !isGuidelinesAction &&
            !isExportAction &&
            !isTermsAction &&
            (
              normalized === "HI" ||
              normalized === "HII" ||
              normalized === "HIII" ||
              normalized === "HELLO" ||
              normalized === "HEY" ||
              normalized === "HEYY" ||
              normalized === "GREETINGS" ||
              normalized === "MENU" ||
              normalized.includes("PORTFOLIO")
            );

          // -------------------------------------------------------------
          // 1. "STOP" / "UNSUBSCRIBE" -> Clear session and messages (Right to be Forgotten)
          // -------------------------------------------------------------
          const isStopAction =
            normalized === "STOP" ||
            normalized === "UNSUBSCRIBE" ||
            normalized === "STOP CHAT" ||
            normalized === "CLEAR DATA" ||
            normalized === "DELETE MY DATA" ||
            normalized === "ERASE DATA" ||
            normalized === "ERASE";

          const isStartAction =
            normalized === "START" ||
            normalized === "CLEAR" ||
            normalized === "RESET" ||
            normalized === "RESTART" ||
            normalized === "START OVER" ||
            normalized === "START AGAIN" ||
            normalized === "BEGIN";

          if (isStopAction) {
            const cleanKey = from.replace(/[^0-9]/g, "");
            memorySessionCache.delete(cleanKey);
            try {
              const db = getAdminFirestore();
              if (db) {
                const msgsSnap = await db.collection("whatsapp_sessions").doc(cleanKey).collection("messages").get();
                const batch = db.batch();
                msgsSnap.docs.forEach((d) => batch.delete(d.ref));
                batch.delete(db.collection("whatsapp_sessions").doc(cleanKey));
                await batch.commit();
              }
            } catch {}

            const stopReply =
              "You have been unsubscribed and your session and data have been cleared. Reply START or HI anytime to begin again.";
            await WhatsAppMetaClient.sendTextMessage(from, stopReply);
            void recordChatMessage(from, "assistant", stopReply);
          }

          // -------------------------------------------------------------
          // 2. "START" / "CLEAR" / "RESET" -> Reset session and show fresh greeting
          // -------------------------------------------------------------
          else if (isStartAction) {
            session.hasReceivedResume = false;
            session.messageCount = 0;
            session.inChatMode = false;
            session.chatModeActivatedAt = undefined;
            session.email = undefined;
            await saveVisitorSession(from, session);

            await WhatsAppMetaClient.sendQuickReplyButtons(
              from,
              GREETING_TEXT,
              [
                { id: "btn_resume", title: "📄 View Resume" },
                { id: "btn_chat", title: "💬 Chat with Gaurav" },
              ],
              GREETING_FOOTER
            );
            void recordChatMessage(from, "assistant", GREETING_TEXT);
          }

          // -------------------------------------------------------------
          // 3. /exportmydata -> Two-stage data export archive generation
          // -------------------------------------------------------------
          else if (isExportAction) {
            // Stage 1: Immediate visual feedback
            const waitMsg = "Please wait, generating your secure data export archive... 📦⏳";
            await WhatsAppMetaClient.sendTextMessage(from, waitMsg);
            void recordChatMessage(from, "assistant", waitMsg);

            // Stage 2: Generate signed 10-minute ephemeral download link and dispatch archive details
            const cleanKey = from.replace(/[^0-9]/g, "");
            const expires = Date.now() + 10 * 60 * 1000; // 10 minutes expiry window
            const sig = createExportSignature(from, expires);
            const baseUrl = getWhatsAppBaseUrl();
            const downloadUrl = `${baseUrl}/api/whatsapp/export?phone=${cleanKey}&expires=${expires}&sig=${sig}`;

            const exportMessage =
              "📦 *Your Official Data Archive is Ready!*\n\n" +
              "Under GDPR Article 20 and global privacy standards, your complete conversation data has been packaged by the automated system:\n" +
              "• 📁 Self-Contained Folder (clean unzipping)\n" +
              "• 📜 Visual Chat Transcript (HTML)\n" +
              "• 💾 Machine-Readable JSON Export\n" +
              "• 🛡️ Data Portability Certificate\n" +
              "• 🔒 Telemetry & Security Audit\n\n" +
              `👉 *Tap to Download Your ZIP Archive:*\n${downloadUrl}\n\n` +
              "⏳ *Security Notice: This link expires in 10 minutes (strictly bound to your number).* If it expires, simply type *EXPORT* or */exportmydata* to generate a fresh link." +
              STANDARD_MESSAGE_FOOTER;

            await WhatsAppMetaClient.sendTextMessage(from, exportMessage);
            void recordChatMessage(from, "assistant", exportMessage);
          }

          // -------------------------------------------------------------
          // 4. /terms -> WhatsApp Channel Terms of Service
          // -------------------------------------------------------------
          else if (isTermsAction) {
            const baseUrl = getWhatsAppBaseUrl();
            const termsMessage =
              "📜 *GAURAV PATIL PORTFOLIO — WHATSAPP CHANNEL TERMS*\n\n" +
              "• Purpose: Direct professional networking & recruiter inquiries\n" +
              "• Message Quota: Up to 3 direct inquiries per session\n" +
              "• Opt-Out Anytime: Send STOP to unsubscribe & erase data\n\n" +
              "👉 *Read Full Terms of Service:*\n" +
              `${baseUrl}/terms?focus=whatsapp#whatsapp-terms` +
              STANDARD_MESSAGE_FOOTER;

            await WhatsAppMetaClient.sendTextMessage(from, termsMessage);
            void recordChatMessage(from, "assistant", termsMessage);
          }

          // -------------------------------------------------------------
          // 5. Discord-Style "/guidelines" or "/rules" or "/help"
          // Dispatches comprehensive guidelines text followed by quick-reply action buttons
          // -------------------------------------------------------------
          else if (isGuidelinesAction) {
            const guidelines = getGuidelinesText();
            await WhatsAppMetaClient.sendTextMessage(from, guidelines);
            await WhatsAppMetaClient.sendQuickReplyButtons(
              from,
              "Select an option below to proceed:",
              [
                { id: "btn_resume", title: "📄 View Resume" },
                { id: "btn_chat", title: "💬 Chat with Gaurav" },
              ],
              GREETING_FOOTER
            );
            void recordChatMessage(from, "assistant", guidelines);
          }

          // -------------------------------------------------------------
          // 6. Option 1: "View Resume" (Always delivers verified PDF)
          // Dynamically acknowledges whether it's the first delivery or a re-send
          // -------------------------------------------------------------
          else if (isResumeAction) {
            const isReSend = Boolean(session.hasReceivedResume);

            // 1. Immediate dynamic feedback to the visitor
            const waitMsg = isReSend
              ? "Please wait, re-sending Gaurav's verified resume... 📄⏳"
              : "Please wait, sending Gaurav's verified resume... 📄⏳";
            await WhatsAppMetaClient.sendTextMessage(from, waitMsg);
            void recordChatMessage(from, "assistant", waitMsg);

            session.hasReceivedResume = true;
            session.lastActivityAt = Date.now();
            await saveVisitorSession(from, session);

            // 2. Canonical, high-availability public PDF URL
            const baseUrl = getWhatsAppBaseUrl();
            const directResumeUrl = `${baseUrl}/resume.pdf`;
            const firebaseResumeUrl =
              "https://firebasestorage.googleapis.com/v0/b/gaurav-portfolio-improved.firebasestorage.app/o/whatsapp%2FGaurav_Patil_Resume.pdf?alt=media";
            const documentUrl = process.env.WHATSAPP_RESUME_URL || directResumeUrl;

            const caption = isReSend
              ? `Here is Gaurav Patil's official resume again! 📄\n\nFeel free to review or download it. To connect directly, tap 'Chat with Gaurav' or type your message below — the automated system will deliver it directly to Gaurav in real time.${STANDARD_MESSAGE_FOOTER}`
              : `Here is Gaurav Patil's official resume! 📄\n\nFeel free to review it. To connect directly, tap 'Chat with Gaurav' or type your message below — the automated system will deliver it directly to Gaurav in real time.${STANDARD_MESSAGE_FOOTER}`;

            const sendResult = await WhatsAppMetaClient.sendDocumentMessage(
              from,
              documentUrl,
              "Gaurav_Patil_Resume.pdf",
              caption
            );
            void recordChatMessage(from, "assistant", caption);

            if (!sendResult.success) {
              adminLogger.warn(
                "WhatsApp:ResumeSendFallback",
                "Primary document send failed, attempting secondary document source",
                { error: sendResult.error, primaryUrl: documentUrl }
              );

              // Attempt secondary document source
              const secondaryUrl = documentUrl === directResumeUrl ? firebaseResumeUrl : directResumeUrl;
              const secondaryResult = await WhatsAppMetaClient.sendDocumentMessage(
                from,
                secondaryUrl,
                "Gaurav_Patil_Resume.pdf",
                caption
              );

              if (!secondaryResult.success) {
                adminLogger.warn(
                  "WhatsApp:ResumeSendDirectLinkFallback",
                  "Both document sources failed; sending direct URL link fallback",
                  { error: secondaryResult.error }
                );
                const fallbackMsg = `Here is Gaurav Patil's resume: ${directResumeUrl}\n\nTo connect directly, tap 'Chat with Gaurav' or send your message below.${STANDARD_MESSAGE_FOOTER}`;
                await WhatsAppMetaClient.sendTextMessage(from, fallbackMsg);
                void recordChatMessage(from, "assistant", fallbackMsg);
              }
            }
          }

          // -------------------------------------------------------------
          // 7. Option 2: "Chat with Gaurav" (Enables free-form chat mode)
          // -------------------------------------------------------------
          else if (isChatAction) {
            session.inChatMode = true;
            session.chatModeActivatedAt = Date.now();
            await saveVisitorSession(from, session);

            const chatMsg =
              "You're now connected with Gaurav! 💬\n\nPlease type your message, project idea, or role details below. Gaurav will be alerted in real time." +
              STANDARD_MESSAGE_FOOTER;
            await WhatsAppMetaClient.sendTextMessage(from, chatMsg);
            void recordChatMessage(from, "assistant", chatMsg);
          }

          // -------------------------------------------------------------
          // 8. Greetings ("Hi", "hi", "Hii", or portfolio link) -> 2 buttons with footer
          // -------------------------------------------------------------
          else if (isGreeting) {
            await WhatsAppMetaClient.sendQuickReplyButtons(
              from,
              GREETING_TEXT,
              [
                { id: "btn_resume", title: "📄 View Resume" },
                { id: "btn_chat", title: "💬 Chat with Gaurav" },
              ],
              GREETING_FOOTER
            );
            void recordChatMessage(from, "assistant", GREETING_TEXT);
          }

          // -------------------------------------------------------------
          // 9. Unrecognized Slash Command Protection (/anything_else)
          // Prevents unrecognized commands like /menu, /helpme, /status from
          // erroneously consuming one of the visitor's 3 direct message slots!
          // -------------------------------------------------------------
          else if (rawInput.trim().startsWith("/")) {
            const unknownCommand = rawInput.trim().split(/\s+/)[0];
            const helpMessage =
              `❓ *Command not recognized:* \`${unknownCommand}\`\n\n` +
              "Here are the available commands:\n" +
              "• */guidelines* — Chat rules, options & rights\n" +
              "• *EXPORT* (or */exportmydata*) — Download full chat history (.zip)\n" +
              "• */terms* — WhatsApp Channel Terms of Service\n" +
              "• *STOP* — Unsubscribe & permanently erase data\n" +
              "• *START* — Reset session and display menu\n\n" +
              "💡 *Tip:* Gaurav has developed smart keyword & typo recognition — select an option below or simply send your message to connect directly with Gaurav!";

            await WhatsAppMetaClient.sendQuickReplyButtons(
              from,
              helpMessage,
              [
                { id: "btn_resume", title: "📄 View Resume" },
                { id: "btn_chat", title: "💬 Chat with Gaurav" },
              ],
              GREETING_FOOTER
            );
            void recordChatMessage(from, "assistant", helpMessage);
          }

          // -------------------------------------------------------------
          // 6. ANY other message -> DELIVER DIRECTLY TO GAURAV
          // Never reject a visitor's genuine inquiry or send dead-ends!
          // -------------------------------------------------------------
          else {
            // Check if visitor is declining optional email prompt (zero message slot penalty)
            const isDeclineEmail =
              session.messageCount === 1 &&
              !session.email &&
              (
                normalized === "NO" ||
                normalized === "NO THANKS" ||
                normalized === "DONT WANT" ||
                normalized === "DON'T WANT" ||
                normalized === "NOT WANT" ||
                normalized === "SKIP" ||
                normalized === "NOT NOW" ||
                normalized === "LATER" ||
                normalized === "PASS"
              );

            if (isDeclineEmail) {
              session.email = "declined";
              await saveVisitorSession(from, session);

              const declineMsg =
                "Understood! You can continue chatting here directly. Gaurav has received your message and will review it shortly." +
                STANDARD_MESSAGE_FOOTER;
              await WhatsAppMetaClient.sendTextMessage(from, declineMsg);
              void recordChatMessage(from, "assistant", declineMsg);
            } else {
              // Check if the message contains an email address
              const emailMatch = rawInput.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);

              if (emailMatch) {
                const detectedEmail = emailMatch[0].toLowerCase();
                session.email = detectedEmail;

                // Distinguish between late email registration ONLY vs combined Message + Email
                const strippedInput = rawInput.replace(/[^a-zA-Z0-9@._+-]/g, "").toLowerCase();
                const isOnlyEmail =
                  strippedInput === detectedEmail ||
                  rawInput.trim().toLowerCase().startsWith("my email is") ||
                  rawInput.trim().length <= detectedEmail.length + 15;

                await saveVisitorSession(from, session);
                const senderName = value.contacts?.[0]?.profile?.name || "WhatsApp Visitor";

                if (isOnlyEmail) {
                  // SCENARIO 2: Late email registration (ZERO message slot penalty)
                  const baseUrl = getWhatsAppBaseUrl();
                  const linkedMsg =
                    `✅ *Email Linked Successfully!*\n\n` +
                    `*_${detectedEmail}_* is saved in the automated system. You will receive an instant email alert the moment Gaurav replies.\n\n` +
                    `Feel free to continue chatting here anytime, or explore the portfolio:\n${baseUrl}` +
                    STANDARD_MESSAGE_FOOTER;
                  await WhatsAppMetaClient.sendTextMessage(from, linkedMsg);
                  void recordChatMessage(from, "assistant", linkedMsg);

                  // Send dedicated "Contact Update (Email Linked)" alert to Gaurav immediately
                  await sendWhatsAppAdminAlert({
                    senderName,
                    senderPhone: from,
                    messageText: `Visitor registered email for WhatsApp chat: ${detectedEmail}`,
                    messageCount: session.messageCount || 1,
                    visitorEmail: detectedEmail,
                    isEmailRegistrationOnly: true,
                  });
                } else {
                  // SCENARIO 3: User sent both their inquiry message AND their email together
                  if (session.messageCount < 3) {
                    session.messageCount += 1;
                    session.inChatMode = false;
                    session.chatModeActivatedAt = undefined;
                    await saveVisitorSession(from, session);
                  }

                  const receivedEmailMsg =
                    `Thank you! Your message has been delivered directly to *Gaurav*.\n\n` +
                    `✅ *_${detectedEmail}_* is saved in the automated system to notify your inbox the moment he replies.` +
                    STANDARD_MESSAGE_FOOTER;
                  await WhatsAppMetaClient.sendTextMessage(from, receivedEmailMsg);
                  void recordChatMessage(from, "assistant", receivedEmailMsg);

                  // Send full inquiry alert to Gaurav with visitorEmail attached immediately
                  await sendWhatsAppAdminAlert({
                    senderName,
                    senderPhone: from,
                    messageText: textBody || rawInput,
                    messageCount: session.messageCount,
                    visitorEmail: detectedEmail,
                  });
                }
              } else if (session.messageCount >= 3) {
                // Strict rate limit triggered on 4th message and beyond
                const rateLimitMsg =
                  "⚠️ Message limit reached (maximum 3 messages). Gaurav has received all your messages and will reply directly to your WhatsApp as soon as he is online. Thank you for your patience!" +
                  STANDARD_MESSAGE_FOOTER;
                await WhatsAppMetaClient.sendTextMessage(from, rateLimitMsg);
                void recordChatMessage(from, "assistant", rateLimitMsg);
              } else {
                // SCENARIO 1: Normal inquiry message (or user holding / replying without email)
                session.messageCount += 1;
                session.inChatMode = false;
                session.chatModeActivatedAt = undefined;
                await saveVisitorSession(from, session);

                const currentCount = session.messageCount;

                // 1. First: Send clean message delivery confirmation
                const deliveredMsg =
                  "Thank you! Your message has been delivered directly to *Gaurav*. He will review it and reply to your WhatsApp shortly." +
                  STANDARD_MESSAGE_FOOTER;
                await WhatsAppMetaClient.sendTextMessage(from, deliveredMsg);
                void recordChatMessage(from, "assistant", deliveredMsg);

                // 2. Second: Send separate, eye-catchy email submission prompt (ONLY on message 1 if email not provided yet)
                if (currentCount === 1 && !session.email) {
                  // Short 350ms delay to ensure Meta delivers bubble 1 first, then bubble 2 in chronological sequence
                  await new Promise((resolve) => setTimeout(resolve, 350));

                  const eyeCatchyEmailPrompt =
                    "🔔 *Want an instant email alert when Gaurav replies?*\n\n" +
                    "If you might step away from WhatsApp, simply reply with *your email address below* (e.g. _name@example.com_).\n\n" +
                    "⚡ *The automated system will notify your inbox the moment Gaurav responds!* _(Optional)_";

                  await WhatsAppMetaClient.sendTextMessage(from, eyeCatchyEmailPrompt);
                  void recordChatMessage(from, "assistant", eyeCatchyEmailPrompt);
                }

                // Dispatch real-time text-first email alert to Gaurav immediately
                const senderName = value.contacts?.[0]?.profile?.name || "WhatsApp Visitor";
                await sendWhatsAppAdminAlert({
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
    }

    return Response.json({ success: true }, { status: 200 });
  } catch (error) {
    adminLogger.error("WhatsApp:WebhookUnhandledError", error, "Webhook handling failed");
    return new Response("Internal Server Error", { status: 500 });
  }
}
