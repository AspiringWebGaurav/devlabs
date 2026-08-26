import { NextRequest } from "next/server";
import { ADMIN_COOKIE_NAME } from "./constants";
import { AdminSession, verifyAdminSession } from "./auth";

/**
 * Validates whether the incoming NextRequest has an active, valid, cryptographically signed Admin session cookie.
 */
export async function isAuthorizedAdminSession(request: NextRequest): Promise<boolean> {
  const session = await getAdminSession(request);
  return session !== null;
}

/**
 * Extracts and cryptographically verifies the AdminSession from incoming request cookies.
 * Returns null if the session is absent, forged, unsigned, expired, or unauthorized.
 */
export async function getAdminSession(request: NextRequest): Promise<AdminSession | null> {
  const sessionCookie = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (!sessionCookie) return null;
  return await verifyAdminSession(sessionCookie);
}
