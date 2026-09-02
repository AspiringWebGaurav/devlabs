/**
 * WhatsApp Transactional Email Notification Dispatcher (Brevo)
 * 
 * Complies with Constitution Rule 2.7 (Central Email Identities & Text-First Format).
 * Senders: hello@gauravpatil.online -> gauravpatil5737@gmail.com
 */

import { sendTransactionalEmail } from "@/lib/email/brevo";
import { EMAIL_IDENTITIES } from "@/lib/email/identities";
import { adminLogger } from "@/lib/admin/logger";
import { maskPhone } from "../security/sanitizer";
import type { WhatsAppOpportunityLead } from "../types";

const GAURAV_EMAIL = "gauravpatil5737@gmail.com";

export class WhatsAppEmailAlerts {
  /**
   * Dispatches text-first notification when a recruiter completes an opportunity lead.
   */
  public static async notifyNewLead(lead: WhatsAppOpportunityLead): Promise<void> {
    const maskedPhone = maskPhone(lead.recruiterPhone);
    const dateStr = new Date(lead.createdAt).toLocaleString("en-US", { timeZone: "Asia/Kolkata" });

    const textContent = [
      "==================================================",
      "NEW RECRUITER OPPORTUNITY VIA WHATSAPP",
      "==================================================",
      `Sender: ${lead.recruiterName || "Recruiter"}`,
      `Role / Opportunity: ${lead.role}`,
      `Company: ${lead.company}`,
      `Phone: ${lead.recruiterPhone} (${maskedPhone})`,
      `Date: ${dateStr} IST`,
      lead.notes ? `Details: ${lead.notes}` : "",
      lead.mediaFileName ? `Attachment: Stored privately in Admin Panel (${lead.mediaFileName})` : "",
      "==================================================",
      "ACTION: Reply directly to the recruiter on WhatsApp from your mobile device.",
      "==================================================",
    ]
      .filter(Boolean)
      .join("\n");

    try {
      await sendTransactionalEmail({
        identity: EMAIL_IDENTITIES.HELLO,
        to: [{ email: GAURAV_EMAIL, name: "Gaurav Patil" }],
        subject: `[WhatsApp Opportunity] ${lead.company} - ${lead.role} (${lead.recruiterName || "Recruiter"})`,
        textContent,
        tags: ["whatsapp-lead", "recruiter-opportunity"],
      });
      adminLogger.info("WhatsApp:EmailAlertSent", "Lead notification sent to Gaurav", { leadId: lead.id });
    } catch (err) {
      adminLogger.error("WhatsApp:EmailAlertFailed", err, "Failed to send lead email alert to Gaurav");
    }
  }

  /**
   * Dispatches text-first alert when a recruiter explicitly requests human escalation.
   */
  public static async notifyHumanEscalation(phone: string, recruiterName?: string, lastMessage?: string): Promise<void> {
    const maskedPhone = maskPhone(phone);
    const dateStr = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });

    const textContent = [
      "==================================================",
      "RECRUITER REQUESTED HUMAN ESCALATION",
      "==================================================",
      `Sender: ${recruiterName || "Recruiter"}`,
      `Phone: ${phone} (${maskedPhone})`,
      `Date: ${dateStr} IST`,
      lastMessage ? `Recent Message: "${lastMessage}"` : "",
      "==================================================",
      "STATUS: Recruiter was informed you will reply directly on WhatsApp.",
      "ACTION: Open WhatsApp on your mobile phone to reply.",
      "==================================================",
    ]
      .filter(Boolean)
      .join("\n");

    try {
      await sendTransactionalEmail({
        identity: EMAIL_IDENTITIES.HELLO,
        to: [{ email: GAURAV_EMAIL, name: "Gaurav Patil" }],
        subject: `[WhatsApp Escalation] Recruiter wants to talk: ${recruiterName || phone}`,
        textContent,
        tags: ["whatsapp-escalation", "human-handoff"],
      });
      adminLogger.info("WhatsApp:EscalationAlertSent", "Human escalation alert sent to Gaurav", { phone: maskedPhone });
    } catch (err) {
      adminLogger.error("WhatsApp:EscalationAlertFailed", err, "Failed to send human escalation alert");
    }
  }

  /**
   * Dispatches text-first alert when a new recruiter starts their first conversation.
   */
  public static async notifyNewConversation(phone: string, senderName?: string): Promise<void> {
    const maskedPhone = maskPhone(phone);
    const dateStr = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });

    const textContent = [
      "==================================================",
      "NEW RECRUITER WHATSAPP CONVERSATION STARTED",
      "==================================================",
      `Recruiter: ${senderName || "Unknown Recruiter"}`,
      `Phone: ${phone} (${maskedPhone})`,
      `Date: ${dateStr} IST`,
      "==================================================",
      "The automated portfolio guide is handling intake.",
      "==================================================",
    ].join("\n");

    try {
      await sendTransactionalEmail({
        identity: EMAIL_IDENTITIES.HELLO,
        to: [{ email: GAURAV_EMAIL, name: "Gaurav Patil" }],
        subject: `[WhatsApp Inbound] New conversation from ${senderName || maskedPhone}`,
        textContent,
        tags: ["whatsapp-new-thread"],
      });
    } catch (err) {
      adminLogger.error("WhatsApp:NewConvAlertFailed", err, "Failed to send new conversation alert");
    }
  }
}
