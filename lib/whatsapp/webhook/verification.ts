/**
 * Meta Webhook GET Handshake Verification
 * 
 * Verifies hub.mode, hub.verify_token, and echoes back hub.challenge
 * using constant-time string comparison.
 */

import crypto from "crypto";
import { getWhatsAppConfig } from "../config/whatsapp.config";
import { adminLogger } from "@/lib/admin/logger";

export interface WebhookVerificationParams {
  mode: string | null;
  verifyToken: string | null;
  challenge: string | null;
}

export function verifyWebhookChallenge(params: WebhookVerificationParams): {
  success: boolean;
  challenge?: string;
  statusCode: number;
} {
  const { mode, verifyToken, challenge } = params;
  const config = getWhatsAppConfig();

  if (!mode || !verifyToken) {
    adminLogger.warn("WhatsApp:WebhookVerificationFailed", "Missing hub.mode or hub.verify_token");
    return { success: false, statusCode: 400 };
  }

  if (mode !== "subscribe") {
    adminLogger.warn("WhatsApp:WebhookVerificationFailed", "Invalid hub.mode", { mode });
    return { success: false, statusCode: 400 };
  }

  const expectedToken = config.webhookVerifyToken;
  if (!expectedToken) {
    adminLogger.error("WhatsApp:WebhookVerificationError", "WHATSAPP_WEBHOOK_VERIFY_TOKEN is not configured on server");
    return { success: false, statusCode: 500 };
  }

  // Constant-time token comparison
  const tokenBuffer = Buffer.from(verifyToken);
  const expectedBuffer = Buffer.from(expectedToken);

  if (tokenBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(tokenBuffer, expectedBuffer)) {
    adminLogger.warn("WhatsApp:WebhookVerificationMismatch", "Verify token does not match server configuration");
    return { success: false, statusCode: 403 };
  }

  adminLogger.info("WhatsApp:WebhookVerified", "Meta webhook challenge verified successfully");
  return {
    success: true,
    challenge: challenge || "",
    statusCode: 200,
  };
}
