import { NextRequest, after } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";
import { ADMIN_COOKIE_NAME } from "@/lib/admin/constants";
import { verifyAdminSession } from "@/lib/admin/auth";
import { legalDocumentsRepository } from "@/lib/dal/repositories/legal-documents.repository";
import { sendLegalNotificationEmail } from "@/lib/email/legal-notification";
import { resolveAppUrl } from "@/lib/email/brevo";
import type { RecipientDeliveryStatus } from "@/types/legal";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id: jobId } = await context.params;
  if (!jobId) {
    return Response.json({ error: "Job ID required" }, { status: 400 });
  }

  // 1. Authorization: Verify Admin Session or Internal Worker Bearer Token
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  const session = sessionToken ? await verifyAdminSession(sessionToken) : null;

  const authHeader = req.headers.get("authorization");
  const workerSecret =
    process.env.CRON_SECRET ||
    process.env.JWT_SECRET ||
    "internal_legal_worker_secret";
  const isWorkerAuthorized =
    authHeader === `Bearer ${workerSecret}` ||
    req.headers.get("x-worker-secret") === workerSecret;

  if (!session && !isWorkerAuthorized) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Generate unique worker lease token
  const workerToken = `worker_${crypto.randomUUID()}`;

  // 3. Attempt to acquire or extend the 90-second lease
  const leaseRes = await legalDocumentsRepository.claimJobLease(jobId, workerToken);
  if (!leaseRes.data?.claimed) {
    return Response.json(
      {
        status: "LEASE_HELD_OR_TERMINAL",
        message: "Job is currently locked by an active worker or has already finalized.",
        currentStatus: leaseRes.data?.job?.status,
      },
      { status: 200 }
    );
  }

  const job = leaseRes.data.job;

  // 4. Fetch up to 10 pending recipients from subcollection
  const batchRes = await legalDocumentsRepository.fetchPendingBatch(jobId, 10);
  const pendingRecipients = batchRes.data || [];

  if (pendingRecipients.length === 0) {
    return Response.json(
      {
        status: "COMPLETED",
        jobId,
        processed: 0,
        message: "No pending recipients found.",
      },
      { status: 200 }
    );
  }

  // 5. Sequential Micro-Batch Execution with Pacing Sleep
  const updates: Array<{
    id: string;
    status: RecipientDeliveryStatus;
    sentAt?: string | null;
    brevoMessageId?: string | null;
    lastError?: string | null;
    isPermanentFailure?: boolean;
    attempts?: number;
  }> = [];

  for (const rec of pendingRecipients) {
    try {
      const dispatchResult = await sendLegalNotificationEmail({
        toEmail: rec.email,
        toName: rec.name,
        docType: job.docType,
        version: job.version,
        effectiveDate: job.effectiveDate,
        changeSummary: job.changeSummary,
        recipientType: rec.type,
        idempotencyKey: rec.idempotencyKey,
      });

      if (dispatchResult.success) {
        updates.push({
          id: rec.id,
          status: "SENT",
          sentAt: new Date().toISOString(),
          brevoMessageId: dispatchResult.messageId || null,
          attempts: (rec.attempts || 0) + 1,
        });
      } else {
        const nextAttempts = (rec.attempts || 0) + 1;
        const isPermanent = nextAttempts >= 3;
        updates.push({
          id: rec.id,
          status: isPermanent ? "FAILED" : "PENDING",
          lastError: dispatchResult.error || "Email delivery failed",
          isPermanentFailure: isPermanent,
          attempts: nextAttempts,
        });
      }
    } catch (err: unknown) {
      const nextAttempts = (rec.attempts || 0) + 1;
      const isPermanent = nextAttempts >= 3;
      updates.push({
        id: rec.id,
        status: isPermanent ? "FAILED" : "PENDING",
        lastError: err instanceof Error ? err.message : "Unexpected dispatch error",
        isPermanentFailure: isPermanent,
        attempts: nextAttempts,
      });
    }

    // 150ms pacing interval between SMTP provider requests
    await new Promise((res) => setTimeout(res, 150));
  }

  // 6. Commit Batch Progress with Stale-Worker Lease Verification
  const commitRes = await legalDocumentsRepository.commitBatchProgress(
    jobId,
    workerToken,
    updates
  );

  if (commitRes.error) {
    return Response.json(
      { error: `Commit rejected: ${commitRes.error}` },
      { status: 500 }
    );
  }

  const remaining = commitRes.data?.pendingCount ?? 0;

  // 7. Self-Chaining Asynchronous Dispatch if Remaining Recipients Exist
  if (remaining > 0) {
    const appBaseUrl = resolveAppUrl(req.headers);
    after(async () => {
      try {
        await fetch(`${appBaseUrl}/api/admin/legal/jobs/${jobId}/process`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${workerSecret}`,
            "Content-Type": "application/json",
          },
        });
      } catch (chainErr) {
        console.error("[LegalJobRunner:SelfChainError]", chainErr);
      }
    });

    return Response.json(
      {
        status: "PROCESSING",
        jobId,
        processedBatchCount: updates.length,
        remainingPending: remaining,
      },
      { status: 200 }
    );
  }

  return Response.json(
    {
      status: commitRes.data?.status || "COMPLETED",
      jobId,
      processedBatchCount: updates.length,
      remainingPending: 0,
    },
    { status: 200 }
  );
}
