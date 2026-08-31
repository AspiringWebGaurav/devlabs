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
import {
  renderCompactEmailLayout,
  EMAIL_SPACING,
  EMAIL_TYPOGRAPHY,
} from "./layout";

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
  statusCode?: number;
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

  // 2. In local development without explicit request headers, default to localhost
  if (process.env.NODE_ENV === "development") {
    if (
      process.env.NEXT_PUBLIC_APP_URL &&
      (process.env.NEXT_PUBLIC_APP_URL.includes("localhost") || process.env.NEXT_PUBLIC_APP_URL.includes("127.0.0.1"))
    ) {
      return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
    }
    return "http://localhost:3000";
  }

  // 3. Explicit public app URL override
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }

  // 4. Vercel deployment URL (auto-populated by Vercel platform)
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL.replace(/\/$/, "")}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
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
        statusCode: res.status,
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
      statusCode: res.status,
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
export function generateInternalNotificationHtml(
  params: ContactFormWorkflowParams,
  formattedTime: string
): string {
  const rawEmail = params.email.trim();
  const safeName = escapeHtml(params.name.trim());
  const safeAttrEmail = escapeHtml(rawEmail);
  const safeTextEmail = escapeHtml(rawEmail);
  const safeRole = escapeHtml(params.role?.trim() || "Visitor / Other");
  const safeMessage = escapeHtml(params.message.trim()).replace(/\n/g, "<br />");
  const leadTag = params.leadNumber ? `#${params.leadNumber}` : "";

  const bodyContentHtml = `
    <p style="${EMAIL_SPACING.greetingMargin}font-weight:600;color:${EMAIL_TYPOGRAPHY.colorHeading};">Hi Gaurav,</p>
    <p style="${EMAIL_SPACING.keyValMargin}font-size:${EMAIL_TYPOGRAPHY.sizeSmall};color:${EMAIL_TYPOGRAPHY.colorBody};"><strong>From:</strong> ${safeName} <span style="color:${EMAIL_TYPOGRAPHY.colorMuted};">(${safeRole})</span></p>
    <p style="${EMAIL_SPACING.keyValMargin}font-size:${EMAIL_TYPOGRAPHY.sizeSmall};color:${EMAIL_TYPOGRAPHY.colorBody};"><strong>Email:</strong> <a href="mailto:${safeAttrEmail}" style="color:${EMAIL_TYPOGRAPHY.colorLink};text-decoration:none;">${safeTextEmail}</a></p>
    <p style="${EMAIL_SPACING.keyValMargin}font-size:${EMAIL_TYPOGRAPHY.sizeSmall};color:${EMAIL_TYPOGRAPHY.colorMuted};"><strong>Received:</strong> ${formattedTime}${leadTag ? ` &nbsp;&bull;&nbsp; <strong>Lead ${leadTag}</strong>` : ""}</p>
    <p style="margin:10px 0 3px 0;font-weight:700;font-size:${EMAIL_TYPOGRAPHY.sizeSmall};color:${EMAIL_TYPOGRAPHY.colorHeading};">Message:</p>
    <p style="margin:0 0 10px 0;font-size:${EMAIL_TYPOGRAPHY.sizeBody};color:${EMAIL_TYPOGRAPHY.colorHeading};line-height:${EMAIL_TYPOGRAPHY.lineHeightBody};">${safeMessage}</p>
  `;

  return renderCompactEmailLayout({
    title: `New Lead ${leadTag}`,
    bodyContentHtml,
    footerType: "LEAD_ALERT",
    footerContext: { replyToEmail: rawEmail },
  });
}

/**
 * Generates the clean, modern confirmation HTML email sent to visitors.
 */
