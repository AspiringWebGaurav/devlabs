/**
 * Server-Authoritative Admin OTP Verification Service
 *
 * Security Invariants:
 * 1. Raw OTP exists strictly on the server and is dispatched solely via Brevo.
 * 2. HMAC-SHA256 with per-challenge cryptographic salt.
 * 3. Constant-time comparison (crypto.timingSafeEqual) against timing attacks.
 * 4. Single atomic Firestore transactions (db.runTransaction) for attempt counting and consumption.
 * 5. Third incorrect attempt invalidates the challenge atomically on the server (isConsumed = true).
 * 6. In-place mutation on resend (0 new permanent documents).
 * 7. Bounded asynchronous cleanup (secondary to auth).
 */

import crypto from "crypto";
import {
  authChallengesRepository,
  AdminOtpChallengeRecord,
} from "../repositories/auth-challenges.repository";
import {
  OTP_MAX_ATTEMPTS,
  OTP_TTL_MS,
  OTP_RESEND_COOLDOWN_MS,
  OTP_MAX_RESENDS,
} from "../constants";
import { dispatchOtpEmail } from "@/lib/email/brevo";
import { constantTimeCompare } from "./ip-security.service";

const OTP_SECRET =
  process.env.ADMIN_OTP_SECRET ||
  process.env.ADMIN_SESSION_SECRET ||
  process.env.FIREBASE_ADMIN_PRIVATE_KEY ||
  "gaurav_portfolio_superadmin_otp_server_secret_2026";

/**
 * Computes HMAC-SHA256 hash for a given 6-digit OTP and challenge salt.
 */
export function computeOtpHmac(otp: string, salt: string): string {
  return crypto
    .createHmac("sha256", OTP_SECRET)
    .update(`${otp.trim()}_${salt.trim()}`)
    .digest("hex");
}

export class OtpService {
  /**
   * Generates a cryptographically secure 6-digit numeric OTP.
   */
  public generateOtpCode(): string {
    return crypto.randomInt(100000, 1000000).toString();
  }

  /**
   * Generates a 16-byte cryptographic random salt.
   */
  public generateSalt(): string {
    return crypto.randomBytes(16).toString("hex");
  }

  /**
   * Initializes and dispatches a new OTP Challenge for an authenticated Google user.
   */
  public async createOtpChallenge(params: {
    email: string;
    name: string;
    avatar?: string;
    clientIp: string | null;
    userAgent?: string;
    requestHeaders?: Headers | null;
  }): Promise<{ challengeId: string; expiresAt: number }> {
    const rawOtp = this.generateOtpCode();
    const salt = this.generateSalt();
    const otpHash = computeOtpHmac(rawOtp, salt);
    const now = Date.now();
    const expiresAt = now + OTP_TTL_MS;
    const challengeId = `ch_${crypto.randomUUID()}`;

    const challengeRecord: AdminOtpChallengeRecord = {
      id: challengeId,
      email: params.email.trim().toLowerCase(),
      name: params.name || "Gaurav Patil",
      avatar: params.avatar,
      otpHash,
      otpSalt: salt,
      primaryOtpVerified: false,
      attemptsCount: 0,
      otpStatus: "ACTIVE",
      isConsumed: false,
      clientIp: params.clientIp,
      userAgent: params.userAgent,
      ipVerified: false,
      resendCount: 0,
      lastResentAt: now,
      createdAt: now,
      expiresAt,
    };

    // 1. Persist challenge record in Firestore
    await authChallengesRepository.createChallenge(challengeRecord);

    // 2. Trigger asynchronous non-blocking opportunistic pruning (Secondary to auth)
    authChallengesRepository.pruneOldChallenges(params.email).catch(() => {});

    // 3. Dispatch OTP strictly via email (never exposed in browser response/cookies)
    await dispatchOtpEmail({
      email: params.email,
      name: params.name,
      otp: rawOtp,
      clientIp: params.clientIp,
      userAgent: params.userAgent,
      expiresMinutes: 5,
      requestHeaders: params.requestHeaders,
    });

    return { challengeId, expiresAt };
  }

