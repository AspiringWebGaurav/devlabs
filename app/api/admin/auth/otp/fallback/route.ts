import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_COOKIE_NAME,
  ADMIN_OTP_COOKIE_NAME,
  ADMIN_SESSION_MAX_AGE_SECONDS,
  OTP_RESEND_COOLDOWN_MS,
} from "@/lib/admin/constants";
import {
  createAdminSessionPayload,
  signAdminSession,
  type AuthFallbackApiResponse,
} from "@/lib/admin/auth";
import { otpService } from "@/lib/admin/services/otp.service";
import { extractClientIp } from "@/lib/admin/services/ip-security.service";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest): Promise<NextResponse<AuthFallbackApiResponse>> {
  try {
    const challengeId = request.cookies.get(ADMIN_OTP_COOKIE_NAME)?.value;
    if (!challengeId) {
      return NextResponse.json(
        { success: false, error: "No active verification challenge. Please sign in again." },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const action = body.action;
    const clientIp = extractClientIp(request.headers);
    const userAgent = request.headers.get("user-agent") || undefined;

    // Sub-Action 1: Request Fallback Passcode
    if (action === "request") {
      const result = await otpService.requestFallbackPasscode(
        challengeId,
        clientIp,
        userAgent,
        request.headers
      );

      if (!result.success) {
        return NextResponse.json(
          {
            success: false,
            error: result.error || "Failed to request authorization passcode.",
            cooldownSeconds: result.cooldownSeconds,
          },
          { status: 400 }
        );
      }

      return NextResponse.json<AuthFallbackApiResponse>({
        success: true,
        message: result.message,
        remainingAttempts: result.remainingAttempts,
        fallbackResendAvailableAt: Date.now() + OTP_RESEND_COOLDOWN_MS,
      });
    }

    // Sub-Action 2: Verify Fallback Passcode
    if (action === "verify") {
      const rawPasscode = typeof body.passcode === "string" ? body.passcode.trim() : "";
      if (!rawPasscode || rawPasscode.length !== 6) {
        return NextResponse.json(
          { success: false, error: "Please enter a valid 6-digit passcode." },
          { status: 400 }
        );
      }

      const verifyResult = await otpService.verifyFallbackPasscodeTransaction(
        challengeId,
        rawPasscode,
        clientIp,
        userAgent
      );

      if (!verifyResult.success || !verifyResult.challenge) {
        const remainingAttempts =
          typeof verifyResult.remainingAttempts === "number" ? verifyResult.remainingAttempts : 0;
        const isInvalidated = verifyResult.invalidated === true || remainingAttempts === 0;

        const response = NextResponse.json<AuthFallbackApiResponse>(
          {
            success: false,
            error: verifyResult.error || "Passcode verification failed.",
            remainingAttempts,
            invalidated: isInvalidated,
          },
          { status: 400 }
        );

        if (isInvalidated) {
          response.cookies.delete(ADMIN_OTP_COOKIE_NAME);
        }

        return response;
      }

      const challenge = verifyResult.challenge;

      // Authoritative Stage Gate: BOTH primaryOtpVerified and ipVerified must be true
      if (!challenge.primaryOtpVerified || !challenge.ipVerified) {
        return NextResponse.json(
          { success: false, error: "Security requirements not satisfied." },
          { status: 400 }
        );
      }

      // Elevate to Full Admin Session
      const session = createAdminSessionPayload(
        challenge.email,
        challenge.avatar,
        challenge.name
      );
      const signedToken = await signAdminSession(session);

      const response = NextResponse.json<AuthFallbackApiResponse>({
        success: true,
        verified: true,
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

      // Clear one-time challenge cookie
      response.cookies.delete(ADMIN_OTP_COOKIE_NAME);

      return response;
    }

    return NextResponse.json(
      { success: false, error: "Invalid action specified." },
      { status: 400 }
    );
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      {
        success: false,
        error: error.message || "An unexpected error occurred during fallback verification.",
      },
      { status: 500 }
    );
  }
}
