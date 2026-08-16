import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { purgeEntireDatabase } from "@/lib/admin/database";
import { ADMIN_COOKIE_NAME, AUTHORIZED_ADMIN_EMAIL } from "@/lib/admin/auth";
import { verifySubmittedOTP } from "@/lib/admin/otp";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    // 1. Verify Admin Session Cookie
    const sessionCookie = request.cookies.get(ADMIN_COOKIE_NAME);
    if (!sessionCookie || !sessionCookie.value) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Admin session required." },
        { status: 401 }
      );
    }

    const session = JSON.parse(decodeURIComponent(sessionCookie.value));
    if (!session || session.email?.trim().toLowerCase() !== AUTHORIZED_ADMIN_EMAIL.toLowerCase()) {
      return NextResponse.json(
        { success: false, error: `Forbidden: Only ${AUTHORIZED_ADMIN_EMAIL} is authorized.` },
        { status: 403 }
      );
    }

    // 2. Parse payload & verify OTP
    const body = await request.json().catch(() => ({}));
    const { otpCode, preserveAuth } = body;

    if (!otpCode || typeof otpCode !== "string" || otpCode.trim().length !== 6) {
      return NextResponse.json(
        { success: false, error: "Please enter the 6-digit authorization code sent to your email." },
        { status: 400 }
      );
    }

    const otpValidation = await verifySubmittedOTP(AUTHORIZED_ADMIN_EMAIL, otpCode, "wipe");
    if (!otpValidation.success) {
      return NextResponse.json(
        {
          success: false,
          error: otpValidation.error || "Invalid or expired authorization code.",
          errorCode: otpValidation.errorCode,
          attemptsLeft: otpValidation.attemptsLeft,
        },
        { status: 401 }
      );
    }

    // 3. Database Purge via Firebase Admin SDK (Service Account Key)
    const purgeResult = await purgeEntireDatabase({
      preserveAuth: preserveAuth !== false,
    });

    // 4. Clear Next.js Caches and Revalidate All Routes
    try {
      revalidatePath("/", "layout");
      revalidatePath("/blog", "layout");
      revalidatePath("/admin", "layout");
    } catch {
      // Ignore in dev
    }

    return NextResponse.json({
      success: true,
      message:
        preserveAuth !== false
          ? "Database successfully wiped to 0 documents. Admin authentication and 2FA session preserved."
          : "Total nuclear purge executed. All database documents wiped to 0.",
      purgedAt: purgeResult.purgedAt,
      authPreserved: preserveAuth !== false,
    });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      { success: false, error: err.message || "Failed to purge database." },
      { status: 500 }
    );
  }
}
