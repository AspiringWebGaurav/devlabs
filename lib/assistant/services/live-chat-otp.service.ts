/**
 * Live Chat OTP Cryptographic Service
 *
 * Implements deterministic HMAC-SHA256 verifier derivation and verification.
 * Invariants:
 * - Plaintext OTP is NEVER stored, logged, or serialized.
 * - OTP salt is a 128-bit random hex value stored as non-secret metadata with the challenge.
 * - Comparison is executed using constant-time crypto.timingSafeEqual.
 * - Emails dispatched via no-reply@gauravpatil.site.
 */

import crypto from "crypto";
import {
  liveChatChallengesRepository,
  LiveChatChallengeDocument,
} from "@/lib/dal/repositories/live-chat-challenges.repository";
import { dispatchLiveChatOtpEmail } from "@/lib/email/brevo";
import { checkLiveChatRateLimit, recordLiveChatAction } from "./live-chat-rate-limiter";

const OTP_SECRET =
  process.env.LIVE_CHAT_OTP_SECRET ||
  process.env.LIVE_CHAT_AUTH_SECRET ||
  "gaurav_portfolio_live_chat_otp_secret_2026_default";

/**
 * Computes the deterministic HMAC-SHA256 verifier hash for an OTP code.
 */
export function computeOtpVerifier(
  challengeId: string,
  challengeSalt: string,
  otp: string
): string {
  return crypto
    .createHmac("sha256", OTP_SECRET)
    .update(`${challengeId}_${challengeSalt}_${otp.trim()}`)
    .digest("hex");
}

/**
 * Normalizes email address for consistent challenge, rate-limiting, and thread lookups.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Generates an ephemeral challenge, hashes the OTP, persists to Firestore, and dispatches via Brevo.
 */
export async function generateAndDispatchOtp(params: {
  name: string;
  email: string;
  clientIp: string;
  userAgent?: string;
  requestHeaders?: Headers | null;
}): Promise<{
  success: boolean;
  challengeId?: string;
  error?: string;
  errorCode?: string;
  retryAfterSeconds?: number;
}> {
  const cleanEmail = normalizeEmail(params.email);
  const cleanName = params.name.trim();

  // 1. Rate Limit Enforcement
  const rateLimit = await checkLiveChatRateLimit({
    clientIp: params.clientIp,
    email: cleanEmail,
    type: "OTP_SEND",
  });

  if (!rateLimit.allowed) {
    return {
      success: false,
      error: rateLimit.reason || "Rate limit reached.",
      errorCode: "RATE_LIMITED",
      retryAfterSeconds: rateLimit.retryAfterSeconds,
    };
  }

  // 2. Cryptographic Material Generation
  const challengeId = `ch_live_${crypto.randomUUID()}`;
  const plainOtp = crypto.randomInt(100000, 1000000).toString();
  const salt = crypto.randomBytes(16).toString("hex");
  const otpHash = computeOtpVerifier(challengeId, salt, plainOtp);
  const now = Date.now();
  const dispatchKey = crypto.createHash("sha256").update(challengeId).digest("hex");

  // Invalidate any existing pending/active challenges for this email
  await liveChatChallengesRepository.supersedeExistingChallenges(cleanEmail);

  const challengeDoc: LiveChatChallengeDocument = {
    challengeId,
    email: cleanEmail,
    name: cleanName,
    otpHash,
    otpSalt: salt,
    clientIp: params.clientIp,
    userAgent: params.userAgent,
    status: "PENDING",
    failedAttempts: 0,
    maxAttempts: 3,
    resendCount: 0,
    maxResends: 2,
    journeyId: challengeId,
    createdAt: now,
    pendingExpiresAt: now + 15000, // 15-second pending dispatch window
    dispatchDeduplicationKey: dispatchKey,
  };

  // 3. Persist PENDING Challenge in Firestore
  await liveChatChallengesRepository.createChallenge(challengeDoc);

  // Record rate limit action
  recordLiveChatAction({
    clientIp: params.clientIp,
    email: cleanEmail,
    type: "OTP_SEND",
  });

  // 4. Dispatch Email via Brevo REST API (strictly no-reply@gauravpatil.site)
  const emailRes = await dispatchLiveChatOtpEmail({
    email: cleanEmail,
    name: cleanName,
    otp: plainOtp,
    expiresMinutes: 5,
    requestHeaders: params.requestHeaders,
    idempotencyKey: dispatchKey,
  });

  if (!emailRes.success) {
    const isTimeout = emailRes.error?.toLowerCase().includes("timed out") || emailRes.error?.toLowerCase().includes("timeout");
    if (!isTimeout) {
      await liveChatChallengesRepository.markChallengeFailed(challengeId);
    }
    return {
      success: false,
      error: emailRes.error || "Failed to dispatch verification code via email gateway.",
      errorCode: isTimeout ? "GATEWAY_TIMEOUT" : "GATEWAY_UNAVAILABLE",
    };
  }

  // 5. Promote Challenge to ACTIVE & start 5-minute TTL
  await liveChatChallengesRepository.promotePendingToActive(challengeId);

  return {
    success: true,
    challengeId,
  };
}

