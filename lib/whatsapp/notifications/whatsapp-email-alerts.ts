/**
 * WhatsApp Transactional Email Notification Dispatcher (Brevo)
 * 
 * Styled in compact, single-view Wasmer Pro aesthetic matching the portfolio design system.
 * Complies with Central Email Identities (Rule 2.7) & 1-click WhatsApp deep-linking.
 */

import { sendTransactionalEmail, escapeHtml, resolveAppUrl } from "@/lib/email/brevo";
import { renderCompactEmailLayout } from "@/lib/email/layout";
import { EMAIL_IDENTITIES } from "@/lib/email/identities";
import { adminLogger } from "@/lib/admin/logger";
import { maskPhone } from "../security/sanitizer";
import type { WhatsAppOpportunityLead } from "../types";

const GAURAV_EMAIL = "gauravpatil5737@gmail.com";

export class WhatsAppEmailAlerts {
  /**
   * Dispatches a compact, single-view HTML email when a recruiter submits opportunity information.
   */
  public static async notifyNewLead(lead: WhatsAppOpportunityLead): Promise<void> {
    const maskedPhone = maskPhone(lead.recruiterPhone);
    const dateStr = new Date(lead.createdAt).toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
    const cleanDigits = lead.recruiterPhone.replace(/\D/g, "");
    const safeName = escapeHtml(lead.recruiterName || "Recruiter");
    const safeCompany = escapeHtml(lead.company || "Unknown Company");
    const safeRole = escapeHtml(lead.role || "General Inquiry");
    const safePhone = escapeHtml(lead.recruiterPhone);
    const safeNotes = lead.notes ? escapeHtml(lead.notes).replace(/\n/g, "<br />") : "";
    const safeFileName = lead.mediaFileName ? escapeHtml(lead.mediaFileName) : "";

    const baseUrl = resolveAppUrl();
    const adminWhatsAppUrl = `${baseUrl}/admin/whatsapp`;

    const bodyContentHtml = `
      <div style="margin-bottom:10px;">
        <span style="background-color:#EBFBF0;color:#059669;font-size:11px;font-weight:700;letter-spacing:0.5px;padding:3px 9px;border-radius:9999px;border:1px solid #A7F3D0;display:inline-block;">
          WHATSAPP OPPORTUNITY
        </span>
      </div>

      <p style="margin:0 0 10px 0;font-size:15px;font-weight:700;color:#111827;">
        ${safeName} submitted opportunity information
      </p>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;margin:0 0 12px 0;background-color:#F9FAFB;border-radius:8px;border:1px solid #E5E7EB;">
        <tr>
          <td style="padding:12px;font-size:13px;line-height:1.55;color:#374151;">
            <div style="margin-bottom:4px;"><strong>Company:</strong> <span style="color:#111827;font-weight:600;">${safeCompany}</span></div>
            <div style="margin-bottom:4px;"><strong>Role / Position:</strong> <span style="color:#111827;font-weight:600;">${safeRole}</span></div>
            <div style="margin-bottom:4px;"><strong>Sender:</strong> ${safeName}</div>
            <div style="margin-bottom:4px;"><strong>Phone:</strong> <a href="https://wa.me/${cleanDigits}" style="color:#059669;font-weight:600;text-decoration:none;">${safePhone}</a> <span style="color:#9CA3AF;font-size:11px;">(${maskedPhone})</span></div>
            <div style="margin-bottom:4px;"><strong>Received:</strong> ${dateStr} IST</div>
            ${safeNotes ? `<div style="margin-top:8px;padding-top:8px;border-top:1px dashed #E5E7EB;"><strong>Key Details / Stack:</strong><br/><span style="color:#111827;">${safeNotes}</span></div>` : ""}
            ${safeFileName ? `<div style="margin-top:8px;padding-top:8px;border-top:1px dashed #E5E7EB;"><strong>Attachment:</strong> <a href="${adminWhatsAppUrl}" style="color:#2563EB;font-weight:600;text-decoration:none;">📄 ${safeFileName}</a> <span style="color:#6B7280;font-size:11px;">(Stored in Admin Panel)</span></div>` : ""}
          </td>
        </tr>
      </table>

      <div style="margin:12px 0 6px 0;">
        <a href="https://wa.me/${cleanDigits}" style="background-color:#25D366;color:#ffffff;font-size:13px;font-weight:600;padding:9px 18px;border-radius:6px;text-decoration:none;display:inline-block;">
          Reply on WhatsApp &rarr;
        </a>
        &nbsp;
        <a href="${adminWhatsAppUrl}" style="background-color:#F3F4F6;color:#374151;font-size:13px;font-weight:600;padding:9px 16px;border-radius:6px;text-decoration:none;display:inline-block;border:1px solid #D1D5DB;">
          Open in Admin Panel
        </a>
      </div>
    `;

    const htmlContent = renderCompactEmailLayout({
      title: `${safeName} submitted opportunity information`,
      bodyContentHtml,
      footerType: "STANDARD",
    });

    const textContent = [
      `[WhatsApp] ${lead.recruiterName || "Recruiter"} submitted opportunity information`,
      `Company: ${lead.company}`,
      `Role: ${lead.role}`,
      `Sender: ${lead.recruiterName || "Recruiter"}`,
      `Phone: ${lead.recruiterPhone} (${maskedPhone})`,
      `Date: ${dateStr} IST`,
      lead.notes ? `Details: ${lead.notes}` : "",
      lead.mediaFileName ? `Attachment: ${lead.mediaFileName} (Stored in Admin Panel)` : "",
      `Reply on WhatsApp: https://wa.me/${cleanDigits}`,
      `Admin Panel: ${adminWhatsAppUrl}`,
    ]
      .filter(Boolean)
      .join("\n");

    const emailSubject = `[WhatsApp] ${lead.recruiterName || "Recruiter"} submitted opportunity information (${lead.company} - ${lead.role})`;

    try {
      await sendTransactionalEmail({
        identity: EMAIL_IDENTITIES.HELLO,
        to: [{ email: GAURAV_EMAIL, name: "Gaurav Patil" }],
        subject: emailSubject,
        htmlContent,
        textContent,
        tags: ["whatsapp-lead", "recruiter-opportunity"],
      });
      adminLogger.info("WhatsApp:EmailAlertSent", "Lead notification sent to Gaurav", { leadId: lead.id });
    } catch (err) {
      adminLogger.error("WhatsApp:EmailAlertFailed", err, "Failed to send lead email alert to Gaurav");
    }
  }