  /**
   * Retrieves an existing challenge by ID.
   */
  public async getChallenge(challengeId: string): Promise<AdminOtpChallengeRecord | null> {
    const result = await authChallengesRepository.getChallenge(challengeId);
    return result.success && result.data ? result.data : null;
  }

  /**
   * Single Atomic Firestore Transaction for Primary OTP Verification:
   * - Reads challenge document
   * - Validates existence, expiry, consumption, and global attempt limits
   * - Computes HMAC and validates via constantTimeCompare
   * - On match: Sets primaryOtpVerified = true, otpStatus = "VERIFIED"
   *   (Note: isConsumed remains false until IP verification resolves and session is issued)
   * - On mismatch: Atomically increments global attemptsCount (only on legitimate code mismatch)
   * - Reaching attemptsCount >= 3 sets otpStatus = "INVALIDATED", isConsumed = true
   */
  public async verifyOtpChallengeTransaction(
    challengeId: string,
    suppliedOtp: string
  ): Promise<{
    success: boolean;
    error?: string;
    remainingAttempts?: number;
    invalidated?: boolean;
    challenge?: AdminOtpChallengeRecord;
  }> {
    if (!challengeId || typeof challengeId !== "string") {
      return { success: false, error: "Invalid challenge identifier.", remainingAttempts: 3, invalidated: false };
    }

    if (!suppliedOtp || typeof suppliedOtp !== "string" || suppliedOtp.trim().length !== 6) {
      return { success: false, error: "Please enter a valid 6-digit code.", remainingAttempts: 3, invalidated: false };
    }

    return await authChallengesRepository.runTransaction(async (transaction, collections, db) => {
      const now = Date.now();
      const challengeRef = db.collection(collections.challenges).doc(challengeId);

      const docSnapshot = await transaction.get(challengeRef);
      if (!docSnapshot.exists) {
        return {
          success: false,
          error: "Challenge session not found. Please sign in again.",
          remainingAttempts: 0,
          invalidated: true,
        };
      }

      const challenge = docSnapshot.data() as AdminOtpChallengeRecord;

      // 1. Eligibility Gate: Challenge must be unconsumed and active
      if (challenge.isConsumed || challenge.otpStatus === "INVALIDATED" || challenge.otpStatus === "EXPIRED") {
        return {
          success: false,
          error: "This verification challenge is no longer active. Please sign in again.",
          remainingAttempts: 0,
          invalidated: true,
        };
      }

      // 2. Check expiration (Immutable 5-minute parent ceiling)
      if (now > challenge.expiresAt) {
        transaction.update(challengeRef, {
          otpStatus: "EXPIRED",
          isConsumed: true,
          consumedAt: now,
        });
        return {
          success: false,
          error: "Your verification code has expired. Please sign in again.",
          remainingAttempts: 0,
          invalidated: true,
        };
      }

      // 3. Check attempt limit on server (Global 3-attempt budget)
      if ((challenge.attemptsCount || 0) >= OTP_MAX_ATTEMPTS) {
        transaction.update(challengeRef, {
          otpStatus: "INVALIDATED",
          isConsumed: true,
          consumedAt: now,
        });
        return {
          success: false,
          error: "Maximum verification attempts exceeded. Challenge invalidated.",
          remainingAttempts: 0,
          invalidated: true,
        };
      }

      // 4. Constant-time HMAC comparison
      const computedHash = computeOtpHmac(suppliedOtp, challenge.otpSalt);
      const isMatch = constantTimeCompare(challenge.otpHash, computedHash);

      if (isMatch) {
        // SUCCESS: Mark primaryOtpVerified = true and otpStatus = "VERIFIED"
        transaction.update(challengeRef, {
          primaryOtpVerified: true,
          otpStatus: "VERIFIED",
        });

        return {
          success: true,
          challenge: {
            ...challenge,
            primaryOtpVerified: true,
            otpStatus: "VERIFIED",
          },
        };
      }

      // MISMATCH: Increment global attempt count atomically
      const currentAttempts = challenge.attemptsCount || 0;
      const newAttempts = currentAttempts + 1;
      const remainingAttempts = Math.max(0, OTP_MAX_ATTEMPTS - newAttempts);
      const shouldInvalidate = newAttempts >= OTP_MAX_ATTEMPTS;

      const updatePayload: Record<string, unknown> = {
        attemptsCount: newAttempts,
        otpStatus: shouldInvalidate ? "INVALIDATED" : challenge.otpStatus,
        isConsumed: shouldInvalidate ? true : false,
      };
      if (shouldInvalidate) {
        updatePayload.consumedAt = now;
      }

      transaction.update(challengeRef, updatePayload);

      if (shouldInvalidate) {
        return {
          success: false,
          error: "Maximum verification attempts exceeded (3 of 3). Challenge invalidated.",
          remainingAttempts: 0,
          invalidated: true,
        };
      }

      return {
        success: false,
        error: `Incorrect verification code. ${remainingAttempts} ${
          remainingAttempts === 1 ? "attempt" : "attempts"
        } remaining.`,
        remainingAttempts,
        invalidated: false,
      };
    });
  }