export function generateVisitorAutoReplyHtml(
  params: { name: string; firstName?: string }
): string {
  const rawFirstName = params.firstName || params.name.split(" ")[0] || params.name;
  const safeName = escapeHtml(rawFirstName.trim());

  const bodyContentHtml = `
    <p style="${EMAIL_SPACING.greetingMargin}font-weight:600;color:${EMAIL_TYPOGRAPHY.colorHeading};">Hi ${safeName},</p>
    <p style="${EMAIL_SPACING.paragraphMargin}color:${EMAIL_TYPOGRAPHY.colorBody};">Thanks for reaching out through my portfolio. I've received your message and will get back to you as soon as possible.</p>
    <p style="${EMAIL_SPACING.paragraphMargin}font-size:${EMAIL_TYPOGRAPHY.sizeSmall};color:${EMAIL_TYPOGRAPHY.colorMuted};">If your inquiry is urgent, you can reply directly to this email.</p>
    <p style="${EMAIL_SPACING.signoffMargin}font-size:${EMAIL_TYPOGRAPHY.sizeSmall};color:${EMAIL_TYPOGRAPHY.colorBody};">
      <strong>Gaurav Patil</strong><br />
      <span style="color:${EMAIL_TYPOGRAPHY.colorMuted};">Developer &amp; Backend Services</span>
    </p>
  `;

  return renderCompactEmailLayout({
    title: "Thanks for reaching out",
    bodyContentHtml,
    footerType: "STANDARD",
  });
}