/**
 * Resends an OTP code with 60-second cooldown enforcement and 3-total-email budget.
 */
export async function resendOtp(params: {
  email: string;
  clientIp: string;
  userAgent?: string;
  requestHeaders?: Headers | null;
}): Promise<{
  success: boolean;
  challengeId?: string;
  error?: string;
  errorCode?: string;
  cooldownSeconds?: number;
}> {
  const cleanEmail = normalizeEmail(params.email);

  // 1. Rate Limit Check
  const rateLimit = await checkLiveChatRateLimit({
    clientIp: params.clientIp,
    email: cleanEmail,
    type: "OTP_SEND",
  });

  if (!rateLimit.allowed) {
    return {
      success: false,
      error: rateLimit.reason || "Rate limit reached.",
      errorCode: "RATE_LIMITED",
      cooldownSeconds: rateLimit.retryAfterSeconds,
    };
  }

  // 2. Find Active Challenge to inspect resend count and cooldown
  const existing = await liveChatChallengesRepository.findActiveChallengeByEmail(cleanEmail);

  if (existing) {
    const now = Date.now();
    const timeSinceCreation = now - existing.createdAt;
    if (timeSinceCreation < 60000) {
      const remainingCooldown = Math.ceil((60000 - timeSinceCreation) / 1000);
      return {
        success: false,
        error: `Please wait ${remainingCooldown}s before requesting a new code.`,
        errorCode: "RATE_LIMITED",
        cooldownSeconds: remainingCooldown,
      };
    }

    if (existing.resendCount >= existing.maxResends) {
      return {
        success: false,
        error: "Maximum verification code requests reached for this session. Please start over.",
        errorCode: "OTP_SUPERSEDED",
      };
    }
  }

  const name = existing?.name || "Visitor";
  const newResendCount = (existing?.resendCount || 0) + 1;
  const journeyId = existing?.journeyId || `ch_live_${crypto.randomUUID()}`;

  // 3. Supersede Old Challenge
  await liveChatChallengesRepository.supersedeExistingChallenges(cleanEmail);

  // 4. Create New Challenge with Incremented Resend Count
  const challengeId = `ch_live_${crypto.randomUUID()}`;
  const plainOtp = crypto.randomInt(100000, 1000000).toString();
  const salt = crypto.randomBytes(16).toString("hex");
  const otpHash = computeOtpVerifier(challengeId, salt, plainOtp);
  const now = Date.now();
  const dispatchKey = crypto.createHash("sha256").update(challengeId).digest("hex");

  const challengeDoc: LiveChatChallengeDocument = {
    challengeId,
    email: cleanEmail,
    name,
    otpHash,
    otpSalt: salt,
    clientIp: params.clientIp,
    userAgent: params.userAgent,
    status: "PENDING",
    failedAttempts: 0,
    maxAttempts: 3,
    resendCount: newResendCount,
    maxResends: 2,
    journeyId,
    createdAt: now,
    pendingExpiresAt: now + 15000,
    dispatchDeduplicationKey: dispatchKey,
  };

  await liveChatChallengesRepository.createChallenge(challengeDoc);

  recordLiveChatAction({
    clientIp: params.clientIp,
    email: cleanEmail,
    type: "OTP_SEND",
  });

  const emailRes = await dispatchLiveChatOtpEmail({
    email: cleanEmail,
    name,
    otp: plainOtp,
    expiresMinutes: 5,
    requestHeaders: params.requestHeaders,
    idempotencyKey: dispatchKey,
  });

  if (!emailRes.success) {
    const isTimeout = emailRes.error?.toLowerCase().includes("timed out") || emailRes.error?.toLowerCase().includes("timeout");
    if (!isTimeout) {
      await liveChatChallengesRepository.markChallengeFailed(challengeId);
    }
    return {
      success: false,
      error: emailRes.error || "Failed to dispatch verification code.",
      errorCode: isTimeout ? "GATEWAY_TIMEOUT" : "GATEWAY_UNAVAILABLE",
    };
  }

  await liveChatChallengesRepository.promotePendingToActive(challengeId);

  return {
    success: true,
    challengeId,
  };
}
