import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isAuthorizedAdminEmail, createAdminSessionPayload } from "@/lib/admin/auth";
import { ADMIN_COOKIE_NAME, PRIMARY_ADMIN_EMAIL, ADMIN_SESSION_MAX_AGE_SECONDS } from "@/lib/admin/constants";

export const dynamic = "force-dynamic";

const LoginSchema = z.object({
  email: z.string().email("A valid email is required."),
  avatar: z.string().url().optional(),
  name: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { success: false, error: "Invalid JSON payload in request." },
        { status: 400 }
      );
    }

    const parsed = LoginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || "Validation failed." },
        { status: 400 }
      );
    }

    const { email, avatar, name } = parsed.data;

    // Strict identity check: only gauravpatil9262 is permitted
    if (!isAuthorizedAdminEmail(email)) {
      return NextResponse.json(
        {
          success: false,
          isUnauthorizedAccount: true,
          unauthorizedEmail: email,
          error: `Access Denied: The account "${email}" is not authorized. Access is strictly restricted to primary superadmin (${PRIMARY_ADMIN_EMAIL}).`,
        },
        { status: 403 }
      );
    }

    // Create session payload with dynamic name and avatar
    const session = createAdminSessionPayload(email, avatar, name);
    const serialized = encodeURIComponent(JSON.stringify(session));

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

    const isSecure = process.env.NODE_ENV === "production";
    response.cookies.set({
      name: ADMIN_COOKIE_NAME,
      value: serialized,
      httpOnly: false, // Accessible to client session utilities
      secure: isSecure,
      sameSite: "lax",
      maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
      path: "/",
    });

    return response;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal authentication error.";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
