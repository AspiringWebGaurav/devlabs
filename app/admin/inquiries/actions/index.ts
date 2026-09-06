"use server";

import crypto from "crypto";
import { inquiriesRepository } from "@/lib/admin/repositories";
import { assertSuperadminSession } from "@/lib/admin/session";
import { dispatchInquiryReplyEmail, EMAIL_IDENTITIES } from "@/lib/email";
import { adminLogger } from "@/lib/admin/logger";
import { InquiryStatusUpdateSchema, ReplyInquirySchema } from "../validators";
import { revalidatePath } from "next/cache";

/**
 * Server Action response contract for inquiry reply workflow.
 */
export interface ReplyToInquiryActionResponse {
  success: boolean;
  status: "RECORDED" | "PERSISTENCE_PENDING" | "ALREADY_REPLIED" | "FAILED";
  messageId?: string;
  error?: string;
  warning?: string;
}

/**
 * Server Action to update an inquiry's status (read, unread, archived).
 */
export async function updateInquiryStatusAction(formData: { id: string; status: "unread" | "read" | "archived" }) {
  await assertSuperadminSession();

  const parsed = InquiryStatusUpdateSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Validation failed" };
  }

  const result = await inquiriesRepository.updateInquiryStatus(parsed.data.id, parsed.data.status);
  if (!result.success) {
    return { success: false, error: result.error || "Failed to update inquiry status" };
  }

  revalidatePath("/admin/inquiries");
  return { success: true };
}

/**
 * Server Action to reply to an inquiry via security@gauravpatil.site using Brevo REST API v3.
 * Protected by strict superadmin session assertion, Zod validation, and atomic transaction locks.
 */
export async function replyToInquiryAction(formData: {
  id?: string;
  idempotencyKey?: string;
  toEmail: string;
  toName?: string;
  subject: string;
  message: string;
}): Promise<ReplyToInquiryActionResponse> {
  const session = await assertSuperadminSession();

  const parsed = ReplyInquirySchema.safeParse(formData);
  if (!parsed.success) {
    return {
      success: false,
      status: "FAILED",
      error: parsed.error.issues[0]?.message || "Validation failed",
    };
  }

  const { id, toEmail, toName, subject, message } = parsed.data;

  // Operation ID: Unique to this logical reply session, preserved across retries
  const idempotencyKey =
    parsed.data.idempotencyKey ||
    `inq_reply_${id || "outreach"}_${Date.now()}_${crypto.randomBytes(6).toString("hex")}`;

  adminLogger.info("reply.send.started", "Initiating inquiry reply dispatch", {
    inquiryId: id,
    toEmail,
    idempotencyKey,
    adminEmail: session.email,
  });

  // 1. Atomic Firestore Transaction Lock & Operation Deduplication Guard
  if (id) {
    const lockResult = await inquiriesRepository.acquireReplyLock(id, idempotencyKey);
    if (!lockResult.success || !lockResult.data?.acquired) {
      if (lockResult.data?.alreadyReplied) {
        adminLogger.info("reply.already_recorded", "This exact reply operation was already recorded; returning existing messageId", {
          inquiryId: id,
          idempotencyKey,
          replyMessageId: lockResult.data.existingMessageId,
        });

        return {
          success: true,
          status: "ALREADY_REPLIED",
          messageId: lockResult.data.existingMessageId,
          warning: "This reply operation was already dispatched and recorded.",
        };
      }

      if (lockResult.data?.inProgress) {
        adminLogger.warn("reply.lock_in_progress", "Concurrent send attempt blocked by atomic lock", {
          inquiryId: id,
          idempotencyKey,
        });

        return {
          success: false,
          status: "FAILED",
          error: "A reply send operation is currently in-flight for this inquiry from another tab or request. Please wait a moment.",
        };
      }

      return {
        success: false,
        status: "FAILED",
        error: lockResult.data?.error || "Failed to acquire atomic inquiry reply lock.",
      };
    }
  }

  // 2. Dispatch via Brevo REST API v3 with stable Idempotency Key
  const dispatchResult = await dispatchInquiryReplyEmail({
    toEmail,
    toName,
    subject,
    message,
    inquiryId: id,
    idempotencyKey,
  });

  if (!dispatchResult.success) {
    adminLogger.warn("reply.failed", "Brevo email dispatch failed or rejected", {
      inquiryId: id,
      idempotencyKey,
      error: dispatchResult.error,
    });

    if (id) {
      await inquiriesRepository.releaseReplyLock(id);
    }

    return {
      success: false,
      status: "FAILED",
      error: dispatchResult.error || "Failed to dispatch email reply via Brevo email gateway.",
    };
  }

  const messageId = dispatchResult.messageId || "msg_accepted";
  adminLogger.info("reply.brevo.accepted", "Email accepted by Brevo", {
    inquiryId: id,
    messageId,
    idempotencyKey,
  });

  // 3. Atomically Record Reply in Firestore and Clear Lock
  if (id) {
    try {
      const recordResult = await inquiriesRepository.recordInquiryReply(id, {
        replyMessage: message,
        replyMessageId: messageId,
        senderIdentity: EMAIL_IDENTITIES.SECURITY.primaryEmail,
        idempotencyKey,
      });

      if (!recordResult.success) {
        adminLogger.error(
          "reply.firestore.persistence_pending",
          new Error(recordResult.error || "Firestore write failed"),
          "Email accepted by Brevo but local Firestore recording failed",
          {
            inquiryId: id,
            messageId,
            idempotencyKey,
          }
        );

        return {
          success: true,
          status: "PERSISTENCE_PENDING",
          messageId,
          warning: "Email accepted by Brevo, but local inquiry history sync is pending.",
        };
      }

      adminLogger.info("reply.firestore.recorded", "Reply recorded in Firestore successfully", {
        inquiryId: id,
        messageId,
        senderIdentity: EMAIL_IDENTITIES.SECURITY.primaryEmail,
        idempotencyKey,
      });
    } catch (dbErr: unknown) {
      adminLogger.error(
        "reply.firestore.persistence_pending",
        dbErr as Error,
        "Exception while recording reply in Firestore",
        {
          inquiryId: id,
          messageId,
          idempotencyKey,
        }
      );

      return {
        success: true,
        status: "PERSISTENCE_PENDING",
        messageId,
        warning: "Email accepted by Brevo, but local inquiry history sync is pending.",
      };
    }
  }

  revalidatePath("/admin/inquiries");
  return {
    success: true,
    status: "RECORDED",
    messageId,
  };
}

/**
 * Server Action to fetch inquiries server-side.
 */
export async function getInquiriesAction(page = 1, pageSize = 10) {
  return await inquiriesRepository.getInquiries({ page, pageSize });
}
