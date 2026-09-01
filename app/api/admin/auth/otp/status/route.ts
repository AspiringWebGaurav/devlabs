import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_COOKIE_NAME,
  ADMIN_OTP_COOKIE_NAME,
  ADMIN_SESSION_MAX_AGE_SECONDS,
  OTP_RESEND_COOLDOWN_MS,
  OTP_MAX_RESENDS,
  OTP_MAX_ATTEMPTS,
} from "@/lib/admin/constants";
import {
  createAdminSessionPayload,
  signAdminSession,
  type AuthStatusApiResponse,
} from "@/lib/admin/auth";
import { otpService } from "@/lib/admin/services/otp.service";
import { getRequestContext } from "@/lib/api/context";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<NextResponse<AuthStatusApiResponse>> {
  const { requestId } = getRequestContext(request);
  const now = Date.now();

  try {
    const challengeId = request.cookies.get(ADMIN_OTP_COOKIE_NAME)?.value;
    if (!challengeId) {
      return NextResponse.json(
        { success: false, status: "UNAUTHORIZED", serverTime: now, error: "No active challenge cookie." },
        { status: 401, headers: { "x-request-id": requestId } }
      );
    }

    const challenge = await otpService.getChallenge(challengeId);
    if (!challenge) {
      const response = NextResponse.json<AuthStatusApiResponse>({
        success: false,
        status: "EXPIRED",
        serverTime: now,
        error: "Challenge not found.",
      });
      response.cookies.delete(ADMIN_OTP_COOKIE_NAME);
      return response;
    }

    if (now > challenge.expiresAt || challenge.otpStatus === "EXPIRED") {
      const response = NextResponse.json<AuthStatusApiResponse>({
        success: false,
        status: "EXPIRED",
        serverTime: now,
        error: "Verification challenge expired.",
      });
      response.cookies.delete(ADMIN_OTP_COOKIE_NAME);
      return response;
    }

    if (challenge.otpStatus === "INVALIDATED") {
      const response = NextResponse.json<AuthStatusApiResponse>({
        success: false,
        status: "INVALIDATED",
        serverTime: now,
        error: "Challenge invalidated.",
      });
      response.cookies.delete(ADMIN_OTP_COOKIE_NAME);
      return response;
    }

    // STRICT GATE: Only elevate if primary OTP is verified AND IP is authorized
    const isPrimaryDone = Boolean(challenge.primaryOtpVerified || challenge.otpStatus === "VERIFIED");
    if (isPrimaryDone && challenge.ipVerified) {
      const session = createAdminSessionPayload(
        challenge.email,
        challenge.avatar,
        challenge.name
      );
      const signedToken = await signAdminSession(session);

      const response = NextResponse.json<AuthStatusApiResponse>({
        success: true,
        status: "VERIFIED",
        serverTime: now,
        redirect: "/admin",
      });

      const isSecure = process.env.NODE_ENV === "production";

      response.cookies.set({
        name: ADMIN_COOKIE_NAME,
        value: signedToken,
        httpOnly: true,
        secure: isSecure,
        sameSite: "lax",
        maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
        path: "/",
      });

      response.cookies.delete(ADMIN_OTP_COOKIE_NAME);
      return response;
    }

    const lastResent = challenge.lastResentAt || challenge.createdAt;
    const resendAvailableAt = lastResent + OTP_RESEND_COOLDOWN_MS;
    const fallbackResendAvailableAt = challenge.fallbackLastResentAt
      ? challenge.fallbackLastResentAt + OTP_RESEND_COOLDOWN_MS
      : 0;

    return NextResponse.json<AuthStatusApiResponse>({
      success: true,
      status: "PENDING",
      primaryOtpVerified: isPrimaryDone,
      ipVerified: Boolean(challenge.ipVerified),
      createdAt: challenge.createdAt,
      expiresAt: challenge.expiresAt,
      resendAvailableAt,
      resendCount: challenge.resendCount || 0,
      maxResends: OTP_MAX_RESENDS,
      fallbackResendAvailableAt,
      fallbackResendCount: challenge.fallbackResendCount || 0,
      maxFallbackResends: OTP_MAX_RESENDS,
      remainingAttempts: Math.max(0, OTP_MAX_ATTEMPTS - (challenge.attemptsCount || 0)),
      serverTime: now,
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json<AuthStatusApiResponse>(
      {
        success: false,
        status: "ERROR",
        serverTime: now,
        error: error.message || "Failed to check status.",
      },
      { status: 500 }
    );
  }
}