  /**
   * Dispatches a compact, single-view HTML alert when a new recruiter starts a WhatsApp conversation.
   */
  public static async notifyNewConversation(phone: string, senderName?: string): Promise<void> {
    const maskedPhone = maskPhone(phone);
    const dateStr = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
    const cleanDigits = phone.replace(/\D/g, "");
    const safeName = escapeHtml(senderName || "Recruiter");
    const safePhone = escapeHtml(phone);

    const bodyContentHtml = `
      <div style="margin-bottom:10px;">
        <span style="background-color:#EBFBF0;color:#059669;font-size:11px;font-weight:700;letter-spacing:0.5px;padding:3px 9px;border-radius:9999px;border:1px solid #A7F3D0;display:inline-block;">
          WHATSAPP RECRUITER CHANNEL
        </span>
      </div>

      <p style="margin:0 0 10px 0;font-size:15px;font-weight:700;color:#111827;">
        New WhatsApp Chat Started
      </p>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;margin:0 0 12px 0;background-color:#F9FAFB;border-radius:8px;border:1px solid #E5E7EB;">
        <tr>
          <td style="padding:12px;font-size:13px;line-height:1.55;color:#374151;">
            <div style="margin-bottom:4px;"><strong>Contact:</strong> ${safeName}</div>
            <div style="margin-bottom:4px;"><strong>Phone:</strong> <a href="https://wa.me/${cleanDigits}" style="color:#059669;font-weight:600;text-decoration:none;">${safePhone}</a> <span style="color:#9CA3AF;font-size:11px;">(${maskedPhone})</span></div>
            <div style="margin-bottom:4px;"><strong>Started:</strong> ${dateStr} IST</div>
            <div style="margin-top:6px;color:#6B7280;font-size:12px;">The automated portfolio guide is currently assisting this contact.</div>
          </td>
        </tr>
      </table>

      <div style="margin:12px 0 6px 0;">
        <a href="https://wa.me/${cleanDigits}" style="background-color:#25D366;color:#ffffff;font-size:13px;font-weight:600;padding:9px 18px;border-radius:6px;text-decoration:none;display:inline-block;">
          Open Chat on WhatsApp &rarr;
        </a>
      </div>
    `;

    const htmlContent = renderCompactEmailLayout({
      title: "New WhatsApp Chat Started",
      bodyContentHtml,
      footerType: "STANDARD",
    });

    const textContent = [
      `[WhatsApp] ${senderName || safePhone} started a chat`,
      `Contact: ${senderName || "Recruiter"}`,
      `Phone: ${phone} (${maskedPhone})`,
      `Date: ${dateStr} IST`,
      `Open on WhatsApp: https://wa.me/${cleanDigits}`,
    ].join("\n");

    const emailSubject = `[WhatsApp] ${senderName || maskedPhone} started a chat`;

    try {
      await sendTransactionalEmail({
        identity: EMAIL_IDENTITIES.HELLO,
        to: [{ email: GAURAV_EMAIL, name: "Gaurav Patil" }],
        subject: emailSubject,
        htmlContent,
        textContent,
        tags: ["whatsapp-new-thread"],
      });
    } catch (err) {
      adminLogger.error("WhatsApp:NewConvAlertFailed", err, "Failed to send new conversation alert");
    }
  }

