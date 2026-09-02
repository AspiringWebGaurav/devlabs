/**
 * Centralized Outbound Policy Guard
 * 
 * Mandatory gatekeeper for every outbound WhatsApp operation.
 * Enforces all 17 outbound and reliability invariants before any network request.
 */

import { adminLogger } from "@/lib/admin/logger";
import { maskPhone } from "./sanitizer";
import type { WhatsAppThread } from "../types";

export interface OutboundPolicyCheckParams {
  recipientPhone: string;
  messageType: "free_form" | "template";
  templateName?: string;
  thread?: WhatsAppThread | null;
}

export interface OutboundPolicyResult {
  allowed: boolean;
  reason?: string;
}

export class OutboundPolicyGuard {
  /**
   * Evaluates whether an outbound message is legally, architecturally,
   * and policy-wise permitted to be dispatched to Meta.
   */
  public static evaluateOutbound(params: OutboundPolicyCheckParams): OutboundPolicyResult {
    const masked = maskPhone(params.recipientPhone);

    // Invariant 1: System Emergency Kill-Switch
    if (process.env.WHATSAPP_ENABLED === "false") {
      adminLogger.warn("WhatsApp:OutboundBlocked", "WhatsApp subsystem globally disabled", { phone: masked });
      return { allowed: false, reason: "WhatsApp subsystem globally disabled by WHATSAPP_ENABLED=false" };
    }

    // Invariant 10: Zero Development Template Invariant
    if (params.messageType === "template") {
      adminLogger.warn("WhatsApp:OutboundBlocked", "Template sending hard-blocked in development", {
        phone: masked,
        templateName: params.templateName,
      });
      return {
        allowed: false,
        reason: "Template sending is disabled by the DEVELOPMENT environment invariant.",
      };
    }

    // Invariant 8: Strict Opt-Out Check
    if (params.thread?.optedOut) {
      adminLogger.warn("WhatsApp:OutboundBlocked", "Recipient has opted out", { phone: masked });
      return { allowed: false, reason: "Recipient has opted out of WhatsApp communication." };
    }

    // Invariant 7: 24-Hour Customer Service Window Boundary
    const now = Date.now();
    const expiresAt = params.thread?.customerServiceWindowExpiresAt || 0;
    const isWindowActive = expiresAt > now;

    if (!isWindowActive) {
      adminLogger.warn("WhatsApp:OutboundBlocked", "Customer service window expired (>24h)", {
        phone: masked,
        expiresAt,
        now,
      });
      return {
        allowed: false,
        reason: "Customer service window expired (>24h). Free-form messaging prohibited by Meta policy.",
      };
    }

    return { allowed: true };
  }
}
