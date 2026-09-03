/**
 * Centralized Outbound Policy Guard
 * 
 * Mandatory gatekeeper for every outbound WhatsApp operation.
 * Enforces all outbound and reliability invariants before any network request.
 * 
 * Strictly decoupled from database entity schemas via OutboundPolicyContext.
 */

import { adminLogger } from "@/lib/admin/logger";
import { maskPhone } from "./sanitizer";

/**
 * Minimal immutable policy context required to evaluate outbound message eligibility.
 * Completely decouples the security guard from underlying database entity schemas.
 */
export interface OutboundPolicyContext {
  /** Epoch milliseconds when the Meta 24-hour Customer Service Window expires */
  readonly customerServiceWindowExpiresAt: number;
  /** Whether the recruiter has opted out (sent STOP / UNSUBSCRIBE) */
  readonly optedOut?: boolean;
}

export interface OutboundPolicyCheckParams {
  recipientPhone: string;
  messageType: "free_form" | "template";
  templateName?: string;
  context?: OutboundPolicyContext | null;
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

    // Fail-Closed Guard: Missing Conversation Context
    if (!params.context) {
      adminLogger.warn("WhatsApp:OutboundBlocked", "Missing conversation policy context", { phone: masked });
      return {
        allowed: false,
        reason: "Missing conversation policy context: customer service window cannot be verified.",
      };
    }

    // Invariant 8: Strict Opt-Out Check
    if (params.context.optedOut) {
      adminLogger.warn("WhatsApp:OutboundBlocked", "Recipient has opted out", { phone: masked });
      return { allowed: false, reason: "Recipient has opted out of WhatsApp communication." };
    }

    // Invariant 7: 24-Hour Customer Service Window Boundary
    const now = Date.now();
    const expiresAt = params.context.customerServiceWindowExpiresAt;

    if (typeof expiresAt !== "number" || !Number.isFinite(expiresAt)) {
      adminLogger.warn("WhatsApp:OutboundBlocked", "Invalid customer service window expiry timestamp", {
        phone: masked,
        expiresAt,
      });
      return {
        allowed: false,
        reason: "Invalid customer service window expiry timestamp. Free-form messaging prohibited.",
      };
    }

    // Strict boundary: now >= expiresAt is closed; strictly expiresAt > now is required
    if (now >= expiresAt) {
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

