"use server";

import { revalidatePath } from "next/cache";
import { assertSuperadminSession } from "@/lib/admin/session";
import { legalDocumentsRepository } from "@/lib/dal/repositories/legal-documents.repository";
import {
  SaveDraftSchema,
  DiscardDraftSchema,
  PublishDocumentSchema,
  RestoreVersionSchema,
  RetryJobSchema,
  SaveDraftInput,
  DiscardDraftInput,
  PublishDocumentInput,
  RestoreVersionInput,
  RetryJobInput,
} from "@/lib/admin/schemas/legal.schema";
import { resolveAppUrl } from "@/lib/email/brevo";
import type { LegalDocument } from "@/types/legal";

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Saves uncommitted working draft for Terms of Service or Privacy Policy.
 */
export async function saveDraftAction(
  input: SaveDraftInput
): Promise<ActionResult<{ savedAt: string }>> {
  try {
    const session = await assertSuperadminSession();
    const parsed = SaveDraftSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues.map((i) => i.message).join(", "),
      };
    }

    const now = new Date().toISOString();
    const res = await legalDocumentsRepository.saveDraft(parsed.data.docType, {
      version: parsed.data.version,
      effectiveDate: parsed.data.effectiveDate,
      lastUpdatedDate: parsed.data.lastUpdatedDate,
      changeSummary: parsed.data.changeSummary,
      isMaterialChange: parsed.data.isMaterialChange,
      sections: parsed.data.sections,
      savedAt: now,
      savedByAdmin: session.email,
    });

    if (res.error) {
      return { success: false, error: res.error };
    }

    revalidatePath("/admin/legal");
    revalidatePath("/admin/legal/editor");

    return { success: true, data: { savedAt: now } };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to save draft",
    };
  }
}

/**
 * Discards uncommitted draft and restores active published document state.
 */
export async function discardDraftAction(
  input: DiscardDraftInput
): Promise<ActionResult<void>> {
  try {
    await assertSuperadminSession();
    const parsed = DiscardDraftSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues.map((i) => i.message).join(", "),
      };
    }

    const res = await legalDocumentsRepository.discardDraft(parsed.data.docType);
    if (res.error) {
      return { success: false, error: res.error };
    }

    revalidatePath("/admin/legal");
    revalidatePath("/admin/legal/editor");

    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to discard draft",
    };
  }
}

/**
 * Atomically publishes a legal document revision, creates an immutable historical record,
 * and initializes a durable notification job if marked as a material change.
 */
export async function publishDocumentAction(
  input: PublishDocumentInput
): Promise<
  ActionResult<{
    publishedDoc: LegalDocument;
    historyDocId: string;
    jobId?: string;
  }>
> {
  try {
    const session = await assertSuperadminSession();
    const parsed = PublishDocumentSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues.map((i) => i.message).join(", "),
      };
    }

    const publishRes = await legalDocumentsRepository.publishDocument({
      docType: parsed.data.docType,
      expectedVersion: parsed.data.expectedVersion,
      version: parsed.data.version,
      effectiveDate: parsed.data.effectiveDate,
      lastUpdatedDate: parsed.data.lastUpdatedDate,
      changeSummary: parsed.data.changeSummary,
      isMaterialChange: parsed.data.isMaterialChange,
      sections: parsed.data.sections,
      adminEmail: session.email,
    });

    if (publishRes.error || !publishRes.data) {
      return {
        success: false,
        error: publishRes.error || "Publication transaction failed",
      };
    }

    const { publishedDoc, historyDocId, jobId } = publishRes.data;

    // If material change created a job, snapshot recipients and trigger worker
    if (jobId) {
      try {
        await legalDocumentsRepository.resolveRecipientSnapshot(jobId);

        // Async kickoff without blocking publish response
        const appBaseUrl = resolveAppUrl();
        const workerSecret =
          process.env.CRON_SECRET ||
          process.env.JWT_SECRET ||
          "internal_legal_worker_secret";

        fetch(`${appBaseUrl}/api/admin/legal/jobs/${jobId}/process`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${workerSecret}`,
            "Content-Type": "application/json",
          },
        }).catch((err) => {
          console.error("[PublishAction:KickoffError]", err);
        });
      } catch (snapshotErr) {
        console.error("[PublishAction:RecipientSnapshotError]", snapshotErr);
      }
    }

    // Edge cache and route revalidations
    revalidatePath("/terms");
    revalidatePath("/privacy");
    revalidatePath("/admin/legal");
    revalidatePath("/admin/legal/editor");
    revalidatePath("/admin/legal/history");

    return {
      success: true,
      data: { publishedDoc, historyDocId, jobId },
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to publish document",
    };
  }
}

/**
 * Restores a historical legal snapshot into the current working draft.
 */
export async function restoreVersionAction(
  input: RestoreVersionInput
): Promise<ActionResult<void>> {
  try {
    const session = await assertSuperadminSession();
    const parsed = RestoreVersionSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues.map((i) => i.message).join(", "),
      };
    }

    const res = await legalDocumentsRepository.restoreVersionAsDraft(
      parsed.data.docType,
      parsed.data.historyId,
      session.email
    );

    if (res.error) {
      return { success: false, error: res.error };
    }

    revalidatePath("/admin/legal");
    revalidatePath("/admin/legal/editor");

    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to restore version",
    };
  }
}

/**
 * Requeues failed recipients for a legal notification job and re-triggers the runner.
 */
export async function retryJobAction(
  input: RetryJobInput
): Promise<ActionResult<void>> {
  try {
    await assertSuperadminSession();
    const parsed = RetryJobSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues.map((i) => i.message).join(", "),
      };
    }

    const res = await legalDocumentsRepository.retryFailedRecipients(
      parsed.data.jobId
    );

    if (res.error) {
      return { success: false, error: res.error };
    }

    // Trigger processor immediately
    const appBaseUrl = resolveAppUrl();
    const workerSecret =
      process.env.CRON_SECRET ||
      process.env.JWT_SECRET ||
      "internal_legal_worker_secret";

    fetch(`${appBaseUrl}/api/admin/legal/jobs/${parsed.data.jobId}/process`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${workerSecret}`,
        "Content-Type": "application/json",
      },
    }).catch((err) => {
      console.error("[RetryJobAction:KickoffError]", err);
    });

    revalidatePath("/admin/legal");

    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to retry job",
    };
  }
}

/**
 * Retrieves the frozen recipient email records for a specific broadcast job.
 */
export async function getJobRecipientsAction(
  jobId: string
): Promise<ActionResult<import("@/types/legal").LegalNotificationRecipientRecord[]>> {
  try {
    await assertSuperadminSession();
    if (!jobId || typeof jobId !== "string") {
      return { success: false, error: "Invalid job ID provided" };
    }

    const res = await legalDocumentsRepository.getJobRecipients(jobId.trim(), 100);
    if (res.error) {
      return { success: false, error: res.error };
    }

    return { success: true, data: res.data || [] };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to fetch job recipients",
    };
  }
}

/**
 * Retrieves a preview of eligible recipients who would receive an update if published now.
 */
export async function getEligibleRecipientsPreviewAction(): Promise<
  ActionResult<{ email: string; name?: string; type: string }[]>
> {
  try {
    await assertSuperadminSession();
    const res = await legalDocumentsRepository.getEligibleRecipientsPreview();
    if (res.error) {
      return { success: false, error: res.error };
    }

    return { success: true, data: res.data || [] };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to preview recipients",
    };
  }
}

