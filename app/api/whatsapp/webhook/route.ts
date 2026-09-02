/**
 * Public Meta WhatsApp Cloud API Webhook Route Handler
 * 
 * Implements:
 * - GET: Verification challenge echo (constant-time token verification)
 * - POST: HMAC-SHA256 signature verification, account ownership check,
 *         authoritative durable Firestore acceptance boundary, and deterministic routing.
 */

import { NextRequest } from "next/server";
import {
  verifyWebhookChallenge,
  verifyWebhookSignature,
  validateWebhookOwnership,
  parseWebhookPayload,
  checkRedisDuplicateAccelerator,
  acceptEventDurablyInFirestore,
  acquireThreadLock,
  releaseThreadLock,
} from "@/lib/whatsapp/webhook";
import { checkPhoneRateLimit } from "@/lib/whatsapp/security/rate-limiter";
import { MediaHandlerService } from "@/lib/whatsapp/services/media-handler.service";
import { WhatsAppRouterService } from "@/lib/whatsapp/services/whatsapp-router.service";
import { whatsappRepository } from "@/lib/whatsapp/persistence/whatsapp.repository";
import { adminLogger } from "@/lib/admin/logger";
import { maskPhone } from "@/lib/whatsapp/security/sanitizer";
import type { MetaWebhookPayload } from "@/lib/whatsapp/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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
 * POST: Ingests authentic Meta WhatsApp events (messages and status updates)
 */
export async function POST(req: NextRequest): Promise<Response> {
  const startTime = Date.now();

  try {
    // 1. Read raw body buffer for authentic HMAC validation
    const rawBody = await req.text();
    const signatureHeader = req.headers.get("x-hub-signature-256");

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

    // 3. Webhook Ownership Validation (WABA and Phone Number IDs)
    const ownership = validateWebhookOwnership(payload);
    if (!ownership.valid) {
      adminLogger.warn("WhatsApp:OwnershipValidationFailed", ownership.reason || "Ownership mismatch");
      return new Response("Forbidden: Ownership validation failed", { status: 403 });
    }

    // 4. Emergency Kill-Switch Check
    if (process.env.WHATSAPP_ENABLED === "false") {
      adminLogger.warn("WhatsApp:WebhookIgnored", "Webhook received but WHATSAPP_ENABLED=false");
      return Response.json({ status: "disabled" }, { status: 200 });
    }

    // 5. Parse all events independently (no messages[0] assumptions)
    const { inboundMessages, statusUpdates } = parseWebhookPayload(payload);

    // 6. Authoritative Ingestion & Processing for Inbound Messages
    for (const msg of inboundMessages) {
      const maskedPhone = maskPhone(msg.from);

      // A. Fast Redis duplicate accelerator
      const isNewInRedis = await checkRedisDuplicateAccelerator(msg.id);
      if (!isNewInRedis) {
        adminLogger.debug("WhatsApp:RedisDuplicateSuppressed", "Duplicate wamid skipped by Redis accelerator", {
          wamid: msg.id,
        });
        continue;
      }

      // B. Authoritative Durable Firestore Acceptance Boundary
      // If Firestore throws, the entire POST fails with 500, prompting Meta retry
      const { isDuplicate } = await acceptEventDurablyInFirestore(msg.id);
      if (isDuplicate) {
        adminLogger.info("WhatsApp:FirestoreDuplicateSuppressed", "Duplicate wamid suppressed by Firestore boundary", {
          wamid: msg.id,
        });
        continue;
      }

      // C. Inbound Rate Limiting Check
      const rateLimit = await checkPhoneRateLimit(msg.from);
      if (!rateLimit.allowed) {
        adminLogger.warn("WhatsApp:InboundRateLimited", "Dropped message due to rate limit", { phone: maskedPhone });
        continue;
      }

      // D. Thread Lock Concurrency Serialization
      const lockToken = await acquireThreadLock(msg.from);

      try {
        // E. Secure Media Processing if message contains attachment
        let fileAttachment: { storagePath: string; fileName: string } | undefined;
        if (msg.mediaId) {
          try {
            const mediaResult = await MediaHandlerService.processInboundMedia(
              msg.mediaId,
              msg.from,
              msg.mediaMimeType,
              msg.mediaFileName
            );
            fileAttachment = {
              storagePath: mediaResult.storagePath,
              fileName: mediaResult.fileName,
            };
          } catch (mediaErr) {
            adminLogger.error("WhatsApp:MediaDownloadFailed", mediaErr, "Failed to download media safely", {
              mediaId: msg.mediaId,
            });
          }
        }

        // F. Deterministic Command Router (Zero AI)
        await WhatsAppRouterService.handleInboundMessage(msg, fileAttachment);
      } finally {
        if (lockToken) {
          await releaseThreadLock(msg.from, lockToken);
        }
      }
    }

    // 7. Process Status Updates (sent, delivered, read, failed)
    for (const status of statusUpdates) {
      try {
        // Durably record status update
        await whatsappRepository.saveMessage({
          id: status.id,
          threadId: status.recipientPhone,
          direction: "outbound",
          type: "text",
          metaStatus: status.status,
          timestamp: status.timestamp,
        });
      } catch (statusErr) {
        adminLogger.warn("WhatsApp:StatusUpdateSaveFailed", "Failed to update message delivery status", {
          error: String(statusErr),
        });
      }
    }

    adminLogger.latency("WhatsApp:WebhookProcessed", Date.now() - startTime, {
      messageCount: inboundMessages.length,
      statusCount: statusUpdates.length,
    });

    return Response.json(
      {
        success: true,
        messagesProcessed: inboundMessages.length,
        statusesProcessed: statusUpdates.length,
      },
      { status: 200 }
    );
  } catch (error) {
    adminLogger.error("WhatsApp:WebhookUnhandledError", error, "Webhook handling failed");
    // Return non-2xx status to notify Meta of failure for automatic retry
    return new Response("Internal Server Error", { status: 500 });
  }
}
