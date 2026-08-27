"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { assertSuperadminSession } from "@/lib/admin/session";
import { mailRepository } from "@/lib/dal/repositories/mail.repository";
import {
  ADMIN_MAIL_SENDERS,
  checkAdminMailRateLimit,
  compileSafeHtml,
  dispatchAdminMail,
  recordAdminMailSend,
} from "@/lib/email/mail-service";
import {
  MailQuerySchema,
  SaveDraftSchema,
  SendMailSchema,
} from "../validators";
import type { MailRecipient, MailSendStatus } from "@/lib/dal/repositories/types";

export interface SendMailActionResponse {
  success: boolean;
  status: MailSendStatus;
  messageId?: string;
  error?: string;
}


/**
 * Server Action to dispatch outbound emails from the Admin Mail Center.
 * Protected by superadmin session assertion, atomic Firestore deduplication,
 * server-side sender identity resolution, and multi-tier rate limiting.
 */
export async function sendAdminMailAction(
  formData: unknown
): Promise<SendMailActionResponse> {
  const session = await assertSuperadminSession();

  // 1. Zod Schema Validation
  const parsed = SendMailSchema.safeParse(formData);
  if (!parsed.success) {
    const errorMsg = parsed.error.issues[0]?.message || "Validation failed.";
    return {
      success: false,
      status: "FAILED",
      error: errorMsg,
    };
  }

  const { idempotencyKey, draftId, senderKey, to, cc, bcc, subject, body } = parsed.data;

  // 2. Resolve Verified Sender Identity
  const identity = ADMIN_MAIL_SENDERS[senderKey];
  if (!identity) {
    return {
      success: false,
      status: "FAILED",
      error: `SENDER_NOT_ALLOWED: Identity "${senderKey}" is not authorized.`,
    };
  }

  // 3. Extract Client IP & Check Admin Rate Limit
  const headersList = await headers();
  const forwardedFor = headersList.get("x-forwarded-for");
  const realIp = headersList.get("x-real-ip");
  const clientIp = forwardedFor ? forwardedFor.split(",")[0].trim() : realIp || "127.0.0.1";

  const rateCheck = await checkAdminMailRateLimit(session.email, clientIp);
  if (!rateCheck.allowed) {
    return {
      success: false,
      status: "FAILED",
      error: rateCheck.reason || "Rate limit exceeded. Please try again later.",
    };
  }

  // 4. Deduplicate Recipients (Merge duplicates between To, CC, and BCC)
  const toEmails = new Set(to.map((r) => r.email.toLowerCase()));
  const sanitizedCc = (cc || []).filter((r) => !toEmails.has(r.email.toLowerCase()));
  const ccEmails = new Set(sanitizedCc.map((r) => r.email.toLowerCase()));
  const sanitizedBcc = (bcc || []).filter(
    (r) => !toEmails.has(r.email.toLowerCase()) && !ccEmails.has(r.email.toLowerCase())
  );

  const cleanSubject = subject.replace(/[\r\n]/g, " ").trim();
  const htmlBody = compileSafeHtml(body, cleanSubject);

  // 5. Acquire Atomic Idempotency Lock in Firestore
  const lockResult = await mailRepository.initiateSendLock(idempotencyKey, {
    senderKey: identity.key,
    senderEmail: identity.email,
    senderName: identity.displayName,
    replyTo: identity.defaultReplyTo,
    to,
    cc: sanitizedCc,
    bcc: sanitizedBcc,
    subject: cleanSubject,
    textBody: body.trim(),
    htmlBody,
    sentByAdminEmail: session.email,
  });

  if (!lockResult.success || !lockResult.data?.acquired) {
    const existingStatus = lockResult.data?.existingStatus || "SENDING";
    if (existingStatus === "SENT") {
      return {
        success: true,
        status: "SENT",
        messageId: lockResult.data?.existingMessageId,
      };
    }
    return {
      success: false,
      status: existingStatus,
      error: lockResult.data?.error || lockResult.error || "Send operation in progress or deduplicated.",
    };
  }

  // 6. Execute Brevo REST API v3 Outbound Dispatch
  const dispatchResult = await dispatchAdminMail({
    senderKey: identity.key,
    to,
    cc: sanitizedCc,
    bcc: sanitizedBcc,
    subject: cleanSubject,
    body,
    idempotencyKey,
    adminEmail: session.email,
  });

  // 7. Finalize State in Firestore
  await mailRepository.finalizeSendStatus(idempotencyKey, {
    status: dispatchResult.status,
    brevoMessageId: dispatchResult.messageId,
    errorMessage: dispatchResult.error,
    draftIdToDelete: draftId,
  });

  // 8. Record Rate Limit & Revalidate Paths
  if (dispatchResult.status === "SENT") {
    recordAdminMailSend(session.email, clientIp);
  }

  revalidatePath("/admin/mail");

  return {
    success: dispatchResult.success,
    status: dispatchResult.status,
    messageId: dispatchResult.messageId,
    error: dispatchResult.error,
  };
}

/**
 * Server Action to save or update a draft in admin_mail_drafts.
 */
export async function saveMailDraftAction(formData: unknown) {
  const session = await assertSuperadminSession();

  const parsed = SaveDraftSchema.safeParse(formData);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || "Draft validation failed.",
    };
  }

  const result = await mailRepository.saveDraft({
    id: parsed.data.id,
    senderKey: parsed.data.senderKey,
    to: parsed.data.to as MailRecipient[],
    cc: parsed.data.cc as MailRecipient[],
    bcc: parsed.data.bcc as MailRecipient[],
    subject: parsed.data.subject || "",
    body: parsed.data.body || "",
    savedByAdminEmail: session.email,
  });

  if (!result.success) {
    return { success: false, error: result.error || "Failed to save draft." };
  }

  revalidatePath("/admin/mail");
  return { success: true, data: result.data };
}

/**
 * Server Action to delete a draft from admin_mail_drafts.
 */
export async function deleteMailDraftAction(draftId: string) {
  await assertSuperadminSession();

  if (!draftId || typeof draftId !== "string") {
    return { success: false, error: "Invalid draft ID." };
  }

  const result = await mailRepository.deleteDraft(draftId);
  if (!result.success) {
    return { success: false, error: result.error || "Failed to delete draft." };
  }

  revalidatePath("/admin/mail");
  return { success: true };
}

/**
 * Server Action to fetch cursor-paginated sent mail records.
 */
export async function getSentMailsAction(page = 1, pageSize = 20) {
  await assertSuperadminSession();
  const parsed = MailQuerySchema.safeParse({ page, pageSize });
  const queryParams = parsed.success ? parsed.data : { page: 1, pageSize: 20 };
  return await mailRepository.getSentMails(queryParams);
}

/**
 * Server Action to fetch active drafts for the logged-in superadmin.
 */
export async function getMailDraftsAction() {
  const session = await assertSuperadminSession();
  return await mailRepository.getDrafts(session.email);
}
