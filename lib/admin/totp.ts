import { generateSecret, generateURI, verifySync } from "otplib";
import QRCode from "qrcode";

export const TOTP_APP_NAME = "Gaurav Portfolio Admin Panel";
export const TOTP_ADMIN_USER = "gauravpatil9262@gmail.com";
export const MAX_TOTP_ATTEMPTS = 5;
export const TOTP_LOCKOUT_MS = 5 * 60 * 1000; // 5 minutes

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/$/, "");
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

// In-memory fallback cache
interface GlobalTotpCache {
  __devlabs_totp_secret?: string;
  __devlabs_totp_attempts?: {
    count: number;
    lockoutUntil?: number;
  };
}

const globalForTotp = globalThis as unknown as GlobalTotpCache;
if (!globalForTotp.__devlabs_totp_attempts) {
  globalForTotp.__devlabs_totp_attempts = { count: 0 };
}

/**
 * Retrieves the currently registered TOTP secret from Redis or memory.
 */
export async function getStoredTOTPSecret(): Promise<string | null> {
  if (process.env.ADMIN_TOTP_SECRET) {
    return process.env.ADMIN_TOTP_SECRET.trim();
  }

  if (REDIS_URL && REDIS_TOKEN) {
    try {
      const res = await fetch(REDIS_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${REDIS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(["GET", `totp_secret_${TOTP_ADMIN_USER}`]),
        cache: "no-store",
      });

      if (res.ok) {
        const json = await res.json();
        if (json.result && typeof json.result === "string" && json.result.trim()) {
          globalForTotp.__devlabs_totp_secret = json.result.trim();
          return json.result.trim();
        }
      }
    } catch (err) {
      console.error("Failed to retrieve TOTP secret from Redis:", err);
    }
  }

  return globalForTotp.__devlabs_totp_secret || null;
}

/**
 * Persists the registered TOTP secret to Redis and memory.
 */
export async function saveTOTPSecret(secret: string): Promise<void> {
  const cleanSecret = secret.trim();
  globalForTotp.__devlabs_totp_secret = cleanSecret;

  if (REDIS_URL && REDIS_TOKEN) {
    try {
      await fetch(REDIS_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${REDIS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(["SET", `totp_secret_${TOTP_ADMIN_USER}`, cleanSecret]),
      });
    } catch (err) {
      console.error("Failed to save TOTP secret to Redis:", err);
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
  const state = globalForTotp.__devlabs_totp_attempts || { count: 0 };
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
  if (!globalForTotp.__devlabs_totp_attempts) {
    globalForTotp.__devlabs_totp_attempts = { count: 0 };
  }

  const state = globalForTotp.__devlabs_totp_attempts;
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
  globalForTotp.__devlabs_totp_attempts = { count: 0 };
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
