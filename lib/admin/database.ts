import { posts as defaultPosts } from "@/data/blog/posts";
import { projects as defaultProjects } from "@/data/index";
import { BlogPost } from "@/types/blog";
import { adminDb, isFirebaseAdminConfigured } from "@/lib/admin/firebase-admin";
import type { DataSnapshot } from "firebase-admin/database";

import type { DatabaseStats } from "@/types/admin";
export type { DatabaseStats };

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/$/, "");
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

// Local runtime fallback cache
interface RuntimeStore {
  posts: BlogPost[];
  projects: typeof defaultProjects;
  messages: Array<{ id: string; name: string; email: string; message: string; date: string }>;
  subscribers: Array<{ id: string; email: string; subscribedAt: string }>;
  telemetryNodes: Array<{ id: string; path: string; timestamp: number; ipHash: string }>;
  isPurged: boolean;
  lastPurgedAt: string | null;
}

const globalForDb = globalThis as unknown as {
  __admin_runtime_store?: RuntimeStore;
};

function getRuntimeStore(): RuntimeStore {
  if (!globalForDb.__admin_runtime_store) {
    globalForDb.__admin_runtime_store = {
      posts: [...defaultPosts],
      projects: [...defaultProjects],
      messages: [
        {
          id: "msg_01",
          name: "Acme Enterprise",
          email: "contact@acme.com",
          message: "Looking for full-stack consultation.",
          date: new Date().toISOString(),
        },
      ],
      subscribers: [
        { id: "sub_01", email: "contact@gauravpatil.online", subscribedAt: new Date().toISOString() },
      ],
      telemetryNodes: [],
      isPurged: false,
      lastPurgedAt: null,
    };
  }
  return globalForDb.__admin_runtime_store;
}

// Timeout helper to avoid hanging
function withTimeout<T>(promise: Promise<T>, timeoutMs = 4000, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), timeoutMs)),
  ]);
}

const FIREBASE_DB_URL = (
  process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL ||
  process.env.FIREBASE_DATABASE_URL ||
  "https://portfolio-admin-default-rtdb.firebaseio.com"
).replace(/\/$/, "");

/**
 * Real-time Database Telemetry Aggregator.
 */
