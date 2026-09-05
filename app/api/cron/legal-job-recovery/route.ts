import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE_NAME } from "@/lib/admin/constants";
import { verifyAdminSession } from "@/lib/admin/auth";
import { legalDocumentsRepository } from "@/lib/dal/repositories/legal-documents.repository";
import { resolveAppUrl } from "@/lib/email/brevo";
import type { LegalNotificationJobDocument } from "@/types/legal";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<Response> {
  // 1. Authenticate via Vercel Cron Secret or Admin Session
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET || process.env.JWT_SECRET || "internal_legal_worker_secret";
  const isCronAuthorized = authHeader === `Bearer ${cronSecret}`;

  let isAdminAuthorized = false;
  if (!isCronAuthorized) {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
    if (sessionToken) {
      const session = await verifyAdminSession(sessionToken);
      if (session) isAdminAuthorized = true;
    }
  }

  if (!isCronAuthorized && !isAdminAuthorized) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Query recent notification jobs
  const jobsRes = await legalDocumentsRepository.getRecentNotificationJobs(30);
  const jobs = jobsRes.data || [];

  const now = Date.now();
  const recoverableJobs: LegalNotificationJobDocument[] = [];

  for (const job of jobs) {
    // A job is recoverable if it is QUEUED, RETRYING, or PROCESSING with an expired lease
    const isQueued = job.status === "QUEUED";
    const isRetrying = job.status === "RETRYING";
    const isStuckProcessing =
      job.status === "PROCESSING" && (job.leaseExpiresAt ?? 0) < now;

    if (isQueued || isRetrying || isStuckProcessing) {
      recoverableJobs.push(job);
    }
  }

  // 3. Trigger processor for each recoverable job asynchronously
  const appBaseUrl = resolveAppUrl(req.headers);
  const workerSecret =
    process.env.CRON_SECRET ||
    process.env.JWT_SECRET ||
    "internal_legal_worker_secret";

  for (const job of recoverableJobs) {
    fetch(`${appBaseUrl}/api/admin/legal/jobs/${job.id}/process`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${workerSecret}`,
        "Content-Type": "application/json",
      },
    }).catch((err) => {
      console.error(`[LegalCronRecovery] Failed to trigger job ${job.id}:`, err);
    });
  }

  return Response.json({
    recoveredJobsCount: recoverableJobs.length,
    jobIds: recoverableJobs.map((j) => j.id),
    timestamp: new Date().toISOString(),
  });
}
