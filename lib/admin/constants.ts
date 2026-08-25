export const ADMIN_COOKIE_NAME = "admin_session";
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
