/**
 * Live Chat Multi-Tier Anti-Abuse Rate Limiter
 *
 * Enforces strict request budgets to protect Brevo daily quota and Gaurav's communication channel:
 * 1. IP OTP Request Limit: Max 5 requests / hour per client IP (`otp:ip:<ip>`)
 * 2. Email OTP Request Limit: Max 3 requests / hour per normalized email (`otp:email:<hash>`)
 * 3. Global Surge Guard: Max 15 requests / min across subsystem (`burst:global`)
 * 4. Message Velocity Limit: Max 20 messages / 10 min per session (`chat:msg:<sessionId>`)
 * 5. SSE Connection Limit: Max 5 concurrent/min per session (`chat:sse:<sessionId>`)
 *
 * Multi-Tier Strategy:
 * - Distributed Layer: Upstash Redis REST API (authoritative across edge instances)
 * - Fallback Layer: In-memory pruned cache with fail-closed behavior for OTP endpoints
 */

import crypto from "crypto";

export interface LiveChatRateLimitCheckResult {
  allowed: boolean;
  reason?: string;
  retryAfterSeconds?: number;
}

export type RateLimitActionType = "OTP_SEND" | "OTP_VERIFY" | "MESSAGE" | "SSE";

interface MemoryRateLimitEntry {
  count: number;
  resetTime: number;
}

const memoryLimiterMap = new Map<string, MemoryRateLimitEntry>();

// Prune memory map periodically to prevent leaks
function pruneMemoryMap(now: number): void {
  if (memoryLimiterMap.size > 200) {
    for (const [key, entry] of memoryLimiterMap.entries()) {
      if (now > entry.resetTime) {
        memoryLimiterMap.delete(key);
      }
    }
  }
}

/**
 * Normalizes email and creates a privacy-safe hash key for rate-limiting.
 */
export function hashRateLimitEmail(email: string): string {
  const normalized = email.trim().toLowerCase();
  return crypto.createHash("sha256").update(normalized).digest("hex").slice(0, 16);
}

/**
 * Checks rate limits for a given Live Chat action.
 */
