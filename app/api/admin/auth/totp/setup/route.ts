import { NextRequest, NextResponse } from "next/server";
import {
  generateTOTPSecret,
  getTOTPAuthUri,
  generateQRCodeDataURL,
  getStoredTOTPSecret,
  TOTP_APP_NAME,
  TOTP_ADMIN_USER,
} from "@/lib/admin/totp";
import { AUTHORIZED_ADMIN_EMAIL } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { adminEmail } = body;

    const normalizedAdminEmail = (adminEmail || "").trim().toLowerCase();
    if (normalizedAdminEmail !== AUTHORIZED_ADMIN_EMAIL.toLowerCase()) {
      return NextResponse.json(
        { success: false, error: "Access Denied: You are not an admin." },
        { status: 403 }
      );
    }

    // Security Gate: Check if TOTP is already registered and locked
    const existingSecret = await getStoredTOTPSecret();
    if (existingSecret) {
      return NextResponse.json(
        {
          success: false,
          error: "Authenticator is already registered and locked. Re-pairing is disabled for security.",
        },
        { status: 403 }
      );
    }

    // Generate fresh secret and QR Code for first-time registration only
    const secret = generateTOTPSecret();
    const uri = getTOTPAuthUri(secret);
    const qrCodeDataUrl = await generateQRCodeDataURL(uri);

    return NextResponse.json({
      success: true,
      secret,
      uri,
      qrCodeDataUrl,
      appName: TOTP_APP_NAME,
      account: TOTP_ADMIN_USER,
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      { success: false, error: error.message || "Failed to generate TOTP setup QR code." },
      { status: 500 }
    );
  }
}
