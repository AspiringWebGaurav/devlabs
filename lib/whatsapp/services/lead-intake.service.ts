/**
 * Sequential Structured Opportunity Intake Service
 * 
 * Manages deterministic recruiter flow (Steps 1 through 6 + Cancel/Reset).
 * Zero AI or NLP inference; persists step state in Firestore after every transition.
 */

import { WhatsAppMetaClient } from "../meta/client";
import { whatsappRepository } from "../persistence/whatsapp.repository";
import { WhatsAppEmailAlerts } from "../notifications/whatsapp-email-alerts";
import { sanitizeText } from "../security/sanitizer";
import type { WhatsAppThread, WhatsAppOpportunityLead } from "../types";

export class LeadIntakeService {
  /**
   * Starts the sequential opportunity intake flow.
   */
  public static async startFlow(thread: WhatsAppThread): Promise<void> {
    thread.currentFlowStep = "awaiting_name";
    thread.draftLead = {};
    await whatsappRepository.saveThread(thread);

    await WhatsAppMetaClient.sendTextMessage(
      thread.recruiterPhone,
      "Thanks for considering me for an opportunity! Let's take down the details step-by-step.\n\nFirst, what is your full name?",
      thread
    );
  }

  /**
   * Handles user input during an active sequential flow step.
   */
  public static async processFlowStep(
    thread: WhatsAppThread,
    textInput: string,
    fileAttachment?: { storagePath: string; fileName: string }
  ): Promise<boolean> {
    const input = sanitizeText(textInput);
    const upperInput = input.toUpperCase();

    // 1. Check for Deterministic CANCEL / RESET Commands
    if (upperInput === "CANCEL" || upperInput === "RESET" || upperInput === "START OVER") {
      thread.currentFlowStep = "idle";
      thread.draftLead = undefined;
      await whatsappRepository.saveThread(thread);

      await WhatsAppMetaClient.sendQuickReplyButtons(
        thread.recruiterPhone,
        "Opportunity intake cancelled. You can request my resume, start an opportunity discussion again, or connect with Gaurav.",
        [
          { id: "action_resume", title: "📄 Get Resume PDF" },
          { id: "action_opportunity", title: "💼 Opportunity" },
          { id: "action_human", title: "🤝 Talk to Gaurav" },
        ],
        thread
      );
      return true;
    }

    const draft = thread.draftLead || {};

    // 2. Step: Awaiting Name
    if (thread.currentFlowStep === "awaiting_name") {
      draft.name = input;
      thread.recruiterName = input;
      thread.currentFlowStep = "awaiting_company";
      thread.draftLead = draft;
      await whatsappRepository.saveThread(thread);

      await WhatsAppMetaClient.sendTextMessage(
        thread.recruiterPhone,
        `Nice to meet you, ${input}! What company or organization are you representing?`,
        thread
      );
      return true;
    }

    // 3. Step: Awaiting Company
    if (thread.currentFlowStep === "awaiting_company") {
      draft.company = input;
      thread.currentFlowStep = "awaiting_role";
      thread.draftLead = draft;
      await whatsappRepository.saveThread(thread);

      await WhatsAppMetaClient.sendTextMessage(
        thread.recruiterPhone,
        `Great! What role, position, or opportunity are you recruiting for at ${input}?`,
        thread
      );
      return true;
    }

    // 4. Step: Awaiting Role
    if (thread.currentFlowStep === "awaiting_role") {
      draft.role = input;
      thread.currentFlowStep = "awaiting_details";
      thread.draftLead = draft;
      await whatsappRepository.saveThread(thread);

      await WhatsAppMetaClient.sendTextMessage(
        thread.recruiterPhone,
        "Got it! Could you share key details (e.g., location, tech stack, contract vs. full-time, salary/rate range)? Or type 'Skip'.",
        thread
      );
      return true;
    }

    // 5. Step: Awaiting Details
    if (thread.currentFlowStep === "awaiting_details") {
      if (upperInput !== "SKIP") {
        draft.notes = input;
      }
      thread.currentFlowStep = "awaiting_file";
      thread.draftLead = draft;
      await whatsappRepository.saveThread(thread);

      await WhatsAppMetaClient.sendTextMessage(
        thread.recruiterPhone,
        "Optional: If you have a Job Description (PDF or DOCX), feel free to attach it now, or type 'Skip' or 'Done'.",
        thread
      );
      return true;
    }

    // 6. Step: Awaiting File Attachment or Done
    if (thread.currentFlowStep === "awaiting_file") {
      if (fileAttachment) {
        draft.mediaStoragePath = fileAttachment.storagePath;
        draft.mediaFileName = fileAttachment.fileName;
      }

      // Complete Lead Creation
      const leadId = `lead_${Date.now()}_${crypto.randomUUID().slice(0, 6)}`;
      const lead: WhatsAppOpportunityLead = {
        id: leadId,
        threadId: thread.id,
        recruiterPhone: thread.recruiterPhone,
        recruiterName: draft.name || thread.recruiterName || "Recruiter",
        company: draft.company || "Unknown Company",
        role: draft.role || "General Inquiry",
        notes: draft.notes,
        mediaStoragePath: draft.mediaStoragePath,
        mediaFileName: draft.mediaFileName,
        status: "new",
        createdAt: Date.now(),
      };

      // Save lead to Firestore
      await whatsappRepository.saveOpportunityLead(lead);

      // Reset thread state to idle and record lead submitted
      thread.currentFlowStep = "idle";
      thread.draftLead = undefined;
      thread.leadSubmitted = true;
      await whatsappRepository.saveThread(thread);

      // Notify Gaurav via Brevo text-first email
      await WhatsAppEmailAlerts.notifyNewLead(lead);

      // Broadcast RTDB minimal change signal for Admin UI
      await whatsappRepository.broadcastSignal({
        threadId: thread.id,
        eventType: "new_lead",
        timestamp: Date.now(),
        unread: true,
      });

      // Send confirmation to recruiter
      await WhatsAppMetaClient.sendQuickReplyButtons(
        thread.recruiterPhone,
        `Thank you, ${lead.recruiterName}! I've saved the opportunity details for ${lead.company} and alerted Gaurav directly. He will review this and get back to you soon.\n\nCan I help you with anything else?`,
        [
          { id: "action_resume", title: "📄 Get Resume PDF" },
          { id: "action_human", title: "🤝 Talk to Gaurav" },
        ],
        thread
      );
      return true;
    }

    return false;
  }
}
