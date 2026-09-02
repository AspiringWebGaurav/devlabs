"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { headers } from "next/headers";
import { assertSuperadminSession } from "@/lib/admin/session";
import { purgeRepository } from "@/lib/dal/repositories/purge.repository";
import {
  lifecycleOtpService,
  type LifecycleOtpChallengePublic,
} from "@/lib/dal/lifecycle/lifecycle-otp.service";
import type {
  DatabaseAuditReport,
  LifecycleExecutionPlan,
  LifecycleExecutionReceipt,
  LifecycleOperationType,
  SanitizedActor,
} from "@/lib/dal/lifecycle/orchestrator";
import type { ActionResult } from "@/lib/actions/cms.actions";

/**
 * Server Action: Performs a non-destructive audit of all data stores.
 */
export async function auditDatabaseAction(): Promise<ActionResult<DatabaseAuditReport>> {
  try {
    await assertSuperadminSession();
    const result = await purgeRepository.auditDatabase();
    if (!result.success || !result.data) {
      throw new Error(result.error || "Failed to audit database.");
    }
    return { success: true, data: result.data };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Error auditing database";
    return { success: false, error: errorMsg };
  }
}

/**
 * Server Action: Generates an immutable preflight execution plan.
 */
export async function generatePlanAction(
  operation: LifecycleOperationType
): Promise<ActionResult<LifecycleExecutionPlan>> {
  try {
    await assertSuperadminSession();
    const result = await purgeRepository.generatePlan(operation);
    if (!result.success || !result.data) {
      throw new Error(result.error || "Failed to generate lifecycle plan.");
    }
    return { success: true, data: result.data };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Error generating plan";
    return { success: false, error: errorMsg };
  }
}

/**
 * Server Action: Executes a zero-mutation DRY RUN simulating the lifecycle operation.
 */
export async function dryRunAction(
  operation: LifecycleOperationType = "CLEAN"
): Promise<ActionResult<LifecycleExecutionReceipt>> {
  try {
    await assertSuperadminSession();
    const result = await purgeRepository.executeDryRun(operation);
    if (!result.success || !result.data) {
      throw new Error(result.error || "Failed to execute dry run.");
    }
    return { success: true, data: result.data };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Error executing dry run";
    return { success: false, error: errorMsg };
  }
}

/**
 * Server Action: Requests a 6-digit OTP security challenge sent to the admin email
 * for authorizing database lifecycle mutations (CLEAN, RESET, SEED, RESEED, RECONCILE).
 */
export async function requestLifecycleOtpAction(params: {
  operation: LifecycleOperationType;
  auditFingerprint: string;
  targetSummary?: {
    dynamicCount: number;
    staticCount: number;
    redisKeysCount: number;
  };
}): Promise<ActionResult<LifecycleOtpChallengePublic>> {
  try {
    const session = await assertSuperadminSession();
    const headersList = await headers();
    const clientIp = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    const userAgent = headersList.get("user-agent") || undefined;

    const adminEmail = session.email || process.env.ADMIN_EMAIL || "gaurav@example.com";
    const adminName = session.name || "Gaurav Patil";

    const challenge = await lifecycleOtpService.createChallenge({
      operation: params.operation,
      auditFingerprint: params.auditFingerprint,
      adminEmail,
      adminName,
      targetSummary: params.targetSummary,
      clientIp,
      userAgent,
      requestHeaders: headersList,
    });

    return { success: true, data: challenge };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to initiate OTP authorization";
    return { success: false, error: errorMsg };
  }
}

/**
 * Server Action: Resends a 6-digit OTP passcode with cooldown enforcement.
 */
export async function resendLifecycleOtpAction(
  challengeId: string
): Promise<ActionResult<LifecycleOtpChallengePublic>> {
  try {
    await assertSuperadminSession();
    const headersList = await headers();
    const clientIp = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";

    const challenge = await lifecycleOtpService.resendChallenge(challengeId, clientIp, headersList);
    return { success: true, data: challenge };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to resend authorization code";
    return { success: false, error: errorMsg };
  }
}

