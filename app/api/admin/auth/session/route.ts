import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, isAuthorizedAdminSession } from "@/lib/admin/session";
import { ADMIN_COOKIE_NAME } from "@/lib/admin/constants";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const isAuth = isAuthorizedAdminSession(request);
  if (!isAuth) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const session = getAdminSession(request);
  return NextResponse.json({
    authenticated: true,
    user: session
      ? {
          id: session.id,
          email: session.email,
          name: session.name,
          role: session.role,
          avatar: session.avatar,
        }
      : null,
  });
}

export async function DELETE() {
  const response = NextResponse.json({ success: true, message: "Logged out successfully." });
  response.cookies.delete(ADMIN_COOKIE_NAME);
  return response;
}
