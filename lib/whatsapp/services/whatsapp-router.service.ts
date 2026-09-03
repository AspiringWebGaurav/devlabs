/**
 * Deterministic WhatsApp Command Router & Intent Dispatcher
 * 
 * 100% Deterministic (ZERO AI, ZERO LLMs, ZERO NLP).
 * Routes based on exact keyword matches, button IDs, and sequential flow steps.
 */

import { WhatsAppMetaClient } from "../meta/client";
import { whatsappRepository } from "../persistence/whatsapp.repository";
import { LeadIntakeService } from "./lead-intake.service";
import { getAdaptiveButtons } from "./button-helper";
import { WhatsAppEmailAlerts } from "../notifications/whatsapp-email-alerts";
import { adminLogger } from "@/lib/admin/logger";
import { maskPhone } from "../security/sanitizer";
import type { WhatsAppMessage } from "../types";
import type { ParsedInboundMessage } from "../webhook/parser";

export class WhatsAppRouterService {
  /**
   * Main router entry point for every inbound WhatsApp message.
   */
  public static async handleInboundMessage(
    inbound: ParsedInboundMessage,
    fileAttachment?: { storagePath: string; fileName: string }
  ): Promise<void> {
    const phone = inbound.from;
    const masked = maskPhone(phone);
    const now = Date.now();

    // 1. Fetch or initialize thread in Firestore
    let thread = await whatsappRepository.getThread(phone);

    if (!thread) {
      thread = {
        id: phone,
        recruiterPhone: phone,
        recruiterName: inbound.senderName,
        status: "active",
        optedOut: false,
        lastInboundMessageAt: now,
        lastOutboundMessageAt: 0,
        customerServiceWindowOpenedAt: now,
        customerServiceWindowExpiresAt: now + 24 * 60 * 60 * 1000,
        currentFlowStep: "idle",
        unreadByAdmin: true,
        leadSubmitted: false,
        hasReceivedResume: false,
        hasRequestedHuman: false,
        createdAt: now,
        updatedAt: now,
      };
      // Dispatch conversation started email in background (non-blocking)
      void WhatsAppEmailAlerts.notifyNewConversation(phone, inbound.senderName);
    } else {
      // Update 24-hour customer service window on every inbound message
      thread.lastInboundMessageAt = now;
      thread.customerServiceWindowExpiresAt = now + 24 * 60 * 60 * 1000;
      thread.unreadByAdmin = true;
      if (inbound.senderName && !thread.recruiterName) {
        thread.recruiterName = inbound.senderName;
      }
    }

    // 2. Persist inbound message to audit log
    const inboundMessageRecord: WhatsAppMessage = {
      id: inbound.id,
      threadId: thread.id,
      direction: "inbound",
      type: inbound.type,
      body: inbound.body,
      mediaStoragePath: fileAttachment?.storagePath,
      mediaFileName: fileAttachment?.fileName,
      mediaMimeType: inbound.mediaMimeType,
      timestamp: inbound.timestamp,
    };
    await whatsappRepository.saveMessage(inboundMessageRecord);

    // Broadcast minimal RTDB signal to notify Admin UI
    await whatsappRepository.broadcastSignal({
      threadId: thread.id,
      eventType: "new_message",
      timestamp: now,
      unread: true,
    });

    const rawText = (inbound.body || "").trim();
    const upperText = rawText.toUpperCase();
    const buttonId = inbound.interactiveButtonId || "";

    // 3. Invariant 8: Opt-Out Check
    const OPT_OUT_KEYWORDS = ["STOP", "UNSUBSCRIBE", "OPT OUT", "REMOVE ME", "OPT-OUT"];
    if (OPT_OUT_KEYWORDS.includes(upperText)) {
      thread.optedOut = true;
      thread.status = "opted_out";
      thread.optedOutAt = now;
      thread.currentFlowStep = "idle";
      thread.draftLead = undefined;
      await whatsappRepository.saveThread(thread);

      await WhatsAppMetaClient.sendTextMessage(
        phone,
        "You have successfully opted out of WhatsApp messages from Gaurav's Portfolio. No further messages will be sent. To reconnect later, reply 'START' or visit https://devlabs.eu.cc.",
        thread
      );
      return;
    }

    // 3.1 Invariant 8.1: Opt-In Reconnect Check
    const OPT_IN_KEYWORDS = ["START", "UNSTOP", "SUBSCRIBE", "RESTART"];
    if (thread.optedOut && OPT_IN_KEYWORDS.includes(upperText)) {
      thread.optedOut = false;
      thread.status = "active";
      thread.optedOutAt = undefined;
      thread.currentFlowStep = "idle";
      thread.draftLead = undefined;
      await whatsappRepository.saveThread(thread);

      await WhatsAppMetaClient.sendQuickReplyButtons(
        phone,
        `Welcome back${thread.recruiterName ? ` ${thread.recruiterName}` : ""}! You have re-subscribed to WhatsApp messages from Gaurav's Portfolio.\n\nHow can I help you today?`,
        getAdaptiveButtons(thread),
        thread
      );
      return;
    }

    // If already opted out, reject messaging
    if (thread.optedOut) {
      adminLogger.warn("WhatsApp:OptedOutMessageIgnored", "Message ignored from opted-out number", { phone: masked });
      return;
    }

    // 4. Sequential Flow Processing (if in active opportunity intake)
    if (thread.currentFlowStep !== "idle") {
      const handled = await LeadIntakeService.processFlowStep(thread, rawText, fileAttachment);
      if (handled) return;
    }

    // 5. Intent Routing (Buttons or Keywords)
    // A. Resume Request
    if (
      buttonId === "action_resume" ||
      upperText === "RESUME" ||
      upperText === "CV" ||
      upperText === "GET RESUME" ||
      upperText.includes("RESUME")
    ) {
      thread.hasReceivedResume = true;
      await whatsappRepository.saveThread(thread);
      const resumeUrl = process.env.RESUME_PUBLIC_URL || "https://devlabs.eu.cc";
      const nextButtons = getAdaptiveButtons(thread);

      await WhatsAppMetaClient.sendQuickReplyButtons(
        phone,
        `Here is Gaurav's portfolio and technical background overview: ${resumeUrl}\n\nWould you like to discuss a specific job opportunity or speak directly with Gaurav?`,
        nextButtons,
        thread
      );
      return;
    }

    // B. Opportunity Intake Request
    if (
      buttonId === "action_opportunity" ||
      upperText === "OPPORTUNITY" ||
      upperText === "JOB" ||
      upperText === "HIRE" ||
      upperText === "ROLE" ||
      upperText.includes("OPPORTUNITY")
    ) {
      await LeadIntakeService.startFlow(thread);
      return;
    }

    // C. Human Escalation Request (Meta Policy Invariant 19)
    if (
      buttonId === "action_human" ||
      upperText === "TALK" ||
      upperText === "TALK TO GAURAV" ||
      upperText === "HUMAN" ||
      upperText === "AGENT" ||
      upperText.includes("TALK")
    ) {
      thread.hasRequestedHuman = true;
      await whatsappRepository.saveThread(thread);

      await WhatsAppMetaClient.sendTextMessage(
        phone,
        "I've notified Gaurav. He can review our conversation and reply to you here directly on WhatsApp when he's available.",
        thread
      );
      return;
    }

    // D. Default Welcome / Command Menu
    await whatsappRepository.saveThread(thread);
    const defaultButtons = getAdaptiveButtons(thread);
    await WhatsAppMetaClient.sendQuickReplyButtons(
      phone,
      `Hello${thread.recruiterName ? ` ${thread.recruiterName}` : ""}! I am Gaurav's Portfolio Assistant on WhatsApp.\n\nHow can I help you today?`,
      defaultButtons,
      thread
    );
  }
}
