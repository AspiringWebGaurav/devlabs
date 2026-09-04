/**
 * Cryptographic Token Engine for 1-Click WhatsApp Reply Notifications
 *
 * Implements high-security, tamper-proof, opaque token encoding and decoding
 * using AES-256-GCM with SHA-256 key derivation.
 *
 * Guarantees:
 * - 100% URL-safe, cryptic link representation (no email, phone, or PII in URL)
 * - Cryptographically authenticated payload (tamper-detection via GCM auth tags)
 * - Self-contained dispatch ID for atomic Firestore idempotency verification
 */

import crypto from "crypto";

export interface WhatsAppReplyTokenPayload {
  dispatchId: string;
  phone: string;
  email: string;
  name: string;
  messageCount: number;
  createdAt: number;
}

/**
 * Creates an opaque, AES-256-GCM encrypted, base64url token for the 1-click reply notification.
 */
export function createWhatsAppReplyToken(params: {
  phone: string;
  email: string;
  name?: string;
  messageCount?: number;
  timestamp?: number;
}): string {
  const cleanPhone = params.phone.replace(/[^0-9]/g, "");
  const cleanEmail = params.email.trim().toLowerCase();
  const cleanName = (params.name || "Visitor").trim();
  const ts = params.timestamp || Date.now();
  const dispatchId = `wa_reply_${cleanPhone}_${ts}`;

  const payload: WhatsAppReplyTokenPayload = {
    dispatchId,
    phone: cleanPhone,
    email: cleanEmail,
    name: cleanName,
    messageCount: params.messageCount || 1,
    createdAt: ts,
  };

  const secret = process.env.ADMIN_SESSION_SECRET || "wa_reply_secret_key_default_32_bytes";
  const key = crypto.createHash("sha256").update(secret).digest(); // 32-byte key
  const iv = crypto.randomBytes(12); // 12-byte IV for GCM

  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const jsonStr = JSON.stringify(payload);
  const encrypted = Buffer.concat([cipher.update(jsonStr, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag(); // 16-byte authentication tag

  // Opaque binary format: [12 bytes IV][16 bytes AuthTag][Encrypted Data]
  return Buffer.concat([iv, authTag, encrypted]).toString("base64url");
}

/**
 * Maximum token age: 14 days (1,209,600,000 ms).
 * Prevents re-activation of leaked or old reply notification links.
 */
export const MAX_REPLY_TOKEN_AGE_MS = 14 * 24 * 60 * 60 * 1000;

/**
 * Decrypts and validates the authentication tag of an incoming reply token.
 * Returns the decoded payload or null if the token is tampered, invalid, or expired.
 */
export function verifyAndDecodeWhatsAppReplyToken(token: string): WhatsAppReplyTokenPayload | null {
  try {
    if (!token || typeof token !== "string") return null;

    const buf = Buffer.from(token, "base64url");
    // Minimum length: 12 (IV) + 16 (AuthTag) + 1 (Encrypted JSON byte) = 29 bytes
    if (buf.length < 29) return null;

    const iv = buf.subarray(0, 12);
    const authTag = buf.subarray(12, 28);
    const encrypted = buf.subarray(28);

    const secret = process.env.ADMIN_SESSION_SECRET || "wa_reply_secret_key_default_32_bytes";
    const key = crypto.createHash("sha256").update(secret).digest();

    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    const payload = JSON.parse(decrypted.toString("utf8")) as WhatsAppReplyTokenPayload;

    if (!payload.dispatchId || !payload.phone || !payload.email) {
      return null;
    }

    // Enforce 14-day expiration ceiling
    const now = Date.now();
    if (!payload.createdAt || typeof payload.createdAt !== "number" || now - payload.createdAt > MAX_REPLY_TOKEN_AGE_MS) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}