/**
 * Contact Form Workflow Dispatcher:
 * 1. Dispatches Internal Notification Email (Lead alert to owner with Reply-To set to visitor).
 * 2. Dispatches Visitor Auto-Reply Email (Local code-generated layout with Reply-To: hello@gauravpatil.online).
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

  const leadTag = leadNo ? ` • Lead #${leadNo}` : "";
  const internalPlainText = `Hi Gaurav,

From: ${trimmedName} (${trimmedRole})
Email: ${trimmedEmail}
Received: ${formattedTime}${leadTag}

Message:
${trimmedMessage}

--------------------------------------------------
To reply directly, hit "Reply" in your email client to message ${trimmedEmail}.`;

  const emailSubject = leadNo
    ? `New Contact Inquiry (Lead #${leadNo}): ${trimmedName} [${trimmedRole}]`
    : `New Contact Inquiry: ${trimmedName} [${trimmedRole}]`;

  // =========================================================================
  // STEP 2: Visitor Auto-Reply (Local code-generated compact layout)
  // =========================================================================
  const autoReplyHtml = generateVisitorAutoReplyHtml({
    name: trimmedName,
    firstName,
  });

  const autoReplyPlainText = `Hi ${firstName || trimmedName},

Thanks for reaching out through my portfolio. I've received your message and will get back to you as soon as possible.

If your inquiry is urgent, you can reply directly to this email.

Gaurav Patil
Developer & Backend Services
https://gauravpatil.online`;

  // =========================================================================
  // Parallel Dual Dispatch (Lead Alert + Auto-Reply concurrently)
  // =========================================================================
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
      replyTo: { email: EMAIL_IDENTITIES.HELLO.primary.email, name: "Gaurav Patil" },
      subject: "Thanks for contacting Gaurav Patil",
      htmlContent: autoReplyHtml,
      textContent: autoReplyPlainText,
      headers: {
        "X-Auto-Response-Suppress": "OOF, AutoReply",
        "Auto-Submitted": "auto-replied",
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
  const rawTermsUrl = `${baseUrl}/admin/terms`;
  const rawPrivacyUrl = `${baseUrl}/admin/privacy`;

  const bodyContentHtml = `
    <p style="${EMAIL_SPACING.greetingMargin}font-weight:600;color:${EMAIL_TYPOGRAPHY.colorHeading};">Hi Gaurav,</p>
    <p style="${EMAIL_SPACING.paragraphMargin}color:${EMAIL_TYPOGRAPHY.colorBody};">Here is your verification code to complete sign-in to the Admin Panel:</p>
    <div style="${EMAIL_SPACING.codeBlockMargin}">
      <span style="font-family:${EMAIL_TYPOGRAPHY.fontMono};font-size:${EMAIL_TYPOGRAPHY.sizeOtp};font-weight:700;letter-spacing:5px;color:${EMAIL_TYPOGRAPHY.colorHeading};line-height:${EMAIL_TYPOGRAPHY.lineHeightCode};display:inline-block;">${safeOtp}</span>
    </div>
    <p style="${EMAIL_SPACING.helperTextMargin}font-size:${EMAIL_TYPOGRAPHY.sizeSmall};color:${EMAIL_TYPOGRAPHY.colorMuted};">This code is valid for ${expiresMin} minutes. If you did not request this code, you can safely ignore this email.</p>
    <p style="${EMAIL_SPACING.signoffMargin}font-size:${EMAIL_TYPOGRAPHY.sizeSmall};color:${EMAIL_TYPOGRAPHY.colorBody};">Gaurav Services</p>
  `;

  const htmlContent = renderCompactEmailLayout({
    title: "Your Verification Code",
    bodyContentHtml,
    footerType: "SECURITY",
    footerContext: { termsUrl: rawTermsUrl, privacyUrl: rawPrivacyUrl, brandName: "Gaurav Services" },
  });

  const textContent = `Hi Gaurav,\n\nHere is your verification code to complete sign-in to the Admin Panel:\n\n${params.otp}\n\nThis code is valid for ${expiresMin} minutes. If you did not request this code, you can safely ignore this email.\n\nGaurav Services\n\nTerms: ${rawTermsUrl} | Privacy: ${rawPrivacyUrl}`;

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
  const rawVerifyUrl = params.verifyUrl;
  const safeIp = escapeHtml(params.clientIp);
  const safeAttrUrl = escapeHtml(rawVerifyUrl);
  const safeTextUrl = escapeHtml(rawVerifyUrl);
  const expiresMin = params.expiresMinutes || 15;
  const baseUrl = resolveAppUrl(params.requestHeaders);
  const rawTermsUrl = `${baseUrl}/admin/terms`;
  const rawPrivacyUrl = `${baseUrl}/admin/privacy`;

  const bodyContentHtml = `
    <p style="${EMAIL_SPACING.greetingMargin}font-weight:600;color:${EMAIL_TYPOGRAPHY.colorHeading};">Hi Gaurav,</p>
    <p style="${EMAIL_SPACING.paragraphMargin}color:${EMAIL_TYPOGRAPHY.colorBody};">A sign-in attempt was detected from an unrecognized IP address (<strong>${safeIp}</strong>).</p>
    <p style="${EMAIL_SPACING.paragraphMargin}color:${EMAIL_TYPOGRAPHY.colorBody};">Click below to authorize this IP address to access your Admin Panel:</p>
    <div style="${EMAIL_SPACING.buttonBlockMargin}">
      <a href="${safeAttrUrl}" style="background-color:#0f172a;color:#ffffff;padding:9px 18px;font-size:${EMAIL_TYPOGRAPHY.sizeSmall};font-weight:600;text-decoration:none;border-radius:4px;display:inline-block;">Authorize IP address &rarr;</a>
    </div>
    <p style="${EMAIL_SPACING.helperTextMargin}font-size:${EMAIL_TYPOGRAPHY.sizeSmall};color:${EMAIL_TYPOGRAPHY.colorMuted};">
      Or open this link: <a href="${safeAttrUrl}" style="color:${EMAIL_TYPOGRAPHY.colorLink};word-break:break-all;">${safeTextUrl}</a>
    </p>
    <p style="${EMAIL_SPACING.helperTextMargin}font-size:${EMAIL_TYPOGRAPHY.sizeSmall};color:${EMAIL_TYPOGRAPHY.colorMuted};">This link is valid for ${expiresMin} minutes. If you did not make this request, no action is needed.</p>
    <p style="${EMAIL_SPACING.signoffMargin}font-size:${EMAIL_TYPOGRAPHY.sizeSmall};color:${EMAIL_TYPOGRAPHY.colorBody};">Gaurav Services</p>
  `;

  const htmlContent = renderCompactEmailLayout({
    title: "Authorize New IP Address",
    bodyContentHtml,
    footerType: "SECURITY",
    footerContext: { termsUrl: rawTermsUrl, privacyUrl: rawPrivacyUrl, brandName: "Gaurav Services" },
  });

  const textContent = `Hi Gaurav,\n\nA sign-in attempt was detected from an unrecognized IP address (${params.clientIp}).\n\nClick below to authorize this IP address to access your Admin Panel:\n${rawVerifyUrl}\n\nThis link is valid for ${expiresMin} minutes. If you did not make this request, no action is needed.\n\nGaurav Services\n\nTerms: ${rawTermsUrl} | Privacy: ${rawPrivacyUrl}`;

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

  const bodyContentHtml = `
    <div style="margin:0 0 12px 0;color:${EMAIL_TYPOGRAPHY.colorHeading};line-height:1.5;font-size:${EMAIL_TYPOGRAPHY.sizeBody};">
      ${safeMessageHtml}
    </div>
  `;

  const htmlContent = renderCompactEmailLayout({
    title: trimmedSubject,
    bodyContentHtml,
    footerType: "STANDARD",
  });

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

export interface LiveChatOtpEmailParams {
  email: string;
  name?: string;
  otp: string;
  expiresMinutes?: number;
  requestHeaders?: Headers | null;
  idempotencyKey?: string;
}

/**
 * Dispatches a single-use 6-digit OTP verification code to a visitor attempting to use Live Chat.
 * Strictly uses no-reply@gauravpatil.online (EMAIL_IDENTITIES.NO_REPLY).
 * Enforces single-view, no-scroll layout with selectable text OTP and security notice.
 */
