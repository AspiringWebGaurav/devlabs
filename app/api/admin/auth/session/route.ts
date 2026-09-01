import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, isAuthorizedAdminSession } from "@/lib/admin/session";
import { ADMIN_COOKIE_NAME, ADMIN_OTP_COOKIE_NAME } from "@/lib/admin/constants";
import { getRequestContext } from "@/lib/api/context";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { requestId } = getRequestContext(request);
  const isAuth = await isAuthorizedAdminSession(request);
  if (!isAuth) {
    return NextResponse.json(
      { authenticated: false, expiresAt: null, user: null },
      { status: 401, headers: { "x-request-id": requestId } }
    );
  }

  const session = await getAdminSession(request);
  return NextResponse.json(
    {
      authenticated: true,
      expiresAt: session?.expiresAt || null,
      user: session
        ? {
            id: session.id,
            email: session.email,
            name: session.name,
            role: session.role,
            avatar: session.avatar,
          }
        : null,
    },
    { status: 200, headers: { "x-request-id": requestId } }
  );
}

export async function DELETE(request: NextRequest) {
  const { requestId } = getRequestContext(request);
  const response = NextResponse.json(
    { success: true, message: "Logged out successfully." },
    { status: 200, headers: { "x-request-id": requestId } }
  );

  // Guarantee complete cookie detachment across all path scopes
  response.cookies.delete(ADMIN_COOKIE_NAME);
  response.cookies.delete(ADMIN_OTP_COOKIE_NAME);
  response.cookies.set({
    name: ADMIN_COOKIE_NAME,
    value: "",
    maxAge: 0,
    path: "/",
  });
  response.cookies.set({
    name: ADMIN_OTP_COOKIE_NAME,
    value: "",
    maxAge: 0,
    path: "/",
  });

  return response;
}
