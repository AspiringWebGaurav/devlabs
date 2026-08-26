/**
 * Contact Form Multi-Tier Anti-Abuse Rate Limiter
 * 
 * Protects Brevo Daily Email Quota (300/day) against spam bots and malicious traffic.
 * 
 * Protection Tiers:
 * 1. IP Burst Cooldown: 30 seconds between consecutive submissions per IP.
 * 2. IP Hourly Budget: Max 5 submissions per hour per IP address.
 * 3. Email Hourly Budget: Max 3 submissions per hour per recipient email address.
 * 4. Global Velocity Surge: Max 10 submissions per minute across all visitors.
 * 
 * Architecture:
 * - In-Memory Fast Cache with automatic garbage collection / pruning.
 * - Upstash Redis Global Sync (when UPSTASH_REDIS_REST_URL is configured).
 */

interface RateLimitEntry {
  count: number;
  lastTimestamp: number;
  resetTime: number;
}

// In-Memory Storage Maps
const ipCooldownMap = new Map<string, number>();
const ipHourlyMap = new Map<string, RateLimitEntry>();
const emailHourlyMap = new Map<string, RateLimitEntry>();
let globalMinuteCount = 0;
let globalMinuteReset = Date.now() + 60000;

// Configuration Constants
const IP_COOLDOWN_MS = 30 * 1000; // 30 seconds cooldown between submissions
const HOURLY_WINDOW_MS = 60 * 60 * 1000; // 1 hour window
const MAX_IP_HOURLY = 5; // Max 5 submissions per hour per IP
const MAX_EMAIL_HOURLY = 3; // Max 3 submissions per hour per Email
const MAX_GLOBAL_PER_MINUTE = 10; // Max 10 submissions/min across all IPs

export interface RateLimitCheckResult {
  allowed: boolean;
  reason?: string;
  retryAfterSeconds?: number;
}

/**
 * Prunes expired entries from in-memory maps to prevent memory leaks in persistent runtimes.
 */
function pruneExpiredEntries(now: number) {
  if (ipCooldownMap.size > 150) {
    for (const [ip, timestamp] of ipCooldownMap.entries()) {
      if (now - timestamp > IP_COOLDOWN_MS) {
        ipCooldownMap.delete(ip);
      }
    }
  }

  if (ipHourlyMap.size > 150) {
    for (const [ip, entry] of ipHourlyMap.entries()) {
      if (now > entry.resetTime) {
        ipHourlyMap.delete(ip);
      }
    }
  }

  if (emailHourlyMap.size > 150) {
    for (const [email, entry] of emailHourlyMap.entries()) {
      if (now > entry.resetTime) {
        emailHourlyMap.delete(email);
      }
    }
  }
}

/**
 * Executes multi-tier anti-abuse rate limit check.
 */