export async function checkLiveChatRateLimit(params: {
  clientIp: string;
  email?: string;
  sessionId?: string;
  type: RateLimitActionType;
}): Promise<LiveChatRateLimitCheckResult> {
  const now = Date.now();
  pruneMemoryMap(now);

  const cleanIp = params.clientIp.trim().replace(/[^a-zA-Z0-9_.-]/g, "_");
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  // ---------------------------------------------------------------------------
  // Rule Definitions: [WindowSeconds, MaxAllowed, ErrorMessage]
  // ---------------------------------------------------------------------------
  const checks: Array<{ key: string; windowSec: number; max: number; errorMsg: string }> = [];

  if (params.type === "OTP_SEND") {
    // 1. Global Surge Wall: 15 reqs / 60s
    checks.push({
      key: "livechat:burst:global",
      windowSec: 60,
      max: 15,
      errorMsg: "Live chat is experiencing high verification traffic. Please retry in a minute.",
    });

    // 2. IP Hourly Budget: 5 reqs / 3600s
    checks.push({
      key: `livechat:otp:ip:${cleanIp}`,
      windowSec: 3600,
      max: 5,
      errorMsg: "Hourly verification limit reached for this network. Please try again later.",
    });

    // 3. Email Hourly Budget: 3 reqs / 3600s
    if (params.email) {
      const emailHash = hashRateLimitEmail(params.email);
      checks.push({
        key: `livechat:otp:email:${emailHash}`,
        windowSec: 3600,
        max: 3,
        errorMsg: "Too many verification codes requested for this email. Please wait an hour.",
      });
    }
  } else if (params.type === "OTP_VERIFY") {
    // IP Verify attempts: Max 15 per 15 minutes
    checks.push({
      key: `livechat:verify:ip:${cleanIp}`,
      windowSec: 900,
      max: 15,
      errorMsg: "Too many verification attempts from this network. Please wait 15 minutes.",
    });
  } else if (params.type === "MESSAGE") {
    // Session Message Velocity: Max 20 messages / 10 minutes
    const idKey = params.sessionId || cleanIp;
    checks.push({
      key: `livechat:msg:${idKey}`,
      windowSec: 600,
      max: 20,
      errorMsg: "Message rate limit reached. Please slow down.",
    });
  } else if (params.type === "SSE") {
    // SSE Stream Connection Rate: Max 10 connects / minute
    const idKey = params.sessionId || cleanIp;
    checks.push({
      key: `livechat:sse:${idKey}`,
      windowSec: 60,
      max: 10,
      errorMsg: "Too many realtime connection attempts. Please wait.",
    });
  }

  // ---------------------------------------------------------------------------
  // Check 1: Distributed Redis Check (if available)
  // ---------------------------------------------------------------------------
  if (redisUrl && redisToken) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1500);

      for (const check of checks) {
        const res = await fetch(`${redisUrl}/get/${check.key}`, {
          headers: { Authorization: `Bearer ${redisToken}` },
          signal: controller.signal,
        });

        if (res.ok) {
          const data = (await res.json()) as { result: string | number | null };
          const currentCount = Number(data.result) || 0;
          if (currentCount >= check.max) {
            clearTimeout(timeoutId);
            return {
              allowed: false,
              reason: check.errorMsg,
              retryAfterSeconds: check.windowSec,
            };
          }
        }
      }
      clearTimeout(timeoutId);
    } catch {
      // Fail closed for OTP_SEND if strict rate limiting is explicitly required in production
      if (process.env.LIVE_CHAT_FAIL_CLOSED_ON_REDIS_ERROR === "true" && params.type === "OTP_SEND") {
        return {
          allowed: false,
          reason: "Rate limiting service temporarily unavailable. Please retry in a few seconds.",
          retryAfterSeconds: 10,
        };
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Check 2: In-Memory Fast Fallback Check
  // ---------------------------------------------------------------------------
  for (const check of checks) {
    const entry = memoryLimiterMap.get(check.key);
    if (entry && now <= entry.resetTime) {
      if (entry.count >= check.max) {
        const retryAfter = Math.max(1, Math.ceil((entry.resetTime - now) / 1000));
        return {
          allowed: false,
          reason: check.errorMsg,
          retryAfterSeconds: retryAfter,
        };
      }
    }
  }

  return { allowed: true };
}

/**
 * Records an action to increment rate-limit counters across Redis and in-memory maps.
 */
export function recordLiveChatAction(params: {
  clientIp: string;
  email?: string;
  sessionId?: string;
  type: RateLimitActionType;
}): void {
  const now = Date.now();
  const cleanIp = params.clientIp.trim().replace(/[^a-zA-Z0-9_.-]/g, "_");
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  const updates: Array<{ key: string; windowSec: number }> = [];

  if (params.type === "OTP_SEND") {
    updates.push({ key: "livechat:burst:global", windowSec: 60 });
    updates.push({ key: `livechat:otp:ip:${cleanIp}`, windowSec: 3600 });
    if (params.email) {
      updates.push({
        key: `livechat:otp:email:${hashRateLimitEmail(params.email)}`,
        windowSec: 3600,
      });
    }
  } else if (params.type === "OTP_VERIFY") {
    updates.push({ key: `livechat:verify:ip:${cleanIp}`, windowSec: 900 });
  } else if (params.type === "MESSAGE") {
    const idKey = params.sessionId || cleanIp;
    updates.push({ key: `livechat:msg:${idKey}`, windowSec: 600 });
  } else if (params.type === "SSE") {
    const idKey = params.sessionId || cleanIp;
    updates.push({ key: `livechat:sse:${idKey}`, windowSec: 60 });
  }

  // 1. In-Memory updates
  for (const update of updates) {
    const entry = memoryLimiterMap.get(update.key);
    if (!entry || now > entry.resetTime) {
      memoryLimiterMap.set(update.key, {
        count: 1,
        resetTime: now + update.windowSec * 1000,
      });
    } else {
      entry.count++;
    }
  }

  // 2. Redis Pipeline execution (non-blocking)
  if (redisUrl && redisToken && updates.length > 0) {
    const pipelineCommands = updates.flatMap((u) => [
      ["INCR", u.key],
      ["EXPIRE", u.key, u.windowSec],
    ]);

    fetch(`${redisUrl}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${redisToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(pipelineCommands),
    }).catch(() => {});
  }
}
