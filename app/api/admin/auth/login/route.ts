import { NextRequest, NextResponse } from "next/server";
import { PRIMARY_ADMIN_EMAIL } from "@/lib/admin/constants";

export const dynamic = "force-dynamic";

/**
 * Legacy Login Endpoint Guard
 *
 * Security Mandate: Direct unauthenticated session minting is strictly disabled.
 * The production-authoritative authentication flow requires:
 * 1. Google OAuth 2.0 PKCE (/api/admin/auth/google -> /api/admin/auth/callback)
 * 2. Two-Factor OTP Verification (/api/admin/auth/otp/verify)
 */
export async function POST(request: NextRequest) {
  // Allow strictly in local development when verified with the internal secret header
  const internalSecret = request.headers.get("x-admin-internal-secret");
  const configuredSecret = process.env.ADMIN_SESSION_SECRET;

  if (
    process.env.NODE_ENV === "development" &&
    configuredSecret &&
    internalSecret === configuredSecret
  ) {
    const { isAuthorizedAdminEmail, createAdminSessionPayload, signAdminSession } = await import(
      "@/lib/admin/auth"
    );
    const { ADMIN_COOKIE_NAME, ADMIN_SESSION_MAX_AGE_SECONDS } = await import(
      "@/lib/admin/constants"
    );

    const body = await request.json().catch(() => null);
    const email = body?.email;

    if (!isAuthorizedAdminEmail(email)) {
      return NextResponse.json(
        {
          success: false,
          error: `Access Denied: The account "${email}" is not authorized. Access is strictly restricted to primary superadmin (${PRIMARY_ADMIN_EMAIL}).`,
        },
        { status: 403 }
      );
    }

    const session = createAdminSessionPayload(email, body?.avatar, body?.name);
    const signedToken = await signAdminSession(session);

    const response = NextResponse.json({
      success: true,
      user: {
        id: session.id,
        email: session.email,
        name: session.name,
        role: session.role,
        avatar: session.avatar,
      },
    });

    response.cookies.set({
      name: ADMIN_COOKIE_NAME,
      value: signedToken,
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
      path: "/",
    });

    return response;
  }

  return NextResponse.json(
    {
      success: false,
      error:
        "Direct session minting is disabled. Administrative sign-in requires Google OAuth 2.0 PKCE and two-factor OTP verification.",
    },
    { status: 403 }
  );
}