export async function checkContactRateLimit(
  clientIp: string,
  email: string
): Promise<RateLimitCheckResult> {
  const now = Date.now();
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedIp = clientIp.trim();

  // Periodic memory leak prevention
  pruneExpiredEntries(now);

  // =========================================================================
  // 1. Global Velocity Surge Guard (Max 10 total site-wide submissions / min)
  // =========================================================================
  if (now > globalMinuteReset) {
    globalMinuteCount = 0;
    globalMinuteReset = now + 60000;
  }

  if (globalMinuteCount >= MAX_GLOBAL_PER_MINUTE) {
    const retryAfter = Math.ceil((globalMinuteReset - now) / 1000);
    return {
      allowed: false,
      reason: `System is experiencing high traffic. Please retry in ${retryAfter}s.`,
      retryAfterSeconds: retryAfter,
    };
  }

  // =========================================================================
  // 2. IP Burst Cooldown Guard (30 seconds between submissions)
  // =========================================================================
  const lastIpTime = ipCooldownMap.get(normalizedIp);
  if (lastIpTime && now - lastIpTime < IP_COOLDOWN_MS) {
    const retryAfter = Math.ceil((IP_COOLDOWN_MS - (now - lastIpTime)) / 1000);
    return {
      allowed: false,
      reason: `Please wait ${retryAfter}s before sending another message.`,
      retryAfterSeconds: retryAfter,
    };
  }

  // =========================================================================
  // 3. IP Hourly Budget Guard (Max 5 submissions / hour)
  // =========================================================================
  let ipEntry = ipHourlyMap.get(normalizedIp);
  if (ipEntry && now > ipEntry.resetTime) {
    ipHourlyMap.delete(normalizedIp);
    ipEntry = undefined;
  }

  if (ipEntry && ipEntry.count >= MAX_IP_HOURLY) {
    const retryAfter = Math.ceil((ipEntry.resetTime - now) / 1000);
    const retryMinutes = Math.ceil(retryAfter / 60);
    return {
      allowed: false,
      reason: `Hourly submission limit reached for this device. Please try again in ${retryMinutes} minutes.`,
      retryAfterSeconds: retryAfter,
    };
  }

  // =========================================================================
  // 4. Email Hourly Budget Guard (Max 3 submissions / hour)
  // =========================================================================
  let emailEntry = emailHourlyMap.get(normalizedEmail);
  if (emailEntry && now > emailEntry.resetTime) {
    emailHourlyMap.delete(normalizedEmail);
    emailEntry = undefined;
  }

  if (emailEntry && emailEntry.count >= MAX_EMAIL_HOURLY) {
    const retryAfter = Math.ceil((emailEntry.resetTime - now) / 1000);
    const retryMinutes = Math.ceil(retryAfter / 60);
    return {
      allowed: false,
      reason: `Too many inquiries sent to "${normalizedEmail}" recently. Please wait ${retryMinutes} minutes.`,
      retryAfterSeconds: retryAfter,
    };
  }

  // =========================================================================
  // 5. Upstash Redis Global Sync (Fast 2s timeout for edge resilience)
  // =========================================================================
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (redisUrl && redisToken) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    try {
      const redisKey = `ratelimit:contact:ip:${normalizedIp.replace(/[^a-zA-Z0-9_]/g, "_")}`;
      const res = await fetch(`${redisUrl}/get/${redisKey}`, {
        headers: { Authorization: `Bearer ${redisToken}` },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const data = (await res.json()) as { result: string | number | null };
        const currentVal = Number(data.result) || 0;
        if (currentVal >= MAX_IP_HOURLY) {
          return {
            allowed: false,
            reason: `Hourly limit reached for this network. Please try again later.`,
            retryAfterSeconds: 3600,
          };
        }
      }
    } catch (redisErr) {
      clearTimeout(timeoutId);
      console.warn("Upstash Redis rate-limit sync note:", redisErr);
      // Fallback cleanly to in-memory check
    }
  }

  return { allowed: true };
}

/**
 * Records a successful submission to update rate limit counters.
 */
export function recordContactSubmission(clientIp: string, email: string) {
  const now = Date.now();
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedIp = clientIp.trim();

  // Prune expired entries
  pruneExpiredEntries(now);

  // 1. Increment Global Surge Counter
  globalMinuteCount++;

  // 2. Set IP Burst Timestamp
  ipCooldownMap.set(normalizedIp, now);

  // 3. Update IP Hourly Map
  const currentIpEntry = ipHourlyMap.get(normalizedIp);
  if (!currentIpEntry || now > currentIpEntry.resetTime) {
    ipHourlyMap.set(normalizedIp, {
      count: 1,
      lastTimestamp: now,
      resetTime: now + HOURLY_WINDOW_MS,
    });
  } else {
    currentIpEntry.count++;
    currentIpEntry.lastTimestamp = now;
  }

  // 4. Update Email Hourly Map
  const currentEmailEntry = emailHourlyMap.get(normalizedEmail);
  if (!currentEmailEntry || now > currentEmailEntry.resetTime) {
    emailHourlyMap.set(normalizedEmail, {
      count: 1,
      lastTimestamp: now,
      resetTime: now + HOURLY_WINDOW_MS,
    });
  } else {
    currentEmailEntry.count++;
    currentEmailEntry.lastTimestamp = now;
  }

  // 5. Atomic Upstash Redis Increment with 1-hour expiry
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (redisUrl && redisToken) {
    const redisKey = `ratelimit:contact:ip:${normalizedIp.replace(/[^a-zA-Z0-9_]/g, "_")}`;
    fetch(`${redisUrl}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${redisToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        ["INCR", redisKey],
        ["EXPIRE", redisKey, 3600],
      ]),
    }).catch(() => {});
  }
}
