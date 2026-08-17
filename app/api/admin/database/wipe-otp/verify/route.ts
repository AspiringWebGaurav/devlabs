import { NextRequest, NextResponse } from "next/server";
import { verifySubmittedOTP } from "@/lib/admin/otp";
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

    const body = await request.json().catch(() => ({}));
    const { code, challengeToken } = body;

    const submittedCode = (code || "").trim();
    if (!/^\d{6}$/.test(submittedCode)) {
      return NextResponse.json(
        { success: false, error: "Please enter a valid 6-digit authorization code." },
        { status: 400 }
      );
    }

    const verifyResult = await verifySubmittedOTP(
      AUTHORIZED_ADMIN_EMAIL,
      submittedCode,
      "wipe",
      challengeToken
    );

    if (!verifyResult.success) {
      return NextResponse.json(
        {
          success: false,
          errorCode: verifyResult.errorCode,
          attemptsLeft: verifyResult.attemptsLeft,
          error: verifyResult.error || "Invalid authorization code.",
        },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      verified: true,
      message: "Cryptographic authorization code verified successfully.",
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      { success: false, error: error.message || "Failed to verify authorization code." },
      { status: 500 }
    );
  }
}
