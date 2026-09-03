"use server";

import { cookies } from "next/headers";
import { ADMIN_COOKIE_NAME } from "@/lib/admin/constants";
import { verifyAdminSession } from "@/lib/admin/auth";
import { conversationRepository } from "@/lib/whatsapp/persistence/conversation.repo";
import { outboxRepository } from "@/lib/whatsapp/persistence/outbox.repo";
import { outboxDispatcherWorker } from "@/lib/whatsapp/engine/outbox-worker";
import { normalizeE164, isValidE164, sanitizeText } from "@/lib/whatsapp/security/sanitizer";
import type { WhatsAppMessage, WhatsAppThread, AuditActor } from "@/lib/whatsapp/types";

const OPERATION_ID_REGEX = /^[a-zA-Z0-9_-]{1,128}$/;

/**
 * Retrieves the unified chronological message ledger for a recruiter conversation.
 * Authoritative: Joins whatsapp_inbound_events and whatsapp_outbox by E.164 phone.
 */
export async function getThreadMessagesAction(phone: string): Promise<WhatsAppMessage[]> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  const session = await verifyAdminSession(sessionToken);
  if (!session) throw new Error("Unauthorized");

  if (!isValidE164(phone)) {
    throw new Error("Invalid E.164 phone number format");
  }

  const joinKey = normalizeE164(phone);
  const [inboundEvents, outboxMessages] = await Promise.all([
    outboxRepository.listInboundForPhone(joinKey),
    outboxRepository.listOutboxForConversation(joinKey),
  ]);

  const merged: WhatsAppMessage[] = [];

  for (const ev of inboundEvents) {
    merged.push({
      id: ev.wamid || ev.eventId,
      threadId: ev.phoneNumber,
      direction: "inbound",
      type: (ev.type as WhatsAppMessage["type"]) || "text",
      body: ev.body || (ev.interactiveButtonId ? `[Button: ${ev.interactiveButtonId}]` : ""),
      mediaStoragePath: ev.mediaStoragePath,
      mediaMimeType: ev.mediaMimeType,
      mediaFileName: ev.mediaFileName,
      timestamp: ev.receivedAt,
    });
  }

  for (const ob of outboxMessages) {
    const metaStatus =
      ob.status === "READ"
        ? "read"
        : ob.status === "DELIVERED"
        ? "delivered"
        : ob.status === "META_ACCEPTED"
        ? "sent"
        : ob.status === "DEAD_LETTER"
        ? "failed"
        : undefined;

    merged.push({
      id: ob.operationId,
      threadId: ob.conversationId,
      direction: "outbound",
      type: (ob.messageType as WhatsAppMessage["type"]) || "text",
      body: ob.payload?.bodyText || (ob.payload?.fileName ? `[File: ${ob.payload.fileName}]` : ""),
      mediaStoragePath: ob.payload?.documentUrl,
      mediaFileName: ob.payload?.fileName,
      metaStatus,
      outboxStatus: ob.status,
      operationId: ob.operationId,
      lastError: ob.lastError,
      metaMessageId: ob.metaMessageId,
      timestamp: ob.createdAt || ob.sentAt || Date.now(),
    });
  }

  merged.sort((a, b) => a.timestamp - b.timestamp);
  return merged;
}

/**
 * Retrieves the live conversation list from whatsapp_conversations.
 * Authoritative: Reflects live UniversalRouter state machine.
 */
export async function refreshThreadsAction(): Promise<WhatsAppThread[]> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  const session = await verifyAdminSession(sessionToken);
  if (!session) throw new Error("Unauthorized");

  const conversations = await conversationRepository.listConversations();
  return conversations.map((conv) => ({
    id: conv.conversationId,
    recruiterPhone: conv.waPhoneNumber,
    recruiterName: conv.contactName || "Recruiter",
    status: conv.optedOut ? "opted_out" : conv.archived ? "closed" : "active",
    currentFlowStep: "idle",
    leadSubmitted: Boolean(conv.leadSubmitted),
    lastInboundMessageAt: conv.lastInboundAt || conv.lastActivityAt || 0,
    lastOutboundMessageAt: conv.lastOutboundAt || 0,
    customerServiceWindowExpiresAt: conv.customerServiceWindowExpiresAt || 0,
    optedOut: Boolean(conv.optedOut),
    unreadByAdmin: Boolean(conv.unreadByAdmin),
    currentState: conv.currentState,
  }));
}

/**
 * Marks conversation as read in whatsapp_conversations.
 */
