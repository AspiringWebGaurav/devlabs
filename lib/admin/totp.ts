import { generateSecret, generateURI, verifySync } from "otplib";
import QRCode from "qrcode";

export const TOTP_APP_NAME = "Gaurav Portfolio Admin Panel";
export const TOTP_ADMIN_USER = "gauravpatil9262@gmail.com";
export const MAX_TOTP_ATTEMPTS = 5;
export const TOTP_LOCKOUT_MS = 5 * 60 * 1000; // 5 minutes

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/$/, "");
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

// In-memory persistent cache
interface GlobalTotpCache {
  __admin_totp_secret?: string;
  __admin_totp_attempts?: {
    count: number;
    lockoutUntil?: number;
  };
}

const globalForTotp = globalThis as unknown as GlobalTotpCache;
if (!globalForTotp.__admin_totp_attempts) {
  globalForTotp.__admin_totp_attempts = { count: 0 };
}

const FIREBASE_DB_URL = (
  process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL ||
  process.env.FIREBASE_DATABASE_URL ||
  "https://portfolio-admin-default-rtdb.firebaseio.com"
).replace(/\/$/, "");

const FB_TOTP_KEY = `totp_${TOTP_ADMIN_USER.replace(/[^a-zA-Z0-9_]/g, "_")}`;

/**
 * Retrieves the currently registered TOTP secret from Redis, Firebase RTDB, or memory.
 */
export async function getStoredTOTPSecret(): Promise<string | null> {
  if (process.env.ADMIN_TOTP_SECRET?.trim()) {
    return process.env.ADMIN_TOTP_SECRET.trim();
  }

  // 1. Check in-memory store
  if (globalForTotp.__admin_totp_secret?.trim()) {
    return globalForTotp.__admin_totp_secret.trim();
  }

  // 2. Check Upstash Redis REST API
  if (REDIS_URL && REDIS_TOKEN) {
    try {
      const res = await fetch(
        `${REDIS_URL}/get/totp_secret_${encodeURIComponent(TOTP_ADMIN_USER)}`,
        {
          headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
          cache: "no-store",
        }
      );

      if (res.ok) {
        const json = await res.json();
        if (json.result && typeof json.result === "string" && json.result.trim()) {
          const secret = json.result.trim();
          globalForTotp.__admin_totp_secret = secret;
          return secret;
        }
      }
    } catch (err) {
      console.warn("Failed to retrieve TOTP secret from Redis:", err);
    }
  }

  // 3. Check Firebase Realtime Database
  if (FIREBASE_DB_URL) {
    try {
      const res = await fetch(`${FIREBASE_DB_URL}/_system/totp/${FB_TOTP_KEY}.json`, {
        cache: "no-store",
      });
      if (res.ok) {
        const secret = await res.json();
        if (secret && typeof secret === "string" && secret.trim()) {
          globalForTotp.__admin_totp_secret = secret.trim();
          return secret.trim();
        }
      }
    } catch (err) {
      console.warn("Failed to retrieve TOTP secret from Firebase RTDB:", err);
    }
  }

  return globalForTotp.__admin_totp_secret || null;
}

/**
 * Persists the registered TOTP secret permanently to Redis, Firebase RTDB, and memory.
 */
export async function saveTOTPSecret(secret: string): Promise<void> {
  const cleanSecret = secret.trim();
  globalForTotp.__admin_totp_secret = cleanSecret;

  if (REDIS_URL && REDIS_TOKEN) {
    try {
      await fetch(
        `${REDIS_URL}/set/totp_secret_${encodeURIComponent(
          TOTP_ADMIN_USER
        )}/${encodeURIComponent(cleanSecret)}`,
        {
          headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
        }
      );
    } catch (err) {
      console.warn("Failed to save TOTP secret to Redis:", err);
    }
  }

  if (FIREBASE_DB_URL) {
    try {
      await fetch(`${FIREBASE_DB_URL}/_system/totp/${FB_TOTP_KEY}.json`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cleanSecret),
        cache: "no-store",
      });
    } catch (err) {
      console.warn("Failed to save TOTP secret to Firebase RTDB:", err);
    }
  }
}

/**
 * Revokes the registered TOTP secret from Redis, Firebase RTDB, and memory (for admin re-pairing).
 */
