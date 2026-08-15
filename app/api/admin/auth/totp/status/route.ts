import { NextRequest, NextResponse } from "next/server";
import { getStoredTOTPSecret } from "@/lib/admin/totp";
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

    const secret = await getStoredTOTPSecret();
    return NextResponse.json({
      success: true,
      isConfigured: !!secret,
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      { success: false, error: error.message || "Failed to check TOTP status." },
      { status: 500 }
    );
  }
}
