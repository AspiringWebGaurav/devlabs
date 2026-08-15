import { AdminSession, AdminUser } from "@/types/admin";
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
 * Checks client-side localStorage / cookie session for quick reactive UI updates.
 * Automatically invalidates expired sessions.
 */
export function getClientAdminSession(): AdminSession {
  if (typeof window === "undefined") {
    return { user: null, isAuthenticated: false };
  }

  try {
    const raw = localStorage.getItem(ADMIN_COOKIE_NAME);
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
    await signOut(auth);
  } catch (err) {
    console.error("Firebase signOut error:", err);
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