export async function dispatchLiveChatOtpEmail(
  params: LiveChatOtpEmailParams
): Promise<SendEmailResult> {
  const safeOtp = escapeHtml(params.otp);
  const rawName = params.name?.trim() || "";
  const safeName = rawName ? escapeHtml(rawName) : "there";
  const expiresMin = params.expiresMinutes || 5;
  const formattedTime = formatSubmissionTimestamp();
  const baseUrl = resolveAppUrl(params.requestHeaders);
  const termsUrl = `${baseUrl}/terms?focus=assistant#assistant-terms`;
  const privacyUrl = `${baseUrl}/privacy?focus=assistant#assistant-privacy`;

  const bodyContentHtml = `
    <p style="${EMAIL_SPACING.greetingMargin}font-weight:600;color:${EMAIL_TYPOGRAPHY.colorHeading};">Hi ${safeName},</p>
    <div style="${EMAIL_SPACING.codeBlockMargin}">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;">
        <tr>
          <td style="padding:10px 18px;">
            <span style="font-family:${EMAIL_TYPOGRAPHY.fontMono};font-size:${EMAIL_TYPOGRAPHY.sizeOtp};font-weight:700;letter-spacing:6px;color:${EMAIL_TYPOGRAPHY.colorHeading};line-height:${EMAIL_TYPOGRAPHY.lineHeightCode};display:inline-block;">${safeOtp}</span>
          </td>
        </tr>
      </table>
    </div>
    <p style="${EMAIL_SPACING.paragraphMargin}color:${EMAIL_TYPOGRAPHY.colorBody};font-size:13px;">${safeName} requested to chat with Gaurav Patil &bull; ${formattedTime}</p>
    <p style="${EMAIL_SPACING.helperTextMargin}font-size:${EMAIL_TYPOGRAPHY.sizeSmall};color:${EMAIL_TYPOGRAPHY.colorMuted};">This single-use verification code is valid for ${expiresMin} minutes. If you did not request Live Chat access, you can safely ignore this email.</p>
    <p style="${EMAIL_SPACING.signoffMargin}font-size:${EMAIL_TYPOGRAPHY.sizeSmall};color:${EMAIL_TYPOGRAPHY.colorBody};">Gaurav Patil</p>
  `;

  const htmlContent = renderCompactEmailLayout({
    title: "Live Chat Verification Code",
    bodyContentHtml,
    footerType: "LIVE_CHAT",
    footerContext: {
      termsUrl,
      privacyUrl,
      termsLabel: "Terms for Live Chat",
      privacyLabel: "Privacy for Live Chat",
      brandName: "Gaurav Patil",
      contextTitle: "Live Chat with Gaurav",
    },
  });

  const textContent = `Hi ${rawName || "there"},\n\nYour verification code:\n${params.otp}\n\n${rawName || "Visitor"} requested to chat with Gaurav Patil (${formattedTime})\n\nThis single-use code is valid for ${expiresMin} minutes. If you did not request Live Chat access, you can safely ignore this email.\n\nGaurav Patil\n\n--------------------------------------------------\nLive Chat with Gaurav\nTerms for Live Chat: ${termsUrl}\nPrivacy for Live Chat: ${privacyUrl}\n© Gaurav Patil`;

  return sendTransactionalEmail({
    purpose: "SECURITY_OTP",
    identity: EMAIL_IDENTITIES.NO_REPLY,
    to: [{ email: params.email.trim(), name: rawName || undefined }],
    subject: "Your Live Chat verification code | Gaurav Patil",
    htmlContent,
    textContent,
    tags: ["live_chat", "otp_verification"],
    idempotencyKey: params.idempotencyKey,
  });
}

