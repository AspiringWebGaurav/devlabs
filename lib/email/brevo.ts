/**
 * Core Brevo Transactional Email Service
 *
 * Centralized server-side execution pipeline for all transactional emails.
 * Security Mandate: Never expose BREVO_API_KEY to browser/client-side code.
 */

import {
  EMAIL_IDENTITIES,
  EmailIdentity,
  EmailPurpose,
  getEmailIdentityForPurpose,
} from "./identities";
import { BREVO_TEMPLATES } from "./templates";

const BREVO_API_ENDPOINT = "https://api.brevo.com/v3/smtp/email";

export interface EmailRecipient {
  email: string;
  name?: string;
}

export interface EmailAttachment {
  name: string;
  content?: string; // Base64 encoded content
  url?: string;
}

export interface SendTransactionalEmailOptions {
  purpose?: EmailPurpose;
  identity?: EmailIdentity;
  to: EmailRecipient[];
  subject?: string;
  htmlContent?: string;
  textContent?: string;
  templateId?: number;
  params?: Record<string, unknown>;
  replyTo?: EmailRecipient;
  attachments?: EmailAttachment[];
  tags?: string[];
  headers?: Record<string, string>;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface ContactFormWorkflowParams {
  name: string;
  email: string;
  role?: string;
  subject?: string;
  category?: string;
  message: string;
  ip?: string;
  leadNumber?: number;
}

export interface ContactFormWorkflowResult {
  internalEmailSent: boolean;
  autoReplySent: boolean;
  internalMessageId?: string;
  autoReplyMessageId?: string;
  errors: string[];
}

/**
 * Escapes raw user inputs for secure HTML email rendering to prevent injection.
 */
export function escapeHtml(text: string): string {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Resolves the application URL dynamically.
 */
export function resolveAppUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
  }
  if (process.env.NODE_ENV === "development") {
    return "http://localhost:3000";
  }
  return "https://gauravpatil.online";
}

/**
 * Formats a submission timestamp into a human-readable IST string.
 */
export function formatSubmissionTimestamp(date = new Date()): string {
  return (
    date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    }) +
    " at " +
    date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Kolkata",
    }) +
    " IST"
  );
}

/**
 * Universal Core Sender: Executes authenticated HTTP POST to Brevo REST API v3.
 */
