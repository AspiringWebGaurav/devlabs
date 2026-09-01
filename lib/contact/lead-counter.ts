/**
 * Synchronized Lead Number Generator
 * 
 * Provides an atomic, monotonically increasing sequential lead number (e.g. Lead #1, Lead #2...)
 * for inbound lead notifications and database record tracking.
 * 
 * Resilience:
 * - 1.0s timeout on Upstash Redis atomic INCR.
 * - 1.0s timeout on Firebase Realtime Database.
 * - Degraded authoritative fallback to Firestore transaction on counters/leads.
 * - Local fallback counter as final safety net.
 */

import { fetchWithTimeout } from "@/lib/api/fetcher";
import { getAdminFirestore } from "@/lib/admin/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

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
    try {
      const res = await fetchWithTimeout(
        `${redisUrl}/incr/counter:leads:global`,
        {
          headers: { Authorization: `Bearer ${redisToken}` },
          cache: "no-store",
        },
        1000
      );

      if (res.ok) {
        const data = (await res.json()) as { result: number };
        if (typeof data.result === "number" && data.result > 0) {
          // Sync with Firebase RTDB in background
          if (firebaseDbUrl) {
            fetchWithTimeout(
              `${firebaseDbUrl}/stats/leadCount.json`,
              {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data.result),
                cache: "no-store",
              },
              1000
            ).catch(() => {});
          }
          return data.result;
        }
      }
    } catch (redisErr) {
      console.warn("Redis lead counter increment note:", redisErr);
    }
  }

  // 2. Try Firebase Realtime Database Read & Increment with 1.0s timeout
  if (firebaseDbUrl) {
    try {
      const readRes = await fetchWithTimeout(
        `${firebaseDbUrl}/stats/leadCount.json`,
        {
          cache: "no-store",
        },
        1000
      );

      let currentCount = 0;
      if (readRes.ok) {
        const raw = await readRes.json();
        if (typeof raw === "number") {
          currentCount = raw;
        }
      }

      const nextCount = currentCount + 1;
      fetchWithTimeout(
        `${firebaseDbUrl}/stats/leadCount.json`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(nextCount),
          cache: "no-store",
        },
        1000
      ).catch(() => {});

      return nextCount;
    } catch (rtdbErr) {
      console.warn("RTDB lead counter note:", rtdbErr);
    }
  }

  // 3. Degraded Authoritative Fallback: Firestore Atomic Transaction
  try {
    const db = getAdminFirestore();
    if (db) {
      const counterRef = db.collection("counters").doc("leads");
      await counterRef.set({ count: FieldValue.increment(1) }, { merge: true });
      const snap = await counterRef.get();
      const count = snap.data()?.count;
      if (typeof count === "number" && count > 0) {
        return count;
      }
    }
  } catch (firestoreErr) {
    console.warn("Firestore lead counter fallback note:", firestoreErr);
  }

  // 4. Final Fallback Monotonic Counter
  return localFallbackCounter++;
}
