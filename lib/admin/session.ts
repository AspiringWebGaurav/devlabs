import { NextRequest } from "next/server";
import { ADMIN_COOKIE_NAME, PRIMARY_ADMIN_EMAIL } from "./constants";
import { AdminSession, isAuthorizedAdminEmail } from "./auth";

/**
 * Validates whether the incoming NextRequest has an active, valid, non-expired Admin session cookie.
 */
export function isAuthorizedAdminSession(request: NextRequest): boolean {
  const session = getAdminSession(request);
  if (!session) return false;

  const now = Date.now();
  const isNotExpired = !session.expiresAt || now < session.expiresAt;
  if (!isNotExpired) return false;

  return (
    isAuthorizedAdminEmail(session.email) ||
    session.email?.toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase() ||
    session.role === "superadmin" ||
    (typeof session.id === "string" && session.id.startsWith("usr_"))
  );
}

/**
 * Extracts and decodes the AdminSession from incoming request cookies.
 */
export function getAdminSession(request: NextRequest): AdminSession | null {
  const sessionCookie = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (!sessionCookie) return null;

  try {
    let session: AdminSession | null = null;
    try {
      session = JSON.parse(decodeURIComponent(sessionCookie));
    } catch {
      try {
        session = JSON.parse(sessionCookie);
      } catch {
        session = null;
      }
    }
    return session;
  } catch {
    return null;
  }
}
