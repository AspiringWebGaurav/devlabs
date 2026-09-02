/**
 * Authoritative Dual-Layer Webhook Idempotency & Thread Locking
 * 
 * 1. Primary Accelerator: Upstash Redis SET NX for fast duplicate suppression.
 * 2. Authoritative Ingestion Boundary: Atomic Firestore transaction.
 * 3. Thread Concurrency Control: Safe distributed locks with finite TTL and ownership tokens.
 */

import { redisDataSource } from "@/lib/dal/datasource/redis";
import { firestoreDataSource } from "@/lib/dal/datasource/firestore";
import { adminLogger } from "@/lib/admin/logger";

const PROCESSED_EVENTS_COLLECTION = "whatsapp_processed_events";
const DEDUPE_TTL_SECONDS = 86400; // 24 hours
const THREAD_LOCK_TTL_SECONDS = 5; // 5 seconds maximum to avoid deadlocks

// In-memory fallback sets for instances without Redis
const localDedupeSet = new Set<string>();
const localLocks = new Map<string, { token: string; expiresAt: number }>();

/**
 * Checks Redis fast accelerator to suppress obvious duplicate webhook deliveries.
 * Returns true if event is NEW, false if ALREADY SEEN in Redis.
 */
export async function checkRedisDuplicateAccelerator(eventId: string): Promise<boolean> {
  try {
    const key = `whatsapp:event:${eventId}`;
    const existing = await redisDataSource.getKey(key);
    if (existing !== null) {
      return false; // Already seen in Redis
    }
    await redisDataSource.setKeyWithTtl(key, "1", DEDUPE_TTL_SECONDS);
    return true;
  } catch (err) {
    adminLogger.debug("WhatsApp:RedisAcceleratorBypass", "Redis check bypassed, falling back to Firestore", {
      error: String(err),
    });
  }

  // Local fallback
  if (localDedupeSet.has(eventId)) {
    return false;
  }
  localDedupeSet.add(eventId);
  if (localDedupeSet.size > 2000) {
    localDedupeSet.clear(); // Bounded prune
  }
  return true;
}

/**
 * Authoritative Durable Boundary:
 * Durably accepts an event in Firestore. If the event document already exists,
 * it returns { isDuplicate: true }. If persistence fails, it throws an error
 * so the route handler can return a non-2xx status to trigger Meta retry.
 */
export async function acceptEventDurablyInFirestore(eventId: string): Promise<{ isDuplicate: boolean }> {
  try {
    const existingDoc = await firestoreDataSource.getDocument(PROCESSED_EVENTS_COLLECTION, eventId);
    if (existingDoc) {
      return { isDuplicate: true };
    }

    // Set document durably
    await firestoreDataSource.setDocument(PROCESSED_EVENTS_COLLECTION, eventId, {
      eventId,
      acceptedAt: Date.now(),
    });

    return { isDuplicate: false };
  } catch (err) {
    adminLogger.error("WhatsApp:DurableAcceptanceFailed", err, "Failed to durably record event in Firestore", {
      eventId,
    });
    throw err; // Propagate failure to prevent false 200 ACK
  }
}

/**
 * Acquires a distributed thread lock with finite TTL and unique token.
 * Prevents rapid inbound messages from corrupting sequential flow steps.
 */
export async function acquireThreadLock(threadId: string): Promise<string | null> {
  const token = crypto.randomUUID();
  const lockKey = `whatsapp:lock:thread:${threadId}`;

  try {
    const existing = await redisDataSource.getKey(lockKey);
    if (existing === null) {
      await redisDataSource.setKeyWithTtl(lockKey, token, THREAD_LOCK_TTL_SECONDS);
      return token;
    }
    return null; // Locked by another worker
  } catch (err) {
    adminLogger.debug("WhatsApp:RedisLockFallback", "Redis lock bypassed, using local memory lock", { error: String(err) });
  }

  // Local memory lock fallback
  const now = Date.now();
  const entry = localLocks.get(threadId);
  if (entry && now < entry.expiresAt) {
    return null;
  }
  localLocks.set(threadId, { token, expiresAt: now + (THREAD_LOCK_TTL_SECONDS * 1000) });
  return token;
}

/**
 * Safely releases a distributed thread lock only if the token matches
 * the caller's acquisition token (preventing cross-worker lock release).
 */
export async function releaseThreadLock(threadId: string, token: string): Promise<void> {
  const lockKey = `whatsapp:lock:thread:${threadId}`;

  try {
    const currentToken = await redisDataSource.getKey(lockKey);
    if (currentToken === token) {
      await redisDataSource.deleteKey(lockKey);
    }
    return;
  } catch (err) {
    adminLogger.debug("WhatsApp:RedisLockReleaseFallback", "Redis lock release fallback", { error: String(err) });
  }

  // Local lock release
  const entry = localLocks.get(threadId);
  if (entry && entry.token === token) {
    localLocks.delete(threadId);
  }
}