  /**
   * Resends Primary OTP code using atomic transaction and in-place mutation.
   * Rate limited: 60s cooldown, max 3 resends.
   * Invariant: Does NOT reset attemptsCount, does NOT extend expiresAt.
   */
  public async resendOtp(
    challengeId: string,
    clientIp: string | null,
    userAgent?: string,
    requestHeaders?: Headers | null
  ): Promise<{ success: boolean; error?: string; message?: string; cooldownSeconds?: number }> {
    if (!challengeId || typeof challengeId !== "string") {
      return { success: false, error: "Invalid challenge identifier." };
    }

    const now = Date.now();
    const newOtp = this.generateOtpCode();
    const newSalt = this.generateSalt();
    const newOtpHmac = computeOtpHmac(newOtp, newSalt);

    const txResult = await authChallengesRepository.runTransaction(async (transaction, collections, db) => {
      const challengeRef = db.collection(collections.challenges).doc(challengeId);

      const docSnapshot = await transaction.get(challengeRef);
      if (!docSnapshot.exists) {
        return { success: false, error: "Challenge session not found. Please sign in again." };
      }

      const challenge = docSnapshot.data() as AdminOtpChallengeRecord;

      if (challenge.isConsumed || challenge.otpStatus === "INVALIDATED" || challenge.otpStatus === "EXPIRED") {
        return { success: false, error: "This challenge is no longer active. Please sign in again." };
      }

      if (now > challenge.expiresAt) {
        transaction.update(challengeRef, {
          otpStatus: "EXPIRED",
          isConsumed: true,
          consumedAt: now,
        });
        return { success: false, error: "Verification challenge expired. Please sign in again." };
      }

      // Check primary resend count limit (Max 3)
      if ((challenge.resendCount || 0) >= OTP_MAX_RESENDS) {
        return {
          success: false,
          error: "Maximum code resend limit reached for this session. Please restart sign-in.",
        };
      }

      // Check 60-second cooldown
      if (challenge.lastResentAt) {
        const elapsed = now - challenge.lastResentAt;
        if (elapsed < OTP_RESEND_COOLDOWN_MS) {
          const remainingSec = Math.ceil((OTP_RESEND_COOLDOWN_MS - elapsed) / 1000);
          return {
            success: false,
            error: `Please wait ${remainingSec} seconds before requesting a new code.`,
            cooldownSeconds: remainingSec,
          };
        }
      }

      const currentResendCount = challenge.resendCount || 0;
      const previousResentAt = challenge.lastResentAt;

      // Update challenge record with new HMAC (strictly keeping existing attemptsCount)
      transaction.update(challengeRef, {
        otpHash: newOtpHmac,
        otpSalt: newSalt,
        resendCount: currentResendCount + 1,
        lastResentAt: now,
        clientIp: clientIp || challenge.clientIp,
        userAgent: userAgent || challenge.userAgent,
      });

      return {
        success: true,
        email: challenge.email,
        name: challenge.name,
        clientIp: clientIp || challenge.clientIp,
        userAgent: userAgent || challenge.userAgent,
        previousResentAt,
      };
    });

    if (!txResult.success) {
      return {
        success: false,
        error: txResult.error,
        cooldownSeconds: txResult.cooldownSeconds,
      };
    }

    try {
      const emailResult = await dispatchOtpEmail({
        email: txResult.email!,
        name: txResult.name,
        otp: newOtp,
        clientIp: txResult.clientIp,
        userAgent: txResult.userAgent,
        expiresMinutes: 5,
        requestHeaders,
      });

      if (!emailResult.success) {
        await authChallengesRepository.updateChallenge(challengeId, {
          lastResentAt: txResult.previousResentAt || 0,
        }).catch(() => {});

        return {
          success: false,
          error: "Failed to deliver verification email. Please try again.",
        };
      }
    } catch {
      await authChallengesRepository.updateChallenge(challengeId, {
        lastResentAt: txResult.previousResentAt || 0,
      }).catch(() => {});

      return {
        success: false,
        error: "Network error sending verification email. Please try again.",
      };
    }

    return {
      success: true,
      message: "A new 6-digit verification code has been dispatched to your email.",
    };
  }

