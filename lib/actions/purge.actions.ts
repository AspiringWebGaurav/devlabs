"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { assertSuperadminSession } from "@/lib/admin/session";
import { purgeRepository } from "@/lib/dal/repositories/purge.repository";
import type { DatabaseAuditReport, LifecycleExecutionReceipt } from "@/lib/dal/lifecycle/orchestrator";
import type { SeedOptions } from "@/lib/dal/lifecycle/seed-generator";
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
 * Server Action: Executes a zero-mutation DRY RUN simulating the lifecycle purge.
 */
export async function dryRunAction(): Promise<ActionResult<LifecycleExecutionReceipt>> {
  try {
    await assertSuperadminSession();
    const result = await purgeRepository.executeDryRun();
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
 * Server Action: Executes PURGE ONLY to clean all dynamic data.
 */
export async function executePurgeOnlyAction(
  confirmationPhrase: string,
  confirmedAuditFingerprint: string
): Promise<ActionResult<LifecycleExecutionReceipt>> {
  try {
    await assertSuperadminSession();

    const normalizedPhrase = confirmationPhrase.trim().toUpperCase();
    if (normalizedPhrase !== "CLEAN DATABASE" && normalizedPhrase !== "PURGE DATABASE") {
      throw new Error("Invalid confirmation phrase. Expected 'CLEAN DATABASE'.");
    }

    if (!confirmedAuditFingerprint) {
      throw new Error("Missing audit fingerprint for stale state validation.");
    }

    const result = await purgeRepository.executePurgeOnly(confirmedAuditFingerprint);
    if (!result.success || !result.data) {
      throw new Error(result.error || "Failed to execute database purge.");
    }

    // Invalidate Next.js edge and layout caches
    revalidateTag("portfolio-cms");
    revalidatePath("/", "page");
    revalidatePath("/admin", "layout");
    revalidatePath("/admin/purge", "page");
    revalidatePath("/admin/inquiries", "page");
    revalidatePath("/admin/mail", "page");

    return { success: true, data: result.data };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Error executing purge";
    return { success: false, error: errorMsg };
  }
}

/**
 * Server Action: Executes RESET & RESEED to purge and seed synthetic data.
 */
export async function executeResetAndReseedAction(
  confirmationPhrase: string,
  confirmedAuditFingerprint: string,
  seedOptions: SeedOptions
): Promise<ActionResult<LifecycleExecutionReceipt>> {
  try {
    await assertSuperadminSession();

    const normalizedPhrase = confirmationPhrase.trim().toUpperCase();
    if (
      normalizedPhrase !== "CLEAN AND RESEED" &&
      normalizedPhrase !== "CLEAN AND RESEED DATABASE" &&
      normalizedPhrase !== "RESET AND RESEED DATABASE"
    ) {
      throw new Error("Invalid confirmation phrase. Expected 'CLEAN AND RESEED'.");
    }

    if (!confirmedAuditFingerprint) {
      throw new Error("Missing audit fingerprint for stale state validation.");
    }

    const result = await purgeRepository.executeResetAndReseed(confirmedAuditFingerprint, seedOptions);
    if (!result.success || !result.data) {
      throw new Error(result.error || "Failed to execute reset and reseed.");
    }

    // Invalidate Next.js edge and layout caches
    revalidateTag("portfolio-cms");
    revalidatePath("/", "page");
    revalidatePath("/admin", "layout");
    revalidatePath("/admin/purge", "page");
    revalidatePath("/admin/inquiries", "page");
    revalidatePath("/admin/mail", "page");

    return { success: true, data: result.data };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Error executing reset and reseed";
    return { success: false, error: errorMsg };
  }
}