export interface LiveChatAdminNotificationParams {
  visitorName: string;
  visitorEmail: string;
  message: string;
  threadId: string;
  clientMessageId?: string;
  notificationType?: "FIRST_MESSAGE" | "FOLLOW_UP" | "REOPENED";
  roomAccessSecret?: string;
  applicationDispatchId?: string;
  requestHeaders?: Headers | null;
  baseUrl?: string;
}

/**
 * Dispatches a dynamic real-time alert to Gaurav when a visitor sends a message in Live Chat.
 * Includes direct 1-click passwordless room access button (15-min TTL) and direct visitor reply-to.
 */
export async function dispatchLiveChatAdminNotificationEmail(
  params: LiveChatAdminNotificationParams
): Promise<SendEmailResult> {
  const formattedTime = formatSubmissionTimestamp();
  const rawEmail = params.visitorEmail.trim().toLowerCase();
  const safeName = escapeHtml(params.visitorName.trim());
  const safeEmail = escapeHtml(rawEmail);
  const safeMessage = escapeHtml(params.message.trim()).replace(/\n/g, "<br />");

  const internalRecipient =
    process.env.BREVO_NOTIFICATION_RECIPIENT ||
    process.env.ADMIN_EMAIL ||
    "gauravpatil5737@gmail.com";

  // Dynamic Subject (Clean, no cloud/speech bubble emojis, dynamic name directly in subject)
  let subject = `${safeName} wants to chat with you`;
  if (params.notificationType === "FOLLOW_UP") {
    subject = `${safeName} sent a new message`;
  } else if (params.notificationType === "REOPENED") {
    subject = `${safeName} reopened conversation`;
  }

  const baseUrl = (params.baseUrl || resolveAppUrl(params.requestHeaders)).replace(/\/$/, "");
  const roomAccessUrl = params.roomAccessSecret
    ? `${baseUrl}/admin/chat/room-access/${params.roomAccessSecret}`
    : `${baseUrl}/admin/chat/${params.threadId}`;

  const ctaButtonHtml = `
    <div style="margin: 22px 0 16px 0; text-align: left;">
      <a href="${roomAccessUrl}" style="background-color: #7C3AED; color: #FFFFFF; font-size: 14px; font-weight: 600; text-decoration: none; padding: 10px 20px; border-radius: 8px; display: inline-block; box-shadow: 0 2px 4px rgba(124, 58, 237, 0.2);">
        Open Live Chat Room &rarr;
      </a>
      <p style="margin: 6px 0 0 0; font-size: 11px; color: #94A3B8;">Direct authenticated access &bull; Open anytime to reply</p>
    </div>
  `;

  const bodyContentHtml = `
    <p style="${EMAIL_SPACING.greetingMargin}font-weight:600;color:${EMAIL_TYPOGRAPHY.colorHeading};">Hi Gaurav,</p>
    <p style="${EMAIL_SPACING.paragraphMargin}color:${EMAIL_TYPOGRAPHY.colorBody};font-weight:600;">${safeName} wants to chat with you:</p>
    <p style="${EMAIL_SPACING.keyValMargin}font-size:${EMAIL_TYPOGRAPHY.sizeSmall};color:${EMAIL_TYPOGRAPHY.colorBody};"><strong>Visitor:</strong> ${safeName}</p>
    <p style="${EMAIL_SPACING.keyValMargin}font-size:${EMAIL_TYPOGRAPHY.sizeSmall};color:${EMAIL_TYPOGRAPHY.colorBody};"><strong>Email:</strong> <a href="mailto:${safeEmail}" style="color:${EMAIL_TYPOGRAPHY.colorLink};text-decoration:none;">${safeEmail}</a></p>
    <p style="${EMAIL_SPACING.keyValMargin}font-size:${EMAIL_TYPOGRAPHY.sizeSmall};color:${EMAIL_TYPOGRAPHY.colorMuted};"><strong>Received:</strong> ${formattedTime}</p>
    <p style="margin:12px 0 3px 0;font-weight:700;font-size:${EMAIL_TYPOGRAPHY.sizeSmall};color:${EMAIL_TYPOGRAPHY.colorHeading};">Message:</p>
    <div style="margin:0 0 12px 0;padding:12px 14px;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;font-size:${EMAIL_TYPOGRAPHY.sizeBody};color:${EMAIL_TYPOGRAPHY.colorHeading};line-height:${EMAIL_TYPOGRAPHY.lineHeightBody};">
      ${safeMessage}
    </div>
    ${ctaButtonHtml}
  `;

  const htmlContent = renderCompactEmailLayout({
    title: `${safeName} wants to chat with you`,
    bodyContentHtml,
    footerType: "LEAD_ALERT",
    footerContext: { replyToEmail: rawEmail },
  });

  const textContent = `Hi Gaurav,\n\n${params.visitorName} wants to chat with you (${rawEmail}):\n\nReceived: ${formattedTime}\n\nMessage:\n${params.message.trim()}\n\nDirect Live Chat Room Link:\n${roomAccessUrl}\n\nReply directly to this email to contact the visitor.`;

  return sendTransactionalEmail({
    purpose: "CONTACT_FORM",
    identity: EMAIL_IDENTITIES.HELLO,
    to: [{ email: internalRecipient, name: "Gaurav Patil" }],
    replyTo: { email: rawEmail, name: params.visitorName },
    subject,
    htmlContent,
    textContent,
    tags: ["live_chat", "admin_alert"],
    idempotencyKey: params.applicationDispatchId || (params.clientMessageId ? `notif_${params.clientMessageId}` : undefined),
  });
}

