import { NextRequest, NextResponse } from "next/server";
import {
  generateCryptographicOTP,
  sendOTPViaEmailJS,
  storeOTP,
  getResendCooldownRemaining,
} from "@/lib/admin/otp";
import { AUTHORIZED_ADMIN_EMAIL } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { targetEmail, adminEmail, adminName } = body;

    // 1. Strict Administrator Identity Verification
    const normalizedAdminEmail = (adminEmail || "").trim().toLowerCase();
    if (normalizedAdminEmail !== AUTHORIZED_ADMIN_EMAIL.toLowerCase()) {
      return NextResponse.json(
        { success: false, error: "Access Denied: You are not an admin." },
        { status: 403 }
      );
    }

    // 2. Validate Target Delivery Email
    const destinationEmail = (targetEmail || adminEmail).trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(destinationEmail)) {
      return NextResponse.json(
        { success: false, error: "Please provide a valid destination email address." },
        { status: 400 }
      );
    }

    // 3. Check Cooldown (prevent spam)
    const cooldownRemaining = getResendCooldownRemaining(destinationEmail);
    if (cooldownRemaining > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Please wait ${cooldownRemaining}s before requesting a new code.`,
          cooldownRemaining,
        },
        { status: 429 }
      );
    }

    // 4. Generate & Store Cryptographic OTP
    const otpCode = generateCryptographicOTP();
    await storeOTP(destinationEmail, otpCode);

    // 5. Dispatch via EmailJS
    const emailResult = await sendOTPViaEmailJS(destinationEmail, otpCode, adminName || "Gaurav");

    if (!emailResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: emailResult.error || "Email delivery failed. Please check your EmailJS service.",
        },
        { status: 502 }
      );
    }

    // 6. Mask recipient email for display
    const [namePart, domainPart] = destinationEmail.split("@");
    const maskedName =
      namePart.length <= 3
        ? namePart[0] + "***"
        : namePart.slice(0, 3) + "***" + (namePart.length > 5 ? namePart.slice(-1) : "");
    const maskedEmail = `${maskedName}@${domainPart}`;

    return NextResponse.json({
      success: true,
      message: `Verification code sent to ${maskedEmail}`,
      targetEmail: destinationEmail,
      maskedEmail,
      expiresInSeconds: 300,
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process OTP request." },
      { status: 500 }
    );
  }
}
