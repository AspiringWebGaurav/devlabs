import { NextRequest, NextResponse } from "next/server";
import {
  extractClientIp,
  validateCsrfOrigin,
  isLiveChatEnabled,
} from "@/lib/assistant/session";
import {
  LIVE_CHAT_COOKIE_NAME,
  LIVE_CHAT_SESSION_MAX_AGE_SECONDS,
  signVisitorSession,
  VisitorSession,
} from "@/lib/assistant/auth";
import { liveChatChallengesRepository } from "@/lib/dal/repositories/live-chat-challenges.repository";
import { liveChatSessionsRepository } from "@/lib/dal/repositories/live-chat-sessions.repository";
import {
  checkLiveChatRateLimit,
  recordLiveChatAction,
} from "@/lib/assistant/services/live-chat-rate-limiter";
import { computeOtpVerifier } from "@/lib/assistant/services/live-chat-otp.service";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OTP_REGEX = /^\d{6}$/;

export async function POST(req: NextRequest) {
  // 1. Kill Switch Check
  if (!isLiveChatEnabled()) {
    return NextResponse.json(
      { ok: false, code: "FEATURE_DISABLED", message: "Live Chat is currently offline." },
      { status: 503 }
    );
  }

  // 2. CSRF Origin Check
  if (!validateCsrfOrigin(req)) {
    return NextResponse.json(
      { ok: false, code: "CSRF_ORIGIN_REJECTED", message: "Cross-origin request rejected." },
      { status: 403 }
    );
  }

  try {
    // Early request size check: Max 16KB raw payload
    const contentLength = req.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > 16384) {
      return NextResponse.json(
        { ok: false, code: "PAYLOAD_TOO_LARGE", message: "Request payload exceeds 16KB limit." },
        { status: 413 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { ok: false, code: "VALIDATION_ERROR", message: "Invalid request payload." },
        { status: 400 }
      );
    }

    const { challengeId, otp } = body as { challengeId?: unknown; otp?: unknown };

    if (!challengeId || typeof challengeId !== "string" || !challengeId.startsWith("ch_live_")) {
      return NextResponse.json(
        { ok: false, code: "VALIDATION_ERROR", message: "Invalid challenge identifier." },
        { status: 400 }
      );
    }

    if (!otp || typeof otp !== "string" || !OTP_REGEX.test(otp.trim())) {
      return NextResponse.json(
        { ok: false, code: "VALIDATION_ERROR", message: "Please provide a valid 6-digit numeric code." },
        { status: 400 }
      );
    }

    const clientIp = extractClientIp(req);

    // Rate limit verify attempts
    const rateLimit = await checkLiveChatRateLimit({
      clientIp,
      type: "OTP_VERIFY",
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          ok: false,
          code: "RATE_LIMITED",
          message: rateLimit.reason || "Too many verification attempts. Please wait.",
        },
        { status: 429 }
      );
    }

    recordLiveChatAction({
      clientIp,
      type: "OTP_VERIFY",
    });

    // 3. Fetch Challenge Document
    const challenge = await liveChatChallengesRepository.getChallenge(challengeId);
    if (!challenge) {
      return NextResponse.json(
        { ok: false, code: "OTP_INVALID", message: "Verification challenge not found or expired." },
        { status: 400 }
      );
    }

    // 4. Compute Verifier & Execute Atomic Verification
    const computedVerifier = computeOtpVerifier(
      challenge.challengeId,
      challenge.otpSalt,
      otp.trim()
    );

    const verificationResult = await liveChatChallengesRepository.verifyAndConsumeOtp(
      challengeId,
      computedVerifier
    );

    if (!verificationResult.success) {
      const code = verificationResult.code || "OTP_INVALID";
      const statusCode = code === "OTP_LOCKED" ? 403 : 400;

      let msg = "Invalid verification code.";
      if (code === "OTP_LOCKED") {
        msg = "Too many failed attempts. Verification challenge locked. Please start over.";
      } else if (code === "OTP_EXPIRED") {
        msg = "Verification code has expired. Please request a new code.";
      } else if (code === "OTP_SUPERSEDED") {
        msg = "This verification code has been superseded by a newer request.";
      } else if (verificationResult.remainingAttempts !== undefined) {
        msg = `Incorrect code. ${verificationResult.remainingAttempts} attempt(s) remaining.`;
      }

      return NextResponse.json(
        {
          ok: false,
          code,
          message: msg,
          remainingAttempts: verificationResult.remainingAttempts,
        },
        { status: statusCode }
      );
    }

    // 5. Create Session in Firestore Registry
    const now = Date.now();
    const sessionId = `sess_live_${crypto.randomUUID()}`;
    const expiresAt = now + LIVE_CHAT_SESSION_MAX_AGE_SECONDS * 1000;
    const userAgent = req.headers.get("user-agent") || undefined;

    await liveChatSessionsRepository.createSession({
      sessionId,
      email: challenge.email,
      name: challenge.name,
      clientIp,
      userAgent,
      status: "ACTIVE",
      createdAt: now,
      expiresAt,
    });

    // 6. Sign Visitor Session Cookie
    const visitorSession: VisitorSession = {
      sessionId,
      email: challenge.email,
      name: challenge.name,
      clientIp,
      createdAt: now,
      expiresAt,
    };

    const signedToken = signVisitorSession(visitorSession);
    const isProduction = process.env.NODE_ENV === "production";

    const response = NextResponse.json({
      ok: true,
      message: "Authentication successful.",
      session: {
        sessionId,
        email: challenge.email,
        name: challenge.name,
        expiresAt,
      },
    });

    // 7. Set Secure HttpOnly Session Cookie
    response.cookies.set({
      name: LIVE_CHAT_COOKIE_NAME,
      value: signedToken,
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      path: "/",
      maxAge: LIVE_CHAT_SESSION_MAX_AGE_SECONDS,
    });

    return response;
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      { ok: false, code: "INTERNAL_ERROR", message: error.message || "An unexpected error occurred." },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { ok: false, code: "METHOD_NOT_ALLOWED", message: "Method Not Allowed" },
    { status: 405 }
  );
}
