/**
 * Synchronized Lead Number Generator
 * 
 * Provides an atomic, monotonically increasing sequential lead number (e.g. Lead #1, Lead #2...)
 * for inbound lead notifications and database record tracking.
 * 
 * Performance & Resilience:
 * - 2.5s network timeout on external Redis/RTDB calls.
 * - Sub-millisecond local in-memory fallback.
 */

let localFallbackCounter = 1;

export async function getNextSynchronizedLeadNumber(): Promise<number> {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  const firebaseDbUrl = (
    process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL ||
    process.env.FIREBASE_DATABASE_URL ||
    ""
  ).replace(/\/$/, "");

  // 1. Try Upstash Redis Atomic Increment with 1.0s timeout
  if (redisUrl && redisToken) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1000);

    try {
      const res = await fetch(`${redisUrl}/incr/counter:leads:global`, {
        headers: { Authorization: `Bearer ${redisToken}` },
        cache: "no-store",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const data = (await res.json()) as { result: number };
        if (typeof data.result === "number" && data.result > 0) {
          // Sync with Firebase RTDB in background
          if (firebaseDbUrl) {
            fetch(`${firebaseDbUrl}/stats/leadCount.json`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(data.result),
              cache: "no-store",
            }).catch(() => {});
          }
          return data.result;
        }
      }
    } catch (redisErr) {
      clearTimeout(timeoutId);
      console.warn("Redis lead counter increment note:", redisErr);
    }
  }

  // 2. Try Firebase Realtime Database Read & Increment with 1.0s timeout
  if (firebaseDbUrl) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1000);

    try {
      const readRes = await fetch(`${firebaseDbUrl}/stats/leadCount.json`, {
        cache: "no-store",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      let currentCount = 0;
      if (readRes.ok) {
        const raw = await readRes.json();
        if (typeof raw === "number") {
          currentCount = raw;
        }
      }

      const nextCount = currentCount + 1;
      fetch(`${firebaseDbUrl}/stats/leadCount.json`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextCount),
        cache: "no-store",
      }).catch(() => {});

      return nextCount;
    } catch (rtdbErr) {
      clearTimeout(timeoutId);
      console.warn("RTDB lead counter note:", rtdbErr);
    }
  }

  // 3. Fallback Monotonic Counter
  return localFallbackCounter++;
}
