/**
 * Admin Outbound Mail Service
 *
 * Dedicated outbound engine for the Admin Mail Center (/admin/mail).
 * Enforces server-side sender identity resolution, safe HTML compilation,
 * multi-tier rate limiting, and failure-aware status classification.
 */

import { adminLogger } from "@/lib/admin/logger";
import { escapeHtml } from "./brevo";
import type { MailRecipient, MailSenderKey } from "@/lib/dal/repositories/types";

const BREVO_API_ENDPOINT = "https://api.brevo.com/v3/smtp/email";

export interface MailSenderIdentity {
  key: MailSenderKey;
  email: string;
  displayName: string;
  purpose: string;
  defaultReplyTo: string;
  isNoReply: boolean;
  brevoSenderId: number;
}

export const ADMIN_MAIL_SENDERS: Record<MailSenderKey, MailSenderIdentity> = {
  SECURITY: {
    key: "SECURITY",
    email: "security@gauravservices.eu.cc",
    displayName: "Gaurav Services Security",
    purpose: "Administrative alerts, access notifications, and security correspondence.",
    defaultReplyTo: "security@gauravservices.eu.cc",
    isNoReply: false,
    brevoSenderId: 2,
  },
  HELP: {
    key: "HELP",
    email: "help@gauravservices.eu.cc",
    displayName: "Gaurav Support",
    purpose: "Support assistance, technical inquiries, and client communications.",
    defaultReplyTo: "help@gauravservices.eu.cc",
    isNoReply: false,
    brevoSenderId: 3,
  },
  HELLO: {
    key: "HELLO",
    email: "hello@gauravservices.eu.cc",
    displayName: "Gaurav Patil",
    purpose: "General professional correspondence and portfolio outreach.",
    defaultReplyTo: "hello@gauravservices.eu.cc",
    isNoReply: false,
    brevoSenderId: 4,
  },
  NO_REPLY: {
    key: "NO_REPLY",
    email: "no-reply@gauravservices.eu.cc",
    displayName: "Gaurav Automated Systems",
    purpose: "Automated receipts and system broadcasts (unmonitored).",
    defaultReplyTo: "no-reply@gauravservices.eu.cc",
    isNoReply: true,
    brevoSenderId: 5,
  },
};

// =============================================================================
// Rate Limiting (Configurable Server-Side In-Memory + Upstash Sync)
// =============================================================================

interface RateLimitTracker {
  count: number;
  resetTime: number;
  lastTimestamp: number;
}

const adminBurstMap = new Map<string, number[]>();
const adminHourlyMap = new Map<string, RateLimitTracker>();
let globalDailyCount = 0;
let globalDailyReset = Date.now() + 24 * 60 * 60 * 1000;

const BURST_WINDOW_MS = 30 * 1000; // 30 seconds
const MAX_BURST = 5; // Max 5 sends per 30s
const HOURLY_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_HOURLY = 30; // Max 30 sends per hour per admin
const MAX_GLOBAL_DAILY = 150; // Safety cap to protect transactional quota

function pruneExpiredAdminRateLimits(now: number) {
  if (adminBurstMap.size > 50) {
    for (const [key, tsList] of adminBurstMap.entries()) {
      const active = tsList.filter((t) => now - t < BURST_WINDOW_MS);
      if (active.length === 0) adminBurstMap.delete(key);
      else adminBurstMap.set(key, active);
    }
  }

  if (adminHourlyMap.size > 50) {
    for (const [key, entry] of adminHourlyMap.entries()) {
      if (now > entry.resetTime) adminHourlyMap.delete(key);
    }
  }
}

