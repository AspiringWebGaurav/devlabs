import {
  ADMIN_COOKIE_NAME,
  PRIMARY_ADMIN_EMAIL,
  PRIMARY_ADMIN_NAME,
  PRIMARY_ADMIN_ROLE,
  ADMIN_SESSION_TTL_MS,
  ADMIN_SESSION_MAX_AGE_SECONDS,
} from "./constants";

export interface AdminSession {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar?: string;
  loggedInAt: number;
  expiresAt: number;
}

/**
 * Validates whether the given email strictly matches the authorized admin identity (gauravpatil5737).
 */
export function isAuthorizedAdminEmail(email?: string | null): boolean {
  if (!email || typeof email !== "string") return false;
  const cleanEmail = email.trim().toLowerCase();
  const configuredEmail = (process.env.ADMIN_EMAIL || PRIMARY_ADMIN_EMAIL).trim().toLowerCase();
  return cleanEmail === configuredEmail || cleanEmail === PRIMARY_ADMIN_EMAIL.toLowerCase();
}

/**
 * Creates a structured session payload for the authenticated superadmin with configurable 5-hour TTL.
 */
export function createAdminSessionPayload(
  email: string,
  avatar?: string,
  name?: string
): AdminSession {
  const now = Date.now();
  return {
    id: "usr_admin_gaurav",
    email: email.trim().toLowerCase(),
    name: name?.trim() || PRIMARY_ADMIN_NAME,
    role: PRIMARY_ADMIN_ROLE,
    avatar: avatar || undefined,
    loggedInAt: now,
    expiresAt: now + ADMIN_SESSION_TTL_MS,
  };
}

/**
 * Client-Side Helper: Sets the admin_session cookie with the centralized TTL.
 */
export function setClientAdminSession(session: AdminSession): void {
  if (typeof document === "undefined") return;
  const serialized = encodeURIComponent(JSON.stringify(session));
  const maxAge = ADMIN_SESSION_MAX_AGE_SECONDS;
  const isSecure = typeof window !== "undefined" && window.location.protocol === "https:";
  document.cookie = `${ADMIN_COOKIE_NAME}=${serialized}; path=/; max-age=${maxAge}; SameSite=Lax${
    isSecure ? "; Secure" : ""
  }`;
}

/**
 * Client-Side Helper: Retrieves and parses the admin session from cookies.
 */
export function getClientAdminSession(): AdminSession | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${ADMIN_COOKIE_NAME}=`));
  if (!match) return null;
  try {
    const raw = decodeURIComponent(match.split("=")[1]);
    return JSON.parse(raw) as AdminSession;
  } catch {
    return null;
  }
}

/**
 * Client-Side Helper: Clears the admin session cookie.
 */
export function clearClientAdminSession(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${ADMIN_COOKIE_NAME}=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
}
