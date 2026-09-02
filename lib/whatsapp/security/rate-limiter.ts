/**
 * WhatsApp Per-Phone Inbound Rate Limiter
 * 
 * Prevents message flooding from compromised or malicious sender numbers.
 * Max 30 messages per hour per phone number.
 */

import { redisDataSource } from "@/lib/dal/datasource/redis";
import { adminLogger } from "@/lib/admin/logger";
import { maskPhone } from "./sanitizer";

const MAX_MESSAGES_PER_HOUR = 30;
const WINDOW_SECONDS = 3600;

// Local in-memory fallback map for serverless instances without Redis
const localLimitMap = new Map<string, { count: number; resetAt: number }>();

export async function checkPhoneRateLimit(phone: string): Promise<{ allowed: boolean; currentCount: number }> {
  const masked = maskPhone(phone);
  const now = Date.now();

  // 1. Try Upstash Redis if configured
  try {
    const redisKey = `whatsapp:ratelimit:${phone}`;
    const currentVal = await redisDataSource.getKey(redisKey);

    if (currentVal !== null) {
      const count = parseInt(currentVal, 10) || 0;
      if (count >= MAX_MESSAGES_PER_HOUR) {
        adminLogger.warn("WhatsApp:RateLimitExceeded", "Phone exceeded hourly rate limit", { phone: masked, count });
        return { allowed: false, currentCount: count };
      }
      await redisDataSource.setKeyWithTtl(redisKey, String(count + 1), WINDOW_SECONDS);
      return { allowed: true, currentCount: count + 1 };
    } else {
      await redisDataSource.setKeyWithTtl(redisKey, "1", WINDOW_SECONDS);
      return { allowed: true, currentCount: 1 };
    }
  } catch (err) {
    adminLogger.debug("WhatsApp:RateLimitRedisFallback", "Redis rate limit check skipped, using local fallback", { error: String(err) });
  }

  // 2. In-memory fallback
  const entry = localLimitMap.get(phone);
  if (!entry || now > entry.resetAt) {
    localLimitMap.set(phone, { count: 1, resetAt: now + (WINDOW_SECONDS * 1000) });
    return { allowed: true, currentCount: 1 };
  }

  if (entry.count >= MAX_MESSAGES_PER_HOUR) {
    adminLogger.warn("WhatsApp:RateLimitExceededLocal", "Phone exceeded local hourly limit", { phone: masked, count: entry.count });
    return { allowed: false, currentCount: entry.count };
  }

  entry.count += 1;
  return { allowed: true, currentCount: entry.count };
}
