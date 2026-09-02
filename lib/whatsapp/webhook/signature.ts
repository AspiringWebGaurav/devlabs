/**
 * Meta Webhook HMAC-SHA256 Signature Verification
 * 
 * Verifies that the inbound payload originates authentically from Meta
 * using the application's META_APP_SECRET and raw body buffer.
 */

import crypto from "crypto";
import { getWhatsAppConfig } from "../config/whatsapp.config";
import { adminLogger } from "@/lib/admin/logger";

export function verifyWebhookSignature(rawBody: string | Buffer, signatureHeader: string | null): boolean {
  if (!signatureHeader) {
    adminLogger.warn("WhatsApp:SignatureMissing", "Missing x-hub-signature-256 header");
    return false;
  }

  const config = getWhatsAppConfig();
  const appSecret = config.appSecret;

  if (!appSecret) {
    adminLogger.error("WhatsApp:SignatureConfigError", "META_APP_SECRET is not configured on server");
    return false;
  }

  // Header format: "sha256=<signature_hex>"
  const parts = signatureHeader.split("=");
  if (parts.length !== 2 || parts[0] !== "sha256") {
    adminLogger.warn("WhatsApp:SignatureMalformed", "Invalid signature header format", { signatureHeader });
    return false;
  }

  const signatureHash = parts[1];
  const hmac = crypto.createHmac("sha256", appSecret);
  hmac.update(typeof rawBody === "string" ? Buffer.from(rawBody, "utf-8") : rawBody);
  const expectedHash = hmac.digest("hex");

  const sigBuffer = Buffer.from(signatureHash, "hex");
  const expectedBuffer = Buffer.from(expectedHash, "hex");

  if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
    adminLogger.warn("WhatsApp:SignatureMismatch", "Webhook HMAC signature verification failed");
    return false;
  }

  return true;
}
