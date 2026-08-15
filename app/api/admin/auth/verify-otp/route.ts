import { NextRequest, NextResponse } from "next/server";
import { verifySubmittedOTP } from "@/lib/admin/otp";
import { AUTHORIZED_ADMIN_EMAIL } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { targetEmail, code, adminEmail } = body;

    // 1. Verify that the authenticating user is gauravpatil9262@gmail.com
    const normalizedAdminEmail = (adminEmail || "").trim().toLowerCase();
    if (normalizedAdminEmail !== AUTHORIZED_ADMIN_EMAIL.toLowerCase()) {
      return NextResponse.json(
        { success: false, error: "Access Denied: You are not an admin." },
        { status: 403 }
      );
    }

    // 2. Validate Code Format
    const submittedCode = (code || "").trim();
    if (!/^\d{6}$/.test(submittedCode)) {
      return NextResponse.json(
        { success: false, error: "Please enter a valid 6-digit verification code." },
        { status: 400 }
      );
    }

    // 3. Verify OTP against cryptographic store
    const destinationEmail = (targetEmail || adminEmail).trim().toLowerCase();
    const verifyResult = await verifySubmittedOTP(destinationEmail, submittedCode);

    if (!verifyResult.success) {
      return NextResponse.json(
        {
          success: false,
          errorCode: verifyResult.errorCode,
          attemptsLeft: verifyResult.attemptsLeft,
          error: verifyResult.error || "Invalid verification code.",
        },
        { status: 401 }
      );
    }

    // 4. Email OTP Stage Verified Successfully
    return NextResponse.json({
      success: true,
      emailOtpVerified: true,
      message: "Email security OTP verified. Proceeding to Google Authenticator.",
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      { success: false, error: error.message || "Failed to verify OTP." },
      { status: 500 }
    );
  }
}
