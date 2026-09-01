import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_OTP_COOKIE_NAME,
  OTP_RESEND_COOLDOWN_MS,
  OTP_MAX_ATTEMPTS,
} from "@/lib/admin/constants";
import { type AuthResendApiResponse } from "@/lib/admin/auth";
import { otpService } from "@/lib/admin/services/otp.service";
import { extractClientIp } from "@/lib/admin/services/ip-security.service";
import { getRequestContext } from "@/lib/api/context";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest): Promise<NextResponse<AuthResendApiResponse>> {
  const { requestId } = getRequestContext(request);

  try {
    const challengeId = request.cookies.get(ADMIN_OTP_COOKIE_NAME)?.value;
    if (!challengeId) {
      return NextResponse.json(
        { success: false, error: "No active verification challenge. Please sign in again." },
        { status: 401, headers: { "x-request-id": requestId } }
      );
    }

    const clientIp = extractClientIp(request.headers);
    const userAgent = request.headers.get("user-agent") || undefined;

    const result = await otpService.resendOtp(challengeId, clientIp, userAgent, request.headers);

    if (!result.success) {
      const isCooldown = typeof result.cooldownSeconds === "number" && result.cooldownSeconds > 0;
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Failed to resend verification code.",
          cooldownSeconds: result.cooldownSeconds,
        },
        { status: isCooldown ? 429 : 400 }
      );
    }

    const challenge = await otpService.getChallenge(challengeId);
    const now = Date.now();

    return NextResponse.json<AuthResendApiResponse>({
      success: true,
      message: result.message || "A new 6-digit verification code has been dispatched to your email.",
      resendAvailableAt: now + OTP_RESEND_COOLDOWN_MS,
      expiresAt: challenge?.expiresAt,
      resendCount: challenge?.resendCount || 1,
      remainingAttempts: challenge ? Math.max(0, OTP_MAX_ATTEMPTS - (challenge.attemptsCount || 0)) : 3,
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process resend request." },
      { status: 500 }
    );
  }
}
