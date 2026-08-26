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

const SESSION_SECRET =
  process.env.ADMIN_SESSION_SECRET ||
  process.env.FIREBASE_ADMIN_PRIVATE_KEY ||
  "gaurav_portfolio_superadmin_session_secret_2026";

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

function toB64Url(buf: ArrayBuffer | Uint8Array): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromB64Url(base64url: string): Uint8Array {
  let base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Cryptographically signs an AdminSession payload using HMAC-SHA256 via Web Crypto API.
 * Portable across Node.js and Next.js Edge Runtime.
 * Format: <base64url-payload>.<base64url-signature>
 */
export async function signAdminSession(session: AdminSession): Promise<string> {
  const enc = new TextEncoder();
  const payloadJson = JSON.stringify(session);
  const payloadB64 = toB64Url(enc.encode(payloadJson));

  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(SESSION_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const sigBuf = await crypto.subtle.sign("HMAC", key, enc.encode(payloadB64));
  const sigB64 = toB64Url(sigBuf);

  return `${payloadB64}.${sigB64}`;
}

/**
 * Cryptographically verifies and extracts an AdminSession from a signed token string via Web Crypto API.
 * Uses timing-safe constant-time verification.
 * Strictly rejects forged, unsigned, tampered, or expired tokens.
 */
export async function verifyAdminSession(token?: string | null): Promise<AdminSession | null> {
  if (!token || typeof token !== "string") return null;

  let cleanToken = token.trim();
  try {
    cleanToken = decodeURIComponent(cleanToken);
  } catch {
    // Keep as-is
  }

  const dotIndex = cleanToken.lastIndexOf(".");
  if (dotIndex === -1) {
    // Missing signature (unsigned / forged)
    return null;
  }

  const payloadB64 = cleanToken.slice(0, dotIndex);
  const sigB64 = cleanToken.slice(dotIndex + 1);

  if (!payloadB64 || !sigB64) return null;

  try {
    const enc = new TextEncoder();
    const dec = new TextDecoder();

    const key = await crypto.subtle.importKey(
      "raw",
      enc.encode(SESSION_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const sigBytes = fromB64Url(sigB64);
    const isValid = await crypto.subtle.verify(
      "HMAC",
      key,
      sigBytes as unknown as BufferSource,
      enc.encode(payloadB64) as unknown as BufferSource
    );

    if (!isValid) {
      return null;
    }

    const jsonStr = dec.decode(fromB64Url(payloadB64));
    const session = JSON.parse(jsonStr) as AdminSession;
    const now = Date.now();

    if (session.expiresAt && now >= session.expiresAt) {
      return null;
    }

    if (!isAuthorizedAdminEmail(session.email)) {
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

/**
 * Client-Side Helper: Sets the admin_session cookie with the centralized TTL.
 */
export async function setClientAdminSession(session: AdminSession): Promise<void> {
  if (typeof document === "undefined") return;
  const signed = await signAdminSession(session);
  const maxAge = ADMIN_SESSION_MAX_AGE_SECONDS;
  const isSecure = typeof window !== "undefined" && window.location.protocol === "https:";
  document.cookie = `${ADMIN_COOKIE_NAME}=${signed}; path=/; max-age=${maxAge}; SameSite=Lax${
    isSecure ? "; Secure" : ""
  }`;
}

/**
 * Client-Side Helper: Retrieves and parses the verified admin session from cookies.
 */
export async function getClientAdminSession(): Promise<AdminSession | null> {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${ADMIN_COOKIE_NAME}=`));
  if (!match) return null;
  const raw = match.split("=")[1];
  return await verifyAdminSession(raw);
}

/**
 * Client-Side Helper: Clears the admin session cookie.
 */
export function clearClientAdminSession(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${ADMIN_COOKIE_NAME}=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
}
