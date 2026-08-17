import crypto from "crypto";

export interface StoredOTP {
  hash: string;
  targetEmail: string;
  attemptsLeft: number;
  expiresAt: number; // Unix timestamp in ms
  createdAt: number;
  lastSentAt: number;
  purpose: "login" | "wipe";
}

export type OtpTemplateMode = "login" | "wipe";

// In-memory dual-layer store to survive Next.js fast refresh
const globalForOtp = globalThis as unknown as {
  __admin_otp_store?: Map<string, StoredOTP>;
};

function getOtpStore(): Map<string, StoredOTP> {
  if (!globalForOtp.__admin_otp_store) {
    globalForOtp.__admin_otp_store = new Map<string, StoredOTP>();
  }
  return globalForOtp.__admin_otp_store;
}

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/$/, "");
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

const SERVICE_ID = process.env.NEXT_PUBLIC_EMAILJS_OTP_SERVICE_ID || "";
const TEMPLATE_ID = process.env.NEXT_PUBLIC_EMAILJS_OTP_TEMPLATE_ID || "";
const PUBLIC_KEY = process.env.NEXT_PUBLIC_EMAILJS_OTP_PUBLIC_KEY || "";
const PRIVATE_KEY = process.env.EMAILJS_OTP_PRIVATE_KEY || "";

/**
 * Computes SHA-256 hash for OTP validation.
 */
function hashOtp(code: string): string {
  return crypto.createHash("sha256").update(code.trim()).digest("hex");
}

/**
 * Generates an unbiased, cryptographically secure 6-digit numeric OTP.
 */
export function generateCryptographicOTP(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

/**
 * Dispatches dynamic OTP email via EmailJS REST API.
 * Supports dual distinct modes (Login 2FA - Purple vs Database Wipe - Red Danger).
 */
export async function sendDynamicOtpEmail(params: {
  toEmail: string;
  otpCode: string;
  mode: OtpTemplateMode;
  toName?: string;
}): Promise<{ success: boolean; error?: string }> {
  const timestamp =
    new Date().toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Kolkata",
    }) + " IST";

  const isWipe = params.mode === "wipe";

  const templateParams: Record<string, string> = {
    to_email: params.toEmail.trim(),
    to_name: params.toName || "Administrator",
    from_name: "GPS Security",
    reply_to: "gauravpatil5737@gmail.com",
    otp_code: params.otpCode,
    expires_in_minutes: "5",
    timestamp,
    year: new Date().getFullYear().toString(),

    // Dynamic Theme Parameters
    email_subject: isWipe
      ? `CRITICAL: Database Wipe Authorization Code [${params.otpCode}]`
      : `GPS Admin: Your Verification Code is ${params.otpCode}`,
    preview_text: isWipe
      ? `CRITICAL ACTION: Authorization code to permanently wipe database records is ${params.otpCode}.`
      : `Your admin security verification code is ${params.otpCode}. Valid for 5 minutes.`,
    action_title: isWipe ? "Confirm Database Wipe" : "Verification Code",
    action_description: isWipe
      ? "A request to permanently erase database records was triggered. Enter this code to confirm."
      : "Enter this code to complete your administrator sign-in.",
    badge_text: isWipe ? "Danger Zone" : "2FA Security",
    accent_color: isWipe ? "#DC2626" : "#7C3AED",
    badge_bg: isWipe ? "#FEF2F2" : "#F5F3FF",
    badge_border: isWipe ? "#FCA5A5" : "#DDD6FE",
    otp_bg: isWipe ? "#FEF2F2" : "#F5F3FF",
    otp_border: isWipe ? "#EF4444" : "#C4B5FD",
    otp_color: isWipe ? "#DC2626" : "#6D28D9",
    timer_color: isWipe ? "#DC2626" : "#94A3B8",
    warning_text: isWipe
      ? "If you did not initiate this wipe, abort immediately and secure your root credentials."
      : "If you didn't request this code, you can safely ignore this email.",
  };

  const payload: Record<string, unknown> = {
    service_id: SERVICE_ID,
    template_id: TEMPLATE_ID,
    user_id: PUBLIC_KEY,
    template_params: templateParams,
  };

  if (PRIVATE_KEY) {
    payload.accessToken = PRIVATE_KEY;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 7000);

  try {
    const origin =
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

    const res = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: origin,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errText = await res.text();
      console.error("EmailJS API send error:", res.status, errText);
      return {
        success: false,
        error: `EmailJS dispatch error (${res.status}): ${errText || "Check credentials in EmailJS dashboard"}`,
      };
    }

    return { success: true };
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    const error = err as Error;
    console.error("EmailJS network error:", error);
    return {
      success: false,
      error: error.name === "AbortError" ? "Email dispatch timed out." : "Network connection failed.",
    };
  }
}