  /**
   * Dispatches a compact, single-view HTML alert when a recruiter sends a direct message to Gaurav.
   */
  public static async notifyDirectMessage(
    phone: string,
    recruiterName: string | undefined,
    messageText: string
  ): Promise<void> {
    const maskedPhone = maskPhone(phone);
    const dateStr = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
    const cleanDigits = phone.replace(/\D/g, "");
    const safeName = escapeHtml(recruiterName || "Recruiter");
    const safePhone = escapeHtml(phone);
    const safeMsg = escapeHtml(messageText).replace(/\n/g, "<br />");
    const preview = messageText.length > 50 ? `${messageText.slice(0, 47)}...` : messageText;

    const bodyContentHtml = `
      <div style="margin-bottom:10px;">
        <span style="background-color:#EBFBF0;color:#059669;font-size:11px;font-weight:700;letter-spacing:0.5px;padding:3px 9px;border-radius:9999px;border:1px solid #A7F3D0;display:inline-block;">
          WHATSAPP DIRECT MESSAGE
        </span>
      </div>

      <p style="margin:0 0 10px 0;font-size:15px;font-weight:700;color:#111827;">
        Direct message from ${safeName}
      </p>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;margin:0 0 12px 0;background-color:#F9FAFB;border-radius:8px;border:1px solid #E5E7EB;">
        <tr>
          <td style="padding:12px;font-size:13px;line-height:1.55;color:#374151;">
            <div style="margin-bottom:4px;"><strong>From:</strong> ${safeName}</div>
            <div style="margin-bottom:4px;"><strong>Phone:</strong> <a href="https://wa.me/${cleanDigits}" style="color:#059669;font-weight:600;text-decoration:none;">${safePhone}</a> <span style="color:#9CA3AF;font-size:11px;">(${maskedPhone})</span></div>
            <div style="margin-bottom:4px;"><strong>Received:</strong> ${dateStr} IST</div>
            <div style="margin-top:8px;padding-top:8px;border-top:1px dashed #E5E7EB;">
              <strong>Message:</strong><br/>
              <span style="color:#111827;font-size:14px;">${safeMsg}</span>
            </div>
          </td>
        </tr>
      </table>

      <div style="margin:12px 0 6px 0;">
        <a href="https://wa.me/${cleanDigits}" style="background-color:#25D366;color:#ffffff;font-size:13px;font-weight:600;padding:9px 18px;border-radius:6px;text-decoration:none;display:inline-block;">
          Reply on WhatsApp &rarr;
        </a>
      </div>
    `;

    const htmlContent = renderCompactEmailLayout({
      title: `Direct message from ${safeName}`,
      bodyContentHtml,
      footerType: "STANDARD",
    });

    const textContent = [
      `[WhatsApp] Direct message from ${recruiterName || safePhone}`,
      `From: ${recruiterName || "Recruiter"}`,
      `Phone: ${phone} (${maskedPhone})`,
      `Date: ${dateStr} IST`,
      `Message: ${messageText}`,
      `Reply on WhatsApp: https://wa.me/${cleanDigits}`,
    ].join("\n");

    const emailSubject = `[WhatsApp Message] ${recruiterName || maskedPhone}: "${preview}"`;

    try {
      await sendTransactionalEmail({
        identity: EMAIL_IDENTITIES.HELLO,
        to: [{ email: GAURAV_EMAIL, name: "Gaurav Patil" }],
        subject: emailSubject,
        htmlContent,
        textContent,
        tags: ["whatsapp-direct-message"],
      });
      adminLogger.info("WhatsApp:DirectMessageAlertSent", "Direct message alert sent to Gaurav", { phone: maskedPhone });
    } catch (err) {
      adminLogger.error("WhatsApp:DirectMessageAlertFailed", err, "Failed to send direct message alert");
    }
  }
}