/**
 * Server Action: Verifies OTP challenge and executes the authorized lifecycle operation.
 */
export async function executeLifecycleWithOtpAction(params: {
  challengeId: string;
  otp: string;
  operation: LifecycleOperationType;
  auditFingerprint: string;
}): Promise<ActionResult<LifecycleExecutionReceipt>> {
  try {
    const session = await assertSuperadminSession();

    // 1. Verify 6-digit OTP challenge against server state
    await lifecycleOtpService.verifyChallenge(
      params.challengeId,
      params.otp,
      params.auditFingerprint
    );

    // 2. Prepare sanitized actor
    const actor: SanitizedActor = {
      actorId: session.email || "<authenticated-admin-id>",
      actorRole: "SUPERADMIN",
    };

    // 3. Execute the authorized lifecycle operation
    let execRes;

    switch (params.operation) {
      case "CLEAN":
        execRes = await purgeRepository.executeClean(params.auditFingerprint, actor);
        break;
      case "RESET":
        execRes = await purgeRepository.executeReset(params.auditFingerprint, actor);
        break;
      case "SEED":
        execRes = await purgeRepository.executeSeed(params.auditFingerprint, actor);
        break;
      case "RESEED":
        execRes = await purgeRepository.executeReseed(params.auditFingerprint, actor);
        break;
      case "RECONCILE":
        execRes = await purgeRepository.executeReconcile(params.auditFingerprint, actor);
        break;
      default:
        throw new Error(`Unsupported lifecycle operation: ${params.operation}`);
    }

    if (!execRes.success || !execRes.data) {
      throw new Error(execRes.error || `Failed to execute ${params.operation}.`);
    }

    // 4. Invalidate Next.js edge and layout caches
    revalidateTag("portfolio-cms");
    revalidatePath("/", "page");
    revalidatePath("/admin", "layout");
    revalidatePath("/admin/purge", "page");
    revalidatePath("/admin/inquiries", "page");
    revalidatePath("/admin/mail", "page");

    return { success: true, data: execRes.data };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Error executing lifecycle authorization";
    return { success: false, error: errorMsg };
  }
}

/**
 * Server Action: Executes CLEAN to wipe dynamic data and flush Redis cache directly.
 */
export async function executeCleanAction(
  confirmedAuditFingerprint: string
): Promise<ActionResult<LifecycleExecutionReceipt>> {
  try {
    const session = await assertSuperadminSession();

    if (!confirmedAuditFingerprint) {
      throw new Error("Missing audit fingerprint for stale state validation.");
    }

    const actor: SanitizedActor = {
      actorId: session.email || "<authenticated-admin-id>",
      actorRole: "SUPERADMIN",
    };

    const result = await purgeRepository.executeClean(confirmedAuditFingerprint, actor);
    if (!result.success || !result.data) {
      throw new Error(result.error || "Failed to execute database cleanup.");
    }

    revalidateTag("portfolio-cms");
    revalidatePath("/", "page");
    revalidatePath("/admin", "layout");
    revalidatePath("/admin/purge", "page");
    revalidatePath("/admin/inquiries", "page");
    revalidatePath("/admin/mail", "page");

    return { success: true, data: result.data };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Error executing clean";
    return { success: false, error: errorMsg };
  }
}

/**
 * Server Action: Executes RESET to wipe dynamic records and static portfolio content directly.
 */
export async function executeResetAction(
  confirmedAuditFingerprint: string
): Promise<ActionResult<LifecycleExecutionReceipt>> {
  try {
    const session = await assertSuperadminSession();

    if (!confirmedAuditFingerprint) {
      throw new Error("Missing audit fingerprint for stale state validation.");
    }

    const actor: SanitizedActor = {
      actorId: session.email || "<authenticated-admin-id>",
      actorRole: "SUPERADMIN",
    };

    const result = await purgeRepository.executeReset(confirmedAuditFingerprint, actor);
    if (!result.success || !result.data) {
      throw new Error(result.error || "Failed to execute environment reset.");
    }

    revalidateTag("portfolio-cms");
    revalidatePath("/", "page");
    revalidatePath("/admin", "layout");
    revalidatePath("/admin/purge", "page");
    revalidatePath("/admin/inquiries", "page");
    revalidatePath("/admin/mail", "page");

    return { success: true, data: result.data };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Error executing reset";
    return { success: false, error: errorMsg };
  }
}