export async function markThreadReadAction(phone: string): Promise<void> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  const session = await verifyAdminSession(sessionToken);
  if (!session) throw new Error("Unauthorized");

  if (!isValidE164(phone)) {
    throw new Error("Invalid E.164 phone number format");
  }

  await conversationRepository.markConversationRead(phone);
}

export interface ReconcileOutboxInput {
  proofType: "META_WAMID_VERIFIED" | "META_GATEWAY_REJECTED" | "INCONCLUSIVE";
  metaMessageId?: string;
  rejectionReason?: string;
  auditNote?: string;
}

/**
 * Reconciles an AMBIGUOUS outbox operation based on deterministic evidence.
 * Fail-Closed: Strictly rejects "phone observation" as proof of non-acceptance.
 */
export async function reconcileOutboxMessageAction(
  operationId: string,
  evidence: ReconcileOutboxInput
): Promise<{ success: boolean; status?: string; error?: string }> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  const session = await verifyAdminSession(sessionToken);
  if (!session) throw new Error("Unauthorized");

  if (!operationId || !OPERATION_ID_REGEX.test(operationId)) {
    return { success: false, error: "Invalid operation ID format" };
  }

  if (!evidence || !["META_WAMID_VERIFIED", "META_GATEWAY_REJECTED", "INCONCLUSIVE"].includes(evidence.proofType)) {
    return { success: false, error: "Invalid reconciliation proofType" };
  }

  const sanitizedEvidence: ReconcileOutboxInput = {
    proofType: evidence.proofType,
    metaMessageId: evidence.metaMessageId ? sanitizeText(evidence.metaMessageId, 256) : undefined,
    rejectionReason: evidence.rejectionReason ? sanitizeText(evidence.rejectionReason, 1000) : undefined,
    auditNote: evidence.auditNote ? sanitizeText(evidence.auditNote, 1000) : undefined,
  };

  const adminActor: AuditActor = {
    type: "ADMIN",
    id: session.email || session.name || "operator",
  };

  // Step 1: Claim lease
  const claim = await outboxRepository.claimForReconciliation(operationId, adminActor);
  if (!claim.success) {
    return { success: false, error: claim.error || "Failed to claim outbox record for reconciliation" };
  }

  // Step 2: Finalize reconciliation with validated evidence
  const finalResult = await outboxRepository.finalizeReconciliation(operationId, adminActor, sanitizedEvidence);
  return finalResult;
}

/**
 * Secure manual admin recovery for failed outbox operations.
 * Strictly respects AMBIGUOUS and DEAD_LETTER safety rules:
 * - AMBIGUOUS/RECONCILING: rejected (reconciliation required)
 * - DEAD_LETTER: rejected by default (permanent failure)
 * - ONLY RETRY_PENDING is permitted for safe re-dispatch.
 */
export async function retryFailedOutboxMessageAction(
  operationId: string
): Promise<{ success: boolean; error?: string }> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  const session = await verifyAdminSession(sessionToken);
  if (!session) throw new Error("Unauthorized");

  if (!operationId || !OPERATION_ID_REGEX.test(operationId)) {
    return { success: false, error: "Invalid operation ID format" };
  }

  const msg = await outboxRepository.getMessage(operationId);
  if (!msg) {
    return { success: false, error: "Outbox record not found" };
  }

  // Safety invariant: Never blindly resend an ambiguous Meta operation
  if (msg.status === "AMBIGUOUS" || msg.status === "RECONCILING") {
    return {
      success: false,
      error: "Cannot resend an AMBIGUOUS operation. Use reconcileOutboxMessageAction to provide deterministic Meta evidence first.",
    };
  }

  // Safety invariant: Never blindly resend a dead-lettered message
  if (msg.status === "DEAD_LETTER") {
    return {
      success: false,
      error: "Cannot retry a DEAD_LETTER operation. Dead-lettered messages represent permanent rejections or exhausted retries.",
    };
  }

  if (msg.status !== "RETRY_PENDING") {
    return { success: false, error: `Cannot retry outbox record with status: ${msg.status}. Only RETRY_PENDING records are safe for re-dispatch.` };
  }

  const adminActor: AuditActor = {
    type: "ADMIN",
    id: session.email || session.name || "operator",
  };

  // Record OUTBOUND_RETRY_AUTHORIZED audit event atomically with deterministic attempt ID
  await outboxRepository.recordRetryAuthorized(operationId, adminActor);

  try {
    await outboxDispatcherWorker.dispatchSingleMessage(msg);
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}