/**
 * Backward compatibility wrapper for sendOTPViaEmailJS.
 */
export async function sendOTPViaEmailJS(
  toEmail: string,
  otpCode: string,
  toName = "Administrator"
): Promise<{ success: boolean; error?: string }> {
  return sendDynamicOtpEmail({
    toEmail,
    otpCode,
    mode: "login",
    toName,
  });
}

function getStoreKey(email: string, purpose: "login" | "wipe"): string {
  return `${purpose}:${email.trim().toLowerCase()}`;
}

const FIREBASE_DB_URL = (
  process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL ||
  process.env.FIREBASE_DATABASE_URL ||
  "https://portfolio-admin-default-rtdb.firebaseio.com"
).replace(/\/$/, "");

function getFirebaseKey(email: string, purpose: "login" | "wipe"): string {
  const cleanEmail = email.trim().toLowerCase().replace(/[^a-zA-Z0-9_]/g, "_");
  return `${purpose}_${cleanEmail}`;
}

/**
 * Stores a generated OTP with a strict 5-minute (300,000ms) TTL.
 * Uses 3-tier persistence: Local Memory -> Upstash Redis -> Firebase Realtime Database.
 */
export async function storeOTP(
  targetEmail: string,
  otpCode: string,
  purpose: "login" | "wipe" = "login"
): Promise<void> {
  const normalizedEmail = targetEmail.trim().toLowerCase();
  const storeKey = getStoreKey(normalizedEmail, purpose);
  const fbKey = getFirebaseKey(normalizedEmail, purpose);
  const now = Date.now();
  const expiresAt = now + 5 * 60 * 1000; // 5 minutes

  const otpData: StoredOTP = {
    hash: hashOtp(otpCode),
    targetEmail: normalizedEmail,
    attemptsLeft: 5,
    expiresAt,
    createdAt: now,
    lastSentAt: now,
    purpose,
  };

  // 1. Local in-memory store
  getOtpStore().set(storeKey, otpData);

  // 2. Upstash Redis store with 300s TTL (if configured)
  if (REDIS_URL && REDIS_TOKEN) {
    try {
      await fetch(
        `${REDIS_URL}/set/otp_${encodeURIComponent(storeKey)}/${encodeURIComponent(
          JSON.stringify(otpData)
        )}?ex=300`,
        {
          headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
        }
      );
    } catch {
      // Fall through to Firebase
    }
  }

  // 3. Firebase Realtime Database Persistent Store (guarantees cross-instance sync on Vercel)
  if (FIREBASE_DB_URL) {
    try {
      await fetch(`${FIREBASE_DB_URL}/_system/otps/${fbKey}.json`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(otpData),
        cache: "no-store",
      });
    } catch (err) {
      console.warn("Firebase RTDB OTP save note:", err);
    }
  }
}

/**
 * Checks if an email is on resend cooldown (30s).
 */
export function getResendCooldownRemaining(
  targetEmail: string,
  purpose: "login" | "wipe" = "login"
): number {
  const normalizedEmail = targetEmail.trim().toLowerCase();
  const storeKey = getStoreKey(normalizedEmail, purpose);
  const existing = getOtpStore().get(storeKey);
  if (!existing) return 0;

  const elapsed = (Date.now() - existing.lastSentAt) / 1000;
  const cooldownPeriod = 30; // 30 seconds cooldown
  return elapsed < cooldownPeriod ? Math.ceil(cooldownPeriod - elapsed) : 0;
}

/**
 * Validates a submitted OTP code with rate-limiting, cross-instance lookup, and timing-safe check.
 */
