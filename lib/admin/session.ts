import { NextRequest } from "next/server";
import { ADMIN_COOKIE_NAME, AUTHORIZED_ADMIN_EMAIL } from "./auth";

/**
 * Validates whether the incoming NextRequest has an active, valid, non-expired Admin session cookie.
 */
export function isAuthorizedAdminSession(request: NextRequest): boolean {
  const sessionCookie = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (!sessionCookie) return false;

  try {
    let session: { email?: string; expiresAt?: number } | null = null;
    try {
      session = JSON.parse(decodeURIComponent(sessionCookie));
    } catch {
      try {
        session = JSON.parse(sessionCookie);
      } catch {
        session = null;
      }
    }

    if (!session || !session.email) return false;

    const isCorrectEmail =
      session.email.trim().toLowerCase() === AUTHORIZED_ADMIN_EMAIL.toLowerCase();
    const isNotExpired = !session.expiresAt || Date.now() < session.expiresAt;

    return isCorrectEmail && isNotExpired;
  } catch {
    return false;
  }
}
