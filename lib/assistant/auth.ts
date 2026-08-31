/**
 * Live Chat Session Token & Authentication Utilities
 *
 * Provides cryptographic HMAC-SHA256 token signing and verification with dual-secret rotation.
 * Invariants:
 * - Cookie format: <Base64Url-payload>.<Base64Url-signature>
 * - Fixed 4-hour lifetime (14,400s).
 * - Verified against server-side Firestore Session Registry.
 */

import crypto from "crypto";

export const LIVE_CHAT_COOKIE_NAME = "live_chat_session";
export const LIVE_CHAT_SESSION_MAX_AGE_SECONDS = 14400; // 4 hours (14,400s)
export const LIVE_CHAT_SESSION_TTL_MS = 14400 * 1000; // 4 hours in milliseconds (14,400,000ms)

export interface VisitorSession {
  sessionId: string;
  email: string;
  name: string;
  clientIp: string;
  createdAt: number;
  expiresAt: number;
}

const PRIMARY_AUTH_SECRET =
  process.env.LIVE_CHAT_AUTH_SECRET ||
  process.env.ADMIN_SESSION_SECRET ||
  "gaurav_portfolio_live_chat_auth_secret_2026_default";

const PREVIOUS_AUTH_SECRET = process.env.LIVE_CHAT_AUTH_SECRET_PREVIOUS;

function toBase64Url(str: string): string {
  return Buffer.from(str, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromBase64Url(b64url: string): string {
  let b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  while (b64.length % 4) {
    b64 += "=";
  }
  return Buffer.from(b64, "base64").toString("utf8");
}

function createSignature(payloadB64: string, secret: string): string {
  const hmac = crypto.createHmac("sha256", secret).update(payloadB64).digest("base64");
  return hmac.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Signs a VisitorSession payload into a secure tamper-proof token string.
 */
export function signVisitorSession(session: VisitorSession): string {
  const payloadJson = JSON.stringify(session);
  const payloadB64 = toBase64Url(payloadJson);
  const signature = createSignature(payloadB64, PRIMARY_AUTH_SECRET);
  return `${payloadB64}.${signature}`;
}

/**
 * Cryptographically verifies a signed token string using primary or previous rotation secret.
 * Rejects unsigned, malformed, tampered, or expired tokens.
 */
export function verifyVisitorSession(token?: string | null): VisitorSession | null {
  if (!token || typeof token !== "string") return null;

  let cleanToken = token.trim();
  try {
    cleanToken = decodeURIComponent(cleanToken);
  } catch {
    // Keep as is
  }

  const dotIndex = cleanToken.lastIndexOf(".");
  if (dotIndex === -1) return null;

  const payloadB64 = cleanToken.slice(0, dotIndex);
  const sigB64 = cleanToken.slice(dotIndex + 1);

  if (!payloadB64 || !sigB64) return null;

  // Try Primary Secret
  let isValid = false;
  const expectedSigPrimary = createSignature(payloadB64, PRIMARY_AUTH_SECRET);

  try {
    const bufA = Buffer.from(sigB64);
    const bufB = Buffer.from(expectedSigPrimary);
    if (bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB)) {
      isValid = true;
    }
  } catch {
    isValid = false;
  }

  // Try Previous Rotation Secret (if configured)
  if (!isValid && PREVIOUS_AUTH_SECRET) {
    try {
      const expectedSigPrev = createSignature(payloadB64, PREVIOUS_AUTH_SECRET);
      const bufA = Buffer.from(sigB64);
      const bufB = Buffer.from(expectedSigPrev);
      if (bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB)) {
        isValid = true;
      }
    } catch {
      isValid = false;
    }
  }

  if (!isValid) return null;

  try {
    const jsonStr = fromBase64Url(payloadB64);
    const session = JSON.parse(jsonStr) as VisitorSession;
    const now = Date.now();

    if (session.expiresAt && now >= session.expiresAt) {
      return null;
    }

    if (!session.sessionId || !session.email) {
      return null;
    }

    return session;
  } catch {
    return null;
  }
}
