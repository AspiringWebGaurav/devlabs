import { NextRequest, NextResponse } from "next/server";
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
import { liveChatChallengesRepository } from "@/lib/dal/repositories/live-chat-challenges.repository";
import { getRequestContext } from "@/lib/api/context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { requestId } = getRequestContext(req);
  if (!isLiveChatEnabled()) {
    return NextResponse.json(
      { ok: false, code: "FEATURE_DISABLED", message: "Assistant verification is temporarily offline." },
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
    const { challengeId, email, otp } = (body || {}) as {
      challengeId?: unknown;
      email?: unknown;
      otp?: unknown;
    };

    if (!challengeId || typeof challengeId !== "string") {
      return NextResponse.json(
        { ok: false, code: "VALIDATION_ERROR", message: "Invalid or missing challenge ID." },
        { status: 400 }
      );
    }

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { ok: false, code: "VALIDATION_ERROR", message: "Invalid or missing email address." },
        { status: 400 }
      );
    }

    if (!otp || typeof otp !== "string" || !/^\d{6}$/.test(otp.trim())) {
      return NextResponse.json(
        { ok: false, code: "INVALID_FORMAT", message: "Please enter a valid 6-digit code." },
        { status: 400 }
      );
    }

    const cleanEmail = normalizeEmail(email);
    const clientIp = extractClientIp(req);

    // Rate Limit Check
    const rateLimit = await checkLiveChatRateLimit({
      clientIp,
      email: cleanEmail,
      type: "OTP_VERIFY",
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          ok: false,
          code: "RATE_LIMITED",
          message: rateLimit.reason || "Too many verification attempts. Please wait.",
          retryAfterSeconds: rateLimit.retryAfterSeconds,
        },
        { status: 429 }
      );
    }

    // Retrieve Challenge Document
    const challenge = await liveChatChallengesRepository.getChallenge(challengeId);
    if (!challenge) {
      return NextResponse.json(
        { ok: false, code: "CHALLENGE_NOT_FOUND", message: "Verification challenge not found or expired." },
        { status: 404 }
      );
    }

    // Compute Verifier and Consume atomically
    const computedVerifier = computeOtpVerifier(challengeId, challenge.otpSalt, otp.trim());
    const verifyResult = await liveChatChallengesRepository.verifyAndConsumeOtp(challengeId, computedVerifier);

    if (!verifyResult.success) {
      const isLocked = verifyResult.code === "OTP_LOCKED";
      const statusCode = isLocked ? 429 : 401;
      return NextResponse.json(
        {
          ok: false,
          code: verifyResult.code || "INVALID_OTP",
          message: isLocked
            ? "Too many incorrect attempts. Please request a new code."
            : "Incorrect verification code.",
          remainingAttempts: verifyResult.remainingAttempts,
        },
        { status: statusCode }
      );
    }

    return NextResponse.json({
      ok: true,
      verifiedAt: Date.now(),
      message: "Security verification successful.",
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      { ok: false, code: "INTERNAL_ERROR", message: error.message || "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
