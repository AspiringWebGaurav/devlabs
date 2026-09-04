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
import { getWhatsAppBaseUrl } from "./config/whatsapp.config";
import { createWhatsAppReplyToken } from "./tokens";

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

    const cleanVisitorEmail = params.visitorEmail?.trim().toLowerCase() || "";

    // Eye-catchy, minimal subject line focused on the email added for contact updates
    const subject = params.isEmailRegistrationOnly
      ? `📧 Email Added: ${cleanVisitorEmail} • ${safeName}`
      : `${safeName} wants to talk to you on WhatsApp`;

    const baseUrl = getWhatsAppBaseUrl();

    // Construct secure, cryptic, standalone 1-click visitor email notification link IF visitor provided an email
    let notifyVisitorUrl = "";
    if (cleanVisitorEmail.length > 0) {
      const replyToken = createWhatsAppReplyToken({
        phone: cleanPhone,
        email: cleanVisitorEmail,
        name: params.senderName || "Visitor",
        messageCount: params.messageCount,
        timestamp: Date.now(),
      });
      notifyVisitorUrl = `${baseUrl}/wa/notify/${replyToken}`;
    }

    // Plain text representation
    const textContent = params.isEmailRegistrationOnly
      ? `--------------------------------------------------\n` +
        `WHATSAPP CONTACT UPDATE: EMAIL ADDED\n` +
        `--------------------------------------------------\n` +
        `Email:           ${cleanVisitorEmail}\n` +
        `Visitor Name:    ${params.senderName || "Visitor"}\n` +
        `WhatsApp Number: +${cleanPhone}\n` +
        `TimeStamp (IST): ${rawTime}\n\n` +
        `Status: Visitor linked their email to receive your reply alert.\n\n` +
        `--------------------------------------------------\n` +
        (notifyVisitorUrl ? `Send "I've Replied" Email: ${notifyVisitorUrl}\n` : "") +
        `Chat on WhatsApp:           ${waReplyUrl}\n` +
        `--------------------------------------------------\n`
      : `--------------------------------------------------\n` +
        `WHATSAPP MESSAGE (${params.messageCount} of 3)\n` +
        `--------------------------------------------------\n` +
        `Name:            ${params.senderName || "Visitor"}\n` +
        `Number:          +${cleanPhone}\n` +
        (params.visitorEmail ? `Email:           ${params.visitorEmail}\n` : "") +
        `TimeStamp (IST): ${rawTime}\n\n` +
        `Message:\n"${params.messageText}"\n\n` +
        `--------------------------------------------------\n` +
        `Chat on WhatsApp: ${waReplyUrl}\n` +
        (notifyVisitorUrl ? `Notify Visitor:   ${notifyVisitorUrl}\n` : "") +
        `--------------------------------------------------\n`;

    // 100% Mobile-responsive HTML email layout: dedicated minimal card for Contact Updates
    const htmlContent = params.isEmailRegistrationOnly
      ? `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:440px;margin:0 auto;padding:18px;background:#FAFAFA;border:1px solid #E2E8F0;border-radius:12px;color:#0F172A;box-sizing:border-box;">
        <!-- Header Badge & Time -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
          <tr>
            <td align="left">
              <span style="display:inline-block;padding:3px 8px;border-radius:6px;background:#F3E8FF;border:1px solid #E9D5FF;color:#7C3AED;font-size:10.5px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;">
                ⚡ CONTACT UPDATE
              </span>
            </td>
            <td align="right" style="font-size:11.5px;color:#94A3B8;font-weight:500;">
              ${rawTime}
            </td>
          </tr>
        </table>

        <!-- Hero Box: Eye-Catchy Focus on Newly Linked Email -->
        <div style="padding:14px 16px;background:#FFFFFF;border:1px solid #DDD6FE;border-left:4px solid #7C3AED;border-radius:8px;margin-bottom:14px;">
          <div style="font-size:10.5px;font-weight:700;color:#7C3AED;text-transform:uppercase;letter-spacing:0.6px;margin-bottom:3px;">
            New Email Registered
          </div>
          <div style="font-size:16px;font-weight:700;color:#0F172A;font-family:monospace;word-break:break-all;">
            ${escapeHtml(cleanVisitorEmail)}
          </div>
          <div style="font-size:12px;color:#64748B;margin-top:4px;">
            Linked to WhatsApp visitor: <strong style="color:#1E293B;">${safeName}</strong>
          </div>
        </div>

        <!-- Sender Meta -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:14px;font-size:12.5px;line-height:1.5;">
          <tr>
            <td style="padding:2px 0;color:#64748B;width:80px;font-weight:500;">Visitor:</td>
            <td style="padding:2px 0;color:#0F172A;font-weight:600;">${safeName}</td>
          </tr>
          <tr>
            <td style="padding:2px 0;color:#64748B;font-weight:500;">Number:</td>
            <td style="padding:2px 0;">
              <a href="${waReplyUrl}" target="_blank" rel="noopener noreferrer" style="color:#059669;text-decoration:none;font-weight:600;">+${cleanPhone}</a>
            </td>
          </tr>
        </table>

        <!-- Primary Action: 1-Click Send I've Replied -->
        <div style="text-align:center;">
          <a href="${notifyVisitorUrl}" target="_blank" rel="noopener noreferrer" style="display:block;width:100%;box-sizing:border-box;padding:11px 16px;background:#7C3AED;color:#FFFFFF;text-decoration:none;font-weight:600;font-size:12.5px;border-radius:6px;text-align:center;">
            ✉️ Send "I've Replied" Email to Visitor &rarr;
          </a>
        </div>

        <!-- Secondary Action: Direct WhatsApp Chat -->
        <div style="text-align:center;margin-top:8px;">
          <a href="${waReplyUrl}" target="_blank" rel="noopener noreferrer" style="display:block;width:100%;box-sizing:border-box;padding:9px 16px;background:#FFFFFF;border:1px solid #E2E8F0;color:#059669;text-decoration:none;font-weight:600;font-size:12px;border-radius:6px;text-align:center;">
            Chat on WhatsApp (+${cleanPhone}) &rarr;
          </a>
        </div>

        <!-- Minimal Footer -->
        <div style="margin-top:12px;padding-top:8px;border-top:1px solid #E2E8F0;font-size:10.5px;color:#94A3B8;text-align:center;">
          Gaurav Portfolio &bull; Inbound WhatsApp Contact Engine
        </div>
      </div>
      `
      : `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:480px;margin:0 auto;padding:16px;background:#FAFAFA;border:1px solid #E2E8F0;border-radius:10px;color:#0F172A;box-sizing:border-box;">
        <!-- Responsive Header (HTML Table prevents float collision on mobile Gmail) -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-bottom:1px solid #E2E8F0;padding-bottom:8px;margin-bottom:12px;">
          <tr>
            <td align="left" style="font-size:12px;font-weight:700;color:#059669;letter-spacing:0.5px;text-transform:uppercase;">
              WhatsApp Message
            </td>
            <td align="right" style="font-size:12px;color:#64748B;font-weight:500;">
              ${params.messageCount} of 3
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
          Message
        </div>
        <div style="padding:10px 12px;background:#FFFFFF;border:1px solid #E2E8F0;border-left:3px solid #059669;border-radius:6px;margin-bottom:14px;color:#0F172A;font-size:13.5px;line-height:1.5;white-space:pre-wrap;word-break:break-word;overflow-wrap:break-word;">${safeMessage}</div>

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
