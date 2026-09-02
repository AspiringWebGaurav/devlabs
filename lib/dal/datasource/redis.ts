/**
 * Upstash Redis REST Data Source
 * 
 * Provides resilient, low-latency communication with Upstash Redis REST API
 * for rate limiting, distributed locking, and administrative lifecycle sanitation.
 */

import { fetchWithTimeout } from "@/lib/api/fetcher";
import { adminLogger } from "@/lib/admin/logger";

export interface RedisHealthInfo {
  connected: boolean;
  dbsize: number;
  urlConfigured: boolean;
  tokenConfigured: boolean;
  endpointMasked: string;
  error?: string;
}

export class RedisDataSource {
  private getCredentials(): { url: string | null; token: string | null } {
    const url = process.env.UPSTASH_REDIS_REST_URL || null;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN || null;
    return { url, token };
  }

  /**
   * Returns connection health and key count telemetry.
   */
  public async getDbInfo(): Promise<RedisHealthInfo> {
    const { url, token } = this.getCredentials();
    if (!url || !token) {
      return {
        connected: false,
        dbsize: 0,
        urlConfigured: Boolean(url),
        tokenConfigured: Boolean(token),
        endpointMasked: "UNCONFIGURED",
      };
    }

    const maskedUrl = url.replace(/^https?:\/\//, "").slice(0, 16) + "...";

    try {
      const res = await fetchWithTimeout(
        `${url}/dbsize`,
        {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        },
        2000
      );

      if (!res.ok) {
        throw new Error(`Upstash Redis dbsize returned status ${res.status}: ${res.statusText}`);
      }

      const data = (await res.json()) as { result?: number };
      const dbsize = typeof data.result === "number" ? data.result : 0;

      return {
        connected: true,
        dbsize,
        urlConfigured: true,
        tokenConfigured: true,
        endpointMasked: maskedUrl,
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      adminLogger.warn("RedisDataSource:getDbInfo", "Failed to query Redis health", { error: errorMsg });
      return {
        connected: false,
        dbsize: 0,
        urlConfigured: true,
        tokenConfigured: true,
        endpointMasked: maskedUrl,
        error: errorMsg,
      };
    }
  }

  /**
   * Retrieves the exact number of active keys.
   */
  public async getDbSize(): Promise<number> {
    const info = await this.getDbInfo();
    return info.dbsize;
  }

  /**
   * Flushes the entire dedicated Redis database (FLUSHDB) and verifies DBSIZE === 0.
   */
  public async flushAll(): Promise<{ success: boolean; dbsizeBefore: number; dbsizeAfter: number; error?: string }> {
    const { url, token } = this.getCredentials();
    if (!url || !token) {
      return {
        success: true,
        dbsizeBefore: 0,
        dbsizeAfter: 0,
      };
    }

    const startTime = Date.now();
    let dbsizeBefore = 0;

    try {
      dbsizeBefore = await this.getDbSize();

      // Execute FLUSHDB via REST endpoint
      const flushRes = await fetchWithTimeout(
        `${url}/flushdb`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        },
        4000
      );

      if (!flushRes.ok) {
        throw new Error(`FLUSHDB failed with HTTP status ${flushRes.status}: ${flushRes.statusText}`);
      }

      // Verify post-flush state: DBSIZE must be 0
      const dbsizeAfter = await this.getDbSize();
      if (dbsizeAfter !== 0) {
        throw new Error(`Post-FLUSHDB verification failed: Expected DBSIZE 0, found ${dbsizeAfter}`);
      }

      adminLogger.latency("RedisDataSource:flushAll", Date.now() - startTime, { dbsizeBefore, dbsizeAfter });
      return {
        success: true,
        dbsizeBefore,
        dbsizeAfter,
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      adminLogger.error("RedisDataSource:flushAll", err, "Failed to flush Upstash Redis");
      return {
        success: false,
        dbsizeBefore,
        dbsizeAfter: -1,
        error: errorMsg,
      };
    }
  }

  /**
   * Sets a key with TTL (seconds) for distributed locking.
   */
  public async setKeyWithTtl(key: string, value: string, ttlSeconds: number): Promise<boolean> {
    const { url, token } = this.getCredentials();
    if (!url || !token) return true; // Local memory fallback handled by lock manager

    try {
      const res = await fetchWithTimeout(
        `${url}/set/${encodeURIComponent(key)}/${encodeURIComponent(value)}?ex=${ttlSeconds}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        },
        2000
      );
      return res.ok;
    } catch (err) {
      adminLogger.warn("RedisDataSource:setKeyWithTtl", "Failed to set Redis key", { key, error: String(err) });
      return false;
    }
  }

  /**
   * Retrieves a string key value from Redis.
   */
  public async getKey(key: string): Promise<string | null> {
    const { url, token } = this.getCredentials();
    if (!url || !token) return null;

    try {
      const res = await fetchWithTimeout(
        `${url}/get/${encodeURIComponent(key)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        },
        2000
      );
      if (!res.ok) return null;
      const data = (await res.json()) as { result?: string | null };
      return data.result || null;
    } catch {
      return null;
    }
  }

  /**
   * Deletes a key from Redis.
   */
  public async deleteKey(key: string): Promise<boolean> {
    const { url, token } = this.getCredentials();
    if (!url || !token) return true;

    try {
      const res = await fetchWithTimeout(
        `${url}/del/${encodeURIComponent(key)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        },
        2000
      );
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * Finds all keys matching a pattern (e.g. "counter:*", "ratelimit:*", "cache:*").
   */
  public async getKeysByPattern(pattern: string): Promise<string[]> {
    const { url, token } = this.getCredentials();
    if (!url || !token) return [];

    try {
      const res = await fetchWithTimeout(
        `${url}/keys/${encodeURIComponent(pattern)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        },
        2000
      );
      if (!res.ok) return [];
      const data = (await res.json()) as { result?: string[] };
      return Array.isArray(data.result) ? data.result : [];
    } catch (err) {
      adminLogger.warn("RedisDataSource:getKeysByPattern", "Failed to query keys by pattern", { pattern, error: String(err) });
      return [];
    }
  }

  /**
   * Deletes all keys matching a specific namespace pattern.
   */
  public async deleteKeysByPattern(pattern: string): Promise<number> {
    const keys = await this.getKeysByPattern(pattern);
    let deletedCount = 0;
    for (const key of keys) {
      const ok = await this.deleteKey(key);
      if (ok) deletedCount++;
    }
    return deletedCount;
  }
}

export const redisDataSource = new RedisDataSource();

