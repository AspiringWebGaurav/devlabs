import { NextRequest } from "next/server";
import { ADMIN_COOKIE_NAME, AUTHORIZED_ADMIN_EMAIL } from "./auth";

/**
 * Validates whether the incoming NextRequest has an active, valid, non-expired Admin session cookie.
 */
export function isAuthorizedAdminSession(request: NextRequest): boolean {
  const sessionCookie = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (!sessionCookie) return false;

  try {
    let session: { email?: string; role?: string; id?: string; expiresAt?: number } | null = null;
    try {
      session = JSON.parse(decodeURIComponent(sessionCookie));
    } catch {
      try {
        session = JSON.parse(sessionCookie);
      } catch {
        session = null;
      }
    }

    if (!session) return false;

    const now = Date.now();
    const isNotExpired = !session.expiresAt || now < session.expiresAt;
    if (!isNotExpired) return false;

    const email = (session.email || "").trim().toLowerCase();
    const isValidRole = session.role === "superadmin" || session.role === "admin";
    const hasAdminId = typeof session.id === "string" && session.id.startsWith("usr_");

    if (
      email === AUTHORIZED_ADMIN_EMAIL.toLowerCase() ||
      isValidRole ||
      hasAdminId
    ) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}
