/**
 * Live Chat Durable Alert Job Delivery Service
 * Manages atomic creation, worker claiming, bounded dispatch, and reconciliation
 * for Live Chat admin notification emails across container / process restarts.
 */

import { firestoreDataSource } from "@/lib/dal/datasource/firestore";
import { dispatchLiveChatAdminNotificationEmail } from "@/lib/email/brevo";
import { adminLogger } from "@/lib/admin/logger";

export type LiveChatAlertJobStatus =
  | "PENDING"
  | "CLAIMED"
  | "SENT"
  | "FAILED"
  | "DELIVERY_UNCERTAIN";

export interface LiveChatAlertJobDocument {
  id: string;
  jobId: string;
  requestId: string;
  threadId: string;
  messageId: string;
  visitorName: string;
  visitorEmail: string;
  messageText: string;
  adminToken: string;
  baseUrl: string;
  attemptCount: number;
  maxAttempts: number;
  status: LiveChatAlertJobStatus;
  createdAt: string;
  updatedAt: string;
  lockedUntil?: string | null;
  claimedByWorkerId?: string | null;
  idempotencyKey: string;
  delivery: {
    state: "PENDING" | "SENT" | "FAILED" | "DELIVERY_UNCERTAIN";
    brevoMessageId?: string;
    dispatchedAt?: string;
    error?: string;
  };
}

const COLLECTION_NAME = "live_chat_alert_jobs";

/**
 * Creates a durable alert job in Firestore BEFORE HTTP response returns.
 * Deduplicates by idempotency key (alert_<threadId>_<messageId>).
 */
export async function createLiveChatAlertJob(params: {
  requestId: string;
  threadId: string;
  messageId: string;
  visitorName: string;
  visitorEmail: string;
  messageText: string;
  adminToken: string;
  baseUrl: string;
}): Promise<LiveChatAlertJobDocument> {
  const idempotencyKey = `alert_${params.threadId}_${params.messageId}`;
  const jobId = `job_${idempotencyKey}`;
  const now = new Date().toISOString();

  // Check if job already exists
  const existing = await firestoreDataSource.getDocument<LiveChatAlertJobDocument>(
    COLLECTION_NAME,
    jobId
  );
  if (existing) {
    adminLogger.info("LiveChatAlertJob:createJob", "Reusing existing alert job", { jobId, status: existing.status });
    return existing;
  }

  const jobDoc: LiveChatAlertJobDocument = {
    id: jobId,
    jobId,
    requestId: params.requestId,
    threadId: params.threadId,
    messageId: params.messageId,
    visitorName: params.visitorName,
    visitorEmail: params.visitorEmail,
    messageText: params.messageText,
    adminToken: params.adminToken,
    baseUrl: params.baseUrl,
    attemptCount: 0,
    maxAttempts: 3,
    status: "PENDING",
    createdAt: now,
    updatedAt: now,
    lockedUntil: null,
    claimedByWorkerId: null,
    idempotencyKey,
    delivery: {
      state: "PENDING",
    },
  };

  await firestoreDataSource.setDocument(COLLECTION_NAME, jobId, jobDoc, true);
  adminLogger.info("LiveChatAlertJob:createJob", "Durable alert job persisted", { jobId, threadId: params.threadId });
  return jobDoc;
}

/**
 * Atomically claims a job for processing with a lease TTL.
 * Recovers stale locks if lockedUntil < now.
 */
export async function claimAlertJob(
  jobId: string,
  workerId: string,
  leaseMs = 60000
): Promise<{ success: boolean; job?: LiveChatAlertJobDocument; reason?: string }> {
  return await firestoreDataSource.runTransaction(async (transaction, db) => {
    const docRef = db.collection(COLLECTION_NAME).doc(jobId);
    const snap = await transaction.get(docRef);

    if (!snap.exists) {
      return { success: false, reason: "JOB_NOT_FOUND" };
    }

    const job = snap.data() as LiveChatAlertJobDocument;

    // Invariant: Confirmed SENT job must NEVER be resent
    if (job.status === "SENT" || job.delivery?.state === "SENT") {
      return { success: false, reason: "ALREADY_SENT", job };
    }

    // Invariant: If claimed and lease has not expired, do not allow other workers to claim
    const now = Date.now();
    const lockTime = job.lockedUntil ? new Date(job.lockedUntil).getTime() : 0;
    const isLocked = job.status === "CLAIMED" && lockTime > now;

    if (isLocked && job.claimedByWorkerId !== workerId) {
      return { success: false, reason: "LOCKED_BY_OTHER_WORKER", job };
    }

    if (job.attemptCount >= job.maxAttempts && job.status === "FAILED") {
      return { success: false, reason: "MAX_ATTEMPTS_EXCEEDED", job };
    }

    const lockedUntil = new Date(now + leaseMs).toISOString();
    const updated: Partial<LiveChatAlertJobDocument> = {
      status: "CLAIMED",
      attemptCount: (job.attemptCount || 0) + 1,
      claimedByWorkerId: workerId,
      lockedUntil,
      updatedAt: new Date().toISOString(),
    };

    transaction.update(docRef, updated);
    return {
      success: true,
      job: { ...job, ...updated } as LiveChatAlertJobDocument,
    };
  });
}

/**
 * Executes the alert job dispatch via Brevo and persists the terminal / uncertain state.
 */
