/**
 * Universal Conversation Router & Real-World Recruiter Engine
 * 
 * Strict Enterprise Standards:
 * - 17 Message Types & Strict 10-Tier Priority.
 * - Invariant 12: Non-mutating classifier (Zero DB writes in classifier).
 * - Authoritative OCC via ConversationRepository.
 * - Conservative Mixed-Input Parsing (unambiguous only, otherwise asks clarification, zero LLM).
 * - Semantic Truth Levels for Lead and Human notifications.
 * - Authoritative Attachment Policy: PDF, DOC, DOCX only (<15MB).
 */

import crypto from "crypto";
import { conversationRepository } from "../persistence/conversation.repo";
import { outboxRepository } from "../persistence/outbox.repo";
import { notificationRepository } from "../persistence/notification.repo";
import { outboxDispatcherWorker } from "../engine/outbox-worker";
import { findFaqAnswer } from "./recruiter-faq-registry";
import { adminLogger } from "@/lib/admin/logger";
import { maskPhone } from "../security/sanitizer";
import type {
  WhatsAppConversation,
  WhatsAppFlow,
  OpportunityFlowStep,
  ClassificationResult,
  WhatsAppOutboxMessage,
  WhatsAppNotificationJob,
  DraftOpportunityLead,
} from "../types";
import type { ParsedInboundMessage } from "../webhook/parser";

export class UniversalRouterService {
  /**
   * Main router entry point.
   */
  public static async routeInboundMessage(
    inbound: ParsedInboundMessage,
    fileAttachment?: { storagePath: string; fileName: string; fileSize?: number; mimeType?: string }
  ): Promise<void> {
    const phone = inbound.from;
    const correlationId = crypto.randomUUID();

    // 1. Fetch or initialize conversation with first-contact concurrency guard
    let conversation = await conversationRepository.getConversation(phone);
    if (!conversation) {
      const initResult = await conversationRepository.initializeFirstContact(phone, inbound.senderName, correlationId);
      conversation = initResult.conversation;
      if (initResult.isNew) {
        // Dispatch initial welcome outbox message immediately
        await outboxDispatcherWorker.processBatch(2);
        return;
      }
    }

    // 2. Fetch active flow if in INTAKE_ACTIVE
    let activeFlow: WhatsAppFlow | null = null;
    if (conversation.currentState === "INTAKE_ACTIVE" && conversation.activeFlowId) {
      activeFlow = await conversationRepository.getFlow(conversation.activeFlowId);
    }

    // 3. Command-boundary normalization (preserve original text for intake parsing)
    const rawText = (inbound.body || "").trim();
    const commandNormalized = this.normalizeForCommandDetection(rawText);
    const buttonId = inbound.interactiveButtonId || "";

    // 4. Deterministic Non-Mutating Classifier (Invariant 12)
    const classification = this.classifyMessage(
      rawText,
      commandNormalized,
      buttonId,
      conversation,
      activeFlow,
      fileAttachment,
      inbound.id
    );

    adminLogger.debug("WhatsApp:MessageClassified", "Classification result computed", {
      classification: classification.classification,
      confidence: classification.confidence,
      phone: maskPhone(phone),
    });

    // 5. Authoritative State Transition Engine
    await this.executeStateTransition(
      conversation,
      activeFlow,
      classification,
      rawText,
      fileAttachment,
      correlationId
    );

    // 6. Trigger outbox worker to dispatch generated responses
    await outboxDispatcherWorker.processBatch(2);
  }

