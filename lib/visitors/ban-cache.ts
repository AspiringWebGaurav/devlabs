export interface CachedBanStatus {
  banned: boolean;
  reason?: string;
  cachedAt: number;
  expiresAt: number;
}

interface BanCacheHolder {
  __visitor_ban_cache?: Map<string, CachedBanStatus>;
}

const globalForBanCache = globalThis as unknown as BanCacheHolder;

if (!globalForBanCache.__visitor_ban_cache) {
  globalForBanCache.__visitor_ban_cache = new Map<string, CachedBanStatus>();
}

const banCache = globalForBanCache.__visitor_ban_cache;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes TTL

/**
 * Checks in-memory cache for a visitor or machine hash's ban status.
 */
export function getCachedBanStatus(identifier: string | undefined | null): CachedBanStatus | null {
  if (!identifier) return null;
  const cleanId = identifier.trim();
  const entry = banCache.get(cleanId);
  if (!entry) return null;

  if (Date.now() > entry.expiresAt) {
    banCache.delete(cleanId);
    return null;
  }

  return entry;
}

/**
 * Sets ban status in in-memory cache with TTL across visitor ID and optional machine hash.
 */
export function setCachedBanStatus(
  identifier: string,
  banned: boolean,
  reason?: string,
  machineHash?: string
): void {
  if (!identifier) return;
  const now = Date.now();
  const banObj: CachedBanStatus = {
    banned,
    reason,
    cachedAt: now,
    expiresAt: now + CACHE_TTL_MS,
  };

  banCache.set(identifier.trim(), banObj);
  if (machineHash && machineHash.trim()) {
    banCache.set(machineHash.trim(), banObj);
  }
}

/**
 * Invalidates and evicts a visitor and optional machine hash from the ban cache immediately.
 */
export function invalidateBanCache(identifier: string, machineHash?: string): void {
  if (identifier) banCache.delete(identifier.trim());
  if (machineHash) banCache.delete(machineHash.trim());
}

/**
 * Clears all expired entries from ban cache (garbage collector).
 */
export function pruneBanCache(): void {
  const now = Date.now();
  for (const [id, entry] of banCache.entries()) {
    if (now > entry.expiresAt) {
      banCache.delete(id);
    }
  }
}
