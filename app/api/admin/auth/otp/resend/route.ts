import { NextRequest, NextResponse } from "next/server";
import { ADMIN_OTP_COOKIE_NAME } from "@/lib/admin/constants";
import { otpService } from "@/lib/admin/services/otp.service";
import { extractClientIp } from "@/lib/admin/services/ip-security.service";

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

    const clientIp = extractClientIp(request.headers);
    const userAgent = request.headers.get("user-agent") || undefined;

    const result = await otpService.resendOtp(challengeId, clientIp, userAgent);

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

    return NextResponse.json({
      success: true,
      message: result.message || "A new 6-digit verification code has been dispatched to your email.",
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process resend request." },
      { status: 500 }
    );
  }
}
