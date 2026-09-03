/**
 * Outbox Dispatcher Worker & WhatsApp Policy Gate
 * 
 * Strict Enterprise Invariants:
 * - Invariant 3: Transactional Outbox Pattern.
 * - Invariant 14: Policy Alert Durability (atomic transaction on POLICY_BLOCKED).
 * - Circuit Breaker integration before network dispatch.
 * - Formal AMBIGUOUS outcome handling.
 */

import crypto from "crypto";
import { outboxRepository } from "../persistence/outbox.repo";
import { conversationRepository, CONVERSATIONS_COLLECTION, AUDIT_LOG_COLLECTION } from "../persistence/conversation.repo";
import { NOTIFICATIONS_COLLECTION } from "../persistence/notification.repo";
import { distributedCircuitBreaker } from "./circuit-breaker";
import { WhatsAppMetaClient } from "../meta/client";
import { OutboundPolicyGuard, type OutboundPolicyContext } from "../security/outbound-policy-guard";
import { firestoreDataSource } from "@/lib/dal/datasource/firestore";
import { adminLogger } from "@/lib/admin/logger";
import type { WhatsAppOutboxMessage, WhatsAppNotificationJob } from "../types";

export class OutboxDispatcherWorker {
  private workerId: string;

  constructor() {
    this.workerId = `worker_${process.pid || 1}_${crypto.randomUUID().slice(0, 6)}`;
  }

  /**
   * Processes a batch of pending outbox messages.
   */
  public async processBatch(limitCount = 5): Promise<number> {
    const messages = await outboxRepository.claimPendingMessages(this.workerId, limitCount);
    let processedCount = 0;

    for (const msg of messages) {
      try {
        await this.dispatchSingleMessage(msg);
        processedCount++;
      } catch (err) {
        adminLogger.error("WhatsApp:OutboxWorkerDispatchError", err, "Failed to dispatch outbox message", {
          operationId: msg.operationId,
        });
      }
    }

    return processedCount;
  }

  /**
   * Dispatches a single outbox message with complete policy gate and error recovery.
   */
  public async dispatchSingleMessage(message: WhatsAppOutboxMessage): Promise<void> {
    const conversation = await conversationRepository.getConversation(message.conversationId);

    // 1. Construct minimal canonical policy context from authoritative conversation
    const policyContext: OutboundPolicyContext = {
      customerServiceWindowExpiresAt: conversation?.customerServiceWindowExpiresAt ?? 0,
      optedOut: conversation?.optedOut,
    };

    // WhatsApp 24-Hour Policy Window Gate via canonical OutboundPolicyGuard
    const policyCheck = OutboundPolicyGuard.evaluateOutbound({
      recipientPhone: message.destinationPhone,
      messageType: "free_form",
      context: policyContext,
    });

    if (!policyCheck.allowed) {
      await this.handlePolicyBlocked(
        message,
        conversation?.contactName || message.conversationId,
        policyCheck.reason
      );
      return;
    }

    // 2. Circuit Breaker Check
    const allowed = await distributedCircuitBreaker.canExecute();
    if (!allowed) {
      adminLogger.warn("WhatsApp:OutboxWorkerThrottled", "Meta Graph API circuit breaker is OPEN, postponing message", {
        operationId: message.operationId,
      });
      return;
    }

    // 3. Mark SENDING right before network request
    await outboxRepository.markSending(message.operationId);

    // 4. Execute Meta HTTP Send with canonical OutboundPolicyContext
    try {
      let metaMessageId: string | null = null;

      if (message.messageType === "quick_reply" && message.payload.buttons) {
        metaMessageId = await WhatsAppMetaClient.sendQuickReplyButtons(
          message.destinationPhone,
          message.payload.bodyText,
          message.payload.buttons,
          policyContext,
          message.payload.footerText
        );
      } else if (message.messageType === "document" && message.payload.documentUrl) {
        metaMessageId = await WhatsAppMetaClient.sendDocumentMessage(
          message.destinationPhone,
          message.payload.documentUrl,
          message.payload.fileName || "Document.pdf",
          message.payload.bodyText,
          policyContext
        );
      } else {
        metaMessageId = await WhatsAppMetaClient.sendTextMessage(
          message.destinationPhone,
          message.payload.bodyText,
          policyContext
        );
      }

      if (metaMessageId) {
        await outboxRepository.markMetaAccepted(message.operationId, metaMessageId);
        await distributedCircuitBreaker.recordSuccess();
      } else {
        // Returned empty ID -> treat as ambiguous
        await outboxRepository.markAmbiguous(message.operationId, "Empty message ID returned by Meta");
      }
    } catch (err: unknown) {
      const errorStr = err instanceof Error ? err.message : String(err);

      // Safety Catch: If client rejects policy, delegate to handlePolicyBlocked rather than markDeadLetter
      if (errorStr.includes("Outbound dispatch blocked")) {
        await this.handlePolicyBlocked(
          message,
          conversation?.contactName || message.conversationId,
          errorStr
        );
        return;
      }

      const isTimeoutOrNetwork =
        errorStr.includes("ETIMEDOUT") ||
        errorStr.includes("ECONNRESET") ||
        errorStr.includes("network timeout") ||
        errorStr.includes("AbortError");

      if (isTimeoutOrNetwork) {
        // Invariant 6 & AMBIGUOUS protocol: Meta may have accepted, wait for status reconciliation
        await outboxRepository.markAmbiguous(message.operationId, `Network timeout: ${errorStr}`);
        return;
      }

      // Check for rate limits (429)
      const is429 = errorStr.includes("429") || errorStr.toLowerCase().includes("rate limit");
      if (is429) {
        await distributedCircuitBreaker.recordFailure("meta_graph_api", 60);
        await outboxRepository.markConfirmedNotAccepted(message.operationId, "Meta 429 Rate Limit");
        return;
      }

      // Transient 5xx vs permanent 4xx
      const is5xx = errorStr.includes("500") || errorStr.includes("502") || errorStr.includes("503");
      if (is5xx) {
        await distributedCircuitBreaker.recordFailure();
        await outboxRepository.markConfirmedNotAccepted(message.operationId, `Meta 5xx: ${errorStr}`);
      } else {
        // Permanent 4xx error (e.g. invalid phone, bad template)
        await outboxRepository.markDeadLetter(message.operationId, `Permanent Meta error: ${errorStr}`);
      }
    }
  }

