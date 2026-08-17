import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, AUTHORIZED_ADMIN_EMAIL } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get(ADMIN_COOKIE_NAME);
    if (!sessionCookie || !sessionCookie.value) {
      return NextResponse.json({ authenticated: false, user: null });
    }

    const parsed = JSON.parse(decodeURIComponent(sessionCookie.value));
    const now = Date.now();

    const isCorrectAdmin =
      parsed &&
      parsed.email &&
      parsed.email.trim().toLowerCase() === AUTHORIZED_ADMIN_EMAIL.toLowerCase();

    const isNotExpired = !parsed.expiresAt || now < parsed.expiresAt;

    if (isCorrectAdmin && isNotExpired) {
      return NextResponse.json({
        authenticated: true,
        user: parsed,
      });
    }

    return NextResponse.json({ authenticated: false, user: null });
  } catch {
    return NextResponse.json({ authenticated: false, user: null });
  }
}