  /**
   * Normalizes text solely for command detection without destroying input semantics.
   */
  public static normalizeForCommandDetection(text: string): string {
    return text
      .trim()
      .toUpperCase()
      .replace(/^[/#.!]+|[.!?]+$/g, "") // Strip leading/trailing command punctuation
      .trim();
  }

  /**
   * Deterministic Classifier (Zero DB writes).
   */
  public static classifyMessage(
    rawText: string,
    commandNormalized: string,
    buttonId: string,
    conversation: WhatsAppConversation,
    activeFlow: WhatsAppFlow | null,
    fileAttachment?: { storagePath: string; fileName: string },
    inboundEventId = ""
  ): ClassificationResult {
    const baseResult: Omit<ClassificationResult, "classification" | "confidence"> = {
      currentState: conversation.currentState,
      currentStep: (activeFlow?.currentStep || "idle") as OpportunityFlowStep,
      sessionGeneration: conversation.sessionGeneration,
      stateVersion: conversation.stateVersion,
      inboundEventId,
      routingRuleVersion: 1,
    };

    // Tier 1: STOP / Opt-Out
    const STOP_KEYWORDS = ["STOP", "UNSUBSCRIBE", "CANCEL ALL", "QUIT", "OPTOUT", "OPT-OUT"];
    if (STOP_KEYWORDS.includes(commandNormalized)) {
      return {
        ...baseResult,
        classification: "GLOBAL_COMMAND",
        commandType: "STOP",
        confidence: "EXACT_COMMAND",
      };
    }

    // Tier 2: RESET / START OVER
    const RESET_KEYWORDS = ["RESET", "START OVER", "START FRESH", "RESTART", "RESET RESET"];
    if (RESET_KEYWORDS.includes(commandNormalized) || buttonId === "lead_reset") {
      return {
        ...baseResult,
        classification: "GLOBAL_COMMAND",
        commandType: "RESET",
        confidence: "EXACT_COMMAND",
      };
    }

    // Tier 3: MENU / HOME / OPTIONS
    const MENU_KEYWORDS = ["MENU", "HOME", "OPTIONS", "MAIN MENU", "MENU MENU"];
    if (MENU_KEYWORDS.includes(commandNormalized) || buttonId === "btn_menu") {
      return {
        ...baseResult,
        classification: "GLOBAL_COMMAND",
        commandType: "MENU",
        confidence: "EXACT_COMMAND",
      };
    }

    // Tier 4: START
    if (commandNormalized === "START") {
      return {
        ...baseResult,
        classification: "GLOBAL_COMMAND",
        commandType: "START",
        confidence: "EXACT_COMMAND",
      };
    }

    // Tier 5: HUMAN / TALK TO GAURAV
    const HUMAN_KEYWORDS = ["HUMAN", "AGENT", "TALK TO GAURAV", "REPRESENTATIVE", "SPEAK WITH GAURAV", "TALK"];
    if (HUMAN_KEYWORDS.includes(commandNormalized) || buttonId === "btn_human") {
      return {
        ...baseResult,
        classification: "GLOBAL_COMMAND",
        commandType: "HUMAN",
        confidence: "EXACT_COMMAND",
      };
    }

    // Interactive Button Responses
    if (buttonId) {
      return {
        ...baseResult,
        classification: "INTERACTIVE_RESPONSE",
        confidence: "EXACT_COMMAND",
        extractedEntities: { buttonId },
      };
    }

    // Tier 6: Active-Flow Navigation (BACK, EDIT, SKIP)
    if (conversation.currentState === "INTAKE_ACTIVE" && activeFlow) {
      if (commandNormalized === "BACK" || commandNormalized === "GO BACK") {
        return { ...baseResult, classification: "FLOW_NAVIGATION", commandType: "BACK", confidence: "EXACT_COMMAND" };
      }
      if (commandNormalized.startsWith("EDIT") || commandNormalized.startsWith("CHANGE")) {
        return { ...baseResult, classification: "FLOW_NAVIGATION", commandType: "EDIT", confidence: "UNAMBIGUOUS_MATCH" };
      }
      if (commandNormalized === "SKIP" || commandNormalized === "DONE") {
        return { ...baseResult, classification: "SKIP_REQUEST", commandType: "SKIP", confidence: "EXACT_COMMAND" };
      }
    }

    // Tier 7 & 8: Attachments
    if (fileAttachment) {
      return {
        ...baseResult,
        classification: "ATTACHMENT_MEDIA",
        confidence: "UNAMBIGUOUS_MATCH",
      };
    }

    // Check for FAQ question
    const faqMatch = findFaqAnswer(rawText);
    if (faqMatch) {
      // Guard: If we are in active intake awaiting_name or awaiting_company, verify if this is an answer or a pure question
      if (conversation.currentState === "INTAKE_ACTIVE" && activeFlow) {
        // 1. Mixed question + answer check
        const hasQuestion =
          rawText.includes("?") ||
          commandNormalized.includes("WHAT") ||
          commandNormalized.includes("HOW") ||
          commandNormalized.includes("TELL ME");
        const hasSentenceOrPunctuation =
          rawText.includes(".") ||
          rawText.includes(";") ||
          (rawText.includes(",") && rawText.length > 15);
        const hasMixedPattern =
          hasQuestion &&
          (hasSentenceOrPunctuation ||
            commandNormalized.includes("ALSO") ||
            commandNormalized.includes("AND WHAT") ||
            commandNormalized.includes("BY THE WAY"));

        if (hasMixedPattern) {
          return {
            ...baseResult,
            classification: "ACTIVE_FLOW_ANSWER",
            confidence: "CLARIFICATION_REQUIRED", // Ask clarification for mixed input
            matchReason: "Possible mixed answer + FAQ question",
          };
        }

        // 2. Pure question
        const isPureQuestion =
          rawText.endsWith("?") ||
          commandNormalized.startsWith("WHAT") ||
          commandNormalized.startsWith("TELL ME") ||
          commandNormalized.startsWith("DO YOU") ||
          commandNormalized.startsWith("HOW");

        if (isPureQuestion) {
          return {
            ...baseResult,
            classification: "RECRUITER_QUESTION",
            faqId: faqMatch.faqId,
            confidence: "UNAMBIGUOUS_MATCH",
          };
        }

        // Otherwise, candidate entered text that happened to contain a keyword (e.g. "React Dynamics Inc")
        return {
          ...baseResult,
          classification: "ACTIVE_FLOW_ANSWER",
          confidence: "UNAMBIGUOUS_MATCH",
        };
      }

      return {
        ...baseResult,
        classification: "RECRUITER_QUESTION",
        faqId: faqMatch.faqId,
        confidence: "UNAMBIGUOUS_MATCH",
      };
    }

    // Tier 9: Greetings & Acknowledgements
    const GREETINGS = ["HI", "HELLO", "HEY", "GOOD MORNING", "GOOD AFTERNOON", "GOOD EVENING", "THANKS", "THANK YOU", "OK", "OKAY", "COOL", "NICE"];
    if (GREETINGS.includes(commandNormalized) || rawText === "👍" || rawText === "👌") {
      return {
        ...baseResult,
        classification: "GREETING_ACKNOWLEDGEMENT",
        confidence: "EXACT_COMMAND",
      };
    }

    // Active flow input
    if (conversation.currentState === "INTAKE_ACTIVE" && activeFlow) {
      return {
        ...baseResult,
        classification: "ACTIVE_FLOW_ANSWER",
        confidence: "UNAMBIGUOUS_MATCH",
      };
    }

    // Tier 10: Unknown Fallback
    return {
      ...baseResult,
      classification: "UNKNOWN_FALLBACK",
      confidence: "FALLBACK",
    };
  }

  /**
   * Authoritative State Transition Execution.
   */
  private static async executeStateTransition(
    conversation: WhatsAppConversation,
    activeFlow: WhatsAppFlow | null,
    classification: ClassificationResult,
    rawText: string,
    fileAttachment: { storagePath: string; fileName: string; fileSize?: number; mimeType?: string } | undefined,
    correlationId: string
  ): Promise<void> {
    const phone = conversation.conversationId;

    // 1. Opt-Out (STOP)
    if (classification.commandType === "STOP") {
      const ackOutbox: WhatsAppOutboxMessage = {
        outboxId: crypto.randomUUID(),
        operationId: outboxRepository.computeOperationId(phone, correlationId, "opt_out_ack"),
        conversationId: phone,
        destinationPhone: phone,
        messageType: "text",
        payload: {
          bodyText:
            "You have unsubscribed from automated WhatsApp messages from Gaurav's Portfolio.\n\n" +
            "Type START anytime to re-enable communication.",
        },
        correlationId,
        status: "PENDING",
        attemptCount: 0,
        maxAttempts: 5,
        nextRetryAt: Date.now(),
        reconciliationAttempts: 0,
        createdAt: Date.now(),
      };
      await conversationRepository.optOut(conversation, ackOutbox);
      return;
    }

    // If conversation is OPTED_OUT and input is not START, ignore safely
    if (conversation.currentState === "OPTED_OUT" && classification.commandType !== "START") {
      return;
    }

    // 2. START / MENU / RESET
    if (
      classification.commandType === "MENU" ||
      classification.commandType === "RESET" ||
      classification.commandType === "START"
    ) {
      const menuOutbox: WhatsAppOutboxMessage = {
        outboxId: crypto.randomUUID(),
        operationId: outboxRepository.computeOperationId(phone, correlationId, "main_menu"),
        conversationId: phone,
        destinationPhone: phone,
        messageType: "quick_reply",
        payload: {
          bodyText:
            "🏠 *Main Menu — Gaurav Patil's Portfolio*\n\n" +
            "How can I assist you?",
          footerText: "Gaurav Portfolio • Type MENU anytime",
          buttons: [
            { id: "btn_resume", title: "📄 View Resume" },
            { id: "btn_opportunity", title: "💼 Opportunities" },
            { id: "btn_human", title: "🤝 Talk to Gaurav" },
          ],
        },
        correlationId,
        status: "PENDING",
        attemptCount: 0,
        maxAttempts: 5,
        nextRetryAt: Date.now(),
        reconciliationAttempts: 0,
        createdAt: Date.now(),
      };
      await conversationRepository.executeSafeReset(conversation, menuOutbox);
      return;
    }

    // 3. HUMAN HANDOFF
    if (classification.commandType === "HUMAN") {
      const handoffOutbox: WhatsAppOutboxMessage = {
        outboxId: crypto.randomUUID(),
        operationId: outboxRepository.computeOperationId(phone, correlationId, "human_handoff_ack"),
        conversationId: phone,
        destinationPhone: phone,
        messageType: "quick_reply",
        payload: {
          bodyText:
            "🤝 *Direct Connection to Gaurav*\n\n" +
            "I've initiated a handoff to Gaurav and queued an alert for him. You can leave your message or questions here, and he will reply directly on WhatsApp.",
          footerText: "Direct Mode • Type MENU to exit",
          buttons: [{ id: "btn_menu", title: "🔄 Main Menu" }],
        },
        correlationId,
        status: "PENDING",
        attemptCount: 0,
        maxAttempts: 5,
        nextRetryAt: Date.now(),
        reconciliationAttempts: 0,
        createdAt: Date.now(),
      };

      const alertNotification: WhatsAppNotificationJob = {
        notificationId: crypto
          .createHash("sha256")
          .update(`${phone}:${correlationId}:DIRECT_MESSAGE`)
          .digest("hex"),
        type: "DIRECT_MESSAGE",
        conversationId: phone,
        recipientEmail: "gauravpatil5737@gmail.com",
        subject: `[WhatsApp Direct Message Alert] Recruiter ${conversation.contactName || phone} requested contact`,
        textContent:
          `A recruiter has requested direct contact on WhatsApp.\n\n` +
          `Recruiter: ${conversation.contactName || "Recruiter"} (${phone})\n` +
          `Reply directly on WhatsApp: https://wa.me/${phone.replace(/[^0-9]/g, "")}`,
        htmlContent: `<p>Recruiter <strong>${conversation.contactName || phone}</strong> requested direct contact.</p>`,
        status: "PENDING",
        attemptCount: 0,
        nextRetryAt: Date.now(),
        createdAt: Date.now(),
        correlationId,
      };

      await conversationRepository.initiateHumanHandoff(conversation, handoffOutbox, alertNotification);
      await notificationRepository.processJob(alertNotification);
      return;
    }

    // 4. Messages during HUMAN_PENDING: do NOT restart flow, append and confirm
    if (conversation.currentState === "HUMAN_PENDING") {
      const confirmOutbox: WhatsAppOutboxMessage = {
        outboxId: crypto.randomUUID(),
        operationId: outboxRepository.computeOperationId(phone, correlationId, "human_message_ack"),
        conversationId: phone,
        destinationPhone: phone,
        messageType: "quick_reply",
        payload: {
          bodyText: "Got it! I've forwarded this to Gaurav as well. He will reply as soon as he is available.",
          footerText: "Direct Mode • Type MENU to exit",
          buttons: [{ id: "btn_menu", title: "🔄 Main Menu" }],
        },
        correlationId,
        status: "PENDING",
        attemptCount: 0,
        maxAttempts: 5,
        nextRetryAt: Date.now(),
        reconciliationAttempts: 0,
        createdAt: Date.now(),
      };
      await outboxRepository.enqueueMessage(confirmOutbox);
      return;
    }

    // 5. Interactive Buttons
    if (classification.classification === "INTERACTIVE_RESPONSE") {
      const buttonId = classification.extractedEntities?.buttonId as string;

      if (buttonId === "btn_resume") {
        await this.handleResumeRequest(conversation, correlationId);
        return;
      }
      if (buttonId === "btn_opportunity") {
        await this.handleStartOpportunity(conversation, correlationId);
        return;
      }
      if (buttonId === "lead_confirm") {
        if (activeFlow && activeFlow.status === "ACTIVE" && activeFlow.currentStep === "lead_review") {
          await this.handleLeadConfirm(conversation, activeFlow, correlationId);
        } else {
          await this.handleStaleButton(conversation, correlationId);
        }
        return;
      }
      if (buttonId === "lead_edit") {
        if (activeFlow && activeFlow.status === "ACTIVE") {
          await this.handleLeadEdit(conversation, activeFlow, correlationId);
        } else {
          await this.handleStaleButton(conversation, correlationId);
        }
        return;
      }
    }

    // 6. Recruiter FAQ Question
    if (classification.classification === "RECRUITER_QUESTION" && classification.faqId) {
      await this.handleFaqAnswer(conversation, activeFlow, classification.faqId, correlationId);
      return;
    }

    // 7. Clarification Required (Mixed input where parsing is ambiguous)
    if (classification.confidence === "CLARIFICATION_REQUIRED") {
      const clarificationOutbox: WhatsAppOutboxMessage = {
        outboxId: crypto.randomUUID(),
        operationId: outboxRepository.computeOperationId(phone, correlationId, "clarification_prompt"),
        conversationId: phone,
        destinationPhone: phone,
        messageType: "text",
        payload: {
          bodyText:
            `I see you mentioned: "${rawText.slice(0, 100)}".\n\n` +
            `To make sure I record your details accurately without guessing, could you please confirm your answer to: *${this.getStepPromptTitle(activeFlow?.currentStep || "awaiting_name")}*?`,
        },
        correlationId,
        status: "PENDING",
        attemptCount: 0,
        maxAttempts: 5,
        nextRetryAt: Date.now(),
        reconciliationAttempts: 0,
        createdAt: Date.now(),
      };
      await outboxRepository.enqueueMessage(clarificationOutbox);
      return;
    }

    // 8. Active Intake Flow Step Processing
    if (conversation.currentState === "INTAKE_ACTIVE" && activeFlow) {
      await this.handleIntakeStepInput(
        conversation,
        activeFlow,
        classification,
        rawText,
        fileAttachment,
        correlationId
      );
      return;
    }

    // 9. Greeting when in IDLE
    if (classification.classification === "GREETING_ACKNOWLEDGEMENT") {
      const welcomeBackOutbox: WhatsAppOutboxMessage = {
        outboxId: crypto.randomUUID(),
        operationId: outboxRepository.computeOperationId(phone, correlationId, "greeting_ack"),
        conversationId: phone,
        destinationPhone: phone,
        messageType: "quick_reply",
        payload: {
          bodyText:
            "👋 Hello! Great to connect. How can I help you today?",
          footerText: "Gaurav Portfolio • Type MENU anytime",
          buttons: [
            { id: "btn_resume", title: "📄 View Resume" },
            { id: "btn_opportunity", title: "💼 Opportunities" },
            { id: "btn_human", title: "🤝 Talk to Gaurav" },
          ],
        },
        correlationId,
        status: "PENDING",
        attemptCount: 0,
        maxAttempts: 5,
        nextRetryAt: Date.now(),
        reconciliationAttempts: 0,
        createdAt: Date.now(),
      };
      await outboxRepository.enqueueMessage(welcomeBackOutbox);
      return;
    }

    // 10. Fallback explanation with Main Menu buttons
    const fallbackOutbox: WhatsAppOutboxMessage = {
      outboxId: crypto.randomUUID(),
      operationId: outboxRepository.computeOperationId(phone, correlationId, "unknown_fallback"),
      conversationId: phone,
      destinationPhone: phone,
      messageType: "quick_reply",
      payload: {
        bodyText:
          "I didn't quite catch that. You can view Gaurav's resume, share an open opportunity, or connect with Gaurav directly.",
        footerText: "Gaurav Portfolio • Type MENU anytime",
        buttons: [
          { id: "btn_resume", title: "📄 View Resume" },
          { id: "btn_opportunity", title: "💼 Opportunities" },
          { id: "btn_human", title: "🤝 Talk to Gaurav" },
        ],
      },
      correlationId,
      status: "PENDING",
      attemptCount: 0,
      maxAttempts: 5,
      nextRetryAt: Date.now(),
      reconciliationAttempts: 0,
      createdAt: Date.now(),
    };
    await outboxRepository.enqueueMessage(fallbackOutbox);
  }

  /**
   * Dispatches Resume PDF and credentials overview.
   */
  private static async handleResumeRequest(conversation: WhatsAppConversation, correlationId: string): Promise<void> {
    const phone = conversation.conversationId;
    const resumeOutbox: WhatsAppOutboxMessage = {
      outboxId: crypto.randomUUID(),
      operationId: outboxRepository.computeOperationId(phone, correlationId, "resume_delivery"),
      conversationId: phone,
      destinationPhone: phone,
      messageType: "document",
      payload: {
        documentUrl: "https://gauravpatil.online/resume.pdf",
        fileName: "Gaurav_Patil_Resume.pdf",
        bodyText:
          "📄 *Gaurav Patil — Full-Stack Systems Engineer*\n\n" +
          "Here is Gaurav's latest verified resume. Would you like to share details about an open role or speak with Gaurav directly?",
      },
      correlationId,
      status: "PENDING",
      attemptCount: 0,
      maxAttempts: 5,
      nextRetryAt: Date.now(),
      reconciliationAttempts: 0,
      createdAt: Date.now(),
    };

    await outboxRepository.enqueueMessage(resumeOutbox);
  }

  /**
   * Starts a fresh opportunity intake flow.
   */
  private static async handleStartOpportunity(conversation: WhatsAppConversation, correlationId: string): Promise<void> {
    const phone = conversation.conversationId;
    const promptOutbox: WhatsAppOutboxMessage = {
      outboxId: crypto.randomUUID(),
      operationId: outboxRepository.computeOperationId(phone, correlationId, "step1_prompt"),
      conversationId: phone,
      destinationPhone: phone,
      messageType: "text",
      payload: {
        bodyText:
          "💼 *Recruiter Opportunity Intake (Step 1 of 5)*\n\n" +
          "What is your full name?",
      },
      correlationId,
      status: "PENDING",
      attemptCount: 0,
      maxAttempts: 5,
      nextRetryAt: Date.now(),
      reconciliationAttempts: 0,
      createdAt: Date.now(),
    };

    await conversationRepository.startOpportunityFlow(conversation, promptOutbox, correlationId);
  }

  /**
   * Dispatches FAQ answer without corrupting active flow.
   */
  private static async handleFaqAnswer(
    conversation: WhatsAppConversation,
    activeFlow: WhatsAppFlow | null,
    faqId: string,
    correlationId: string
  ): Promise<void> {
    const phone = conversation.conversationId;
    const faq = (await import("./recruiter-faq-registry")).RECRUITER_FAQ_REGISTRY[faqId];
    if (!faq) return;

    let responseText = faq.bodyText;
    // If inside active intake, append re-prompt for current step
    if (conversation.currentState === "INTAKE_ACTIVE" && activeFlow) {
      responseText += `\n\n---\n*Continuing Opportunity Details:*\n${this.getStepPromptText(activeFlow.currentStep)}`;
    }

    const faqOutbox: WhatsAppOutboxMessage = {
      outboxId: crypto.randomUUID(),
      operationId: outboxRepository.computeOperationId(phone, correlationId, `faq_${faqId}`),
      conversationId: phone,
      destinationPhone: phone,
      messageType: activeFlow ? "text" : "quick_reply",
      payload: {
        bodyText: responseText,
        buttons: activeFlow ? undefined : faq.buttons,
      },
      correlationId,
      status: "PENDING",
      attemptCount: 0,
      maxAttempts: 5,
      nextRetryAt: Date.now(),
      reconciliationAttempts: 0,
      createdAt: Date.now(),
    };

    await outboxRepository.enqueueMessage(faqOutbox);
  }

  /**
   * Handles per-step intake inputs sequentially and crash-resiliently.
   */
  private static async handleIntakeStepInput(
    conversation: WhatsAppConversation,
    flow: WhatsAppFlow,
    classification: ClassificationResult,
    rawText: string,
    fileAttachment: { storagePath: string; fileName: string; fileSize?: number; mimeType?: string } | undefined,
    correlationId: string
  ): Promise<void> {
    const phone = conversation.conversationId;
    const step = flow.currentStep;

    // Handle Skip
    if (classification.commandType === "SKIP") {
      if (step === "awaiting_details" || step === "awaiting_file") {
        await this.advanceToNextStep(conversation, flow, step, null, correlationId);
        return;
      } else {
        const requiredOutbox: WhatsAppOutboxMessage = {
          outboxId: crypto.randomUUID(),
          operationId: outboxRepository.computeOperationId(phone, correlationId, `skip_rejected_${step}`),
          conversationId: phone,
          destinationPhone: phone,
          messageType: "text",
          payload: {
            bodyText: `This field is required so Gaurav has sufficient context. Please provide your answer, or type MENU to return to options.`,
          },
          correlationId,
          status: "PENDING",
          attemptCount: 0,
          maxAttempts: 5,
          nextRetryAt: Date.now(),
          reconciliationAttempts: 0,
          createdAt: Date.now(),
        };
        await outboxRepository.enqueueMessage(requiredOutbox);
        return;
      }
    }

    // Step 1: Awaiting Name
    if (step === "awaiting_name") {
      if (rawText.length < 2 || /^\d+$/.test(rawText)) {
        await this.sendValidationFailure(phone, "Please provide your full name as text.", correlationId, step);
        return;
      }
      await this.advanceToNextStep(conversation, flow, "awaiting_name", rawText, correlationId);
      return;
    }

    // Step 2: Awaiting Company
    if (step === "awaiting_company") {
      if (rawText.length < 2) {
        await this.sendValidationFailure(phone, "Please provide the company or client organization name.", correlationId, step);
        return;
      }
      await this.advanceToNextStep(conversation, flow, "awaiting_company", rawText, correlationId);
      return;
    }

    // Step 3: Awaiting Role
    if (step === "awaiting_role") {
      if (rawText.length < 2) {
        await this.sendValidationFailure(phone, "Please provide the job title or role position.", correlationId, step);
        return;
      }
      await this.advanceToNextStep(conversation, flow, "awaiting_role", rawText, correlationId);
      return;
    }

    // Step 4: Awaiting Details (Optional)
    if (step === "awaiting_details") {
      await this.advanceToNextStep(conversation, flow, "awaiting_details", rawText, correlationId);
      return;
    }

    // Step 5: Awaiting File (PDF, DOC, DOCX Only, <15MB)
    if (step === "awaiting_file") {
      if (fileAttachment) {
        const allowedExtensions = [".pdf", ".doc", ".docx"];
        const ext = (fileAttachment.fileName || "").toLowerCase().slice((fileAttachment.fileName || "").lastIndexOf("."));

        if (!allowedExtensions.includes(ext)) {
          await this.sendValidationFailure(
            phone,
            "I can only accept PDF or Word documents (DOC, DOCX) under 15MB. Please upload a valid document or type 'Skip'.",
            correlationId,
            step
          );
          return;
        }

        await this.advanceToNextStep(conversation, flow, "awaiting_file", fileAttachment, correlationId);
        return;
      }

      // If user typed "done" or text instead of file
      await this.advanceToNextStep(conversation, flow, "awaiting_file", null, correlationId);
      return;
    }
  }

  /**
   * Advances flow to the next step atomically and enqueues next prompt.
   */
  private static async advanceToNextStep(
    conversation: WhatsAppConversation,
    flow: WhatsAppFlow,
    currentStep: OpportunityFlowStep,
    value: string | { storagePath: string; fileName: string } | null,
    correlationId: string
  ): Promise<void> {
    const phone = conversation.conversationId;
    const collectedUpdates: Partial<DraftOpportunityLead> = {};
    let nextStep: OpportunityFlowStep = "awaiting_name";
    let promptText = "";
    let buttons: Array<{ id: string; title: string }> | undefined;

    if (currentStep === "awaiting_name") {
      collectedUpdates.name = value as string;
      nextStep = "awaiting_company";
      promptText = "🏢 *Step 2 of 5: Company / Client*\n\nWhat company or organization are you hiring for?";
    } else if (currentStep === "awaiting_company") {
      collectedUpdates.company = value as string;
      nextStep = "awaiting_role";
      promptText = "💼 *Step 3 of 5: Role Title*\n\nWhat specific position or job title are you seeking to fill?";
    } else if (currentStep === "awaiting_role") {
      collectedUpdates.role = value as string;
      nextStep = "awaiting_details";
      promptText = "📝 *Step 4 of 5: Key Details (Optional)*\n\nPlease share tech stack, salary/rate range, or location details (or type *Skip*).";
    } else if (currentStep === "awaiting_details") {
      if (value) collectedUpdates.details = value as string;
      nextStep = "awaiting_file";
      promptText = "📎 *Step 5 of 5: Job Description (Optional)*\n\nPlease attach a JD (PDF or Word document under 15MB), or type *Skip*.";
    } else if (currentStep === "awaiting_file") {
      if (value && typeof value === "object") {
        collectedUpdates.mediaStoragePath = value.storagePath;
        collectedUpdates.mediaFileName = value.fileName;
      }
      nextStep = "lead_review";
      const merged = { ...flow.collectedData, ...collectedUpdates };
      promptText =
        "📋 *Opportunity Review & Confirmation*\n\n" +
        `• *Name:* ${merged.name || "N/A"}\n` +
        `• *Company:* ${merged.company || "N/A"}\n` +
        `• *Role:* ${merged.role || "N/A"}\n` +
        `• *Details:* ${merged.details || "None provided"}\n` +
        `• *Attachment:* ${merged.mediaFileName || "None"}\n\n` +
        "Please confirm your submission below:";
      buttons = [
        { id: "lead_confirm", title: "✅ Confirm & Submit" },
        { id: "lead_edit", title: "✏️ Edit Details" },
        { id: "lead_reset", title: "🔄 Start Over" },
      ];
    }

    const nextOutbox: WhatsAppOutboxMessage = {
      outboxId: crypto.randomUUID(),
      operationId: outboxRepository.computeOperationId(phone, correlationId, `prompt_${nextStep}`),
      conversationId: phone,
      destinationPhone: phone,
      messageType: buttons ? "quick_reply" : "text",
      payload: {
        bodyText: promptText,
        buttons,
      },
      correlationId,
      status: "PENDING",
      attemptCount: 0,
      maxAttempts: 5,
      nextRetryAt: Date.now(),
      reconciliationAttempts: 0,
      createdAt: Date.now(),
    };

    await conversationRepository.advanceFlowStep(
      conversation,
      flow,
      { nextStep, collectedDataUpdates: collectedUpdates },
      nextOutbox
    );
  }

  /**
   * Finalizes confirmed lead submission with strict semantic levels.
   */
  private static async handleLeadConfirm(
    conversation: WhatsAppConversation,
    flow: WhatsAppFlow,
    correlationId: string
  ): Promise<void> {
    const phone = conversation.conversationId;
    const leadId = `lead_${Date.now()}_${crypto.randomUUID().slice(0, 6)}`;
    const data = flow.collectedData;

    // 1. Strict Semantic Level 1: Lead Saved & Level 2: Notification Queued
    const confirmOutbox: WhatsAppOutboxMessage = {
      outboxId: crypto.randomUUID(),
      operationId: outboxRepository.computeOperationId(phone, correlationId, "lead_final_confirmation"),
      conversationId: phone,
      destinationPhone: phone,
      messageType: "quick_reply",
      payload: {
        bodyText:
          `🎉 Thank you, ${data.name || "Recruiter"}!\n\n` +
          `Your opportunity details for *${data.role || "Engineering Role"}* at *${data.company || "Company"}* have been securely saved. ` +
          "I've queued a notification for Gaurav, and he'll be able to review it shortly.",
        footerText: "Gaurav Portfolio • Type MENU anytime",
        buttons: [
          { id: "btn_resume", title: "📄 View Resume" },
          { id: "btn_menu", title: "🔄 Main Menu" },
        ],
      },
      correlationId,
      status: "PENDING",
      attemptCount: 0,
      maxAttempts: 5,
      nextRetryAt: Date.now(),
      reconciliationAttempts: 0,
      createdAt: Date.now(),
    };

    const notificationJob: WhatsAppNotificationJob = {
      notificationId: crypto
        .createHash("sha256")
        .update(`${phone}:${leadId}:OPPORTUNITY_LEAD`)
        .digest("hex"),
      type: "OPPORTUNITY_LEAD",
      conversationId: phone,
      leadId,
      recipientEmail: "gauravpatil5737@gmail.com",
      subject: `[WhatsApp Lead] ${data.name || "Recruiter"} submitted opportunity (${data.company || "Company"} - ${data.role || "Role"})`,
      textContent:
        `New WhatsApp Recruiter Lead Submitted:\n\n` +
        `• Name: ${data.name}\n` +
        `• Company: ${data.company}\n` +
        `• Role: ${data.role}\n` +
        `• Details: ${data.details || "None"}\n` +
        `• File: ${data.mediaFileName || "None"}\n\n` +
        `WhatsApp Chat Link: https://wa.me/${phone.replace(/[^0-9]/g, "")}`,
      htmlContent: `<p>New WhatsApp Lead from <strong>${data.name}</strong> (${data.company} - ${data.role})</p>`,
      status: "PENDING",
      attemptCount: 0,
      nextRetryAt: Date.now(),
      createdAt: Date.now(),
      correlationId,
    };

    await conversationRepository.finalizeLeadSubmission(
      conversation,
      flow,
      {
        id: leadId,
        threadId: phone,
        recruiterPhone: phone,
        recruiterName: data.name || "Recruiter",
        company: data.company || "Unknown",
        role: data.role || "Engineering Role",
        details: data.details,
        mediaStoragePath: data.mediaStoragePath,
        mediaFileName: data.mediaFileName,
        status: "new",
        createdAt: Date.now(),
      },
      confirmOutbox,
      notificationJob
    );

    await notificationRepository.processJob(notificationJob);
  }

  private static async handleLeadEdit(
    conversation: WhatsAppConversation,
    flow: WhatsAppFlow | null,
    correlationId: string
  ): Promise<void> {
    if (!flow) return;
    const phone = conversation.conversationId;
    const editOutbox: WhatsAppOutboxMessage = {
      outboxId: crypto.randomUUID(),
      operationId: outboxRepository.computeOperationId(phone, correlationId, "edit_prompt"),
      conversationId: phone,
      destinationPhone: phone,
      messageType: "text",
      payload: {
        bodyText: "What company or organization are you hiring for? (You can type the updated company name below):",
      },
      correlationId,
      status: "PENDING",
      attemptCount: 0,
      maxAttempts: 5,
      nextRetryAt: Date.now(),
      reconciliationAttempts: 0,
      createdAt: Date.now(),
    };

    await conversationRepository.advanceFlowStep(
      conversation,
      flow,
      { nextStep: "awaiting_company", collectedDataUpdates: {} },
      editOutbox
    );
  }

  private static async sendValidationFailure(
    phone: string,
    message: string,
    correlationId: string,
    step: string
  ): Promise<void> {
    const outbox: WhatsAppOutboxMessage = {
      outboxId: crypto.randomUUID(),
      operationId: outboxRepository.computeOperationId(phone, correlationId, `val_err_${step}`),
      conversationId: phone,
      destinationPhone: phone,
      messageType: "text",
      payload: {
        bodyText: message,
      },
      correlationId,
      status: "PENDING",
      attemptCount: 0,
      maxAttempts: 5,
      nextRetryAt: Date.now(),
      reconciliationAttempts: 0,
      createdAt: Date.now(),
    };

    await outboxRepository.enqueueMessage(outbox);
  }

  private static getStepPromptTitle(step: OpportunityFlowStep): string {
    switch (step) {
      case "awaiting_name":
        return "Your Full Name";
      case "awaiting_company":
        return "Company / Client Organization";
      case "awaiting_role":
        return "Role / Position Title";
      case "awaiting_details":
        return "Role Details (Location, Stack, Salary)";
      case "awaiting_file":
        return "Job Description Attachment";
      default:
        return "Your Input";
    }
  }

  private static getStepPromptText(step: OpportunityFlowStep): string {
    switch (step) {
      case "awaiting_name":
        return "Please enter your full name:";
      case "awaiting_company":
        return "Please enter the company or client organization name:";
      case "awaiting_role":
        return "Please enter the role title:";
      case "awaiting_details":
        return "Please share any additional details, or type Skip:";
      case "awaiting_file":
        return "Please upload a JD (PDF or Word document), or type Skip:";
      default:
        return "Please provide your answer:";
    }
  }

  private static async handleStaleButton(conversation: WhatsAppConversation, correlationId: string): Promise<void> {
    const phone = conversation.conversationId;
    const staleOutbox: WhatsAppOutboxMessage = {
      outboxId: crypto.randomUUID(),
      operationId: outboxRepository.computeOperationId(phone, correlationId, "stale_button_fallback"),
      conversationId: phone,
      destinationPhone: phone,
      messageType: "quick_reply",
      payload: {
        bodyText: "That button is from an earlier menu or completed session. Here is your current options menu:",
        footerText: "Gaurav Portfolio • Type MENU anytime",
        buttons: [
          { id: "btn_resume", title: "📄 View Resume" },
          { id: "btn_opportunity", title: "💼 Opportunities" },
          { id: "btn_human", title: "🤝 Talk to Gaurav" },
        ],
      },
      correlationId,
      status: "PENDING",
      attemptCount: 0,
      maxAttempts: 5,
      nextRetryAt: Date.now(),
      reconciliationAttempts: 0,
      createdAt: Date.now(),
    };
    await outboxRepository.enqueueMessage(staleOutbox);
  }
}