  /**
   * Invariant 14: Atomic transaction creating POLICY_BLOCKED state and POLICY_BLOCKED_ALERT job.
   */
  private async handlePolicyBlocked(
    message: WhatsAppOutboxMessage,
    contactName: string,
    reason?: string
  ): Promise<void> {
    const policyAlertNotificationId = crypto
      .createHash("sha256")
      .update(`${message.conversationId}:${message.outboxId}:POLICY_BLOCKED_ALERT`)
      .digest("hex");

    const now = Date.now();

    await firestoreDataSource.runTransaction(async (tx, db) => {
      // 1. Mark outbox message POLICY_BLOCKED
      const outboxRef = db.collection("whatsapp_outbox").doc(message.operationId);
      tx.update(outboxRef, {
        status: "POLICY_BLOCKED",
        lastError: reason || "Customer service window closed (>24h since last inbound message)",
        updatedAt: now,
      });

      // 2. Tag conversation root
      const convRef = db.collection(CONVERSATIONS_COLLECTION).doc(message.conversationId);
      tx.update(convRef, {
        windowClosedActionRequired: true,
        updatedAt: now,
      });

      // 3. Atomically enqueue durable notification job for Gaurav
      const notifRef = db.collection(NOTIFICATIONS_COLLECTION).doc(policyAlertNotificationId);
      const notificationJob: WhatsAppNotificationJob = {
        notificationId: policyAlertNotificationId,
        type: "POLICY_BLOCKED_ALERT",
        conversationId: message.conversationId,
        recipientEmail: "gauravpatil5737@gmail.com",
        subject: `[Urgent WhatsApp] Window closed for ${contactName} (${message.conversationId})`,
        textContent:
          `An automated WhatsApp reply could not be dispatched because Meta's 24-hour customer window is closed.\n\n` +
          `Recipient: ${contactName} (${message.conversationId})\n` +
          `Message Attempted: ${message.payload.bodyText.slice(0, 150)}...\n\n` +
          `Please reply directly to this recruiter on WhatsApp: https://wa.me/${message.conversationId.replace(/[^0-9]/g, "")}`,
        htmlContent: `<p>Meta 24h window closed for <strong>${contactName}</strong>. Please reply directly on WhatsApp.</p>`,
        status: "PENDING",
        attemptCount: 0,
        nextRetryAt: now,
        createdAt: now,
        correlationId: message.correlationId,
      };
      tx.set(notifRef, notificationJob, { merge: true });

      // 4. Atomically append OUTBOUND_POLICY_BLOCKED audit record
      const auditRef = db.collection(AUDIT_LOG_COLLECTION).doc(`aud_${message.operationId}_OUTBOUND_POLICY_BLOCKED`);
      tx.set(auditRef, {
        auditId: auditRef.id,
        eventType: "OUTBOUND_POLICY_BLOCKED",
        conversationId: message.conversationId,
        operationId: message.operationId,
        correlationId: message.correlationId,
        previousState: message.status,
        newState: "POLICY_BLOCKED",
        timestamp: now,
        actor: "SYSTEM",
        actorId: "policy_guard",
        reason: reason || "Customer service window closed (>24h since last inbound message)",
      });
    });

    adminLogger.warn("WhatsApp:PolicyBlockedAlertCommitted", "Committed POLICY_BLOCKED and alert notification job atomically", {
      operationId: message.operationId,
      policyAlertNotificationId,
    });
  }
}

export const outboxDispatcherWorker = new OutboxDispatcherWorker();
