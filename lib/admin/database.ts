import { posts as defaultPosts } from "@/data/blog/posts";
import { projects as defaultProjects } from "@/data/index";
import { BlogPost } from "@/types/blog";
import { getAdminFirestore, adminDb, isFirebaseAdminConfigured } from "@/lib/admin/firebase-admin";
import type { DataSnapshot } from "firebase-admin/database";
import type { DatabaseStats } from "@/types/admin";

export type { DatabaseStats };

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

/**
 * Data Access Layer: Returns active blog posts from Cloud Firestore or fallback.
 */
export async function getActiveDbPosts(): Promise<BlogPost[]> {
  const store = getRuntimeStore();
  if (store.isPurged) return [];

  const firestore = getAdminFirestore();
  if (firestore) {
    try {
      const snap = await firestore.collection("posts").get();
      if (!snap.empty) {
        const posts: BlogPost[] = [];
        snap.forEach((doc) => posts.push(doc.data() as BlogPost));
        return posts;
      }
    } catch {
      // Fall through to store
    }
  }

  return store.posts;
}

/**
 * Data Access Layer: Returns active projects from Cloud Firestore or fallback.
 */
export async function getActiveDbProjects(): Promise<typeof defaultProjects> {
  const store = getRuntimeStore();
  if (store.isPurged) return [];

  const firestore = getAdminFirestore();
  if (firestore) {
    try {
      const snap = await firestore.collection("projects").get();
      if (!snap.empty) {
        const projects: typeof defaultProjects = [];
        snap.forEach((doc) => projects.push(doc.data() as (typeof defaultProjects)[0]));
        return projects;
      }
    } catch {
      // Fall through to store
    }
  }

  return store.projects;
}

/**
 * Real-time Database Telemetry Aggregator querying Cloud Firestore & fallback systems.
 */
export async function getDatabaseStats(): Promise<DatabaseStats> {
  const store = getRuntimeStore();
  const firestore = getAdminFirestore();

  // 1. Direct Cloud Firestore Inspection (Primary Database)
  if (firestore) {
    try {
      const [
        visitorsSnap,
        sessionsSnap,
        appealsSnap,
        postsSnap,
        projectsSnap,
        messagesSnap,
        subscribersSnap,
      ] = await Promise.allSettled([
        firestore.collection("visitors").get(),
        firestore.collection("visitor_sessions").get(),
        firestore.collection("visitor_appeals").get(),
        firestore.collection("posts").get(),
        firestore.collection("projects").get(),
        firestore.collection("messages").get(),
        firestore.collection("subscribers").get(),
      ]);

      const visitorsCount = visitorsSnap.status === "fulfilled" ? visitorsSnap.value.size : 0;
      const sessionsCount = sessionsSnap.status === "fulfilled" ? sessionsSnap.value.size : 0;
      const appealsCount = appealsSnap.status === "fulfilled" ? appealsSnap.value.size : 0;
      const postsCount = postsSnap.status === "fulfilled" ? postsSnap.value.size : (store.isPurged ? 0 : defaultPosts.length);
      const projectsCount = projectsSnap.status === "fulfilled" ? projectsSnap.value.size : (store.isPurged ? 0 : defaultProjects.length);
      const messagesCount = messagesSnap.status === "fulfilled" ? messagesSnap.value.size : (store.isPurged ? 0 : store.messages.length);
      const subscribersCount = subscribersSnap.status === "fulfilled" ? subscribersSnap.value.size : (store.isPurged ? 0 : store.subscribers.length);

      const totalDocs = visitorsCount + sessionsCount + appealsCount + postsCount + projectsCount + messagesCount + subscribersCount;
      const isPurged = totalDocs === 0;

      // Estimate live payload size in bytes
      const storageUsedBytes = totalDocs * 1240;

      return {
        postsCount,
        projectsCount,
        messagesCount,
        subscribersCount,
        telemetryCount: sessionsCount,
        visitorsCount,
        sessionsCount,
        cacheKeysCount: isPurged ? 0 : 1,
        databaseStatus: "ONLINE",
        storageUsedBytes,
        lastPurgedAt: store.lastPurgedAt,
        isPurged,
        redisLatencyMs: 0,
        databaseType: "Firestore",
        collections: {
          visitors: visitorsCount,
          visitor_sessions: sessionsCount,
          visitor_appeals: appealsCount,
          posts: postsCount,
          projects: projectsCount,
          messages: messagesCount,
          subscribers: subscribersCount,
        },
      };
    } catch (err) {
      console.warn("Firestore getDatabaseStats note:", err);
    }
  }

  // 2. Query Firebase Realtime Database via Admin SDK if configured
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
            cacheKeysCount: isPurged ? 0 : 1,
            databaseStatus: isPurged ? "OFFLINE" : "ONLINE",
            storageUsedBytes: payloadBytes,
            lastPurgedAt: val.meta?.lastPurgedAt || store.lastPurgedAt,
            isPurged,
            redisLatencyMs: 0,
            databaseType: "RealtimeDB",
          };
        }
      }
    } catch {
      // Fall through to memory
    }
  }

  // 3. Memory Cache Fallback
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
    cacheKeysCount: store.isPurged ? 0 : 1,
    databaseStatus: store.isPurged ? "OFFLINE" : "ONLINE",
    storageUsedBytes: calculatedBytes,
    lastPurgedAt: store.lastPurgedAt,
    isPurged: store.isPurged || totalLiveDocs === 0,
    redisLatencyMs: 0,
    databaseType: "Firestore",
  };
}

