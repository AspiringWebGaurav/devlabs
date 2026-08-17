import { NextRequest, NextResponse } from "next/server";
import { revokeTOTPSecret } from "@/lib/admin/totp";
import { AUTHORIZED_ADMIN_EMAIL, ADMIN_COOKIE_NAME } from "@/lib/admin/auth";
import { AdminUser } from "@/types/admin";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { adminEmail } = body;

    // 1. Strict Identity Check
    const normalizedAdminEmail = (adminEmail || "").trim().toLowerCase();
    if (normalizedAdminEmail !== AUTHORIZED_ADMIN_EMAIL.toLowerCase()) {
      return NextResponse.json(
        { success: false, error: "Access Denied: Only Gaurav Patil can manage Authenticator configuration." },
        { status: 403 }
      );
    }

    // 2. Verify Session or Caller Authority
    const sessionCookie = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
    if (sessionCookie) {
      try {
        const parsed: AdminUser = JSON.parse(decodeURIComponent(sessionCookie));
        if (parsed.email.toLowerCase() !== AUTHORIZED_ADMIN_EMAIL.toLowerCase()) {
          return NextResponse.json(
            { success: false, error: "Unauthorized session credentials." },
            { status: 401 }
          );
        }
      } catch {
        // Fallback to strict email check
      }
    }

    // 3. Revoke TOTP Secret from Redis and Memory
    await revokeTOTPSecret();

    return NextResponse.json({
      success: true,
      message: "Google Authenticator secret has been revoked. You can now scan a new QR Code to re-pair your device.",
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      { success: false, error: error.message || "Failed to revoke Authenticator secret." },
      { status: 500 }
    );
  }
}
