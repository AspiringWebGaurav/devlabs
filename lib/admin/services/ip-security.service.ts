/**
 * Deployment-Authoritative IP Security Service
 *
 * Architecture & Deployment Documentation:
 * - Runtime Platform: Vercel Serverless / Edge Runtime.
 * - Authoritative IP Mechanism: Vercel edge reverse proxy guarantees `x-vercel-forwarded-for`
 *   and `x-real-ip` as set by Vercel edge routing.
 * - Security Rule: Never blindly trust untrusted client forwarding headers.
 * - Fail-Closed Rule: If the authoritative client IP cannot be resolved safely via net.isIP(),
 *   this function returns null, triggering the safe email security approval workflow.
 * - Production Fallback Rule: NEVER silently return 127.0.0.1 in production.
 */

import net from "net";
import crypto from "crypto";
import { authChallengesRepository, AdminTrustedIpRecord, AdminIpVerificationRecord } from "../repositories/auth-challenges.repository";
import { IP_VERIFY_TTL_MS, IP_VERIFY_TOKEN_MAX_ATTEMPTS } from "../constants";
import { resolveAppUrl } from "@/lib/email/brevo";

/**
 * Validates and canonicalizes an IP address into standard format:
 * - Strips IPv4-mapped IPv6 prefixes (e.g. ::ffff:192.168.1.1 -> 192.168.1.1)
 * - Normalizes localhost only during development (::1 -> 127.0.0.1)
 * - Validates strict IP syntax with net.isIP()
 * - Returns canonical string or null (fail closed)
 */
export function normalizeIpAddress(rawIp?: string | null): string | null {
  if (!rawIp || typeof rawIp !== "string") return null;
  let ip = rawIp.trim().toLowerCase();

  // Strip IPv4-mapped IPv6 prefix
  if (ip.startsWith("::ffff:")) {
    ip = ip.substring(7);
  }

  // Development loopback normalization
  if (process.env.NODE_ENV === "development" && (ip === "::1" || ip === "localhost")) {
    return "127.0.0.1";
  }

  // Strict syntax validation
  if (net.isIP(ip) === 0) {
    return null;
  }

  return ip;
}

/**
 * Deployment-Authoritative IP Extractor:
 * Calibrated specifically for Vercel's edge-proxy hosting infrastructure.
 */
export function extractClientIp(headers: Headers): string | null {
  // 1. Authoritative Vercel edge proxy guaranteed header
  const vercelIp = headers.get("x-vercel-forwarded-for");
  if (vercelIp) {
    // If multi-value, the first IP is the client IP added by Vercel edge
    const candidate = normalizeIpAddress(vercelIp.split(",")[0]);
    if (candidate) return candidate;
  }

  // 2. Standard reverse proxy forwarded header
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    const candidate = normalizeIpAddress(forwardedFor.split(",")[0]);
    if (candidate) return candidate;
  }

  // 3. Direct platform real IP header
  const realIp = headers.get("x-real-ip");
  if (realIp) {
    const candidate = normalizeIpAddress(realIp);
    if (candidate) return candidate;
  }

  // 4. In development: Simulate a fresh unrecognized IP for testing the email authorization workflow
  if (process.env.NODE_ENV === "development") {
    return "198.51.100.99";
  }

  // 5. In production: Fail Closed (return null -> forces email security verification)
  return null;
}

/**
 * Generates a deterministic, canonical SHA-256 document key for an account + normalized IP pair.
 */
export function generateDeterministicIpKey(email: string, normalizedIp: string): string {
  return crypto
    .createHash("sha256")
    .update(`${email.trim().toLowerCase()}_${normalizedIp.trim().toLowerCase()}`)
    .digest("hex");
}

/**
 * Constant-time string comparison using crypto.timingSafeEqual
 */
export function constantTimeCompare(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const aBuf = Buffer.from(a, "utf8");
  const bBuf = Buffer.from(b, "utf8");
  if (aBuf.length !== bBuf.length) {
    crypto.timingSafeEqual(aBuf, aBuf);
    return false;
  }
  return crypto.timingSafeEqual(aBuf, bBuf);
}

export class IpSecurityService {
  /**
   * Checks if an IP is already trusted for the given admin email.
   * Single-document point lookup using deterministic key.
   */
  public async isIpTrusted(email: string, normalizedIp: string): Promise<boolean> {
    const docId = generateDeterministicIpKey(email, normalizedIp);
    const result = await authChallengesRepository.getTrustedIp(docId);
    return Boolean(result.success && result.data && result.data.ip === normalizedIp);
  }

  /**
   * Checks how many trusted IPs exist for this admin email.
   */
  public async getTrustedIpCount(email: string): Promise<number> {
    const result = await authChallengesRepository.countTrustedIpsForEmail(email);
    return result.success && typeof result.data === "number" ? result.data : 0;
  }

  /**
   * Registers/upserts a trusted IP record for an admin email.
   */
  public async trustIp(
    email: string,
    normalizedIp: string,
    source: "first_login" | "email_approval" | "manual" = "email_approval",
    userAgent?: string
  ): Promise<void> {
    const now = Date.now();
    const docId = generateDeterministicIpKey(email, normalizedIp);
    const record: AdminTrustedIpRecord = {
      id: docId,
      email: email.trim().toLowerCase(),
      ip: normalizedIp,
      trustedAt: now,
      lastUsedAt: now,
      source,
      userAgent: userAgent || undefined,
    };
    await authChallengesRepository.saveTrustedIp(record);
  }

