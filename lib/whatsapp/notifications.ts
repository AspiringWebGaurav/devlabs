/**
 * Real-Time WhatsApp Inbound Alert Dispatcher
 *
 * Dispatches clean, mobile-responsive, single-view email notifications to Gaurav
 * whenever a visitor reaches out or sends a message on WhatsApp.
 *
 * Features:
 * - Clean subject line without phone numbers
 * - Responsive HTML table header (prevents float collision on mobile Gmail)
 * - Single-view message card that dynamically expands vertically
 * - Direct "Chat on WhatsApp" button
 * - Conditional "Send I've Replied Email" button (strictly shown ONLY if visitor provided email)
 */

import crypto from "crypto";
import { sendTransactionalEmail, EMAIL_IDENTITIES, formatSubmissionTimestamp, escapeHtml } from "@/lib/email";
import { adminLogger } from "@/lib/admin/logger";

export interface WhatsAppInboundAlertParams {
  senderName: string;
  senderPhone: string;
  messageText: string;
  messageCount: number; // e.g. 1, 2, 3
  visitorEmail?: string;
  isEmailRegistrationOnly?: boolean;
}

/**
 * Creates a cryptographic HMAC-SHA256 signature for the 1-click visitor notification link.
 */
export function createNotifyVisitorSignature(email: string, phone: string): string {
  const secret = process.env.ADMIN_SESSION_SECRET || "wa_notify_visitor_secret_key";
  const cleanEmail = email.trim().toLowerCase();
  const cleanPhone = phone.replace(/[^0-9]/g, "");
  return crypto.createHmac("sha256", secret).update(`${cleanEmail}:${cleanPhone}`).digest("hex");
}

/**
 * Verifies the cryptographic HMAC-SHA256 signature.
 */
