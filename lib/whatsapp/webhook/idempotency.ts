/**
 * Authoritative Webhook Inbound Ingestion Boundary
 * 
 * Strict Zero-Infrastructure Standard:
 * - 100% Serverless on Vercel + Firestore (uses no additional scheduler, worker, or Redis infrastructure and is designed to operate within the existing free-tier/resource limits).
 * - Invariant 1: Canonical Inbound Identity: Doc ID = sha256(wamid:wabaId:phoneNumber).
 * - Invariant 2: Fast ACK gate: Webhook returns 200 if and only if raw inbound event is durably committed.
 * - Invariant 5: OCC via Firestore transactions is the sole authoritative correctness mechanism.
 */

import { inboundEventRepository, type InboundClaimResult } from "../persistence/inbound-event.repo";
import { normalizeE164 } from "../security/sanitizer";
import type { InboundEvent } from "../types";

/**
 * Authoritative Durable Ingestion Gate:
 * Commits raw InboundEvent to whatsapp_inbound_events with doc ID = sha256(wamid:wabaId:phone)
 * inside an atomic Firestore transaction.
 * 
 * Returns InboundClaimResult:
 * - shouldProcess: true if caller is authorized claimant
 * - isDuplicate: true if event already exists
 * - httpStatus: 200 | 429 | 500
 * - reason: classification reason
 */
export async function acceptInboundEventDurably(
  wamid: string,
  wabaId: string,
  phoneNumber: string,
  rawPayload: Partial<InboundEvent>,
  workerId = `worker_${Date.now()}`
): Promise<InboundClaimResult> {
  const eventId = inboundEventRepository.computeEventId(wamid, wabaId, phoneNumber);

  const eventRecord: InboundEvent = {
    eventId,
    wamid,
    wabaId,
    phoneNumber: normalizeE164(phoneNumber),
    senderName: rawPayload.senderName,
    type: rawPayload.type || "text",
    body: rawPayload.body,
    interactiveButtonId: rawPayload.interactiveButtonId,
    mediaId: rawPayload.mediaId,
    mediaMimeType: rawPayload.mediaMimeType,
    mediaFileName: rawPayload.mediaFileName,
    receivedAt: Date.now(),
    processingStatus: "CLAIMED",
    attemptCount: 1,
  };

  return await inboundEventRepository.claimOrDetectDuplicate(eventRecord, workerId);
}