export async function getDatabaseStats(): Promise<DatabaseStats> {
  const store = getRuntimeStore();
  let redisLatency = 0;
  let redisKeys = store.isPurged ? 0 : 1;

  // 1. Upstash Redis Telemetry
  if (REDIS_URL && REDIS_TOKEN) {
    try {
      const startPing = Date.now();
      const res = await withTimeout<Response | null>(
        fetch(`${REDIS_URL}/dbsize`, {
          headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
          cache: "no-store",
        }),
        2500,
        null
      );
      redisLatency = Date.now() - startPing;

      if (res && res.ok) {
        const sizeData = await res.json();
        redisKeys = typeof sizeData.result === "number" ? sizeData.result : 0;
      }
    } catch {
      redisKeys = store.isPurged ? 0 : 1;
    }
  }

  // 2. Query Firebase Realtime Database via REST API (fastest, zero-config on Vercel)
  if (FIREBASE_DB_URL) {
    try {
      const res = await withTimeout<Response | null>(
        fetch(`${FIREBASE_DB_URL}/.json`, { cache: "no-store" }),
        3000,
        null
      );
      if (res && res.ok) {
        const val = await res.json();
        if (val && typeof val === "object") {
          const postsCount = val.posts ? Object.keys(val.posts).length : 0;
          const projectsCount = val.projects ? Object.keys(val.projects).length : 0;
          const messagesCount = val.messages ? Object.keys(val.messages).length : 0;
          const subscribersCount = val.subscribers ? Object.keys(val.subscribers).length : 0;
          const isPurged =
            val.meta?.purged === true ||
            (postsCount === 0 && projectsCount === 0 && messagesCount === 0 && subscribersCount === 0);
          const payloadBytes = isPurged ? 0 : new TextEncoder().encode(JSON.stringify(val)).length;

          return {
            postsCount,
            projectsCount,
            messagesCount,
            subscribersCount,
            telemetryCount: val.telemetry ? Object.keys(val.telemetry).length : 0,
            cacheKeysCount: isPurged ? 0 : redisKeys,
            databaseStatus: isPurged ? "OFFLINE" : "ONLINE",
            storageUsedBytes: payloadBytes,
            lastPurgedAt: val.meta?.lastPurgedAt || store.lastPurgedAt,
            isPurged,
            redisLatencyMs: redisLatency,
          };
        }
      }
    } catch {
      // Fall through to Admin SDK / Runtime
    }
  }

  // 3. Query Firebase Realtime Database via Admin SDK if configured
  if (isFirebaseAdminConfigured()) {
    try {
      const snapshot = await withTimeout<DataSnapshot | null>(
        adminDb.ref("/").once("value"),
        3500,
        null
      );

      if (snapshot && snapshot.exists()) {
        const val = snapshot.val();
        if (val && typeof val === "object") {
          const postsCount = val.posts ? Object.keys(val.posts).length : 0;
          const projectsCount = val.projects ? Object.keys(val.projects).length : 0;
          const messagesCount = val.messages ? Object.keys(val.messages).length : 0;
          const subscribersCount = val.subscribers ? Object.keys(val.subscribers).length : 0;
          const isPurged =
            val.meta?.purged === true ||
            (postsCount === 0 && projectsCount === 0 && messagesCount === 0 && subscribersCount === 0);
          const payloadBytes = isPurged ? 0 : new TextEncoder().encode(JSON.stringify(val)).length;

          return {
            postsCount,
            projectsCount,
            messagesCount,
            subscribersCount,
            telemetryCount: val.telemetry ? Object.keys(val.telemetry).length : 0,
            cacheKeysCount: isPurged ? 0 : redisKeys,
            databaseStatus: isPurged ? "OFFLINE" : "ONLINE",
            storageUsedBytes: payloadBytes,
            lastPurgedAt: val.meta?.lastPurgedAt || store.lastPurgedAt,
            isPurged,
            redisLatencyMs: redisLatency,
          };
        }
      }
    } catch {
      // Fall through to memory
    }
  }

  // 4. Memory Cache Fallback
  const totalLiveDocs =
    store.posts.length + store.projects.length + store.messages.length + store.subscribers.length;
  const liveStorePayload = {
    posts: store.posts,
    projects: store.projects,
    messages: store.messages,
    subscribers: store.subscribers,
  };
  const calculatedBytes = store.isPurged
    ? 0
    : new TextEncoder().encode(JSON.stringify(liveStorePayload)).length;

  return {
    postsCount: store.posts.length,
    projectsCount: store.projects.length,
    messagesCount: store.messages.length,
    subscribersCount: store.subscribers.length,
    telemetryCount: store.telemetryNodes.length,
    cacheKeysCount: store.isPurged ? 0 : redisKeys,
    databaseStatus: store.isPurged ? "OFFLINE" : "ONLINE",
    storageUsedBytes: calculatedBytes,
    lastPurgedAt: store.lastPurgedAt,
    isPurged: store.isPurged || totalLiveDocs === 0,
    redisLatencyMs: redisLatency,
  };
}

/**
 * Nuclear Database Purge to exactly 0 documents via Direct Firebase REST API & Admin SDK.
 */
