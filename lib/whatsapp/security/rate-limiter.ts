/**
 * WhatsApp Per-Phone Inbound Rate Limiter
 * 
 * Strict Zero-Infrastructure Standard:
 * - 100% In-Memory Sliding Window (uses no additional scheduler, worker, or Redis infrastructure and is designed to operate within the existing free-tier/resource limits).
 * - Prevents message flooding from compromised or malicious sender numbers.
 * - Max 30 messages per hour per phone number.
 */

import { adminLogger } from "@/lib/admin/logger";
import { maskPhone } from "./sanitizer";

const MAX_MESSAGES_PER_HOUR = 30;
const WINDOW_MS = 3600 * 1000; // 1 hour

// Bounded in-memory map tracking message count and window expiration
const phoneRateMap = new Map<string, { count: number; resetAt: number }>();

export async function checkPhoneRateLimit(phone: string): Promise<{ allowed: boolean; currentCount: number }> {
  const masked = maskPhone(phone);
  const now = Date.now();

  // Periodic bounded cleanup (if map grows beyond 500 active senders)
  if (phoneRateMap.size > 500) {
    for (const [key, entry] of phoneRateMap.entries()) {
      if (now > entry.resetAt) {
        phoneRateMap.delete(key);
      }
    }
  }

  const entry = phoneRateMap.get(phone);

  if (!entry || now > entry.resetAt) {
    phoneRateMap.set(phone, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, currentCount: 1 };
  }

  if (entry.count >= MAX_MESSAGES_PER_HOUR) {
    adminLogger.warn("WhatsApp:RateLimitExceeded", "Phone exceeded hourly rate limit", {
      phone: masked,
      count: entry.count,
    });
    return { allowed: false, currentCount: entry.count };
  }

  entry.count += 1;
  return { allowed: true, currentCount: entry.count };
}
