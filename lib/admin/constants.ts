export const ADMIN_COOKIE_NAME = "admin_session";
export const ADMIN_OTP_COOKIE_NAME = "admin_otp_challenge";
export const PRIMARY_ADMIN_EMAIL = "gauravpatil5737@gmail.com";
export const PRIMARY_ADMIN_NAME = "Gaurav Patil";
export const PRIMARY_ADMIN_ROLE = "superadmin";

/**
 * Single Source of Truth for Session Lifetime:
 * Configurable via `ADMIN_SESSION_TTL_HOURS` (Default: 5 hours)
 */
export const ADMIN_SESSION_TTL_HOURS = Number(process.env.ADMIN_SESSION_TTL_HOURS || 5);

/**
 * Internally derived session expiration in seconds for HTTP cookies
 */
export const ADMIN_SESSION_MAX_AGE_SECONDS = ADMIN_SESSION_TTL_HOURS * 60 * 60;

/**
 * Internally derived session expiration in milliseconds for timestamps & tokens
 */
export const ADMIN_SESSION_TTL_MS = ADMIN_SESSION_MAX_AGE_SECONDS * 1000;

/**
 * Two-Factor OTP Security Constants
 */
export const OTP_MAX_ATTEMPTS = 3;
export const OTP_TTL_SECONDS = 5 * 60; // 5 minutes
export const OTP_TTL_MS = OTP_TTL_SECONDS * 1000;
export const OTP_RESEND_COOLDOWN_SECONDS = 60; // 60 seconds cooldown
export const OTP_RESEND_COOLDOWN_MS = OTP_RESEND_COOLDOWN_SECONDS * 1000;
export const OTP_MAX_RESENDS = 3;

/**
 * New IP Security Constants
 */
export const IP_VERIFY_TTL_SECONDS = 15 * 60; // 15 minutes
export const IP_VERIFY_TTL_MS = IP_VERIFY_TTL_SECONDS * 1000;
export const IP_VERIFY_TOKEN_MAX_ATTEMPTS = 5;

/**
 * Database Retention & Pruning Constants
 */
export const RETENTION_BUFFER_MS = 24 * 60 * 60 * 1000; // 24 hours
export const PRUNE_BATCH_LIMIT = 5;

