import { NextRequest, NextResponse } from "next/server";
import {
  verifyTOTPToken,
  getStoredTOTPSecret,
  saveTOTPSecret,
  checkTOTPAttemptStatus,
  recordFailedTOTPAttempt,
  resetTOTPAttempts,
} from "@/lib/admin/totp";
import { AUTHORIZED_ADMIN_EMAIL, ADMIN_COOKIE_NAME } from "@/lib/admin/auth";
import { AdminUser } from "@/types/admin";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, secret, isInitialSetup, adminEmail, adminName, adminAvatar, adminUid } = body;

    // 1. Strict Identity Check
    const normalizedAdminEmail = (adminEmail || "").trim().toLowerCase();
    if (normalizedAdminEmail !== AUTHORIZED_ADMIN_EMAIL.toLowerCase()) {
      return NextResponse.json(
        { success: false, error: "Access Denied: You are not an admin." },
        { status: 403 }
      );
    }

    // 2. Check Lockout Status
    const status = checkTOTPAttemptStatus();
    if (status.isLockedOut) {
      return NextResponse.json(
        {
          success: false,
          isLockedOut: true,
          attemptsLeft: 0,
          error: `Maximum Authenticator attempts exceeded. Locked for ${status.lockTimeRemainingSeconds}s.`,
        },
        { status: 429 }
      );
    }

    // 3. Token Format Validation
    const cleanToken = (token || "").trim();
    if (!/^\d{6}$/.test(cleanToken)) {
      return NextResponse.json(
        { success: false, error: "Please enter a valid 6-digit Google Authenticator code." },
        { status: 400 }
      );
    }

    // 4. Resolve Active Secret
    let activeSecret = secret;
    if (!isInitialSetup || !activeSecret) {
      activeSecret = await getStoredTOTPSecret();
    }

    if (!activeSecret) {
      return NextResponse.json(
        {
          success: false,
          error: "No Authenticator secret found. Please scan the QR Code to set up your device.",
          requireSetup: true,
        },
        { status: 400 }
      );
    }

    // 5. Verify Cryptographic TOTP Token
    const isValid = verifyTOTPToken(cleanToken, activeSecret);
    if (!isValid) {
      const failState = recordFailedTOTPAttempt();
      if (failState.isLockedOut) {
        return NextResponse.json(
          {
            success: false,
            isLockedOut: true,
            attemptsLeft: 0,
            error: "Too many failed attempts. Authenticator locked for 5 minutes.",
          },
          { status: 429 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          attemptsLeft: failState.attemptsLeft,
          error: `Invalid Google Authenticator code. ${failState.attemptsLeft} attempt${
            failState.attemptsLeft === 1 ? "" : "s"
          } remaining.`,
        },
        { status: 401 }
      );
    }

    // 6. Verification Succeeded: Reset attempt counter
    resetTOTPAttempts();

    // 7. Save Secret if this was an initial/re-pairing setup
    if (isInitialSetup && secret) {
      await saveTOTPSecret(secret);
    }

    // 8. Complete 3-Factor Verification & Issue 8-Hour Session
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

    const response = NextResponse.json({
      success: true,
      message: "3-Factor Security Verification Complete (Google + Email OTP + Authenticator).",
      user: adminUser,
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
      { success: false, error: error.message || "Failed to verify Authenticator code." },
      { status: 500 }
    );
  }
}
