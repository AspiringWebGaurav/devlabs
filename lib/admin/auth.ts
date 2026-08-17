import { AdminSession, AdminUser, AdminSecurityConfig } from "@/types/admin";
import { auth, googleProvider, signInWithPopup, signOut } from "@/lib/admin/firebase";

export const ADMIN_COOKIE_NAME = "admin_session";
export const AUTHORIZED_ADMIN_EMAIL = "gauravpatil9262@gmail.com";
export const AUTHORIZED_ADMIN_HASH = "51244b59576a3a706630b1f136520a35105bfb9bb06b0c064e171cb788549637";

/**
 * Computes SHA-256 hash of a string using Web Cryptography API.
 */
export async function sha256Hex(message: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(message.trim().toLowerCase());
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Authenticates Google Account and validates admin identity before 2FA OTP verification.
 * Does not establish final session until OTP is confirmed.
 */
export async function authenticateWithGooglePreOTP(): Promise<{
  success: boolean;
  googleUser?: {
    email: string;
    name: string;
    avatar: string;
    uid: string;
  };
  error?: string;
}> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const firebaseUser = result.user;
    const userEmail = (firebaseUser.email || "").trim().toLowerCase();

    // Check if the authenticated Google email matches gauravpatil9262@gmail.com
    if (userEmail !== AUTHORIZED_ADMIN_EMAIL.toLowerCase()) {
      await signOut(auth);
      return {
        success: false,
        error: "Access Denied: You are not an admin.",
      };
    }

    return {
      success: true,
      googleUser: {
        email: AUTHORIZED_ADMIN_EMAIL,
        name: firebaseUser.displayName || "Gaurav patil",
        avatar:
          firebaseUser.photoURL ||
          "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
        uid: firebaseUser.uid,
      },
    };
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    console.error("Firebase Auth Pre-OTP Error:", err);

    if (err?.code === "auth/popup-closed-by-user") {
      return {
        success: false,
        error: "Google sign-in popup was cancelled.",
      };
    }

    if (err?.code === "auth/unauthorized-domain") {
      return {
        success: false,
        error: "Domain not authorized in Firebase. Please add this domain under Firebase Console > Authentication > Settings > Authorized domains.",
      };
    }

    if (err?.code === "auth/invalid-api-key" || !process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
      return {
        success: false,
        error: "Firebase API key missing. Please add NEXT_PUBLIC_FIREBASE_* variables in Vercel Project Settings > Environment Variables.",
      };
    }

    if (err?.code === "auth/popup-blocked") {
      return {
        success: false,
        error: "Google sign-in popup was blocked by browser. Please enable popups for this site.",
      };
    }

    return {
      success: false,
      error: err?.message || "Google authentication handshake failed. Please try again.",
    };
  }
}

/**
 * Genuine Firebase Google Authentication with Popup.
 * Strictly verifies that the authenticated Google account is gauravpatil9262@gmail.com.
 * Rejects all other Google accounts with explicit access denial.
 */
export async function signInWithFirebaseGoogle(): Promise<{
  success: boolean;
  user?: AdminUser;
  error?: string;
}> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const firebaseUser = result.user;
    const userEmail = (firebaseUser.email || "").trim().toLowerCase();

    // Check if the authenticated Google email matches gauravpatil9262@gmail.com
    if (userEmail !== AUTHORIZED_ADMIN_EMAIL.toLowerCase()) {
      // Immediately sign out from Firebase
      await signOut(auth);
      return {
        success: false,
        error: "Access Denied: You are not an admin.",
      };
    }

    const now = Date.now();
    const sessionDurationMs = 8 * 60 * 60 * 1000;

    const adminUser: AdminUser = {
      id: `usr_google_${firebaseUser.uid}`,
      email: AUTHORIZED_ADMIN_EMAIL,
      name: firebaseUser.displayName || "Gaurav",
      role: "superadmin",
      avatar:
        firebaseUser.photoURL ||
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      issuedAt: now,
      expiresAt: now + sessionDurationMs,
      lastActiveAt: now,
    };

    // Save session in localStorage and cookie
    setClientAdminSession(adminUser);

    return {
      success: true,
      user: adminUser,
    };
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    console.error("Firebase Auth Error:", err);

    if (err?.code === "auth/popup-closed-by-user") {
      return {
        success: false,
        error: "Google sign-in popup was closed before completing authentication.",
      };
    }
    if (err?.code === "auth/cancelled-popup-request") {
      return {
        success: false,
        error: "Sign-in popup request was cancelled.",
      };
    }
    if (err?.code === "auth/unauthorized-domain") {
      return {
        success: false,
        error: "Firebase domain unauthorized. Add 'localhost' to Firebase Console -> Authentication -> Settings -> Authorized Domains.",
      };
    }
    if (err?.code === "auth/operation-not-allowed" || err?.code === "auth/internal-error") {
      return {
        success: false,
        error: "Firebase Google Provider is not enabled in Firebase Console. Enable 'Google' under Firebase Console -> Authentication -> Sign-in method, or add localhost to Authorized Domains.",
      };
    }
    return {
      success: false,
      error: err?.message || "Firebase Google Authentication failed.",
    };
  }
}

/**
 * Helper to extract a cookie value on the client side.
 */
function getClientCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(^|;\\s*)" + name + "=([^;]*)"));
  return match ? decodeURIComponent(match[2]) : null;
}

/**
 * Checks client-side localStorage / cookie session for quick reactive UI updates.
 * Features dual-storage fallback and self-healing to prevent loader loops across browser sessions.
 */