  /**
   * Creates a secure, time-bounded IP verification token and record.
   * Dynamically constructs the verification URL using the runtime request host.
   */
  public async createIpVerificationToken(
    challengeId: string,
    email: string,
    normalizedIp: string,
    requestHeaders?: Headers | null
  ): Promise<{ token: string; verifyUrl: string; expiresAt: number }> {
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const now = Date.now();
    const expiresAt = now + IP_VERIFY_TTL_MS;

    const verificationRecord: AdminIpVerificationRecord = {
      id: tokenHash,
      challengeId,
      email: email.trim().toLowerCase(),
      ip: normalizedIp,
      tokenHash,
      isConsumed: false,
      attemptsCount: 0,
      createdAt: now,
      expiresAt,
    };

    await authChallengesRepository.createIpVerification(verificationRecord);

    const baseUrl = resolveAppUrl(requestHeaders);
    const verifyUrl = `${baseUrl}/api/admin/auth/verify-ip?token=${encodeURIComponent(rawToken)}`;

    return {
      token: rawToken,
      verifyUrl,
      expiresAt,
    };
  }

  /**
   * Atomically verifies an IP authorization token in a single Firestore transaction:
   * - Validates token existence, unconsumed state, and expiration
   * - Uses constant-time token comparison
   * - Marks token consumed
   * - Creates/updates canonical trusted IP record
   * - Sets challenge.ipVerified = true on the active challenge
   */
  public async verifyNewIpTransaction(rawToken: string): Promise<{
    success: boolean;
    error?: string;
    email?: string;
    ipAddress?: string;
    challengeId?: string;
  }> {
    if (!rawToken || typeof rawToken !== "string") {
      return { success: false, error: "Missing or invalid verification token." };
    }

    const tokenHash = crypto.createHash("sha256").update(rawToken.trim()).digest("hex");

    return await authChallengesRepository.runTransaction(async (transaction, collections, db) => {
      const now = Date.now();
      const verificationRef = db.collection(collections.ipVerifications).doc(tokenHash);

      // --- PHASE 1: ALL READS FIRST (Strict Firestore Invariant) ---
      const verificationDoc = await transaction.get(verificationRef);
      if (!verificationDoc.exists) {
        return { success: false, error: "Invalid or non-existent verification link." };
      }

      const verificationData = verificationDoc.data() as AdminIpVerificationRecord;

      let challengeRef: import("firebase-admin/firestore").DocumentReference | null = null;
      let challengeDoc: import("firebase-admin/firestore").DocumentSnapshot | null = null;

      if (verificationData.challengeId) {
        challengeRef = db.collection(collections.challenges).doc(verificationData.challengeId);
        challengeDoc = await transaction.get(challengeRef);
      }

      // --- PHASE 2: VALIDATE DATA ---
      // Check consumption with 5-minute idempotent grace window for rapid double-clicks / mobile refreshes
      if (verificationData.isConsumed) {
        const GRACE_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
        if (verificationData.consumedAt && (now - verificationData.consumedAt < GRACE_WINDOW_MS)) {
          return {
            success: true,
            email: verificationData.email,
            ipAddress: verificationData.ip,
            challengeId: verificationData.challengeId,
          };
        }
        return { success: false, error: "This verification link has already been used." };
      }

      // Check expiration
      if (now > verificationData.expiresAt) {
        return { success: false, error: "This verification link has expired. Please sign in again." };
      }

      // Check attempt limits
      if (verificationData.attemptsCount >= IP_VERIFY_TOKEN_MAX_ATTEMPTS) {
        return { success: false, error: "Verification attempt limit exceeded. Please restart sign-in." };
      }

      // Constant-time token verification
      const isMatch = constantTimeCompare(verificationData.tokenHash, tokenHash);
      if (!isMatch) {
        transaction.update(verificationRef, {
          attemptsCount: (verificationData.attemptsCount || 0) + 1,
        });
        return { success: false, error: "Invalid verification token." };
      }

      // --- PHASE 3: ALL WRITES AFTER READS ---
      // 1. Mark verification token consumed
      transaction.update(verificationRef, {
        isConsumed: true,
        consumedAt: now,
      });

      // 2. Register canonical trusted IP
      const trustedIpKey = generateDeterministicIpKey(verificationData.email, verificationData.ip);
      const trustedIpRef = db.collection(collections.trustedIps).doc(trustedIpKey);

      const trustedIpRecord: AdminTrustedIpRecord = {
        id: trustedIpKey,
        email: verificationData.email,
        ip: verificationData.ip,
        trustedAt: now,
        lastUsedAt: now,
        source: "email_approval",
      };

      transaction.set(trustedIpRef, trustedIpRecord, { merge: true });

      // 3. Mark active challenge ipVerified = true (only if challenge is still active)
      if (challengeRef && challengeDoc && challengeDoc.exists) {
        const challengeData = challengeDoc.data() as import("../repositories/auth-challenges.repository").AdminOtpChallengeRecord;
        if (challengeData && challengeData.otpStatus !== "INVALIDATED" && challengeData.otpStatus !== "EXPIRED") {
          transaction.update(challengeRef, {
            ipVerified: true,
          });
        }
      }

      return {
        success: true,
        email: verificationData.email,
        ipAddress: verificationData.ip,
        challengeId: verificationData.challengeId,
      };
    });
  }
}

export const ipSecurityService = new IpSecurityService();
