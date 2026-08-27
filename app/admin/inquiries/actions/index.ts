"use server";

import { inquiriesRepository } from "@/lib/admin/repositories";
import { assertSuperadminSession } from "@/lib/admin/session";
import { dispatchInquiryReplyEmail } from "@/lib/email";
import { InquiryStatusUpdateSchema, ReplyInquirySchema } from "../validators";
import { revalidatePath } from "next/cache";

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
 * Server Action to reply to an inquiry via security@gauravservices.eu.cc using Brevo REST API v3.
 * Protected by strict superadmin session assertion and Zod payload validation.
 */
export async function replyToInquiryAction(formData: {
  id?: string;
  toEmail: string;
  toName?: string;
  subject: string;
  message: string;
}) {
  await assertSuperadminSession();

  const parsed = ReplyInquirySchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Validation failed" };
  }

  const dispatchResult = await dispatchInquiryReplyEmail({
    toEmail: parsed.data.toEmail,
    toName: parsed.data.toName,
    subject: parsed.data.subject,
    message: parsed.data.message,
    inquiryId: parsed.data.id,
  });

  if (!dispatchResult.success) {
    return {
      success: false,
      error: dispatchResult.error || "Failed to dispatch email reply via Brevo email gateway.",
    };
  }

  if (parsed.data.id) {
    await inquiriesRepository.recordInquiryReply(parsed.data.id, {
      replyMessage: parsed.data.message,
      replyMessageId: dispatchResult.messageId,
      senderIdentity: "security@gauravservices.eu.cc",
    });
  }

  revalidatePath("/admin/inquiries");
  return {
    success: true,
    messageId: dispatchResult.messageId,
  };
}

/**
 * Server Action to fetch inquiries server-side.
 */
export async function getInquiriesAction(page = 1, pageSize = 10) {
  return await inquiriesRepository.getInquiries({ page, pageSize });
}

