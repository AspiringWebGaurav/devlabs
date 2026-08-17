import { NextRequest, NextResponse } from "next/server";
import { verifySubmittedOTP } from "@/lib/admin/otp";
import { AUTHORIZED_ADMIN_EMAIL, ADMIN_COOKIE_NAME } from "@/lib/admin/auth";
import { AdminUser } from "@/types/admin";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { targetEmail, code, adminEmail, adminName, adminAvatar, adminUid } = body;

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

    // 4. Construct Authenticated Admin User Session
    const now = Date.now();
    const sessionDurationMs = 8 * 60 * 60 * 1000;
    const expiresAt = now + sessionDurationMs;

    const adminUser: AdminUser = {
      id: adminUid ? `usr_google_${adminUid}` : `usr_admin_${Date.now()}`,
      email: AUTHORIZED_ADMIN_EMAIL,
      name: adminName || "Gaurav patil",
      role: "superadmin",
      avatar:
        adminAvatar ||
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      issuedAt: now,
      expiresAt,
      lastActiveAt: now,
    };

    // 5. Issue session cookie and return user payload
    const response = NextResponse.json({
      success: true,
      emailOtpVerified: true,
      user: adminUser,
      message: "Email security OTP verified successfully.",
    });

    response.cookies.set({
      name: ADMIN_COOKIE_NAME,
      value: encodeURIComponent(JSON.stringify(adminUser)),
      path: "/",
      maxAge: 8 * 3600,
      sameSite: "lax",
      httpOnly: false,
    });

    return response;
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      { success: false, error: error.message || "Failed to verify OTP." },
      { status: 500 }
    );
  }
}
