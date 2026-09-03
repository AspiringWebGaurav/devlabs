/**
 * Public Meta WhatsApp Cloud API Webhook Route Handler
 * 
 * Strict Zero-Infrastructure Standard:
 * - 100% Serverless on Vercel + Firestore (uses no additional scheduler, worker, or Redis infrastructure and is designed to operate within the existing free-tier/resource limits).
 * - GET: Verification challenge echo (constant-time token verification)
 * - POST: HMAC-SHA256 signature verification, account ownership check,
 *         authoritative durable InboundEvent acceptance boundary (Invariant 1 & 2),
 *         Universal Conversation Router (Section 16),
 *         and Outbox delivery status correlation.
 */

import crypto from "crypto";
import { NextRequest } from "next/server";
import {
  verifyWebhookChallenge,
  verifyWebhookSignature,
  validateWebhookOwnership,
  parseWebhookPayload,
  acceptInboundEventDurably,
} from "@/lib/whatsapp/webhook";
import { checkPhoneRateLimit } from "@/lib/whatsapp/security/rate-limiter";
import { MediaHandlerService } from "@/lib/whatsapp/services/media-handler.service";
import { UniversalRouterService } from "@/lib/whatsapp/services/universal-router.service";
import { outboxRepository } from "@/lib/whatsapp/persistence/outbox.repo";
import { inboundEventRepository } from "@/lib/whatsapp/persistence/inbound-event.repo";
import { adminLogger } from "@/lib/admin/logger";
import { maskPhone } from "@/lib/whatsapp/security/sanitizer";
import type { MetaWebhookPayload } from "@/lib/whatsapp/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60; // Invariant: Max Vercel execution (60s) < LEASE_TTL_MS (120s)

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

const MAX_WEBHOOK_PAYLOAD_BYTES = 5 * 1024 * 1024; // 5MB hard ceiling

/**
 * Safely reads the inbound request body with a hard byte-accumulation ceiling.
 * Rejects requests exceeding MAX_WEBHOOK_PAYLOAD_BYTES (including chunked transfer)
 * before memory exhaustion can occur.
 */
async function readBoundedRawBody(
  req: NextRequest,
  maxBytes: number
): Promise<{ body: string; exceeded: boolean }> {
  // Fast path: trustworthy Content-Length header
  const contentLengthStr = req.headers.get("content-length");
  if (contentLengthStr) {
    const contentLength = parseInt(contentLengthStr, 10);
    if (!isNaN(contentLength) && contentLength > maxBytes) {
      return { body: "", exceeded: true };
    }
  }

  // Stream-bounded consumption to prevent chunked DoS
  if (!req.body) {
    return { body: "", exceeded: false };
  }

  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        totalBytes += value.byteLength;
        if (totalBytes > maxBytes) {
          await reader.cancel();
          return { body: "", exceeded: true };
        }
        chunks.push(value);
      }
    }
  } catch {
    return { body: "", exceeded: true };
  }

  const merged = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return { body: new TextDecoder("utf-8").decode(merged), exceeded: false };
}

/**
 * POST: Ingests authentic Meta WhatsApp events (messages and status updates)
 */
export async function POST(req: NextRequest): Promise<Response> {
  const startTime = Date.now();

  try {
    // 1. Stream-bounded raw body reading to enforce 5MB memory ceiling
    const { body: rawBody, exceeded } = await readBoundedRawBody(req, MAX_WEBHOOK_PAYLOAD_BYTES);
    if (exceeded) {
      adminLogger.warn("WhatsApp:PayloadTooLarge", "Webhook payload exceeded 5MB memory ceiling");
      return new Response("Payload Too Large", { status: 413 });
    }

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
    const wabaId = ownership.wabaId || "default_waba";

    let hasInFlightConflict = false;
    let hasProcessingFailure = false;

    // 6. Authoritative Ingestion & Processing for Inbound Messages
    for (const msg of inboundMessages) {
      const maskedPhone = maskPhone(msg.from);
      const workerId = `webhook_${process.pid || 1}_${crypto.randomUUID().slice(0, 6)}`;

      // A. Authoritative Durable InboundEvent Gate (Invariant 1 & 2)
      // Runs inside atomic Firestore transaction with 120s lease TTL
      const claim = await acceptInboundEventDurably(
        msg.id,
        wabaId,
        msg.from,
        {
          senderName: msg.senderName,
          type: msg.type,
          body: msg.body,
          interactiveButtonId: msg.interactiveButtonId,
          mediaId: msg.mediaId,
          mediaMimeType: msg.mediaMimeType,
          mediaFileName: msg.mediaFileName,
        },
        workerId
      );

      // In-flight collision: record conflict and continue batch so other messages are not stranded!
      if (claim.httpStatus === 429) {
        adminLogger.warn("WhatsApp:InFlightDuplicateSuppressed", "In-flight delivery collision detected", {
          wamid: msg.id,
          reason: claim.reason,
        });
        hasInFlightConflict = true;
        continue;
      }

      // Terminal duplicate or poison: acknowledge without processing
      if (!claim.shouldProcess) {
        adminLogger.info("WhatsApp:DuplicateSuppressed", "Duplicate event suppressed by canonical eventId boundary", {
          wamid: msg.id,
          reason: claim.reason,
        });
        continue;
      }

      // B. Authorized Claimant: Execute downstream processing under try/catch
      try {
        const rateLimit = await checkPhoneRateLimit(msg.from);
        if (!rateLimit.allowed) {
          adminLogger.warn("WhatsApp:InboundRateLimited", "Dropped message due to rate limit", { phone: maskedPhone });
          await inboundEventRepository.markProcessed(claim.eventId);
          continue;
        }

        // Secure Media Processing if message contains attachment
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

        // Universal Conversation Router (Request-Driven Execution)
        await UniversalRouterService.routeInboundMessage(msg, fileAttachment);

        // Mark PROCESSED on successful completion
        await inboundEventRepository.markProcessed(claim.eventId);
      } catch (err: unknown) {
        const errorStr = err instanceof Error ? err.message : String(err);
        adminLogger.error("WhatsApp:InboundProcessingFailed", err, "Downstream message processing failed", {
          eventId: claim.eventId,
          wamid: msg.id,
        });

        const isTerminal = await inboundEventRepository.recordFailure(claim.eventId, errorStr);
        if (!isTerminal) {
          hasProcessingFailure = true;
        }
      }
    }

    // 7. Process Status Updates (sent, delivered, read, failed)
    for (const status of statusUpdates) {
      try {
        // Update outbox delivery status (strictly matches direct metaMessageId)
        if (status.status === "delivered" || status.status === "read") {
          await outboxRepository.updateDeliveryStatus(
            status.id,
            status.status === "read" ? "READ" : "DELIVERED"
          );
        } else if (status.status === "failed") {
          await outboxRepository.updateDeliveryStatus(
            status.id,
            "FAILED",
            status.error || "Meta delivery failed"
          );
        }
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

    // 8. Post-Batch Response Determination
    if (hasProcessingFailure) {
      return new Response("Internal Server Error: One or more messages failed processing", { status: 500 });
    }

    if (hasInFlightConflict) {
      return new Response("Conflict: In-flight message actively processing", {
        status: 429,
        headers: {
          "Retry-After": "5",
          "Content-Type": "text/plain",
        },
      });
    }

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
