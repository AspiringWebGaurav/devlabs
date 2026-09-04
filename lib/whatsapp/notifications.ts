/**
 * Real-Time WhatsApp Inbound Alert Dispatcher
 *
 * Dispatches clean, uncarded, single-view email notifications to Gaurav
 * whenever a visitor reaches out or sends a message on WhatsApp.
 */

import { sendTransactionalEmail, EMAIL_IDENTITIES, formatSubmissionTimestamp, escapeHtml } from "@/lib/email";
import { adminLogger } from "@/lib/admin/logger";

export interface WhatsAppInboundAlertParams {
  senderName: string;
  senderPhone: string;
  messageText: string;
  messageCount: number; // e.g. 1, 2, 3
}

export async function sendWhatsAppAdminAlert(params: WhatsAppInboundAlertParams): Promise<boolean> {
  try {
    const formattedTime = formatSubmissionTimestamp();
    const cleanPhone = params.senderPhone.replace(/[^0-9]/g, "");
    const safeName = escapeHtml(params.senderName || "WhatsApp Visitor");
    const safeMessage = escapeHtml(params.messageText);
    const waReplyUrl = `https://wa.me/${cleanPhone}`;

    const internalRecipient =
      process.env.BREVO_NOTIFICATION_RECIPIENT ||
      process.env.ADMIN_EMAIL ||
      "gauravpatil5737@gmail.com";

    const subject = `[WhatsApp Alert (${params.messageCount}/3)] Message from ${safeName} (+${cleanPhone})`;

    // Single-view, text-first, zero-scroll email layout
    const textContent =
      `--------------------------------------------------\n` +
      `WHATSAPP VISITOR INQUIRY (Message ${params.messageCount} of 3)\n` +
      `--------------------------------------------------\n` +
      `Sender:    ${params.senderName}\n` +
      `Phone:     +${cleanPhone}\n` +
      `Received:  ${formattedTime}\n\n` +
      `Message:\n` +
      `"${params.messageText}"\n\n` +
      `--------------------------------------------------\n` +
      `QUICK ACTION:\n` +
      `Reply on WhatsApp: ${waReplyUrl}\n` +
      `--------------------------------------------------\n`;

    const htmlContent = `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'SFMono-Regular',Consolas,Menlo,monospace;max-width:540px;margin:0 auto;padding:16px;background:#FAFAFA;border:1px solid #E2E8F0;border-radius:8px;color:#111827;font-size:13px;line-height:1.5;">
        <div style="padding-bottom:10px;margin-bottom:12px;border-bottom:1px solid #E2E8F0;">
          <strong style="color:#7C3AED;text-transform:uppercase;letter-spacing:1px;font-size:11px;">WhatsApp Inbound Alert</strong>
          <span style="font-size:11px;color:#64748B;float:right;">Message ${params.messageCount} of 3</span>
        </div>
        <p style="margin:0 0 6px 0;"><strong>Sender:</strong> ${safeName}</p>
        <p style="margin:0 0 6px 0;"><strong>Phone:</strong> <a href="${waReplyUrl}" style="color:#059669;text-decoration:none;font-weight:600;">+${cleanPhone}</a></p>
        <p style="margin:0 0 12px 0;font-size:11px;color:#64748B;"><strong>Received:</strong> ${formattedTime}</p>
        <div style="padding:10px 12px;background:#FFFFFF;border:1px solid #E2E8F0;border-left:3px solid #7C3AED;border-radius:4px;margin-bottom:14px;white-space:pre-wrap;">${safeMessage}</div>
        <div style="text-align:left;">
          <a href="${waReplyUrl}" style="display:inline-block;padding:8px 16px;background:#059669;color:#FFFFFF;text-decoration:none;font-weight:600;font-size:12px;border-radius:4px;">
            Reply on WhatsApp &rarr;
          </a>
        </div>
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