export function getClientAdminSession(): AdminSession {
  if (typeof window === "undefined") {
    return { user: null, isAuthenticated: false };
  }

  try {
    let raw = localStorage.getItem(ADMIN_COOKIE_NAME);
    const cookieRaw = getClientCookie(ADMIN_COOKIE_NAME);

    // If localStorage is empty but cookie exists, auto-heal localStorage
    if (!raw && cookieRaw) {
      raw = cookieRaw;
      try {
        localStorage.setItem(ADMIN_COOKIE_NAME, cookieRaw);
      } catch {
        // Ignore storage error
      }
    }

    // If cookie is missing but localStorage exists, auto-heal cookie
    if (raw && !cookieRaw) {
      try {
        document.cookie = `${ADMIN_COOKIE_NAME}=${encodeURIComponent(raw)}; path=/; max-age=28800; SameSite=Lax`;
      } catch {
        // Ignore cookie error
      }
    }

    if (!raw) return { user: null, isAuthenticated: false };

    const parsed: AdminUser = JSON.parse(raw);
    const now = Date.now();

    // Check email identity
    const isCorrectAdmin =
      parsed &&
      parsed.email &&
      parsed.email.trim().toLowerCase() === AUTHORIZED_ADMIN_EMAIL.toLowerCase();

    // Check expiration timestamp
    if (parsed.expiresAt && now > parsed.expiresAt) {
      clearClientAdminSession();
      return { user: null, isAuthenticated: false };
    }

    if (isCorrectAdmin) {
      return {
        user: parsed,
        isAuthenticated: true,
        token: "tok_" + btoa(parsed.email),
        expiresInMs: parsed.expiresAt ? Math.max(0, parsed.expiresAt - now) : 8 * 3600 * 1000,
      };
    }
  } catch {
    // Ignore parse error
  }

  return { user: null, isAuthenticated: false };
}

/**
 * Saves client-side session upon successful encrypted login.
 */
export function setClientAdminSession(user: AdminUser, sessionHours = 8) {
  if (typeof window === "undefined") return;

  const now = Date.now();
  const maxAgeSeconds = sessionHours * 3600;
  const userWithTimestamp: AdminUser = {
    ...user,
    issuedAt: user.issuedAt || now,
    expiresAt: user.expiresAt || now + maxAgeSeconds * 1000,
    lastActiveAt: now,
  };

  localStorage.setItem(ADMIN_COOKIE_NAME, JSON.stringify(userWithTimestamp));
  document.cookie = `${ADMIN_COOKIE_NAME}=${encodeURIComponent(
    JSON.stringify(userWithTimestamp)
  )}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax`;
}

/**
 * Updates the last active timestamp to prevent background inactivity timeouts.
 */
export function touchAdminSession() {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(ADMIN_COOKIE_NAME);
    if (!raw) return;
    const parsed: AdminUser = JSON.parse(raw);
    parsed.lastActiveAt = Date.now();
    localStorage.setItem(ADMIN_COOKIE_NAME, JSON.stringify(parsed));
  } catch {
    // Ignore
  }
}

/**
 * Clears client-side admin session and signs out of Firebase on logout.
 */
export async function clearClientAdminSession(): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    if (auth && typeof signOut === "function") {
      await signOut(auth).catch(() => {});
    }
  } catch {
    // Ignore any client auth signout errors
  }

  try {
    localStorage.removeItem(ADMIN_COOKIE_NAME);
    sessionStorage.clear();
  } catch {
    // Ignore storage errors
  }

  // Clear cookie completely across all paths
  document.cookie = `${ADMIN_COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
  document.cookie = `${ADMIN_COOKIE_NAME}=; path=/admin; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
}

const DEFAULT_SECURITY_CONFIG: AdminSecurityConfig = {
  requireEmailOtp: true,
  requireTotp: false,
  wipeOtpRequired: true,
};

// Global memory cache for fast refresh
const globalForSecurity = globalThis as unknown as {
  __admin_security_config?: AdminSecurityConfig;
};

/**
 * Retrieves the global admin security & 2FA configuration.
 */
export async function getAdminSecurityConfig(): Promise<AdminSecurityConfig> {
  const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/$/, "");
  const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (REDIS_URL && REDIS_TOKEN) {
    try {
      const res = await fetch(`${REDIS_URL}/get/admin_security_config`, {
        headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
        cache: "no-store",
      });
      if (res.ok) {
        const json = await res.json();
        if (json.result) {
          const parsed = typeof json.result === "string" ? JSON.parse(json.result) : json.result;
          const resolved: AdminSecurityConfig = {
            ...DEFAULT_SECURITY_CONFIG,
            ...parsed,
          };
          globalForSecurity.__admin_security_config = resolved;
          return resolved;
        }
      }
    } catch {
      // Fallback
    }
  }

  return globalForSecurity.__admin_security_config || DEFAULT_SECURITY_CONFIG;
}

/**
 * Saves and updates the global admin security & 2FA configuration.
 */
export async function saveAdminSecurityConfig(
  updates: Partial<AdminSecurityConfig>
): Promise<AdminSecurityConfig> {
  const current = await getAdminSecurityConfig();
  const updated: AdminSecurityConfig = {
    ...current,
    ...updates,
    updatedAt: Date.now(),
  };

  globalForSecurity.__admin_security_config = updated;

  const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/$/, "");
  const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (REDIS_URL && REDIS_TOKEN) {
    try {
      await fetch(
        `${REDIS_URL}/set/admin_security_config/${encodeURIComponent(JSON.stringify(updated))}`,
        {
          headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
        }
      );
    } catch {
      // Ignore
    }
  }

  return updated;
}