export async function revokeTOTPSecret(): Promise<void> {
  globalForTotp.__admin_totp_secret = undefined;

  if (REDIS_URL && REDIS_TOKEN) {
    try {
      await fetch(
        `${REDIS_URL}/del/totp_secret_${encodeURIComponent(TOTP_ADMIN_USER)}`,
        {
          headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
        }
      );
    } catch (err) {
      console.warn("Failed to revoke TOTP secret from Redis:", err);
    }
  }

  if (FIREBASE_DB_URL) {
    try {
      await fetch(`${FIREBASE_DB_URL}/_system/totp/${FB_TOTP_KEY}.json`, {
        method: "DELETE",
        cache: "no-store",
      });
    } catch (err) {
      console.warn("Failed to delete TOTP secret from Firebase RTDB:", err);
    }
  }
}

/**
 * Checks TOTP attempt status and lockout.
 */
export function checkTOTPAttemptStatus(): {
  isLockedOut: boolean;
  attemptsLeft: number;
  lockTimeRemainingSeconds: number;
} {
  const state = globalForTotp.__admin_totp_attempts || { count: 0 };
  const now = Date.now();

  if (state.lockoutUntil && state.lockoutUntil > now) {
    return {
      isLockedOut: true,
      attemptsLeft: 0,
      lockTimeRemainingSeconds: Math.ceil((state.lockoutUntil - now) / 1000),
    };
  }

  // If previous lockout expired, reset
  if (state.lockoutUntil && state.lockoutUntil <= now) {
    state.count = 0;
    state.lockoutUntil = undefined;
  }

  const attemptsLeft = Math.max(0, MAX_TOTP_ATTEMPTS - state.count);
  return {
    isLockedOut: false,
    attemptsLeft,
    lockTimeRemainingSeconds: 0,
  };
}

/**
 * Records an invalid TOTP attempt.
 */
export function recordFailedTOTPAttempt(): {
  isLockedOut: boolean;
  attemptsLeft: number;
} {
  if (!globalForTotp.__admin_totp_attempts) {
    globalForTotp.__admin_totp_attempts = { count: 0 };
  }

  const state = globalForTotp.__admin_totp_attempts;
  state.count += 1;

  if (state.count >= MAX_TOTP_ATTEMPTS) {
    state.lockoutUntil = Date.now() + TOTP_LOCKOUT_MS;
    return { isLockedOut: true, attemptsLeft: 0 };
  }

  return {
    isLockedOut: false,
    attemptsLeft: MAX_TOTP_ATTEMPTS - state.count,
  };
}

/**
 * Resets TOTP attempts upon successful validation.
 */
export function resetTOTPAttempts(): void {
  globalForTotp.__admin_totp_attempts = { count: 0 };
}

/**
 * Generates a fresh Base32 cryptographic secret key.
 */
export function generateTOTPSecret(): string {
  return generateSecret();
}

/**
 * Constructs the standard otpauth:// URI.
 */
export function getTOTPAuthUri(secret: string): string {
  return generateURI({
    issuer: TOTP_APP_NAME,
    label: TOTP_ADMIN_USER,
    secret: secret.trim(),
  });
}

/**
 * Generates a crisp, high-resolution QR Code Data URL.
 */
export async function generateQRCodeDataURL(otpauthUri: string): Promise<string> {
  return await QRCode.toDataURL(otpauthUri, {
    errorCorrectionLevel: "H",
    margin: 2,
    scale: 8,
    color: {
      dark: "#000000",
      light: "#FFFFFF",
    },
  });
}

/**
 * Validates a 6-digit TOTP token against the secret key with clock drift tolerance.
 */
export function verifyTOTPToken(token: string, secret: string): boolean {
  try {
    const cleanToken = token.trim().replace(/\s/g, "");
    if (!/^\d{6}$/.test(cleanToken)) return false;

    // verifySync with 60-second clock tolerance (allows +/- 1-2 step drift)
    const result = verifySync({
      token: cleanToken,
      secret: secret.trim(),
      epochTolerance: 60,
    });

    return !!result && result.valid === true;
  } catch (err) {
    console.error("TOTP verification error:", err);
    return false;
  }
}
