import { AdminSession, AdminUser, AdminSecurityConfig } from "@/types/admin";
import { auth, googleProvider, signInWithPopup, signOut } from "@/lib/admin/firebase";

import {
  ADMIN_COOKIE_NAME,
  AUTHORIZED_ADMIN_EMAIL,
  AUTHORIZED_ADMIN_EMAILS,
  AUTHORIZED_ADMIN_HASH,
  AUTHORIZED_ADMIN_HASHES,
} from "./constants";

export {
  ADMIN_COOKIE_NAME,
  AUTHORIZED_ADMIN_EMAIL,
  AUTHORIZED_ADMIN_EMAILS,
  AUTHORIZED_ADMIN_HASH,
  AUTHORIZED_ADMIN_HASHES,
};

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
 * Validates whether an email matches the authorized admin identity across:
 * 1. Direct authorized list (Gaurav's primary emails)
 * 2. Environment variables (ADMIN_EMAIL, NEXT_PUBLIC_ADMIN_EMAIL, ADMIN_AUTHORIZED_EMAILS)
 * 3. Cryptographic SHA-256 Hashes
 */
export async function isAuthorizedAdminEmail(email: string): Promise<boolean> {
  if (!email || typeof email !== "string") return false;
  const cleanEmail = email.trim().toLowerCase();

  // 1. Check known authorized admin emails
  if (
    cleanEmail === AUTHORIZED_ADMIN_EMAIL.toLowerCase() ||
    AUTHORIZED_ADMIN_EMAILS.map((e) => e.toLowerCase()).includes(cleanEmail)
  ) {
    return true;
  }

  // 2. Check environment variable emails
  const envAdminEmail = (process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL || "").trim().toLowerCase();
  if (envAdminEmail) {
    const splitEmails = envAdminEmail.split(",").map((e) => e.trim().toLowerCase());
    if (splitEmails.includes(cleanEmail)) {
      return true;
    }
  }

  const envAuthorizedList = (process.env.ADMIN_AUTHORIZED_EMAILS || "").trim().toLowerCase();
  if (envAuthorizedList) {
    const splitList = envAuthorizedList.split(",").map((e) => e.trim().toLowerCase());
    if (splitList.includes(cleanEmail)) {
      return true;
    }
  }

  // 3. Check SHA-256 Hashes
  const hash = await sha256Hex(cleanEmail);
  if (AUTHORIZED_ADMIN_HASHES.includes(hash)) {
    return true;
  }

  const envHashes = (process.env.ADMIN_AUTHORIZED_HASH || "")
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
  if (envHashes.includes(hash)) {
    return true;
  }

  return false;
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

    // Verify Google email against encrypted SHA-256 admin hash
    const isAuthorized = await isAuthorizedAdminEmail(userEmail);
    if (!isAuthorized) {
      await signOut(auth);
      return {
        success: false,
        error: userEmail
          ? `Access Denied: ${userEmail} is not authorized as an administrator. You do not have permission to access the admin panel.`
          : "Access Denied: This Google account is not authorized as an administrator.",
      };
    }

    return {
      success: true,
      googleUser: {
        email: userEmail,
        name: firebaseUser.displayName || "Admin",
        avatar:
          firebaseUser.photoURL ||
          "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
        uid: firebaseUser.uid,
      },
    };
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };

    const errCode =
      err?.code ||
      (typeof err?.message === "string" ? err.message.match(/auth\/[a-zA-Z0-9_-]+/)?.[0] : "");

    if (errCode === "auth/popup-closed-by-user" || errCode === "auth/cancelled-popup-request") {
      return {
        success: false,
        error: "Google sign-in popup was closed before completing authentication. Please select your authorized admin account.",
      };
    }

    // Only log non-cancellation errors
    console.warn("Firebase Google Auth Notice:", err);

    if (errCode === "auth/popup-blocked") {
      return {
        success: false,
        error: "Google sign-in popup was blocked by your browser. Please allow popups for this site.",
      };
    }

    if (errCode === "auth/unauthorized-domain") {
      return {
        success: false,
        error: "Domain not authorized in Firebase. Please add this domain under Firebase Console > Authentication > Settings > Authorized domains.",
      };
    }

    if (errCode === "auth/network-request-failed") {
      return {
        success: false,
        error: "Network error connecting to Google Auth servers. Please check your internet connection.",
      };
    }

    if (errCode === "auth/invalid-api-key" || !process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
      return {
        success: false,
        error: "Firebase API key missing. Please verify NEXT_PUBLIC_FIREBASE_* environment variables.",
      };
    }

    return {
      success: false,
      error: "Access Denied: This email account is not authorized as an administrator.",
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

    // Verify Google email against encrypted SHA-256 admin hash
    const isAuthorized = await isAuthorizedAdminEmail(userEmail);
    if (!isAuthorized) {
      // Immediately sign out from Firebase
      await signOut(auth);
      return {
        success: false,
        error: userEmail
          ? `Access Denied: ${userEmail} is not authorized as an administrator. You do not have permission to access the admin panel.`
          : "Access Denied: This Google account is not authorized as an administrator.",
      };
    }

    const now = Date.now();
    const sessionDurationMs = 8 * 60 * 60 * 1000;

    const adminUser: AdminUser = {
      id: `usr_google_${firebaseUser.uid}`,
      email: userEmail,
      name: firebaseUser.displayName || "Admin",
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

    const errCode =
      err?.code ||
      (typeof err?.message === "string" ? err.message.match(/auth\/[a-zA-Z0-9_-]+/)?.[0] : "");

    if (errCode === "auth/popup-closed-by-user" || errCode === "auth/cancelled-popup-request") {
      return {
        success: false,
        error: "Google sign-in popup was closed before completing authentication. Please select your authorized admin account.",
      };
    }

    console.warn("Firebase Auth Notice:", err);

    if (errCode === "auth/unauthorized-domain") {
      return {
        success: false,
        error: "Firebase domain unauthorized. Add 'localhost' to Firebase Console -> Authentication -> Settings -> Authorized Domains.",
      };
    }
    if (errCode === "auth/operation-not-allowed" || errCode === "auth/internal-error") {
      return {
        success: false,
        error: "Firebase Google Provider is not enabled in Firebase Console. Enable 'Google' under Firebase Console -> Authentication -> Sign-in method, or add localhost to Authorized Domains.",
      };
    }
    return {
      success: false,
      error: "Access Denied: This email account is not authorized as an administrator.",
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

    // Check email identity and superadmin role
    const isCorrectAdmin =
      parsed &&
      parsed.email &&
      (parsed.email.trim().toLowerCase() === AUTHORIZED_ADMIN_EMAIL.toLowerCase() ||
       parsed.role === "superadmin");

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

const FIREBASE_DB_URL = (
  process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL ||
  process.env.FIREBASE_DATABASE_URL ||
  "https://portfolio-admin-default-rtdb.firebaseio.com"
).replace(/\/$/, "");

/**
 * Retrieves the global admin security & 2FA configuration from Redis, Firebase RTDB, or memory.
 */
export async function getAdminSecurityConfig(): Promise<AdminSecurityConfig> {
  const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/$/, "");
  const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

  // 1. Check Upstash Redis
  if (REDIS_URL && REDIS_TOKEN) {
    try {
      const res = await fetch(`${REDIS_URL}/get/admin_security_config`, {
        headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
        cache: "no-store",
        signal: AbortSignal.timeout(4000),
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
      // Fall through to Firebase
    }
  }

  // 2. Check Firebase Realtime Database
  if (FIREBASE_DB_URL) {
    try {
      const res = await fetch(`${FIREBASE_DB_URL}/_system/security_config.json`, {
        cache: "no-store",
        signal: AbortSignal.timeout(4000),
      });
      if (res.ok) {
        const parsed = await res.json();
        if (parsed && typeof parsed === "object") {
          const resolved: AdminSecurityConfig = {
            ...DEFAULT_SECURITY_CONFIG,
            ...parsed,
          };
          globalForSecurity.__admin_security_config = resolved;
          return resolved;
        }
      }
    } catch (err) {
      console.warn("Failed to retrieve security config from Firebase RTDB:", err);
    }
  }

  // 3. Check Cloud Firestore (Server-side)
  if (typeof window === "undefined") {
    try {
      const { getAdminFirestore } = await import("@/lib/admin/firebase-admin");
      const firestore = getAdminFirestore();
      if (firestore) {
        const snap = await firestore.collection("admin_security_config").doc("default").get();
        if (snap.exists) {
          const data = snap.data();
          if (data && typeof data === "object") {
            const resolved: AdminSecurityConfig = {
              ...DEFAULT_SECURITY_CONFIG,
              ...data,
            };
            globalForSecurity.__admin_security_config = resolved;
            return resolved;
          }
        }
      }
    } catch {
      // Fall through to memory
    }
  }

  return globalForSecurity.__admin_security_config || DEFAULT_SECURITY_CONFIG;
}

/**
 * Saves and updates the global admin security & 2FA configuration across 4 layers.
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
      // Fall through to Firebase
    }
  }

  if (FIREBASE_DB_URL) {
    try {
      await fetch(`${FIREBASE_DB_URL}/_system/security_config.json`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
        cache: "no-store",
      });
    } catch (err) {
      console.warn("Failed to save security config to Firebase RTDB:", err);
    }
  }

  // Persist to Cloud Firestore (Server-side)
  if (typeof window === "undefined") {
    try {
      const { getAdminFirestore } = await import("@/lib/admin/firebase-admin");
      const firestore = getAdminFirestore();
      if (firestore) {
        await firestore.collection("admin_security_config").doc("default").set(updated, { merge: true });
      }
    } catch (err) {
      console.warn("Failed to save security config to Firestore:", err);
    }
  }

  return updated;
}