export function verifyNotifyVisitorSignature(email: string, phone: string, signature: string): boolean {
  if (!email || !phone || !signature) return false;
  const expected = createNotifyVisitorSignature(email, phone);
  if (expected.length !== signature.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export async function sendWhatsAppAdminAlert(params: WhatsAppInboundAlertParams): Promise<boolean> {
  try {
    const rawTime = formatSubmissionTimestamp();
    const cleanPhone = params.senderPhone.replace(/[^0-9]/g, "");
    const safeName = escapeHtml(params.senderName || "Visitor");
    const safeMessage = escapeHtml(params.messageText);
    const waReplyUrl = `https://wa.me/${cleanPhone}`;

    const internalRecipient =
      process.env.BREVO_NOTIFICATION_RECIPIENT ||
      process.env.ADMIN_EMAIL ||
      "gauravpatil5737@gmail.com";

    // Clean, friendly subject line without phone number or heavy brackets
    const subject = params.isEmailRegistrationOnly
      ? `${safeName} added email for WhatsApp chat`
      : `${safeName} wants to talk to you on WhatsApp`;

    const baseUrl = (
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.APP_URL ||
      "https://www.gauravpatil.online"
    ).replace(/\/+$/, "");

    // Construct secure 1-click visitor email notification link IF visitor provided an email
    let notifyVisitorUrl = "";
    if (params.visitorEmail && params.visitorEmail.trim().length > 0) {
      const cleanVisitorEmail = params.visitorEmail.trim().toLowerCase();
      const sig = createNotifyVisitorSignature(cleanVisitorEmail, cleanPhone);
      const searchParams = new URLSearchParams({
        email: cleanVisitorEmail,
        phone: cleanPhone,
        name: params.senderName || "Visitor",
        sig,
      });
      notifyVisitorUrl = `${baseUrl}/admin/whatsapp/notify?${searchParams.toString()}`;
    }

    // Plain text representation
    const textContent =
      `--------------------------------------------------\n` +
      (params.isEmailRegistrationOnly
        ? `WHATSAPP CONTACT UPDATE (Email Linked)\n`
        : `WHATSAPP MESSAGE (${params.messageCount} of 3)\n`) +
      `--------------------------------------------------\n` +
      `Name:            ${params.senderName || "Visitor"}\n` +
      `Number:          +${cleanPhone}\n` +
      (params.visitorEmail ? `Email:           ${params.visitorEmail}\n` : "") +
      `TimeStamp (IST): ${rawTime}\n\n` +
      (params.isEmailRegistrationOnly
        ? `Status:          Visitor provided email for notification\n\n`
        : `Message:\n"${params.messageText}"\n\n`) +
      `--------------------------------------------------\n` +
      `Chat on WhatsApp: ${waReplyUrl}\n` +
      (notifyVisitorUrl ? `Notify Visitor:   ${notifyVisitorUrl}\n` : "") +
      `--------------------------------------------------\n`;

    // 100% Mobile-responsive, single-view HTML email layout
    const htmlContent = `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:480px;margin:0 auto;padding:16px;background:#FAFAFA;border:1px solid #E2E8F0;border-radius:10px;color:#0F172A;box-sizing:border-box;">
        <!-- Responsive Header (HTML Table prevents float collision on mobile Gmail) -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-bottom:1px solid #E2E8F0;padding-bottom:8px;margin-bottom:12px;">
          <tr>
            <td align="left" style="font-size:12px;font-weight:700;color:${params.isEmailRegistrationOnly ? "#7C3AED" : "#059669"};letter-spacing:0.5px;text-transform:uppercase;">
              ${params.isEmailRegistrationOnly ? "Contact Update" : "WhatsApp Message"}
            </td>
            <td align="right" style="font-size:12px;color:#64748B;font-weight:500;">
              ${params.isEmailRegistrationOnly ? "Email Linked" : `${params.messageCount} of 3`}
            </td>
          </tr>
        </table>

        <!-- Sender Details -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;font-size:13px;line-height:1.6;">
          <tr>
            <td style="padding:2px 0;color:#64748B;width:105px;vertical-align:top;font-weight:500;">Name:</td>
            <td style="padding:2px 0;color:#0F172A;font-weight:600;vertical-align:top;">${safeName}</td>
          </tr>
          <tr>
            <td style="padding:2px 0;color:#64748B;vertical-align:top;font-weight:500;">Number:</td>
            <td style="padding:2px 0;vertical-align:top;">
              <a href="${waReplyUrl}" target="_blank" rel="noopener noreferrer" style="color:#059669;text-decoration:none;font-weight:600;">+${cleanPhone}</a>
            </td>
          </tr>
          ${
            params.visitorEmail
              ? `
          <tr>
            <td style="padding:2px 0;color:#64748B;vertical-align:top;font-weight:500;">Email:</td>
            <td style="padding:2px 0;vertical-align:top;">
              <a href="mailto:${escapeHtml(params.visitorEmail)}" style="color:#7C3AED;text-decoration:none;font-weight:600;">${escapeHtml(params.visitorEmail)}</a>
            </td>
          </tr>`
              : ""
          }
          <tr>
            <td style="padding:2px 0;color:#64748B;vertical-align:top;font-weight:500;">TimeStamp (IST):</td>
            <td style="padding:2px 0;color:#334155;vertical-align:top;">${rawTime}</td>
          </tr>
        </table>

        <!-- Message Body (Dynamically expands vertically with text length) -->
        <div style="font-size:11px;font-weight:600;color:#64748B;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:5px;">
          ${params.isEmailRegistrationOnly ? "Contact Note" : "Message"}
        </div>
        <div style="padding:10px 12px;background:#FFFFFF;border:1px solid #E2E8F0;border-left:3px solid ${params.isEmailRegistrationOnly ? "#7C3AED" : "#059669"};border-radius:6px;margin-bottom:14px;color:#0F172A;font-size:13.5px;line-height:1.5;white-space:pre-wrap;word-break:break-word;overflow-wrap:break-word;">${safeMessage}</div>

        <!-- Primary Action: Direct WhatsApp Chat -->
        <div style="text-align:center;">
          <a href="${waReplyUrl}" target="_blank" rel="noopener noreferrer" style="display:block;width:100%;box-sizing:border-box;padding:11px 16px;background:#25D366;color:#FFFFFF;text-decoration:none;font-weight:600;font-size:13px;border-radius:6px;text-align:center;">
            Chat on WhatsApp &rarr;
          </a>
        </div>

        <!-- Conditional Secondary Action: ONLY shown if visitor provided their email -->
        ${
          notifyVisitorUrl
            ? `
        <div style="text-align:center;margin-top:8px;">
          <a href="${notifyVisitorUrl}" target="_blank" rel="noopener noreferrer" style="display:block;width:100%;box-sizing:border-box;padding:10px 16px;background:#7C3AED;color:#FFFFFF;text-decoration:none;font-weight:600;font-size:12.5px;border-radius:6px;text-align:center;">
            ✉️ Send "I've Replied" Email to Visitor &rarr;
          </a>
        </div>`
            : ""
        }
      </div>
    `;

    const result = await sendTransactionalEmail({
      purpose: "CONTACT_FORM",
      identity: EMAIL_IDENTITIES.HELLO,
      to: [{ email: internalRecipient, name: "Gaurav Patil" }],
      subject,
      htmlContent,
      textContent,
      tags: ["whatsapp_inbound", "admin_alert"],
      idempotencyKey: `wa_alert_${cleanPhone}_${Date.now()}_${params.messageCount}`,
    });

    return result.success;
  } catch (err) {
    adminLogger.error("sendWhatsAppAdminAlert", err, "Failed to dispatch WhatsApp admin alert email");
    return false;
  }
}