export async function checkAdminMailRateLimit(
  adminEmail: string,
  clientIp: string
): Promise<{ allowed: boolean; reason?: string; retryAfterSeconds?: number }> {
  const now = Date.now();
  const normalizedKey = `${adminEmail.toLowerCase()}:${clientIp}`;

  pruneExpiredAdminRateLimits(now);

  // 1. Global Daily Safety Threshold
  if (now > globalDailyReset) {
    globalDailyCount = 0;
    globalDailyReset = now + 24 * 60 * 60 * 1000;
  }

  if (globalDailyCount >= MAX_GLOBAL_DAILY) {
    return {
      allowed: false,
      reason: "Daily administrative outbound email threshold reached. Please try again tomorrow.",
      retryAfterSeconds: Math.ceil((globalDailyReset - now) / 1000),
    };
  }

  // 2. Burst Protection (Max 5 per 30s + 2.5s cooldown)
  const timestamps = adminBurstMap.get(normalizedKey) || [];
  const recentTimestamps = timestamps.filter((t) => now - t < BURST_WINDOW_MS);
  if (recentTimestamps.length >= MAX_BURST) {
    return {
      allowed: false,
      reason: `Burst rate limit reached (max ${MAX_BURST} emails per 30 seconds). Please wait.`,
      retryAfterSeconds: Math.ceil((BURST_WINDOW_MS - (now - recentTimestamps[0])) / 1000),
    };
  }

  const lastSend = recentTimestamps[recentTimestamps.length - 1];
  if (lastSend && now - lastSend < 2500) {
    return {
      allowed: false,
      reason: "Please wait a moment before initiating another email dispatch.",
      retryAfterSeconds: 3,
    };
  }

  // 3. Hourly Admin Quota (Max 30 / hr)
  const hourlyEntry = adminHourlyMap.get(normalizedKey);
  if (hourlyEntry && now < hourlyEntry.resetTime && hourlyEntry.count >= MAX_HOURLY) {
    const retryAfter = Math.ceil((hourlyEntry.resetTime - now) / 1000);
    return {
      allowed: false,
      reason: `Hourly admin mail limit reached (${MAX_HOURLY}/hr). Please retry in ${Math.ceil(retryAfter / 60)} minutes.`,
      retryAfterSeconds: retryAfter,
    };
  }

  return { allowed: true };
}

export function recordAdminMailSend(adminEmail: string, clientIp: string) {
  const now = Date.now();
  const normalizedKey = `${adminEmail.toLowerCase()}:${clientIp}`;

  pruneExpiredAdminRateLimits(now);

  globalDailyCount++;

  const timestamps = adminBurstMap.get(normalizedKey) || [];
  const recentTimestamps = timestamps.filter((t) => now - t < BURST_WINDOW_MS);
  recentTimestamps.push(now);
  adminBurstMap.set(normalizedKey, recentTimestamps);

  const hourlyEntry = adminHourlyMap.get(normalizedKey);
  if (!hourlyEntry || now > hourlyEntry.resetTime) {
    adminHourlyMap.set(normalizedKey, {
      count: 1,
      lastTimestamp: now,
      resetTime: now + HOURLY_WINDOW_MS,
    });
  } else {
    hourlyEntry.count++;
    hourlyEntry.lastTimestamp = now;
  }
}


// =============================================================================
// Zero-Dependency Safe HTML Compiler
// =============================================================================

/**
 * Compiles rich text / markdown into safe, responsive HTML without external dependencies.
 * Strictly whitelists formatting primitives while prohibiting scripts, objects, and iframes.
 */
