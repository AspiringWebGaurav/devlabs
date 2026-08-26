import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_COOKIE_NAME,
  ADMIN_OTP_COOKIE_NAME,
  ADMIN_SESSION_MAX_AGE_SECONDS,
} from "@/lib/admin/constants";
import { createAdminSessionPayload, signAdminSession } from "@/lib/admin/auth";
import { otpService } from "@/lib/admin/services/otp.service";
import { ipSecurityService, normalizeIpAddress } from "@/lib/admin/services/ip-security.service";
import { dispatchNewIpSecurityAlert } from "@/lib/email/brevo";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const challengeId = request.cookies.get(ADMIN_OTP_COOKIE_NAME)?.value;
    if (!challengeId) {
      return NextResponse.json(
        { success: false, error: "No active verification challenge. Please sign in again." },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const rawOtp = typeof body.otp === "string" ? body.otp.trim() : "";

    if (!rawOtp || rawOtp.length !== 6) {
      return NextResponse.json(
        { success: false, error: "Please enter a valid 6-digit code." },
        { status: 400 }
      );
    }

    // Single Atomic Transactional OTP Verification
    const verifyResult = await otpService.verifyOtpChallengeTransaction(challengeId, rawOtp);

    // Case 1: OTP verification failed (Incorrect code, attempt exceeded, or expired)
    if (!verifyResult.success || !verifyResult.challenge) {
      const remainingAttempts =
        typeof verifyResult.remainingAttempts === "number" ? verifyResult.remainingAttempts : 0;
      const isInvalidated = verifyResult.invalidated === true || remainingAttempts === 0;

      const response = NextResponse.json(
        {
          success: false,
          error: verifyResult.error || "Verification failed.",
          remainingAttempts,
          invalidated: isInvalidated,
        },
        { status: 400 }
      );

      // Delete challenge cookie ONLY if the challenge was invalidated on the server
      if (isInvalidated) {
        response.cookies.delete(ADMIN_OTP_COOKIE_NAME);
      }

      return response;
    }

    const challenge = verifyResult.challenge;

    // Explicit OTP Authentication Gate: Stage 1 must be satisfied
    if (!challenge.primaryOtpVerified && challenge.otpStatus !== "VERIFIED") {
      return NextResponse.json(
        { success: false, error: "OTP verification requirement not satisfied." },
        { status: 400 }
      );
    }

    const email = challenge.email;
    const rawClientIp = challenge.clientIp;
    const clientIp = normalizeIpAddress(rawClientIp);
    const userAgent = challenge.userAgent || request.headers.get("user-agent") || undefined;

    // Case 2: IP Evaluation & Trust Verification
    let isIpAuthorized = false;

    if (clientIp) {
      const isKnown = await ipSecurityService.isIpTrusted(email, clientIp);
      if (isKnown) {
        isIpAuthorized = true;
      } else {
        // Check if this is the very first login for this admin identity
        const trustedCount = await ipSecurityService.getTrustedIpCount(email);
        if (trustedCount === 0) {
          // Bootstrap trust for initial login
          await ipSecurityService.trustIp(email, clientIp, "first_login", userAgent);
          isIpAuthorized = true;
        }
      }
    }

    // Case 3: New or Unresolved IP requires email security authorization link or fallback
    if (!isIpAuthorized || !clientIp) {
      const displayIp = clientIp || "Unresolved Location";
      const { verifyUrl, expiresAt } = await ipSecurityService.createIpVerificationToken(
        challenge.id,
        email,
        clientIp || "0.0.0.0",
        request.headers
      );

      // Dispatch security authorization alert strictly via security@gauravservices.eu.cc
      await dispatchNewIpSecurityAlert({
        email,
        name: challenge.name,
        clientIp: displayIp,
        verifyUrl,
        userAgent,
        expiresMinutes: 15,
      });

      return NextResponse.json({
        success: true,
        requiresIpVerification: true,
        clientIp: displayIp,
        expiresAt,
        remainingAttempts: Math.max(0, 3 - (challenge.attemptsCount || 0)),
        message: "New IP address detected. A verification link has been sent to your email.",
      });
    }

    // Case 4: IP is Authorized & OTP Validated -> Finalize Challenge & Elevate to Full Admin Session
    await otpService.getChallenge(challenge.id).then(async (latest) => {
      if (latest && !latest.isConsumed) {
        const { authChallengesRepository } = await import("@/lib/admin/repositories/auth-challenges.repository");
        await authChallengesRepository.updateChallenge(challenge.id, {
          ipVerified: true,
          isConsumed: true,
          consumedAt: Date.now(),
        }).catch(() => {});
      }
    });

    const session = createAdminSessionPayload(email, challenge.avatar, challenge.name);
    const signedToken = await signAdminSession(session);

    const response = NextResponse.json({
      success: true,
      verified: true,
      redirect: "/admin/authenticating",
    });

    const isSecure = process.env.NODE_ENV === "production";

    // Set full cryptographically signed admin_session cookie with httpOnly protection
    response.cookies.set({
      name: ADMIN_COOKIE_NAME,
      value: signedToken,
      httpOnly: true,
      secure: isSecure,
      sameSite: "lax",
      maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
      path: "/",
    });

    // Clear one-time OTP challenge cookie
    response.cookies.delete(ADMIN_OTP_COOKIE_NAME);

    return response;
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      {
        success: false,
        error: error.message || "An unexpected error occurred during verification.",
        invalidated: false,
      },
      { status: 500 }
    );
  }
}
