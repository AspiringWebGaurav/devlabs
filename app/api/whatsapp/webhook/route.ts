/**
 * Meta WhatsApp Cloud API Webhook Handler
 * 
 * Clean, baseline implementation:
 * - GET: Webhook verification handshake with Meta.
 * - POST: HMAC-SHA256 signature verification and direct message replies.
 * - No Redis, no queues, no complex state machines.
 */

import { NextRequest } from "next/server";
import { verifyWebhookChallenge, verifyWebhookSignature } from "@/lib/whatsapp/webhook";
import { WhatsAppMetaClient } from "@/lib/whatsapp/meta/client";
import { adminLogger } from "@/lib/admin/logger";
import type { MetaWebhookPayload } from "@/lib/whatsapp/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Ephemeral in-memory session tracker (per process instance, zero backend/database)
const activeChatSessions = new Set<string>();

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
 * POST: Ingests authentic Meta WhatsApp events and sends immediate replies
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
          // If the message is older than 24 hours, free-form messages cannot be delivered
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

          // Extract message text
          const rawText = (msg.text?.body || msg.button?.text || "").trim();
          if (!rawText) continue;

          // Normalize command: trim, uppercase, remove leading/trailing punctuation
          const normalized = rawText
            .toUpperCase()
            .replace(/^[/#.!]+|[.!?]+$/g, "")
            .trim();

          adminLogger.info("WhatsApp:InboundReceived", "Inbound message received", {
            from,
            text: rawText,
            normalized,
          });

          // 1. "STOP" -> Exact STOP response & clear session
          if (normalized === "STOP" || normalized === "UNSUBSCRIBE") {
            activeChatSessions.delete(from);
            await WhatsAppMetaClient.sendTextMessage(
              from,
              "You have been unsubscribed. Feel free to START again anytime."
            );
          }
          // 2. "START" -> If already in ready session, show no need to send START; otherwise welcome
          else if (normalized === "START") {
            if (activeChatSessions.has(from)) {
              await WhatsAppMetaClient.sendTextMessage(
                from,
                "You're already in a ready session! You can chat directly—no need to send START. How can I assist you today?"
              );
            } else {
              activeChatSessions.add(from);
              await WhatsAppMetaClient.sendTextMessage(
                from,
                "You're all set! You can chat directly—no need to send START. How can I assist you today? (Reply STOP anytime to unsubscribe)"
              );
            }
          }
          // 3. "Hii" / "Hi" / "Hello" / Portfolio referral -> Warm reply & mark session ready
          else if (
            normalized === "HII" ||
            normalized.startsWith("HI") ||
            normalized.startsWith("HELLO") ||
            normalized.startsWith("HEY") ||
            normalized.includes("PORTFOLIO")
          ) {
            activeChatSessions.add(from);
            await WhatsAppMetaClient.sendTextMessage(
              from,
              "Hi! Thanks for reaching out through my portfolio. I've received your message and will get back to you directly here shortly! Feel free to share any details in the meantime."
            );
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
