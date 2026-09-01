/**
 * Fail-Safe Tokenized Lifecycle Execution Lock & Maintenance Guard
 * 
 * Prevents concurrent destructive operations across multiple browser tabs,
 * instances, or background processes, and pauses dynamic writes during purge.
 */

import crypto from "crypto";
import { redisDataSource } from "@/lib/dal/datasource/redis";
import { adminLogger } from "@/lib/admin/logger";

const REDIS_LOCK_KEY = "system:lifecycle:lock";
const LOCK_TTL_SECONDS = 60;

interface MemoryLockRecord {
  token: string;
  executionId: string;
  createdAt: number;
  expiresAt: number;
}

let inMemoryLockRecord: MemoryLockRecord | null = null;

export interface LifecycleLockHandle {
  token: string;
  executionId: string;
  heartbeatInterval: NodeJS.Timeout | null;
}

/**
 * Checks if the lifecycle lock is currently active.
 * Used by dynamic write endpoints (Contact API, Live Chat, etc.) to enforce maintenance mode.
 */
export async function isLifecycleLockActive(): Promise<boolean> {
  const now = Date.now();

  // 1. Check in-process memory lock
  if (inMemoryLockRecord && now < inMemoryLockRecord.expiresAt) {
    return true;
  }

  // 2. Check distributed Redis lock
  const redisLockVal = await redisDataSource.getKey(REDIS_LOCK_KEY);
  return Boolean(redisLockVal);
}

/**
 * Attempts to acquire the exclusive lifecycle execution lock.
 * Returns null if another execution holds the lock.
 */
export async function acquireLifecycleLock(executionId: string): Promise<LifecycleLockHandle | null> {
  const now = Date.now();
  const token = `lock_${executionId}_${crypto.randomBytes(4).toString("hex")}`;

  // 1. Check for active existing lock
  const isActive = await isLifecycleLockActive();
  if (isActive) {
    adminLogger.warn("LifecycleLock:acquireFailed", "Lock already active; rejecting concurrent execution", { executionId });
    return null;
  }

  // 2. Set memory lock
  inMemoryLockRecord = {
    token,
    executionId,
    createdAt: now,
    expiresAt: now + LOCK_TTL_SECONDS * 1000,
  };

  // 3. Set Redis lock with TTL
  await redisDataSource.setKeyWithTtl(REDIS_LOCK_KEY, token, LOCK_TTL_SECONDS);

  // 4. Start heartbeat renewal timer (every 15s to maintain 60s TTL)
  const heartbeatInterval = setInterval(async () => {
    try {
      if (inMemoryLockRecord && inMemoryLockRecord.token === token) {
        inMemoryLockRecord.expiresAt = Date.now() + LOCK_TTL_SECONDS * 1000;
        await redisDataSource.setKeyWithTtl(REDIS_LOCK_KEY, token, LOCK_TTL_SECONDS);
      } else {
        clearInterval(heartbeatInterval);
      }
    } catch (err) {
      adminLogger.warn("LifecycleLock:heartbeatFailed", "Heartbeat renewal failed", { token, error: String(err) });
    }
  }, 15000);

  adminLogger.info("LifecycleLock:acquired", "Exclusive lifecycle lock acquired", { executionId, token });

  return {
    token,
    executionId,
    heartbeatInterval,
  };
}

/**
 * Asserts that the caller still owns the exclusive lock.
 * Throws immediately if ownership was lost or expired.
 */
export async function assertLockOwnership(handle: LifecycleLockHandle): Promise<void> {
  const now = Date.now();

  // 1. Check memory lock token
  if (!inMemoryLockRecord || inMemoryLockRecord.token !== handle.token || now > inMemoryLockRecord.expiresAt) {
    throw new Error(
      `LOCK_OWNERSHIP_LOST: Execution ${handle.executionId} lost in-memory lock ownership. Destructive operation halted.`
    );
  }

  // 2. Check Redis lock token (if Redis is configured)
  const redisVal = await redisDataSource.getKey(REDIS_LOCK_KEY);
  if (redisVal && redisVal !== handle.token) {
    throw new Error(
      `LOCK_OWNERSHIP_LOST: Execution ${handle.executionId} lost distributed Redis lock ownership to ${redisVal}. Destructive operation halted.`
    );
  }
}

/**
 * Releases the lifecycle lock cleanly and stops the heartbeat timer.
 */
export async function releaseLifecycleLock(handle: LifecycleLockHandle | null): Promise<void> {
  if (!handle) return;

  if (handle.heartbeatInterval) {
    clearInterval(handle.heartbeatInterval);
  }

  if (inMemoryLockRecord && inMemoryLockRecord.token === handle.token) {
    inMemoryLockRecord = null;
  }

  try {
    const currentVal = await redisDataSource.getKey(REDIS_LOCK_KEY);
    if (currentVal === handle.token) {
      await redisDataSource.deleteKey(REDIS_LOCK_KEY);
    }
  } catch (err) {
    adminLogger.warn("LifecycleLock:releaseRedisFailed", "Failed to delete Redis lock key", { error: String(err) });
  }

  adminLogger.info("LifecycleLock:released", "Exclusive lifecycle lock released", { executionId: handle.executionId });
}