  /**
   * Requests a Fallback Passcode for IP Authorization (In-Place Mutation).
   * Rate limited: 60s cooldown, max 3 fallback resends.
   * Dispatched strictly via no-reply@gauravservices.eu.cc.
   */
  public async requestFallbackPasscode(
    challengeId: string,
    clientIp: string | null,
    userAgent?: string,
    requestHeaders?: Headers | null
  ): Promise<{
    success: boolean;
    error?: string;
    message?: string;
    cooldownSeconds?: number;
    remainingAttempts?: number;
  }> {
    if (!challengeId || typeof challengeId !== "string") {
      return { success: false, error: "Invalid challenge identifier." };
    }

    const now = Date.now();
    const newPasscode = this.generateOtpCode();
    const newSalt = this.generateSalt();
    const newPasscodeHmac = computeOtpHmac(newPasscode, newSalt);

    const txResult = await authChallengesRepository.runTransaction(async (transaction, collections, db) => {
      const challengeRef = db.collection(collections.challenges).doc(challengeId);

      const docSnapshot = await transaction.get(challengeRef);
      if (!docSnapshot.exists) {
        return { success: false, error: "Challenge session not found. Please sign in again." };
      }

      const challenge = docSnapshot.data() as AdminOtpChallengeRecord;

      if (challenge.isConsumed || challenge.otpStatus === "INVALIDATED" || challenge.otpStatus === "EXPIRED") {
        return { success: false, error: "This challenge is no longer active. Please sign in again." };
      }

      if (now > challenge.expiresAt) {
        transaction.update(challengeRef, {
          otpStatus: "EXPIRED",
          isConsumed: true,
          consumedAt: now,
        });
        return { success: false, error: "Verification challenge expired. Please sign in again." };
      }

      if ((challenge.attemptsCount || 0) >= OTP_MAX_ATTEMPTS) {
        return { success: false, error: "Maximum attempts exceeded. Challenge invalidated." };
      }

      // Check fallback resend count limit (Max 3)
      if ((challenge.fallbackResendCount || 0) >= OTP_MAX_RESENDS) {
        return {
          success: false,
          error: "Maximum passcode resend limit reached. Please check your inbox or restart sign-in.",
        };
      }

      // Check 60-second cooldown
      if (challenge.fallbackLastResentAt) {
        const elapsed = now - challenge.fallbackLastResentAt;
        if (elapsed < OTP_RESEND_COOLDOWN_MS) {
          const remainingSec = Math.ceil((OTP_RESEND_COOLDOWN_MS - elapsed) / 1000);
          return {
            success: false,
            error: `Please wait ${remainingSec} seconds before requesting another passcode.`,
            cooldownSeconds: remainingSec,
          };
        }
      }

      // Mutate fallback fields in-place (attemptsCount and expiresAt are strictly preserved!)
      transaction.update(challengeRef, {
        fallbackOtpHash: newPasscodeHmac,
        fallbackOtpSalt: newSalt,
        fallbackResendCount: (challenge.fallbackResendCount || 0) + 1,
        fallbackLastResentAt: now,
        clientIp: clientIp || challenge.clientIp,
        userAgent: userAgent || challenge.userAgent,
      });

      return {
        success: true,
        email: challenge.email,
        name: challenge.name,
        previousLastResentAt: challenge.fallbackLastResentAt,
        clientIp: clientIp || challenge.clientIp,
        userAgent: userAgent || challenge.userAgent,
        remainingAttempts: Math.max(0, OTP_MAX_ATTEMPTS - (challenge.attemptsCount || 0)),
      };
    });

    if (!txResult.success) {
      return {
        success: false,
        error: txResult.error,
        cooldownSeconds: txResult.cooldownSeconds,
      };
    }

    try {
      const emailResult = await dispatchOtpEmail({
        email: txResult.email!,
        name: txResult.name,
        otp: newPasscode,
        clientIp: txResult.clientIp,
        userAgent: txResult.userAgent,
        expiresMinutes: 5,
        requestHeaders,
      });

      if (!emailResult.success) {
        await authChallengesRepository.updateChallenge(challengeId, {
          fallbackLastResentAt: txResult.previousLastResentAt || 0,
        }).catch(() => {});

        return {
          success: false,
          error: "Failed to deliver authorization passcode email. Please try again.",
        };
      }
    } catch {
      await authChallengesRepository.updateChallenge(challengeId, {
        fallbackLastResentAt: txResult.previousLastResentAt || 0,
      }).catch(() => {});

      return {
        success: false,
        error: "Network error sending authorization passcode. Please try again.",
      };
    }

    return {
      success: true,
      message: "A 6-digit authorization passcode was sent to your registered Superadmin email.",
      remainingAttempts: txResult.remainingAttempts,
    };
  }