export async function processAlertJob(
  jobId: string,
  workerId: string
): Promise<{ success: boolean; status: LiveChatAlertJobStatus; brevoMessageId?: string; error?: string }> {
  const claimRes = await claimAlertJob(jobId, workerId);
  if (!claimRes.success || !claimRes.job) {
    if (claimRes.reason === "ALREADY_SENT") {
      return {
        success: true,
        status: "SENT",
        brevoMessageId: claimRes.job?.delivery?.brevoMessageId,
      };
    }
    return {
      success: false,
      status: claimRes.job?.status || "FAILED",
      error: claimRes.reason,
    };
  }

  const job = claimRes.job;

  try {
    const emailResult = await dispatchLiveChatAdminNotificationEmail({
      visitorName: job.visitorName,
      visitorEmail: job.visitorEmail,
      message: job.messageText,
      threadId: job.threadId,
      roomAccessSecret: job.adminToken,
      notificationType: "FIRST_MESSAGE",
      baseUrl: job.baseUrl,
      applicationDispatchId: job.idempotencyKey,
      clientMessageId: job.messageId,
    });

    const now = new Date().toISOString();

    if (emailResult.success) {
      const updateData: Partial<LiveChatAlertJobDocument> = {
        status: "SENT",
        lockedUntil: null,
        claimedByWorkerId: null,
        updatedAt: now,
        delivery: {
          state: "SENT",
          brevoMessageId: emailResult.messageId,
          dispatchedAt: now,
        },
      };
      await firestoreDataSource.setDocument(COLLECTION_NAME, jobId, updateData, true);
      adminLogger.info("LiveChatAlertJob:processAlertJob", "Job successfully sent", { jobId, messageId: emailResult.messageId });
      return { success: true, status: "SENT", brevoMessageId: emailResult.messageId };
    } else {
      const errStr = emailResult.error || "Unknown dispatch error";
      const isUncertain =
        errStr.toLowerCase().includes("timeout") ||
        errStr.toLowerCase().includes("network") ||
        errStr.toLowerCase().includes("econnreset");

      const nextStatus: LiveChatAlertJobStatus = isUncertain
        ? "DELIVERY_UNCERTAIN"
        : job.attemptCount >= job.maxAttempts
        ? "FAILED"
        : "PENDING";

      const updateData: Partial<LiveChatAlertJobDocument> = {
        status: nextStatus,
        lockedUntil: null,
        claimedByWorkerId: null,
        updatedAt: now,
        delivery: {
          state: isUncertain ? "DELIVERY_UNCERTAIN" : "FAILED",
          error: errStr,
        },
      };
      await firestoreDataSource.setDocument(COLLECTION_NAME, jobId, updateData, true);
      adminLogger.warn("LiveChatAlertJob:processAlertJob", "Job failed/uncertain dispatch", { jobId, status: nextStatus, error: errStr });
      return { success: false, status: nextStatus, error: errStr };
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    const now = new Date().toISOString();
    const isUncertain =
      errorMsg.toLowerCase().includes("timeout") ||
      errorMsg.toLowerCase().includes("abort") ||
      errorMsg.toLowerCase().includes("econnreset");

    const nextStatus: LiveChatAlertJobStatus = isUncertain
      ? "DELIVERY_UNCERTAIN"
      : job.attemptCount >= job.maxAttempts
      ? "FAILED"
      : "PENDING";

    const updateData: Partial<LiveChatAlertJobDocument> = {
      status: nextStatus,
      lockedUntil: null,
      claimedByWorkerId: null,
      updatedAt: now,
      delivery: {
        state: isUncertain ? "DELIVERY_UNCERTAIN" : "FAILED",
        error: errorMsg,
      },
    };
    await firestoreDataSource.setDocument(COLLECTION_NAME, jobId, updateData, true);
    adminLogger.error("LiveChatAlertJob:processAlertJob", err, `Exception processing job ${jobId}`);
    return { success: false, status: nextStatus, error: errorMsg };
  }
}

/**
 * Triggers background worker execution without blocking the caller or HTTP response.
 */
export function triggerAlertJobProcessing(jobId: string): void {
  const workerId = `worker_${process.pid}_${Date.now()}`;
  setImmediate(() => {
    processAlertJob(jobId, workerId).catch((err) => {
      adminLogger.warn("LiveChatAlertJob:triggerWorker", "Async worker exception", { jobId, error: String(err) });
    });
  });
}

/**
 * Sweeps and reconciles pending, stale-locked, and uncertain alert jobs.
 */
export async function sweepAndReconcileAlertJobs(
  workerId = `sweeper_${Date.now()}`
): Promise<{ sweptCount: number; reconciledCount: number }> {
  const now = Date.now();
  const allJobs = await firestoreDataSource.getAllDocuments<LiveChatAlertJobDocument>(COLLECTION_NAME);

  let sweptCount = 0;
  let reconciledCount = 0;

  for (const job of allJobs) {
    if (job.status === "SENT") continue;

    const lockTime = job.lockedUntil ? new Date(job.lockedUntil).getTime() : 0;
    const isStaleLock = job.status === "CLAIMED" && lockTime < now;
    const isPending = job.status === "PENDING";
    const isUncertain = job.status === "DELIVERY_UNCERTAIN";

    if (isPending || isStaleLock || isUncertain) {
      sweptCount++;
      const res = await processAlertJob(job.id, workerId);
      if (res.success && res.status === "SENT") {
        reconciledCount++;
      }
    }
  }

  return { sweptCount, reconciledCount };
}
