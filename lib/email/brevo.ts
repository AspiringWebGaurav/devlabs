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

import crypto from "crypto";

/**
 * Normalizes an idempotency key into a standard RFC 4122 compliant UUID v4 string
 * suitable for Brevo's provider-level idempotency mechanism.
 * Deterministic for identical input strings (reties reuse the same UUID).
 */
export function formatBrevoIdempotencyKey(key: string): string {
  if (!key || typeof key !== "string") {
    return crypto.randomUUID();
  }
  const trimmed = key.trim();
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(trimmed)) {
    return trimmed.toLowerCase();
  }

  // Deterministically hash to standard RFC 4122 format
  const hash = crypto.createHash("sha256").update(trimmed).digest("hex");
  return `${hash.substring(0, 8)}-${hash.substring(8, 12)}-4${hash.substring(13, 16)}-a${hash.substring(17, 20)}-${hash.substring(20, 32)}`;
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
  idempotencyKey?: string;
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
 * Resolves the application URL dynamically based on runtime request headers or environment variables.
 * Supports localhost, preview/staging URLs, and production domains with zero hardcoding.
 */
export function resolveAppUrl(requestHeaders?: Headers | null): string {
  // 1. Authoritative runtime request headers (highest priority for 100% dynamic URL matching)
  if (requestHeaders) {
    const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host");
    if (host) {
      const proto =
        requestHeaders.get("x-forwarded-proto") ||
        (host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "https");
      return `${proto}://${host}`.replace(/\/$/, "");
    }
  }

  // 2. Explicit public app URL override
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }

  // 3. Vercel deployment URL (auto-populated by Vercel platform)
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL.replace(/\/$/, "")}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
  }

  // 4. Local development fallback
  if (process.env.NODE_ENV === "development") {
    return "http://localhost:3000";
  }

  // 5. Canonical production domain fallback
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

  const requestHeaders: Record<string, string> = {
    accept: "application/json",
    "api-key": apiKey,
    "content-type": "application/json",
  };

  if (options.idempotencyKey) {
    requestHeaders["Idempotency-Key"] = formatBrevoIdempotencyKey(options.idempotencyKey);
  }

  try {
    const res = await fetch(BREVO_API_ENDPOINT, {
      method: "POST",
      headers: requestHeaders,
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
 * 2. Dispatches Visitor Auto-Reply Email (Using Brevo Template #1 with Reply-To: hello@gauravpatil.online).
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

export interface OtpEmailParams {
  email: string;
  name?: string;
  otp: string;
  clientIp?: string | null;
  userAgent?: string | null;
  expiresMinutes?: number;
  requestHeaders?: Headers | null;
}

/**
 * Dispatches a 6-digit OTP code to the Superadmin inbox via no-reply@gauravpatil.online
 * Styled in minimal, spam-free Wasmer Pro aesthetic with dynamic admin panel URLs.
 */
export async function dispatchOtpEmail(
  params: OtpEmailParams
): Promise<SendEmailResult> {
  const safeOtp = escapeHtml(params.otp);
  const expiresMin = params.expiresMinutes || 5;
  const baseUrl = resolveAppUrl(params.requestHeaders);
  const termsUrl = `${baseUrl}/admin/terms`;
  const privacyUrl = `${baseUrl}/admin/privacy`;

  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Verification Code</title>
</head>
<body style="margin:0;padding:32px 24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;color:#111827;line-height:1.6;background-color:#ffffff;">
  <p style="margin:0 0 16px 0;">Hi Gaurav,</p>
  <p style="margin:0 0 20px 0;">Here is your verification code to complete sign-in to the Admin Panel:</p>

  <p style="margin:24px 0;font-family:-apple-system,BlinkMacSystemFont,'SFMono-Regular',Consolas,Menlo,monospace;font-size:32px;font-weight:700;letter-spacing:6px;color:#111827;">${safeOtp}</p>

  <p style="margin:0 0 8px 0;font-size:14px;color:#6b7280;">This code is valid for ${expiresMin} minutes. If you did not request this code, you can safely ignore this email.</p>

  <p style="margin:24px 0 0 0;font-size:14px;color:#374151;">Gaurav Services</p>

  <div style="margin-top:28px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:12px;color:#9ca3af;">
    <span>Gaurav Services</span> &nbsp;&bull;&nbsp;
    <a href="${termsUrl}" style="color:#6b7280;text-decoration:none;">Terms</a> &nbsp;|&nbsp;
    <a href="${privacyUrl}" style="color:#6b7280;text-decoration:none;">Privacy</a>
  </div>
</body>
</html>`;

  const textContent = `Hi Gaurav,

Here is your verification code to complete sign-in to the Admin Panel:

${params.otp}

This code is valid for ${expiresMin} minutes. If you did not request this code, you can safely ignore this email.

Gaurav Services

Terms: ${termsUrl} | Privacy: ${privacyUrl}`;

  return sendTransactionalEmail({
    purpose: "SECURITY_OTP",
    identity: EMAIL_IDENTITIES.NO_REPLY,
    to: [{ email: params.email, name: params.name || "Gaurav Patil" }],
    subject: `Your verification code is ${params.otp}`,
    htmlContent,
    textContent,
    tags: ["admin_auth", "otp_verification"],
  });
}

export interface NewIpAlertParams {
  email: string;
  name?: string;
  clientIp: string;
  verifyUrl: string;
  userAgent?: string | null;
  expiresMinutes?: number;
  requestHeaders?: Headers | null;
}

/**
 * Dispatches an untrusted IP authorization alert with 1-click approval link via security@gauravpatil.online
 * Styled in minimal, spam-free Wasmer Pro aesthetic with dynamic admin panel URLs.
 */
export async function dispatchNewIpSecurityAlert(
  params: NewIpAlertParams
): Promise<SendEmailResult> {
  const safeIp = escapeHtml(params.clientIp);
  const safeUrl = escapeHtml(params.verifyUrl);
  const expiresMin = params.expiresMinutes || 15;
  const baseUrl = resolveAppUrl(params.requestHeaders);
  const termsUrl = `${baseUrl}/admin/terms`;
  const privacyUrl = `${baseUrl}/admin/privacy`;

  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Authorize New IP Address</title>
</head>
<body style="margin:0;padding:32px 24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;color:#111827;line-height:1.6;background-color:#ffffff;">
  <p style="margin:0 0 16px 0;">Hi Gaurav,</p>
  <p style="margin:0 0 16px 0;">A sign-in attempt was detected from an unrecognized IP address (<strong>${safeIp}</strong>).</p>
  <p style="margin:0 0 24px 0;">Click below to authorize this IP address to access your Admin Panel:</p>

  <div style="margin:24px 0;">
    <a href="${safeUrl}" style="background-color:#0f172a;color:#ffffff;padding:12px 24px;font-size:14px;font-weight:600;text-decoration:none;border-radius:4px;display:inline-block;">
      Authorize IP address &rarr;
    </a>
  </div>

  <p style="margin:0 0 8px 0;font-size:13px;color:#6b7280;">
    Or open this link: <a href="${safeUrl}" style="color:#2563eb;word-break:break-all;">${safeUrl}</a>
  </p>
  <p style="margin:0 0 8px 0;font-size:13px;color:#6b7280;">This link is valid for ${expiresMin} minutes. If you did not make this request, no action is needed.</p>

  <p style="margin:24px 0 0 0;font-size:14px;color:#374151;">Gaurav Services</p>

  <div style="margin-top:28px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:12px;color:#9ca3af;">
    <span>Gaurav Services</span> &nbsp;&bull;&nbsp;
    <a href="${termsUrl}" style="color:#6b7280;text-decoration:none;">Terms</a> &nbsp;|&nbsp;
    <a href="${privacyUrl}" style="color:#6b7280;text-decoration:none;">Privacy</a>
  </div>
</body>
</html>`;

  const textContent = `Hi Gaurav,

A sign-in attempt was detected from an unrecognized IP address (${params.clientIp}).

Click below to authorize this IP address to access your Admin Panel:
${params.verifyUrl}

This link is valid for ${expiresMin} minutes. If you did not make this request, no action is needed.

Gaurav Services

Terms: ${termsUrl} | Privacy: ${privacyUrl}`;

  return sendTransactionalEmail({
    purpose: "SECURITY_ALERT",
    identity: EMAIL_IDENTITIES.SECURITY,
    to: [{ email: params.email, name: params.name || "Gaurav Patil" }],
    subject: "Authorize sign-in from a new IP address",
    htmlContent,
    textContent,
    tags: ["admin_auth", "security_alert", "ip_verification"],
  });
}

export interface ReplyInquiryEmailParams {
  toEmail: string;
  toName?: string;
  subject: string;
  message: string;
  inquiryId?: string;
  idempotencyKey?: string;
}

/**
 * Dispatches a direct reply to an inbound inquiry or outreach contact via security@gauravpatil.online.
 * Uses Brevo REST API v3 with clean HTML and plain text formatting.
 */
export async function dispatchInquiryReplyEmail(
  params: ReplyInquiryEmailParams
): Promise<SendEmailResult> {
  const trimmedEmail = params.toEmail.trim().toLowerCase();
  const trimmedName = params.toName?.trim();
  const trimmedSubject = params.subject.trim();
  const trimmedMessage = params.message.trim();

  const safeMessageHtml = escapeHtml(trimmedMessage).replace(/\n/g, "<br />");

  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(trimmedSubject)}</title>
</head>
<body style="margin:0;padding:24px 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;color:#1e293b;line-height:1.6;background-color:#ffffff;">
  <div style="margin:0 0 20px 0;color:#0f172a;line-height:1.6;white-space:pre-wrap;">${safeMessageHtml}</div>
  <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 16px 0;" />
  <p style="margin:0;font-size:12px;color:#64748b;">
    Sent by Gaurav Patil &bull; <a href="https://gauravpatil.online" style="color:#2563eb;text-decoration:none;">gauravpatil.online</a>
  </p>
</body>
</html>`;

  return sendTransactionalEmail({
    identity: {
      ...EMAIL_IDENTITIES.SECURITY,
      name: "Gaurav Patil",
    },
    to: [{ email: trimmedEmail, name: trimmedName || undefined }],
    replyTo: { email: EMAIL_IDENTITIES.SECURITY.email, name: "Gaurav Patil" },
    subject: trimmedSubject,
    htmlContent,
    textContent: trimmedMessage,
    tags: ["portfolio_reply", "outreach_response"],
    idempotencyKey: params.idempotencyKey,
  });
}