/**
 * Server Action: Executes SEED directly.
 */
export async function executeSeedAction(
  confirmedAuditFingerprint: string
): Promise<ActionResult<LifecycleExecutionReceipt>> {
  try {
    const session = await assertSuperadminSession();

    if (!confirmedAuditFingerprint) {
      throw new Error("Missing audit fingerprint for stale state validation.");
    }

    const actor: SanitizedActor = {
      actorId: session.email || "<authenticated-admin-id>",
      actorRole: "SUPERADMIN",
    };

    const result = await purgeRepository.executeSeed(confirmedAuditFingerprint, actor);
    if (!result.success || !result.data) {
      throw new Error(result.error || "Failed to seed canonical static pillars.");
    }

    revalidateTag("portfolio-cms");
    revalidatePath("/", "page");
    revalidatePath("/admin", "layout");
    revalidatePath("/admin/purge", "page");

    return { success: true, data: result.data };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Error executing seed";
    return { success: false, error: errorMsg };
  }
}

/**
 * Server Action: Executes RESEED directly.
 */
export async function executeReseedAction(
  confirmedAuditFingerprint: string
): Promise<ActionResult<LifecycleExecutionReceipt>> {
  try {
    const session = await assertSuperadminSession();

    if (!confirmedAuditFingerprint) {
      throw new Error("Missing audit fingerprint for stale state validation.");
    }

    const actor: SanitizedActor = {
      actorId: session.email || "<authenticated-admin-id>",
      actorRole: "SUPERADMIN",
    };

    const result = await purgeRepository.executeReseed(confirmedAuditFingerprint, actor);
    if (!result.success || !result.data) {
      throw new Error(result.error || "Failed to reseed canonical static pillars.");
    }

    revalidateTag("portfolio-cms");
    revalidatePath("/", "page");
    revalidatePath("/admin", "layout");
    revalidatePath("/admin/purge", "page");

    return { success: true, data: result.data };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Error executing reseed";
    return { success: false, error: errorMsg };
  }
}

/**
 * Server Action: Executes RECONCILE directly.
 */
export async function executeReconcileAction(
  confirmedAuditFingerprint: string
): Promise<ActionResult<LifecycleExecutionReceipt>> {
  try {
    const session = await assertSuperadminSession();

    if (!confirmedAuditFingerprint) {
      throw new Error("Missing audit fingerprint for stale state validation.");
    }

    const actor: SanitizedActor = {
      actorId: session.email || "<authenticated-admin-id>",
      actorRole: "SUPERADMIN",
    };

    const result = await purgeRepository.executeReconcile(confirmedAuditFingerprint, actor);
    if (!result.success || !result.data) {
      throw new Error(result.error || "Failed to reconcile database state.");
    }

    revalidateTag("portfolio-cms");
    revalidatePath("/", "page");
    revalidatePath("/admin", "layout");
    revalidatePath("/admin/purge", "page");

    return { success: true, data: result.data };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Error executing reconcile";
    return { success: false, error: errorMsg };
  }
}

/**
 * Server Action: Retrieves server cursor-paginated execution history.
 */
export async function getExecutionHistoryAction(
  limit = 10,
  cursor?: string
): Promise<ActionResult<{ receipts: LifecycleExecutionReceipt[]; nextCursor?: string }>> {
  try {
    await assertSuperadminSession();
    const result = await purgeRepository.getRecentExecutions(limit, cursor);
    if (!result.success || !result.data) {
      throw new Error(result.error || "Failed to fetch execution history.");
    }
    return { success: true, data: result.data };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Error fetching history";
    return { success: false, error: errorMsg };
  }
}