export function compileSafeHtml(rawText: string, subject = ""): string {
  if (!rawText) return "";

  // 1. Raw character escape to eliminate injection
  const escaped = escapeHtml(rawText);

  // 2. Format paragraphs and line breaks
  const paragraphs = escaped
    .split(/\n{2,}/)
    .map((block) => {
      let formatted = block.replace(/\n/g, "<br />");
      // Format **bold**
      formatted = formatted.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
      // Format *italic*
      formatted = formatted.replace(/\*(.*?)\*/g, "<em>$1</em>");
      // Format `code`
      formatted = formatted.replace(/`(.*?)`/g, "<code style=\"background-color:#f1f5f9;padding:2px 4px;font-size:13px;border-radius:2px;\">$1</code>");

      return `<p style="margin:0 0 16px 0;line-height:1.6;color:#1e293b;">${formatted}</p>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:28px 24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;color:#1e293b;line-height:1.6;background-color:#ffffff;">
  <div style="max-width:600px;margin:0 auto;">
    <div style="margin-bottom:24px;">
      ${paragraphs}
    </div>
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 16px 0;" />
    <p style="margin:0;font-size:12px;color:#64748b;">
      Sent via Gaurav Services &bull; <a href="https://gauravpatil.online" style="color:#7c3aed;text-decoration:none;">gauravpatil.online</a>
    </p>
  </div>
</body>
</html>`;
}

// =============================================================================
// Core Brevo Dispatcher Pipeline
// =============================================================================

export interface DispatchAdminMailParams {
  senderKey: MailSenderKey;
  to: MailRecipient[];
  cc?: MailRecipient[];
  bcc?: MailRecipient[];
  subject: string;
  body: string;
  idempotencyKey: string;
  adminEmail: string;
}

export interface DispatchAdminMailResult {
  success: boolean;
  status: "SENT" | "FAILED" | "DELIVERY_UNCERTAIN";
  messageId?: string;
  error?: string;
}

export async function dispatchAdminMail(
  params: DispatchAdminMailParams
): Promise<DispatchAdminMailResult> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    adminLogger.error("dispatchAdminMail", new Error("BREVO_API_KEY missing"), "Missing API key in environment");
    return {
      success: false,
      status: "FAILED",
      error: "BREVO_API_KEY is not configured in server environment.",
    };
  }

  // 1. Resolve Verified Sender Identity
  const identity = ADMIN_MAIL_SENDERS[params.senderKey];
  if (!identity) {
    return {
      success: false,
      status: "FAILED",
      error: `SENDER_NOT_ALLOWED: Identity "${params.senderKey}" is not authorized.`,
    };
  }

  const cleanSubject = params.subject.replace(/[\r\n]/g, " ").trim();
  const htmlContent = compileSafeHtml(params.body, cleanSubject);
  const textContent = params.body.trim();

  // 2. Build Payload
  const payload: Record<string, unknown> = {
    sender: {
      name: identity.displayName,
      email: identity.email,
    },
    to: params.to.map((rec) => ({
      email: rec.email.trim().toLowerCase(),
      name: rec.name?.trim() || undefined,
    })),
    replyTo: {
      email: identity.defaultReplyTo,
      name: identity.displayName,
    },
    subject: cleanSubject,
    htmlContent,
    textContent,
    tags: ["admin_mail", `sender_${identity.key.toLowerCase()}`],
  };

  if (params.cc && params.cc.length > 0) {
    payload.cc = params.cc.map((rec) => ({
      email: rec.email.trim().toLowerCase(),
      name: rec.name?.trim() || undefined,
    }));
  }

  if (params.bcc && params.bcc.length > 0) {
    payload.bcc = params.bcc.map((rec) => ({
      email: rec.email.trim().toLowerCase(),
      name: rec.name?.trim() || undefined,
    }));
  }

  // 3. Dispatch with 10-Second Abort Controller
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  const startTime = Date.now();

  try {
    const res = await fetch(BREVO_API_ENDPOINT, {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const durationMs = Date.now() - startTime;
    const data = await res.json().catch(() => ({}));

    if (res.ok && (res.status === 200 || res.status === 201)) {
      const messageId = (data.messageId as string) || "msg_accepted";
      adminLogger.info("dispatchAdminMail:Success", "Brevo accepted outbound mail", {
        idempotencyKey: params.idempotencyKey,
        senderKey: identity.key,
        recipientCount: params.to.length,
        hasCc: Boolean(params.cc && params.cc.length > 0),
        hasBcc: Boolean(params.bcc && params.bcc.length > 0),
        durationMs,
        brevoMessageId: messageId,
      });

      return {
        success: true,
        status: "SENT",
        messageId,
      };
    }

    // 4. Handle HTTP Rejections
    const errorMessage =
      (data.message as string) ||
      (data.error as string) ||
      `Brevo API returned HTTP ${res.status}`;

    // HTTP 5xx Server Error / Upstream Crash -> Ambiguous outcome
    if (res.status >= 500) {
      adminLogger.warn("dispatchAdminMail:Ambiguous5xx", `Ambiguous HTTP ${res.status} response from Brevo`, { status: res.status, error: errorMessage, durationMs });
      return {
        success: false,
        status: "DELIVERY_UNCERTAIN",
        error: `Provider returned HTTP ${res.status}. Delivery unconfirmed.`,
      };
    }

    // HTTP 4xx Client Error -> Confirmed Rejection
    adminLogger.warn("dispatchAdminMail:Rejection", `Brevo rejected send request with HTTP ${res.status}`, { status: res.status, error: errorMessage, durationMs });
    return {
      success: false,
      status: "FAILED",
      error: errorMessage,
    };
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    const error = err as Error;
    const isTimeout = error.name === "AbortError";

    adminLogger.warn("dispatchAdminMail:NetworkException", isTimeout ? "Brevo gateway timed out" : "Network exception in Brevo dispatch", {
      isTimeout,
      error: error.message,
      durationMs: Date.now() - startTime,
    });


    // Timeouts and socket resets are classified strictly as DELIVERY_UNCERTAIN
    return {
      success: false,
      status: "DELIVERY_UNCERTAIN",
      error: isTimeout
        ? "Brevo email gateway timed out (10s). Delivery status unconfirmed."
        : "Network error connecting to Brevo API. Delivery status unconfirmed.",
    };
  }
}
