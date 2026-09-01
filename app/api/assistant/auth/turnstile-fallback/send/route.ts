import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import {
  extractClientIp,
  validateCsrfOrigin,
  isLiveChatEnabled,
} from "@/lib/assistant/session";
import {
  computeOtpVerifier,
  normalizeEmail,
} from "@/lib/assistant/services/live-chat-otp.service";
import { checkLiveChatRateLimit } from "@/lib/assistant/services/live-chat-rate-limiter";
import {
  liveChatChallengesRepository,
  LiveChatChallengeDocument,
} from "@/lib/dal/repositories/live-chat-challenges.repository";
import { dispatchTurnstileFallbackOtpEmail } from "@/lib/email/brevo";
import { getRequestContext } from "@/lib/api/context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export async function POST(req: NextRequest) {
  const { requestId } = getRequestContext(req);
  if (!isLiveChatEnabled()) {
    return NextResponse.json(
      { ok: false, code: "FEATURE_DISABLED", message: "Assistant security verification is temporarily unavailable." },
      { status: 503, headers: { "x-request-id": requestId } }
    );
  }

  if (!validateCsrfOrigin(req)) {
    return NextResponse.json(
      { ok: false, code: "CSRF_ORIGIN_REJECTED", message: "Cross-origin request rejected." },
      { status: 403, headers: { "x-request-id": requestId } }
    );
  }

  try {
    const body = await req.json().catch(() => null);
    const { email } = (body || {}) as { email?: unknown };

    if (!email || typeof email !== "string" || !EMAIL_REGEX.test(email.trim()) || email.trim().length > 150) {
      return NextResponse.json(
        { ok: false, code: "VALIDATION_ERROR", message: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    const cleanEmail = normalizeEmail(email);
    const clientIp = extractClientIp(req);

    // Rate Limit Check
    const rateLimit = await checkLiveChatRateLimit({
      clientIp,
      email: cleanEmail,
      type: "OTP_SEND",
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          ok: false,
          code: "RATE_LIMITED",
          message: rateLimit.reason || "Rate limit reached. Please wait before requesting another code.",
          retryAfterSeconds: rateLimit.retryAfterSeconds,
        },
        { status: 429 }
      );
    }

    // Cryptographic Material Generation
    const challengeId = `ch_cf_fallback_${crypto.randomUUID()}`;
    const plainOtp = crypto.randomInt(100000, 1000000).toString();
    const salt = crypto.randomBytes(16).toString("hex");
    const otpHash = computeOtpVerifier(challengeId, salt, plainOtp);
    const now = Date.now();
    const dispatchKey = crypto.createHash("sha256").update(challengeId).digest("hex");

    await liveChatChallengesRepository.supersedeExistingChallenges(cleanEmail);

    const challengeDoc: LiveChatChallengeDocument = {
      challengeId,
      email: cleanEmail,
      name: "Visitor",
      otpHash,
      otpSalt: salt,
      clientIp,
      userAgent: req.headers.get("user-agent") || undefined,
      status: "PENDING",
      failedAttempts: 0,
      maxAttempts: 3,
      resendCount: 0,
      maxResends: 2,
      journeyId: `jy_${cleanEmail}_${now}`,
      createdAt: now,
      pendingExpiresAt: now + 15000,
      dispatchDeduplicationKey: dispatchKey,
    };

    await liveChatChallengesRepository.createChallenge(challengeDoc);

    // Dispatch Cloudflare Fallback OTP Email
    const dispatchResult = await dispatchTurnstileFallbackOtpEmail({
      email: cleanEmail,
      otp: plainOtp,
      expiresMinutes: 5,
      requestHeaders: req.headers,
      idempotencyKey: `cf_fb_${dispatchKey.slice(0, 32)}`,
    });

    if (!dispatchResult.success) {
      await liveChatChallengesRepository.markChallengeFailed(challengeId);
      return NextResponse.json(
        {
          ok: false,
          code: "GATEWAY_UNAVAILABLE",
          message: "Unable to dispatch verification code. Please check your email and try again.",
        },
        { status: 503 }
      );
    }

    // Promote from PENDING to ACTIVE
    await liveChatChallengesRepository.promotePendingToActive(challengeId);

    return NextResponse.json({
      ok: true,
      challengeId,
      email: cleanEmail,
      expiresInSeconds: 300,
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      { ok: false, code: "INTERNAL_ERROR", message: error.message || "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