export async function purgeEntireDatabase(options: {
  preserveAuth?: boolean;
} = {}): Promise<{
  success: boolean;
  purgedAt: string;
}> {
  const preserveAuth = options.preserveAuth !== false;
  const store = getRuntimeStore();
  const purgedAt = new Date().toISOString();

  // 1. Wipe Firebase Realtime DB via Direct REST API (Failsafe & Fast)
  if (FIREBASE_DB_URL) {
    try {
      if (preserveAuth) {
        await Promise.allSettled([
          fetch(`${FIREBASE_DB_URL}/posts.json`, { method: "DELETE", cache: "no-store" }),
          fetch(`${FIREBASE_DB_URL}/projects.json`, { method: "DELETE", cache: "no-store" }),
          fetch(`${FIREBASE_DB_URL}/messages.json`, { method: "DELETE", cache: "no-store" }),
          fetch(`${FIREBASE_DB_URL}/subscribers.json`, { method: "DELETE", cache: "no-store" }),
          fetch(`${FIREBASE_DB_URL}/telemetry.json`, { method: "DELETE", cache: "no-store" }),
          fetch(`${FIREBASE_DB_URL}/meta.json`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              purged: true,
              lastPurgedAt: purgedAt,
              authPreserved: true,
            }),
            cache: "no-store",
          }),
        ]);
      } else {
        await fetch(`${FIREBASE_DB_URL}/.json`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            meta: {
              purged: true,
              lastPurgedAt: purgedAt,
              authPreserved: false,
            },
          }),
          cache: "no-store",
        });
      }
    } catch (err) {
      console.warn("Firebase RTDB REST wipe note:", err);
    }
  }

  // 2. Wipe Firebase Realtime DB using Admin SDK Service Account Key (if configured)
  if (isFirebaseAdminConfigured()) {
    try {
      if (preserveAuth) {
        await withTimeout<void>(
          Promise.all([
            adminDb.ref("/posts").set(null),
            adminDb.ref("/projects").set(null),
            adminDb.ref("/messages").set(null),
            adminDb.ref("/subscribers").set(null),
            adminDb.ref("/telemetry").set(null),
            adminDb.ref("/meta").set({
              purged: true,
              lastPurgedAt: purgedAt,
              authPreserved: true,
            }),
          ]).then(() => undefined),
          3000,
          undefined
        );
      } else {
        await withTimeout<void>(
          adminDb.ref("/").set({
            meta: {
              purged: true,
              lastPurgedAt: purgedAt,
              authPreserved: false,
            },
          }),
          3000,
          undefined
        );
      }
    } catch (err) {
      console.warn("Firebase Admin SDK wipe note:", err);
    }
  }

  // 3. Flush Redis Cache
  if (REDIS_URL && REDIS_TOKEN) {
    try {
      await withTimeout<Response | null>(
        fetch(`${REDIS_URL}/flushdb`, {
          headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
        }),
        2500,
        null
      );
    } catch (err) {
      console.warn("Redis flush note:", err);
    }
  }

  // 4. Wipe Runtime Memory Cache
  store.posts = [];
  store.projects = [];
  store.messages = [];
  store.subscribers = [];
  store.telemetryNodes = [];
  store.isPurged = true;
  store.lastPurgedAt = purgedAt;

  return {
    success: true,
    purgedAt,
  };
}

/**
 * Seed Default Database via Direct Firebase REST API & Admin SDK.
 */
export async function seedDefaultDatabase(): Promise<{
  success: boolean;
}> {
  const store = getRuntimeStore();

  const seedPayload = {
    posts: defaultPosts.reduce((acc, p) => ({ ...acc, [p.id]: p }), {}),
    projects: defaultProjects.reduce((acc, p) => ({ ...acc, [p.id]: p }), {}),
    messages: {
      msg_01: {
        id: "msg_01",
        name: "Acme Enterprise",
        email: "contact@acme.com",
        message: "Looking for full-stack consultation.",
        date: new Date().toISOString(),
      },
    },
    subscribers: {
      sub_01: { id: "sub_01", email: "contact@gauravpatil.online", subscribedAt: new Date().toISOString() },
    },
    meta: {
      purged: false,
      lastPurgedAt: null,
      seededAt: new Date().toISOString(),
    },
  };

  if (FIREBASE_DB_URL) {
    try {
      await fetch(`${FIREBASE_DB_URL}/.json`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(seedPayload),
        cache: "no-store",
      });
    } catch (err) {
      console.warn("Firebase RTDB REST seed note:", err);
    }
  }

  if (isFirebaseAdminConfigured()) {
    try {
      await withTimeout<void>(adminDb.ref("/").set(seedPayload), 3000, undefined);
    } catch (err) {
      console.warn("Firebase Admin SDK seed note:", err);
    }
  }

  store.posts = [...defaultPosts];
  store.projects = [...defaultProjects];
  store.messages = [
    {
      id: "msg_01",
      name: "Acme Enterprise",
      email: "contact@acme.com",
      message: "Looking for full-stack consultation.",
      date: new Date().toISOString(),
    },
  ];
  store.subscribers = [{ id: "sub_01", email: "contact@gauravpatil.online", subscribedAt: new Date().toISOString() }];
  store.isPurged = false;
  store.lastPurgedAt = null;

  return {
    success: true,
  };
}

/**
 * Live Post Fetcher for Portfolio DAL.
 */
export async function getActiveDbPosts(): Promise<BlogPost[]> {
  if (isFirebaseAdminConfigured()) {
    try {
      const snapshot = await withTimeout<DataSnapshot | null>(
        adminDb.ref("/posts").once("value"),
        3000,
        null
      );
      if (snapshot && snapshot.exists()) {
        const data = snapshot.val();
        if (!data) return [];
        return Object.values(data);
      }
    } catch {
      // Fallback to runtime
    }
  }

  return getRuntimeStore().posts;
}