  /**
   * Single Atomic Firestore Transaction for Fallback Passcode Verification:
   * - Enforces global 3-attempt budget
   * - On match: Sets primaryOtpVerified = true, ipVerified = true, isConsumed = true, registers trusted IP
   * - On mismatch: Atomically increments global attemptsCount (only on legitimate code mismatch)
   */
  public async verifyFallbackPasscodeTransaction(
    challengeId: string,
    suppliedPasscode: string,
    clientIp: string | null,
    userAgent?: string
  ): Promise<{
    success: boolean;
    error?: string;
    remainingAttempts?: number;
    invalidated?: boolean;
    challenge?: AdminOtpChallengeRecord;
  }> {
    if (!challengeId || typeof challengeId !== "string") {
      return { success: false, error: "Invalid challenge identifier.", remainingAttempts: 3, invalidated: false };
    }

    if (!suppliedPasscode || typeof suppliedPasscode !== "string" || suppliedPasscode.trim().length !== 6) {
      return { success: false, error: "Please enter a valid 6-digit passcode.", remainingAttempts: 3, invalidated: false };
    }

    return await authChallengesRepository.runTransaction(async (transaction, collections, db) => {
      const now = Date.now();
      const challengeRef = db.collection(collections.challenges).doc(challengeId);

      // Phase 1: All Reads First
      const docSnapshot = await transaction.get(challengeRef);
      if (!docSnapshot.exists) {
        return {
          success: false,
          error: "Challenge session not found. Please sign in again.",
          remainingAttempts: 0,
          invalidated: true,
        };
      }

      const challenge = docSnapshot.data() as AdminOtpChallengeRecord;

      // Idempotent success: if already completed and verified
      if (challenge.isConsumed && challenge.primaryOtpVerified && challenge.ipVerified) {
        return {
          success: true,
          challenge,
        };
      }

      // Check validity
      if (challenge.isConsumed || challenge.otpStatus === "INVALIDATED" || challenge.otpStatus === "EXPIRED") {
        return {
          success: false,
          error: "This verification challenge is no longer active. Please sign in again.",
          remainingAttempts: 0,
          invalidated: true,
        };
      }

      // Check expiration
      if (now > challenge.expiresAt) {
        transaction.update(challengeRef, {
          otpStatus: "EXPIRED",
          isConsumed: true,
          consumedAt: now,
        });
        return {
          success: false,
          error: "Your verification passcode has expired. Please sign in again.",
          remainingAttempts: 0,
          invalidated: true,
        };
      }

      // Check if fallback was generated
      if (!challenge.fallbackOtpHash || !challenge.fallbackOtpSalt) {
        return {
          success: false,
          error: "No fallback passcode has been requested for this session. Please request one first.",
          remainingAttempts: Math.max(0, OTP_MAX_ATTEMPTS - (challenge.attemptsCount || 0)),
          invalidated: false,
        };
      }

      // Check global attempt limit
      if ((challenge.attemptsCount || 0) >= OTP_MAX_ATTEMPTS) {
        transaction.update(challengeRef, {
          otpStatus: "INVALIDATED",
          isConsumed: true,
          consumedAt: now,
        });
        return {
          success: false,
          error: "Maximum verification attempts exceeded. Challenge invalidated.",
          remainingAttempts: 0,
          invalidated: true,
        };
      }

      // Constant-time HMAC comparison
      const computedHash = computeOtpHmac(suppliedPasscode, challenge.fallbackOtpSalt);
      const isMatch = constantTimeCompare(challenge.fallbackOtpHash, computedHash);

      if (isMatch) {
        // SUCCESS: Mark primaryOtpVerified = true, ipVerified = true, isConsumed = true atomically
        transaction.update(challengeRef, {
          primaryOtpVerified: true,
          ipVerified: true,
          otpStatus: "VERIFIED",
          isConsumed: true,
          consumedAt: now,
        });

        // Register canonical trusted IP
        const effectiveIp = clientIp || challenge.clientIp || "0.0.0.0";
        const trustedIpKey = crypto
          .createHash("sha256")
          .update(`${challenge.email.trim().toLowerCase()}_${effectiveIp.trim().toLowerCase()}`)
          .digest("hex");
        const trustedIpRef = db.collection(collections.trustedIps).doc(trustedIpKey);

        transaction.set(
          trustedIpRef,
          {
            id: trustedIpKey,
            email: challenge.email.trim().toLowerCase(),
            ip: effectiveIp,
            trustedAt: now,
            lastUsedAt: now,
            source: "otp_fallback",
            userAgent: userAgent || challenge.userAgent,
          },
          { merge: true }
        );

        return {
          success: true,
          challenge: {
            ...challenge,
            primaryOtpVerified: true,
            ipVerified: true,
            otpStatus: "VERIFIED",
            isConsumed: true,
            consumedAt: now,
          },
        };
      }

      // MISMATCH: Increment global attempt count atomically
      const currentAttempts = challenge.attemptsCount || 0;
      const newAttempts = currentAttempts + 1;
      const remainingAttempts = Math.max(0, OTP_MAX_ATTEMPTS - newAttempts);
      const shouldInvalidate = newAttempts >= OTP_MAX_ATTEMPTS;

      const updatePayload: Record<string, unknown> = {
        attemptsCount: newAttempts,
        otpStatus: shouldInvalidate ? "INVALIDATED" : challenge.otpStatus,
        isConsumed: shouldInvalidate ? true : false,
      };
      if (shouldInvalidate) {
        updatePayload.consumedAt = now;
      }

      transaction.update(challengeRef, updatePayload);

      if (shouldInvalidate) {
        return {
          success: false,
          error: "Maximum verification attempts exceeded (3 of 3). Challenge invalidated.",
          remainingAttempts: 0,
          invalidated: true,
        };
      }

      return {
        success: false,
        error: `Incorrect authorization passcode. ${remainingAttempts} ${
          remainingAttempts === 1 ? "attempt" : "attempts"
        } remaining.`,
        remainingAttempts,
        invalidated: false,
      };
    });
  }
}

export const otpService = new OtpService();
