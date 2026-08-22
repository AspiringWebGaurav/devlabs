import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isAuthorizedAdminEmail, createAdminSessionPayload } from "@/lib/admin/auth";
import { ADMIN_COOKIE_NAME } from "@/lib/admin/constants";

export const dynamic = "force-dynamic";

const LoginSchema = z.object({
  email: z.string().email("A valid email is required."),
  avatar: z.string().url().optional(),
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

    const { email, avatar } = parsed.data;

    // Strict identity check: only gauravpatil9262 is permitted
    if (!isAuthorizedAdminEmail(email)) {
      return NextResponse.json(
        {
          success: false,
          error: "Access Denied: You are not authorized to access this administrator console.",
        },
        { status: 403 }
      );
    }

    // Create session payload
    const session = createAdminSessionPayload(email, avatar);
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
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      httpOnly: false, // Accessible by client session state machine
      sameSite: "lax",
      secure: isSecure,
    });

    return response;
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process admin authentication." },
      { status: 500 }
    );
  }
}
