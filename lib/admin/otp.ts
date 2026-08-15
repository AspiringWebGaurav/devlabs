import crypto from "crypto";

export interface StoredOTP {
  hash: string;
  targetEmail: string;
  attemptsLeft: number;
  expiresAt: number; // Unix timestamp in ms
  createdAt: number;
  lastSentAt: number;
}

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
 * Dispatches the dynamic OTP email via EmailJS REST API.
 */
export async function sendOTPViaEmailJS(
  toEmail: string,
  otpCode: string,
  toName = "Administrator"
): Promise<{ success: boolean; error?: string }> {
  const timestamp = new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  }) + " IST";

  const templateParams = {
    to_email: toEmail.trim(),
    to_name: toName,
    from_name: "Admin Security Subsystem",
    reply_to: "gauravpatil5737@gmail.com",
    otp_code: otpCode,
    expires_in_minutes: "5",
    timestamp,
    year: new Date().getFullYear().toString(),
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
        error: `EmailJS dispatch notice (${res.status}): ${errText || "Check credentials in EmailJS dashboard"}`,
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
 * Stores a generated OTP with a strict 5-minute (300,000ms) TTL.
 */
export async function storeOTP(targetEmail: string, otpCode: string): Promise<void> {
  const normalizedEmail = targetEmail.trim().toLowerCase();
  const now = Date.now();
  const expiresAt = now + 5 * 60 * 1000; // 5 minutes

  const otpData: StoredOTP = {
    hash: hashOtp(otpCode),
    targetEmail: normalizedEmail,
    attemptsLeft: 5,
    expiresAt,
    createdAt: now,
    lastSentAt: now,
  };

  // 1. In-memory store
  getOtpStore().set(normalizedEmail, otpData);

  // 2. Upstash Redis store with 300s TTL (if configured)
  if (REDIS_URL && REDIS_TOKEN) {
    try {
      await fetch(`${REDIS_URL}/set/otp_${encodeURIComponent(normalizedEmail)}/${encodeURIComponent(JSON.stringify(otpData))}?ex=300`, {
        headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
      });
    } catch {
      // Memory store acts as primary fallback
    }
  }
}

/**
 * Checks if an email is on resend cooldown (45s).
 */
export function getResendCooldownRemaining(targetEmail: string): number {
  const normalizedEmail = targetEmail.trim().toLowerCase();
  const existing = getOtpStore().get(normalizedEmail);
  if (!existing) return 0;

  const elapsed = (Date.now() - existing.lastSentAt) / 1000;
  const cooldownPeriod = 45; // 45 seconds cooldown
  return elapsed < cooldownPeriod ? Math.ceil(cooldownPeriod - elapsed) : 0;
}

/**
 * Validates a submitted OTP code with rate-limiting and timing-safe check.
 */
export async function verifySubmittedOTP(
  targetEmail: string,
  submittedCode: string
): Promise<{
  success: boolean;
  errorCode?: "NOT_FOUND" | "EXPIRED" | "INVALID_CODE" | "MAX_ATTEMPTS";
  attemptsLeft?: number;
  error?: string;
}> {
  const normalizedEmail = targetEmail.trim().toLowerCase();
  const store = getOtpStore();
  let existing = store.get(normalizedEmail);

  // Fallback to Redis if memory cache missed
  if (!existing && REDIS_URL && REDIS_TOKEN) {
    try {
      const res = await fetch(`${REDIS_URL}/get/otp_${encodeURIComponent(normalizedEmail)}`, {
        headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.result) {
          existing = JSON.parse(json.result);
          if (existing) store.set(normalizedEmail, existing);
        }
      }
    } catch {
      // Ignore
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
    store.delete(normalizedEmail);
    return {
      success: false,
      errorCode: "EXPIRED",
      error: "Verification code expired (valid for 5 minutes). Please request a new code.",
    };
  }

  // 2. Check remaining attempts
  if (existing.attemptsLeft <= 0) {
    store.delete(normalizedEmail);
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
    store.set(normalizedEmail, existing);

    if (existing.attemptsLeft <= 0) {
      store.delete(normalizedEmail);
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
      error: `Incorrect code. ${existing.attemptsLeft} attempt${existing.attemptsLeft === 1 ? "" : "s"} remaining.`,
    };
  }

  // 4. Success: invalidate OTP immediately to prevent replay attacks
  store.delete(normalizedEmail);
  if (REDIS_URL && REDIS_TOKEN) {
    try {
      fetch(`${REDIS_URL}/del/otp_${encodeURIComponent(normalizedEmail)}`, {
        headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
      });
    } catch {
      // Ignore
    }
  }

  return { success: true };
}