/**
 * Nuclear Database Purge to exactly 0 documents via Cloud Firestore & Admin SDK.
 */
export async function purgeEntireDatabase(options: {
  preserveAuth?: boolean;
} = {}): Promise<{
  success: boolean;
  purgedAt: string;
}> {
  const store = getRuntimeStore();
  const purgedAt = new Date().toISOString();
  const firestore = getAdminFirestore();
  const preserveAuth = options.preserveAuth !== false;

  // 1. Wipe Firestore collections (batched safely in chunks of 450 to avoid Firestore 500-op limit)
  if (firestore) {
    try {
      const collectionsToWipe = [
        "posts",
        "projects",
        "messages",
        "subscribers",
        "visitors",
        "visitor_sessions",
        "visitor_appeals",
      ];
      if (!preserveAuth) {
        collectionsToWipe.push("admin_sessions");
      }
      for (const colName of collectionsToWipe) {
        const snap = await firestore.collection(colName).get();
        if (!snap.empty) {
          for (let i = 0; i < snap.docs.length; i += 450) {
            const chunk = snap.docs.slice(i, i + 450);
            const batch = firestore.batch();
            chunk.forEach((doc) => batch.delete(doc.ref));
            await batch.commit();
          }
        }
      }
    } catch (err) {
      console.warn("Firestore purge note:", err);
    }
  }

  // 2. Wipe Realtime DB if configured
  if (isFirebaseAdminConfigured()) {
    try {
      await adminDb.ref("/posts").set(null);
      await adminDb.ref("/projects").set(null);
      await adminDb.ref("/messages").set(null);
      await adminDb.ref("/subscribers").set(null);
      await adminDb.ref("/visitors").set(null);
      await adminDb.ref("/visitor_sessions").set(null);
      await adminDb.ref("/visitor_appeals").set(null);
    } catch {
      // Ignored
    }
  }

  // 3. Update memory store
  store.posts = [];
  store.projects = [];
  store.messages = [];
  store.subscribers = [];
  store.telemetryNodes = [];
  store.isPurged = true;
  store.lastPurgedAt = purgedAt;

  // Clear global in-memory visitor stores
  const globalStore = globalThis as unknown as {
    __visitor_in_memory_store?: {
      visitors: Map<string, unknown>;
      sessions: Map<string, unknown>;
      appeals: Map<string, unknown>;
      machineIndex: Map<string, string>;
    };
  };
  if (globalStore.__visitor_in_memory_store) {
    globalStore.__visitor_in_memory_store.visitors.clear();
    globalStore.__visitor_in_memory_store.sessions.clear();
    globalStore.__visitor_in_memory_store.appeals.clear();
    globalStore.__visitor_in_memory_store.machineIndex.clear();
  }

  return { success: true, purgedAt };
}

/**
 * Seeds default database records into Cloud Firestore and runtime stores.
 */
export async function seedDefaultDatabase(): Promise<{
  success: boolean;
  seededAt: string;
  counts: { posts: number; projects: number; messages: number; subscribers: number };
}> {
  const store = getRuntimeStore();
  const seededAt = new Date().toISOString();
  const firestore = getAdminFirestore();

  // 1. Seed Cloud Firestore
  if (firestore) {
    try {
      const batch = firestore.batch();
      for (const post of defaultPosts) {
        const docRef = firestore.collection("posts").doc(post.slug);
        batch.set(docRef, post, { merge: true });
      }
      for (const project of defaultProjects) {
        const docRef = firestore.collection("projects").doc(String(project.id));
        batch.set(docRef, project, { merge: true });
      }
      await batch.commit();
    } catch (err) {
      console.warn("Firestore seed note:", err);
    }
  }

  // 2. Seed Realtime DB if configured
  if (isFirebaseAdminConfigured()) {
    try {
      await adminDb.ref("/posts").set(defaultPosts);
      await adminDb.ref("/projects").set(defaultProjects);
    } catch {
      // Ignored
    }
  }

  // 3. Update memory store
  store.posts = [...defaultPosts];
  store.projects = [...defaultProjects];
  store.messages = [
    {
      id: "msg_01",
      name: "Acme Enterprise",
      email: "contact@acme.com",
      message: "Looking for full-stack consultation.",
      date: seededAt,
    },
  ];
  store.subscribers = [
    { id: "sub_01", email: "contact@gauravpatil.online", subscribedAt: seededAt },
  ];
  store.isPurged = false;

  return {
    success: true,
    seededAt,
    counts: {
      posts: store.posts.length,
      projects: store.projects.length,
      messages: store.messages.length,
      subscribers: store.subscribers.length,
    },
  };
}
