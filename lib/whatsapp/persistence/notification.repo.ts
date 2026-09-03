/**
 * Durable Notification Queue Repository
 * 
 * Strict Enterprise Invariant:
 * - Deterministic Notification ID: sha256(conversationId + eventId + type).
 * - Decouples lead capture from Brevo email delivery.
 * - Formal AMBIGUOUS handling for email provider timeouts.
 */

import crypto from "crypto";
import { firestoreDataSource } from "@/lib/dal/datasource/firestore";
import { sendTransactionalEmail } from "@/lib/email/brevo";
import { adminLogger } from "@/lib/admin/logger";
import { normalizeE164 } from "../security/sanitizer";
import type { WhatsAppNotificationJob, NotificationJobStatus } from "../types";
import type { Transaction, Firestore } from "firebase-admin/firestore";

export const NOTIFICATIONS_COLLECTION = "whatsapp_notifications";

export class NotificationRepository {
  /**
   * Computes deterministic canonical document ID for a notification job.
   */
  public computeNotificationId(conversationId: string, eventId: string, type: string): string {
    const normalizedPhone = normalizeE164(conversationId);
    return crypto
      .createHash("sha256")
      .update(`${normalizedPhone}:${eventId}:${type}`)
      .digest("hex");
  }

  /**
   * Enqueues a durable notification job, optionally inside a Firestore transaction.
   */
  public async enqueueNotificationJob(
    job: WhatsAppNotificationJob,
    transactionContext?: { tx: Transaction; db: Firestore }
  ): Promise<void> {
    const notificationId =
      job.notificationId || this.computeNotificationId(job.conversationId, job.correlationId, job.type);

    const payload: WhatsAppNotificationJob = {
      ...job,
      notificationId,
      conversationId: normalizeE164(job.conversationId),
      status: "PENDING",
      attemptCount: 0,
      nextRetryAt: Date.now(),
      createdAt: job.createdAt || Date.now(),
    };

    if (transactionContext) {
      const ref = transactionContext.db.collection(NOTIFICATIONS_COLLECTION).doc(notificationId);
      transactionContext.tx.set(ref, payload, { merge: true });
    } else {
      await firestoreDataSource.setDocument(NOTIFICATIONS_COLLECTION, notificationId, payload, true);
    }
  }

  /**
   * Claims a batch of PENDING notification jobs for execution.
   */
  public async claimPendingJobs(workerId: string, limitCount = 5, leaseMs = 30000): Promise<WhatsAppNotificationJob[]> {
    const now = Date.now();
    return await firestoreDataSource.runTransaction(async (tx, db) => {
      const q = db
        .collection(NOTIFICATIONS_COLLECTION)
        .where("status", "in", ["PENDING", "RETRY_PENDING"])
        .limit(limitCount);

      const snapshot = await tx.get(q);
      const claimed: WhatsAppNotificationJob[] = [];

      for (const doc of snapshot.docs) {
        const data = doc.data() as WhatsAppNotificationJob;
        const isLeaseExpired = !data.leaseExpiresAt || data.leaseExpiresAt < now;
        const isReadyForRetry = (data.nextRetryAt || 0) <= now;

        if (isLeaseExpired && isReadyForRetry && data.attemptCount < 5) {
          const updated: Partial<WhatsAppNotificationJob> = {
            status: "CLAIMED" as NotificationJobStatus,
            lockedBy: workerId,
            leaseExpiresAt: now + leaseMs,
            attemptCount: (data.attemptCount || 0) + 1,
          };
          tx.update(doc.ref, updated);
          claimed.push({ ...data, ...updated });
        }
      }

      return claimed;
    });
  }

  /**
   * Dispatches a claimed notification job to Brevo.
   */
  public async processJob(job: WhatsAppNotificationJob): Promise<{ success: boolean; error?: string }> {
    try {
      await firestoreDataSource.setDocument(
        NOTIFICATIONS_COLLECTION,
        job.notificationId,
        { status: "SENDING" as NotificationJobStatus },
        true
      );

      const result = await sendTransactionalEmail({
        purpose: "SYSTEM_NOTIFICATION",
        to: [{ email: job.recipientEmail }],
        subject: job.subject,
        htmlContent: job.htmlContent,
        textContent: job.textContent,
        idempotencyKey: job.notificationId,
      });

      if (result.success) {
        await firestoreDataSource.setDocument(
          NOTIFICATIONS_COLLECTION,
          job.notificationId,
          {
            status: "SENT" as NotificationJobStatus,
            sentAt: Date.now(),
            lockedBy: null,
            leaseExpiresAt: null,
          },
          true
        );
        return { success: true };
      } else {
        throw new Error(result.error || "Brevo delivery failed");
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      adminLogger.warn("WhatsApp:NotificationDispatchFailed", "Failed to dispatch email notification", {
        notificationId: job.notificationId,
        error: errorMessage,
      });

      // Exponential backoff retry
      const backoffMs = Math.min(300000, 5000 * Math.pow(2, job.attemptCount || 1));
      const nextStatus: NotificationJobStatus = (job.attemptCount || 1) >= 5 ? "DEAD_LETTER" : "RETRY_PENDING";

      await firestoreDataSource.setDocument(
        NOTIFICATIONS_COLLECTION,
        job.notificationId,
        {
          status: nextStatus,
          lastError: errorMessage,
          nextRetryAt: Date.now() + backoffMs,
          lockedBy: null,
          leaseExpiresAt: null,
        },
        true
      );

      return { success: false, error: errorMessage };
    }
  }
}

export const notificationRepository = new NotificationRepository();