export async function verifySubmittedOTP(
  targetEmail: string,
  submittedCode: string,
  purpose: "login" | "wipe" = "login"
): Promise<{
  success: boolean;
  errorCode?: "NOT_FOUND" | "EXPIRED" | "INVALID_CODE" | "MAX_ATTEMPTS";
  attemptsLeft?: number;
  error?: string;
}> {
  const normalizedEmail = targetEmail.trim().toLowerCase();
  const storeKey = getStoreKey(normalizedEmail, purpose);
  const fbKey = getFirebaseKey(normalizedEmail, purpose);
  const store = getOtpStore();
  let existing = store.get(storeKey);

  // 1. Fallback to Upstash Redis if local memory missed
  if (!existing && REDIS_URL && REDIS_TOKEN) {
    try {
      const res = await fetch(`${REDIS_URL}/get/otp_${encodeURIComponent(storeKey)}`, {
        headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
        cache: "no-store",
      });
      if (res.ok) {
        const json = await res.json();
        if (json.result) {
          existing = JSON.parse(json.result);
          if (existing) store.set(storeKey, existing);
        }
      }
    } catch {
      // Fall through to Firebase RTDB
    }
  }

  // 2. Fallback to Firebase Realtime Database (guarantees cross-instance sync on Vercel)
  if (!existing && FIREBASE_DB_URL) {
    try {
      const res = await fetch(`${FIREBASE_DB_URL}/_system/otps/${fbKey}.json`, {
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data === "object" && data.hash) {
          existing = data as StoredOTP;
          store.set(storeKey, existing);
        }
      }
    } catch (err) {
      console.warn("Firebase RTDB OTP lookup note:", err);
    }
  }

  if (!existing) {
    return {
      success: false,
      errorCode: "NOT_FOUND",
      error: "No active verification code found. Please request a new code.",
    };
  }

  // 1. Check expiration
  if (Date.now() > existing.expiresAt) {
    store.delete(storeKey);
    // Cleanup Firebase
    if (FIREBASE_DB_URL) {
      fetch(`${FIREBASE_DB_URL}/_system/otps/${fbKey}.json`, { method: "DELETE" }).catch(() => {});
    }
    return {
      success: false,
      errorCode: "EXPIRED",
      error: "Verification code expired (valid for 5 minutes). Please request a new code.",
    };
  }

  // 2. Check remaining attempts
  if (existing.attemptsLeft <= 0) {
    store.delete(storeKey);
    if (FIREBASE_DB_URL) {
      fetch(`${FIREBASE_DB_URL}/_system/otps/${fbKey}.json`, { method: "DELETE" }).catch(() => {});
    }
    return {
      success: false,
      errorCode: "MAX_ATTEMPTS",
      error: "Maximum failed attempts exceeded. Please request a new code.",
    };
  }

  // 3. Cryptographic timing-safe comparison
  const submittedHash = hashOtp(submittedCode);
  const isMatch =
    submittedHash.length === existing.hash.length &&
    crypto.timingSafeEqual(Buffer.from(submittedHash), Buffer.from(existing.hash));

  if (!isMatch) {
    existing.attemptsLeft -= 1;
    store.set(storeKey, existing);

    // Sync updated attempts left across Redis and Firebase
    if (FIREBASE_DB_URL) {
      fetch(`${FIREBASE_DB_URL}/_system/otps/${fbKey}.json`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(existing),
      }).catch(() => {});
    }

    if (existing.attemptsLeft <= 0) {
      store.delete(storeKey);
      if (FIREBASE_DB_URL) {
        fetch(`${FIREBASE_DB_URL}/_system/otps/${fbKey}.json`, { method: "DELETE" }).catch(() => {});
      }
      return {
        success: false,
        errorCode: "MAX_ATTEMPTS",
        attemptsLeft: 0,
        error: "Incorrect code. Maximum attempts exceeded. Please request a new code.",
      };
    }

    return {
      success: false,
      errorCode: "INVALID_CODE",
      attemptsLeft: existing.attemptsLeft,
      error: `Incorrect code. ${existing.attemptsLeft} attempt${
        existing.attemptsLeft === 1 ? "" : "s"
      } remaining.`,
    };
  }

  // 4. Success: invalidate OTP immediately to prevent replay attacks
  store.delete(storeKey);
  if (REDIS_URL && REDIS_TOKEN) {
    try {
      fetch(`${REDIS_URL}/del/otp_${encodeURIComponent(storeKey)}`, {
        headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
      });
    } catch {
      // Ignore
    }
  }
  if (FIREBASE_DB_URL) {
    try {
      fetch(`${FIREBASE_DB_URL}/_system/otps/${fbKey}.json`, {
        method: "DELETE",
      });
    } catch {
      // Ignore
    }
  }

  return { success: true };
}