export interface LiveChatVisitorReplyEmailParams {
  visitorName: string;
  visitorEmail: string;
  adminName: string;
  replySnippet: string;
  capabilityToken: string;
  threadId: string;
  applicationDispatchId?: string;
  requestHeaders?: Headers | null;
  baseUrl?: string;
}

/**
 * Dispatches an email notification to a visitor when Gaurav replies while the visitor is away.
 * Includes direct 1-click return link to open the conversation in the main portfolio.
 */
export async function dispatchLiveChatVisitorReplyEmail(
  params: LiveChatVisitorReplyEmailParams
): Promise<SendEmailResult> {
  const formattedTime = formatSubmissionTimestamp();
  const rawEmail = params.visitorEmail.trim().toLowerCase();
  const safeVisitorName = escapeHtml(params.visitorName.trim());
  const safeAdminName = escapeHtml(params.adminName.trim() || "Gaurav Patil");
  const safeReply = escapeHtml(params.replySnippet.trim()).replace(/\n/g, "<br />");

  const baseUrl = (params.baseUrl || resolveAppUrl(params.requestHeaders)).replace(/\/$/, "");
  const returnUrl = `${baseUrl}/?chat=open&c=${encodeURIComponent(params.capabilityToken)}`;
  const termsUrl = `${baseUrl}/terms?focus=assistant#assistant-terms`;
  const privacyUrl = `${baseUrl}/privacy?focus=assistant#assistant-privacy`;

  const ctaButtonHtml = `
    <div style="margin: 22px 0 16px 0; text-align: left;">
      <a href="${returnUrl}" style="background-color: #7C3AED; color: #FFFFFF; font-size: 14px; font-weight: 600; text-decoration: none; padding: 10px 20px; border-radius: 8px; display: inline-block; box-shadow: 0 2px 4px rgba(124, 58, 237, 0.2);">
        Open Conversation in Portfolio &rarr;
      </a>
      <p style="margin: 6px 0 0 0; font-size: 11px; color: #94A3B8;">Returns directly to your conversation in the live chat</p>
    </div>
  `;

  const bodyContentHtml = `
    <p style="${EMAIL_SPACING.greetingMargin}font-weight:600;color:${EMAIL_TYPOGRAPHY.colorHeading};">Hi ${safeVisitorName},</p>
    <p style="${EMAIL_SPACING.paragraphMargin}color:${EMAIL_TYPOGRAPHY.colorBody};font-weight:600;">${safeAdminName} replied to your message:</p>
    <div style="margin:12px 0;padding:12px 14px;background:#F8FAFC;border:1px solid #E2E8F0;border-left:3px solid #7C3AED;border-radius:8px;font-size:${EMAIL_TYPOGRAPHY.sizeBody};color:${EMAIL_TYPOGRAPHY.colorHeading};line-height:${EMAIL_TYPOGRAPHY.lineHeightBody};">
      ${safeReply}
    </div>
    <p style="${EMAIL_SPACING.keyValMargin}font-size:${EMAIL_TYPOGRAPHY.sizeSmall};color:${EMAIL_TYPOGRAPHY.colorMuted};">Sent: ${formattedTime}</p>
    ${ctaButtonHtml}
    <p style="${EMAIL_SPACING.signoffMargin}font-size:${EMAIL_TYPOGRAPHY.sizeSmall};color:${EMAIL_TYPOGRAPHY.colorBody};">${safeAdminName}</p>
  `;

  const htmlContent = renderCompactEmailLayout({
    title: "New Reply from Gaurav Patil",
    bodyContentHtml,
    footerType: "LIVE_CHAT",
    footerContext: {
      termsUrl,
      privacyUrl,
      termsLabel: "Terms for Live Chat",
      privacyLabel: "Privacy for Live Chat",
      brandName: "Gaurav Patil",
      contextTitle: "Live Chat with Gaurav",
    },
  });

  const textContent = `Hi ${params.visitorName.trim()},\n\n${params.adminName.trim() || "Gaurav Patil"} replied to your message (${formattedTime}):\n\n"${params.replySnippet.trim()}"\n\nOpen your conversation in the portfolio to reply:\n${returnUrl}\n\n--------------------------------------------------\nLive Chat with Gaurav\nTerms for Live Chat: ${termsUrl}\nPrivacy for Live Chat: ${privacyUrl}\n© Gaurav Patil`;

  return sendTransactionalEmail({
    purpose: "CONTACT_FORM",
    identity: EMAIL_IDENTITIES.HELLO,
    to: [{ email: rawEmail, name: params.visitorName.trim() }],
    subject: "Gaurav replied to your message | Gaurav Patil",
    htmlContent,
    textContent,
    tags: ["live_chat", "visitor_reply"],
    idempotencyKey: params.applicationDispatchId,
  });
}



