import { NextRequest, NextResponse } from "next/server";
import {
  generateCryptographicOTP,
  sendDynamicOtpEmail,
  storeOTP,
  getResendCooldownRemaining,
} from "@/lib/admin/otp";
import { AUTHORIZED_ADMIN_EMAIL, ADMIN_COOKIE_NAME } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    // 1. Session verification
    const sessionCookie = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
    if (!sessionCookie) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Admin session required." },
        { status: 401 }
      );
    }

    let session: { email?: string } | null = null;
    try {
      session = JSON.parse(decodeURIComponent(sessionCookie));
    } catch {
      try {
        session = JSON.parse(sessionCookie);
      } catch {
        session = null;
      }
    }

    if (!session || session.email?.trim().toLowerCase() !== AUTHORIZED_ADMIN_EMAIL.toLowerCase()) {
      return NextResponse.json(
        { success: false, error: `Forbidden: Only ${AUTHORIZED_ADMIN_EMAIL} is authorized.` },
        { status: 403 }
      );
    }

    const destinationEmail = AUTHORIZED_ADMIN_EMAIL.trim().toLowerCase();

    // 2. Cooldown check
    const cooldownRemaining = getResendCooldownRemaining(destinationEmail, "wipe");
    if (cooldownRemaining > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Please wait ${cooldownRemaining}s before requesting a new authorization code.`,
          cooldownRemaining,
        },
        { status: 429 }
      );
    }

    // 3. Generate & Store Wipe OTP
    const otpCode = generateCryptographicOTP();
    const { challengeToken } = await storeOTP(destinationEmail, otpCode, "wipe");

    // 4. Dispatch Red Danger Themed OTP via EmailJS
    const emailResult = await sendDynamicOtpEmail({
      toEmail: destinationEmail,
      otpCode,
      mode: "wipe",
      toName: "Administrator",
    });

    if (!emailResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: emailResult.error || "Failed to dispatch wipe authorization email.",
        },
        { status: 502 }
      );
    }

    // 5. Masked email
    const [namePart, domainPart] = destinationEmail.split("@");
    const maskedEmail = `${namePart.slice(0, 3)}***@${domainPart}`;

    return NextResponse.json({
      success: true,
      message: `Critical authorization code sent to ${maskedEmail}.`,
      challengeToken,
      expiresInMinutes: 5,
    });
  } catch (error) {
    console.error("Wipe OTP send error:", error);
    const err = error as Error;
    return NextResponse.json(
      { success: false, error: err.message || "Failed to dispatch authorization code." },
      { status: 500 }
    );
  }
}