export async function sendTransactionalEmail(
  options: SendTransactionalEmailOptions
): Promise<SendEmailResult> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    return {
      success: false,
      error: "BREVO_API_KEY is not configured in server environment.",
    };
  }

  // Determine sender identity: explicit identity > purpose-derived identity > default HELLO
  const senderIdentity =
    options.identity ||
    (options.purpose
      ? getEmailIdentityForPurpose(options.purpose)
      : EMAIL_IDENTITIES.HELLO);

  const payload: Record<string, unknown> = {
    sender: {
      name: senderIdentity.name,
      email: senderIdentity.email,
    },
    to: options.to.map((rec) => ({
      email: rec.email.trim().toLowerCase(),
      name: rec.name?.trim() || undefined,
    })),
    replyTo: options.replyTo
      ? {
          email: options.replyTo.email.trim().toLowerCase(),
          name: options.replyTo.name?.trim() || undefined,
        }
      : {
          email: senderIdentity.defaultReplyTo,
          name: senderIdentity.name,
        },
  };

  if (options.templateId) {
    payload.templateId = options.templateId;
    if (options.params) {
      payload.params = options.params;
    }
  } else {
    if (options.subject) payload.subject = options.subject;
    if (options.htmlContent) payload.htmlContent = options.htmlContent;
    if (options.textContent) payload.textContent = options.textContent;
  }

  if (options.attachments && options.attachments.length > 0) {
    payload.attachment = options.attachments;
  }

  if (options.tags && options.tags.length > 0) {
    payload.tags = options.tags;
  }

  if (options.headers && Object.keys(options.headers).length > 0) {
    payload.headers = options.headers;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(BREVO_API_ENDPOINT, {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = await res.json().catch(() => ({}));

    if (res.ok && (res.status === 200 || res.status === 201)) {
      return {
        success: true,
        messageId: (data.messageId as string) || "msg_delivered",
      };
    }

    const errorMessage =
      (data.message as string) ||
      (data.error as string) ||
      `Brevo API returned HTTP ${res.status}`;
    console.warn(`Brevo API Error (HTTP ${res.status}):`, data);

    return {
      success: false,
      error: errorMessage,
    };
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    const error = err as Error;
    const isTimeout = error.name === "AbortError";
    return {
      success: false,
      error: isTimeout
        ? "Brevo email dispatch timed out (10s)."
        : error.message || "Network error connecting to Brevo API.",
    };
  }
}

/**
 * Generates the clean, modern internal notification HTML email for the owner.
 */
function generateInternalNotificationHtml(
  params: ContactFormWorkflowParams,
  formattedTime: string
): string {
  const safeName = escapeHtml(params.name.trim());
  const safeEmail = escapeHtml(params.email.trim());
  const safeRole = escapeHtml(params.role?.trim() || "Visitor / Other");
  const safeMessage = escapeHtml(params.message.trim()).replace(/\n/g, "<br />");
  const leadTag = params.leadNumber ? `#${params.leadNumber}` : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Lead ${leadTag}</title>
</head>
<body style="margin:0;padding:24px 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;color:#1e293b;line-height:1.6;background-color:#ffffff;">
  <p style="margin:0 0 16px 0;">Hi Gaurav,</p>
  <p style="margin:0 0 16px 0;">You received a new portfolio inquiry${leadTag ? ` (Lead ${leadTag})` : ""} from <strong>${safeName}</strong>.</p>

  <p style="margin:0 0 4px 0;"><strong>Lead Number:</strong> ${params.leadNumber ? `#${params.leadNumber}` : "Direct"}</p>
  <p style="margin:0 0 4px 0;"><strong>Sender:</strong> ${safeName}</p>
  <p style="margin:0 0 4px 0;"><strong>Role:</strong> ${safeRole}</p>
  <p style="margin:0 0 4px 0;"><strong>Email:</strong> <a href="mailto:${safeEmail}" style="color:#2563eb;text-decoration:none;">${safeEmail}</a></p>
  <p style="margin:0 0 16px 0;"><strong>Received:</strong> ${formattedTime}</p>

  <p style="margin:16px 0 6px 0;font-weight:700;color:#0f172a;">Message:</p>
  <p style="margin:0 0 24px 0;color:#0f172a;line-height:1.6;">${safeMessage}</p>

  <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;" />
  <p style="margin:0;font-size:13px;color:#64748b;">
    To reply directly, hit "Reply" in your email client to message <a href="mailto:${safeEmail}" style="color:#2563eb;text-decoration:none;">${safeEmail}</a>.
  </p>
</body>
</html>`;
}

/**
 * Contact Form Workflow Dispatcher:
 * 1. Dispatches Internal Notification Email (Lead alert to owner with Reply-To set to visitor).
 * 2. Dispatches Visitor Auto-Reply Email (Using Brevo Template #1 with Reply-To: hello@gauravservices.eu.cc).
 */
export async function dispatchContactFormWorkflow(
  params: ContactFormWorkflowParams
): Promise<ContactFormWorkflowResult> {
  const formattedTime = formatSubmissionTimestamp();
  const errors: string[] = [];

  const trimmedName = params.name.trim();
  const trimmedEmail = params.email.trim().toLowerCase();
  const trimmedRole = params.role?.trim() || "Visitor / Other";
  const trimmedCategory = params.category?.trim() || trimmedRole;
  const trimmedMessage = params.message.trim();
  const firstName = trimmedName.split(" ")[0] || trimmedName;
  const leadNo = params.leadNumber;

  const internalRecipient =
    process.env.BREVO_NOTIFICATION_RECIPIENT ||
    process.env.ADMIN_EMAIL ||
    "gauravpatil5737@gmail.com";

  // =========================================================================
  // STEP 1: Internal Lead Notification (Sent to owner with 1-click visitor reply)
  // =========================================================================
  const internalHtml = generateInternalNotificationHtml(
    {
      name: trimmedName,
      email: trimmedEmail,
      role: trimmedRole,
      category: trimmedCategory,
      message: trimmedMessage,
      leadNumber: leadNo,
    },
    formattedTime
  );

  const internalPlainText = `Hi Gaurav,

You received a new portfolio inquiry${leadNo ? ` (Lead #${leadNo})` : ""} from ${trimmedName}.

Lead Number: ${leadNo ? `#${leadNo}` : "Direct"}
Sender: ${trimmedName}
Role: ${trimmedRole}
Email: ${trimmedEmail}
Received: ${formattedTime}

Message:
${trimmedMessage}

--------------------------------------------------
To reply directly, hit "Reply" in your email client to message ${trimmedEmail}.`;

  const emailSubject = leadNo
    ? `New Contact Inquiry (Lead #${leadNo}): ${trimmedName} [${trimmedRole}]`
    : `New Contact Inquiry: ${trimmedName} [${trimmedRole}]`;

  // =========================================================================
  // Parallel Dual Dispatch (Lead Alert + Auto-Reply concurrently)
  // =========================================================================
  const autoReplyTemplateId =
    BREVO_TEMPLATES.CONTACT_FORM_AUTO_REPLY.id || 1;

  const [internalResult, autoReplyResult] = await Promise.all([
    sendTransactionalEmail({
      purpose: "CONTACT_FORM",
      to: [{ email: internalRecipient, name: "Gaurav Patil" }],
      replyTo: { email: trimmedEmail, name: trimmedName },
      subject: emailSubject,
      htmlContent: internalHtml,
      textContent: internalPlainText,
      tags: ["portfolio_inquiry", "internal_notification"],
    }),
    sendTransactionalEmail({
      purpose: "CONTACT_FORM_AUTO_REPLY",
      to: [{ email: trimmedEmail, name: trimmedName }],
      templateId: autoReplyTemplateId,
      headers: {
        "X-Auto-Response-Suppress": "OOF, AutoReply",
        "Auto-Submitted": "auto-replied",
      },
      params: {
        name: trimmedName,
        NAME: trimmedName,
        FNAME: firstName,
        category: trimmedRole,
        message: trimmedMessage,
        date: formattedTime,
      },
      tags: ["portfolio_auto_reply", "visitor_confirmation"],
    }),
  ]);

  if (!internalResult.success && internalResult.error) {
    errors.push(`Internal notification: ${internalResult.error}`);
  }

  if (!autoReplyResult.success && autoReplyResult.error) {
    errors.push(`Visitor auto-reply: ${autoReplyResult.error}`);
  }

  return {
    internalEmailSent: internalResult.success,
    autoReplySent: autoReplyResult.success,
    internalMessageId: internalResult.messageId,
    autoReplyMessageId: autoReplyResult.messageId,
    errors,
  };
}
