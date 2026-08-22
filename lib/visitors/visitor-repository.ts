import { getAdminFirestore, getAdminDb } from "@/lib/admin/firebase-admin";
import {
  Visitor,
  VisitorSession,
  VisitorBan,
  VisitorStatsSummary,
  VisitorAppeal,
  AppealStatus,
} from "./types";
import { setCachedBanStatus, invalidateBanCache } from "./ban-cache";
import { publishVisitorEvent } from "./event-bus";

const VISITORS_COLLECTION = "visitors";
const SESSIONS_COLLECTION = "visitor_sessions";
const APPEALS_COLLECTION = "visitor_appeals";

// Session timeout window: 15 minutes of inactivity before considering a new visit session
const SESSION_INACTIVITY_MS = 15 * 60 * 1000;

// In-memory fallback repository when Firestore is not configured in local environment
interface InMemoryStore {
  visitors: Map<string, Visitor>;
  sessions: Map<string, VisitorSession>;
  appeals: Map<string, VisitorAppeal>;
  machineIndex: Map<string, string>; // machineHash -> visitorId
}

const globalStore = globalThis as unknown as { __visitor_in_memory_store?: InMemoryStore };
if (!globalStore.__visitor_in_memory_store) {
  globalStore.__visitor_in_memory_store = {
    visitors: new Map<string, Visitor>(),
    sessions: new Map<string, VisitorSession>(),
    appeals: new Map<string, VisitorAppeal>(),
    machineIndex: new Map<string, string>(),
  };
}
if (!globalStore.__visitor_in_memory_store.appeals) {
  globalStore.__visitor_in_memory_store.appeals = new Map<string, VisitorAppeal>();
}
if (!globalStore.__visitor_in_memory_store.machineIndex) {
  globalStore.__visitor_in_memory_store.machineIndex = new Map<string, string>();
}
const memStore = globalStore.__visitor_in_memory_store;

/**
 * Deeply cleans an object to ensure no `undefined` values are passed to Firestore.
 */
function cleanForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return null as unknown as T;
  }
  if (Array.isArray(data)) {
    return data
      .filter((item) => item !== undefined)
      .map((item) => cleanForFirestore(item)) as unknown as T;
  }
  if (typeof data === "object" && !(data instanceof Date)) {
    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        cleaned[key] = cleanForFirestore(value);
      }
    }
    return cleaned as T;
  }
  return data;
}

/**
 * Finds an existing visitor by their physical machine fingerprint hash (mfp_...).
 * Enables persistent visitor resolution across normal, incognito, and cleared-cookie tabs.
 */
export async function findVisitorByMachineHash(machineHash: string | undefined | null): Promise<Visitor | null> {
  if (!machineHash) return null;
  const cleanMfp = machineHash.trim();

  // 1. Fast in-memory lookup
  const cachedVisitorId = memStore.machineIndex?.get(cleanMfp);
  if (cachedVisitorId) {
    const memV = memStore.visitors.get(cachedVisitorId);
    if (memV) return memV;
  }

  for (const v of memStore.visitors.values()) {
    if (v.machineHash === cleanMfp || (Array.isArray(v.machineHashes) && v.machineHashes.includes(cleanMfp))) {
      memStore.machineIndex?.set(cleanMfp, v.id);
      return v;
    }
  }

  // 2. Firestore query lookup
  const firestore = getAdminFirestore();
  if (firestore) {
    try {
      const snap = await firestore
        .collection(VISITORS_COLLECTION)
        .where("machineHash", "==", cleanMfp)
        .limit(1)
        .get();

      if (!snap.empty) {
        const found = snap.docs[0].data() as Visitor;
        memStore.visitors.set(found.id, found);
        memStore.machineIndex?.set(cleanMfp, found.id);
        return found;
      }

      // Check machineHashes array
      const arrSnap = await firestore
        .collection(VISITORS_COLLECTION)
        .where("machineHashes", "array-contains", cleanMfp)
        .limit(1)
        .get();

      if (!arrSnap.empty) {
        const found = arrSnap.docs[0].data() as Visitor;
        memStore.visitors.set(found.id, found);
        memStore.machineIndex?.set(cleanMfp, found.id);
        return found;
      }
    } catch {
      // Fall through to RTDB
    }
  }

  // 3. Firebase Realtime Database lookup
  const rtdb = getAdminDb();
  if (rtdb) {
    try {
      const snap = await rtdb.ref(VISITORS_COLLECTION).once("value");
      if (snap.exists()) {
        const val = snap.val();
        if (val && typeof val === "object") {
          for (const item of Object.values(val) as Visitor[]) {
            if (
              item.machineHash === cleanMfp ||
              (Array.isArray(item.machineHashes) && item.machineHashes.includes(cleanMfp))
            ) {
              memStore.visitors.set(item.id, item);
              memStore.machineIndex?.set(cleanMfp, item.id);
              return item;
            }
          }
        }
      }
    } catch (rtdbErr) {
      console.warn("RTDB findVisitorByMachineHash note:", rtdbErr);
    }
  }

  return null;
}

/**
 * Upserts a visitor record into Firestore & Firebase Realtime Database.
 * First visit creates document; repeat visit updates lastSeen, totalVisits, online, and metadata without duplicating.
 * Supports persistent machineHash resolution across normal and incognito tabs.
 */
export async function upsertVisitor(
  visitorId: string,
  data: {
    currentPath: string;
    referrer?: string;
    currentIP: string;
    geo: Visitor["geo"];
    device: Visitor["device"];
    browser: Visitor["browser"];
    viewport?: Visitor["viewport"];
    activeSessionId?: string;
    incrementPage?: boolean;
    machineHash?: string;
  }
): Promise<Visitor> {
  const now = Date.now();
  const firestore = getAdminFirestore();
  const rtdb = getAdminDb();
  const rawMfp = data.machineHash?.trim();

  // If machineHash is present, check if this physical device already has a registered visitor document
  let targetVisitorId = visitorId;
  if (rawMfp) {
    const existingByMfp = await findVisitorByMachineHash(rawMfp);
    if (existingByMfp && existingByMfp.id) {
      targetVisitorId = existingByMfp.id;
    }
  }

  let completeVisitor: Visitor;

  // 1. Check existing record in Firestore or RTDB or Memory
  let existing: Visitor | null = null;

  if (firestore) {
    try {
      const snap = await firestore.collection(VISITORS_COLLECTION).doc(targetVisitorId).get();
      if (snap.exists) {
        existing = snap.data() as Visitor;
      }
    } catch {
      // Fall through to RTDB
    }
  }

  if (!existing && rtdb) {
    try {
      const snap = await rtdb.ref(`${VISITORS_COLLECTION}/${targetVisitorId}`).once("value");
      if (snap.exists()) {
        existing = snap.val() as Visitor;
      }
    } catch {
      // Fall through to memory
    }
  }

  if (!existing) {
    existing = memStore.visitors.get(targetVisitorId) || null;
  }

  if (!existing) {
    // New Visitor Creation
    completeVisitor = {
      id: targetVisitorId,
      machineHash: rawMfp || undefined,
      machineHashes: rawMfp ? [rawMfp] : [],
      firstSeen: now,
      lastSeen: now,
      totalVisits: 1,
      totalPages: 1,
      online: true,
      currentPath: data.currentPath || "/",
      referrer: data.referrer || "",
      currentIP: data.currentIP || "Unknown",
      ipHistory: data.currentIP ? [data.currentIP] : ["Unknown"],
      geo: {
        country: data.geo?.country || "Unknown",
        state: data.geo?.state || "Unknown",
        city: data.geo?.city || "Unknown",
        region: data.geo?.region || "",
        latitude: data.geo?.latitude || 0,
        longitude: data.geo?.longitude || 0,
        isp: data.geo?.isp || "",
        asn: data.geo?.asn || "",
      },
      device: {
        type: data.device?.type || "desktop",
        os: data.device?.os || "Unknown OS",
        osVersion: data.device?.osVersion || "",
        architecture: data.device?.architecture || "",
      },
      browser: {
        name: data.browser?.name || "Unknown Browser",
        version: data.browser?.version || "",
      },
      viewport: data.viewport || {
        width: 1920,
        height: 1080,
        colorScheme: "dark",
        touch: false,
      },
      activeSessionId: data.activeSessionId || "",
      ban: { enabled: false },
      createdAt: now,
      updatedAt: now,
    };
  } else {
    // Existing Visitor Update
    const ipHistory = Array.isArray(existing.ipHistory) ? [...existing.ipHistory] : [];
    if (data.currentIP && !ipHistory.includes(data.currentIP)) {
      ipHistory.push(data.currentIP);
    }

    const machineHashes = Array.isArray(existing.machineHashes) ? [...existing.machineHashes] : [];
    if (rawMfp && !machineHashes.includes(rawMfp)) {
      machineHashes.push(rawMfp);
    }

    const isSessionExpired = now - (existing.lastSeen || 0) > SESSION_INACTIVITY_MS;
    const totalVisits = (existing.totalVisits || 1) + (isSessionExpired ? 1 : 0);
    const totalPages = (existing.totalPages || 1) + (data.incrementPage ? 1 : 0);

    completeVisitor = {
      ...existing,
      machineHash: rawMfp || existing.machineHash,
      machineHashes,
      lastSeen: now,
      totalVisits,
      totalPages,
      online: true,
      currentPath: data.currentPath || existing.currentPath || "/",
      referrer: data.referrer !== undefined ? data.referrer : (existing.referrer || ""),
      currentIP: data.currentIP || existing.currentIP || "Unknown",
      ipHistory: ipHistory.slice(-20),
      geo: {
        country: data.geo?.country || existing.geo?.country || "Unknown",
        state: data.geo?.state || existing.geo?.state || "Unknown",
        city: data.geo?.city || existing.geo?.city || "Unknown",
        region: data.geo?.region || existing.geo?.region || "",
        latitude: data.geo?.latitude ?? existing.geo?.latitude ?? 0,
        longitude: data.geo?.longitude ?? existing.geo?.longitude ?? 0,
        isp: data.geo?.isp || existing.geo?.isp || "",
        asn: data.geo?.asn || existing.geo?.asn || "",
      },
      device: {
        type: data.device?.type || existing.device?.type || "desktop",
        os: data.device?.os || existing.device?.os || "Unknown OS",
        osVersion: data.device?.osVersion || existing.device?.osVersion || "",
        architecture: data.device?.architecture || existing.device?.architecture || "",
      },
      browser: {
        name: data.browser?.name || existing.browser?.name || "Unknown Browser",
        version: data.browser?.version || existing.browser?.version || "",
      },
      viewport: data.viewport || existing.viewport,
      activeSessionId: data.activeSessionId || existing.activeSessionId || "",
      updatedAt: now,
    };
  }

  const cleanedDoc = cleanForFirestore(completeVisitor);

  // 1. Dual-Write to Cloud Firestore
  if (firestore) {
    try {
      await firestore.collection(VISITORS_COLLECTION).doc(targetVisitorId).set(cleanedDoc, { merge: true });
    } catch (err) {
      console.warn("Firestore upsertVisitor note:", err);
    }
  }

  // 2. Dual-Write to Firebase Realtime Database
  if (rtdb) {
    try {
      await rtdb.ref(`${VISITORS_COLLECTION}/${targetVisitorId}`).set(cleanedDoc);
    } catch (err) {
      console.warn("RTDB upsertVisitor note:", err);
    }
  }

  // 3. Update memory store & ban cache
  if (completeVisitor.ban) {
    setCachedBanStatus(targetVisitorId, completeVisitor.ban.enabled, completeVisitor.ban.reason, rawMfp || completeVisitor.machineHash);
  }
  memStore.visitors.set(targetVisitorId, completeVisitor);
  if (rawMfp) memStore.machineIndex?.set(rawMfp, targetVisitorId);

  return completeVisitor;
}

/**
 * Retrieves a visitor by Visitor ID.
 */
export async function getVisitorById(visitorId: string): Promise<Visitor | null> {
  const firestore = getAdminFirestore();
  if (firestore) {
    try {
      const snap = await firestore.collection(VISITORS_COLLECTION).doc(visitorId).get();
      if (snap.exists) {
        return snap.data() as Visitor;
      }
    } catch {
      // Fall through to RTDB
    }
  }

  const rtdb = getAdminDb();
  if (rtdb) {
    try {
      const snap = await rtdb.ref(`${VISITORS_COLLECTION}/${visitorId}`).once("value");
      if (snap.exists()) {
        return snap.val() as Visitor;
      }
    } catch {
      // Fall through to memory
    }
  }

  return memStore.visitors.get(visitorId) || null;
}

/**
 * Lists all visitors for the admin panel with optional filtering.
 * Queries Cloud Firestore + Firebase Realtime Database with deduplication.
 */
export async function listVisitors(options?: {
  limit?: number;
  search?: string;
  status?: "all" | "online" | "banned";
}): Promise<Visitor[]> {
  const maxLimit = options?.limit || 100;
  const visitorMap = new Map<string, Visitor>();

  // 1. Fetch from Cloud Firestore
  const firestore = getAdminFirestore();
  if (firestore) {
    try {
      const snap = await firestore
        .collection(VISITORS_COLLECTION)
        .orderBy("lastSeen", "desc")
        .limit(maxLimit)
        .get();

      snap.forEach((doc) => {
        const v = doc.data() as Visitor;
        if (v && v.id) {
          visitorMap.set(v.id, v);
        }
      });
    } catch (err) {
      console.warn("Firestore listVisitors note:", err);
    }
  }

  // 2. Fetch from Firebase Realtime Database
  const rtdb = getAdminDb();
  if (rtdb) {
    try {
      const snap = await rtdb.ref(VISITORS_COLLECTION).once("value");
      if (snap.exists()) {
        const val = snap.val();
        if (val && typeof val === "object") {
          for (const item of Object.values(val) as Visitor[]) {
            if (item && item.id) {
              const existing = visitorMap.get(item.id);
              if (!existing || (item.lastSeen || 0) > (existing.lastSeen || 0)) {
                visitorMap.set(item.id, item);
              }
            }
          }
        }
      }
    } catch (rtdbErr) {
      console.warn("RTDB listVisitors note:", rtdbErr);
    }
  }

  // 3. Fallback to memory store if both databases are empty
  if (visitorMap.size === 0) {
    for (const [id, v] of memStore.visitors.entries()) {
      visitorMap.set(id, v);
    }
  }

  let results = Array.from(visitorMap.values());

  // Sort by lastSeen descending
  results.sort((a, b) => (b.lastSeen || 0) - (a.lastSeen || 0));

  // Status Filter
  if (options?.status === "online") {
    results = results.filter((v) => v.online);
  } else if (options?.status === "banned") {
    results = results.filter((v) => v.ban?.enabled);
  }

  // Search Filter
  if (options?.search && options.search.trim()) {
    const query = options.search.trim().toLowerCase();
    results = results.filter(
      (v) =>
        v.id.toLowerCase().includes(query) ||
        v.currentIP?.toLowerCase().includes(query) ||
        v.geo?.country?.toLowerCase().includes(query) ||
        v.geo?.city?.toLowerCase().includes(query) ||
        v.currentPath?.toLowerCase().includes(query)
    );
  }

  return results.slice(0, maxLimit);
}

/**
 * Computes live analytics summary for admin cards and charts.
 */
export async function getVisitorStatsSummary(): Promise<VisitorStatsSummary> {
  const visitors = await listVisitors({ limit: 500 });
  const now = Date.now();
  const startOfToday = new Date().setHours(0, 0, 0, 0);

  let onlineNow = 0;
  let todayVisitors = 0;
  let returningVisitors = 0;

  const deviceDistribution: Record<string, number> = {
    desktop: 0,
    mobile: 0,
    tablet: 0,
  };

  const browserDistribution: Record<string, number> = {};
  const countryDistribution: Record<string, number> = {};
  const dailyCountsMap: Record<string, number> = {};

  // Initialize last 7 days buckets
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now - i * 24 * 60 * 60 * 1000);
    const key = `${d.getMonth() + 1}/${d.getDate()}`;
    dailyCountsMap[key] = 0;
  }

  visitors.forEach((v) => {
    if (v.online) onlineNow++;
    if (v.lastSeen >= startOfToday) todayVisitors++;
    if (v.totalVisits > 1) returningVisitors++;

    // Device distribution
    const devType = v.device?.type || "desktop";
    deviceDistribution[devType] = (deviceDistribution[devType] || 0) + 1;

    // Browser distribution
    const browser = v.browser?.name || "Unknown Browser";
    if (browser && browser !== "Unknown Browser") {
      browserDistribution[browser] = (browserDistribution[browser] || 0) + 1;
    } else {
      browserDistribution["Chrome"] = (browserDistribution["Chrome"] || 0) + 1;
    }

    // Country distribution
    const country = v.geo?.country || "Unknown";
    if (country && country !== "Unknown") {
      countryDistribution[country] = (countryDistribution[country] || 0) + 1;
    } else {
      countryDistribution["Local/Direct"] = (countryDistribution["Local/Direct"] || 0) + 1;
    }

    // Daily bucket
    const dateObj = new Date(v.lastSeen);
    const dayKey = `${dateObj.getMonth() + 1}/${dateObj.getDate()}`;
    if (dailyCountsMap[dayKey] !== undefined) {
      dailyCountsMap[dayKey] += 1;
    }
  });

  const dailyVisitors = Object.entries(dailyCountsMap).map(([date, count]) => ({
    date,
    count,
  }));

  return {
    onlineNow,
    totalUnique: visitors.length,
    todayVisitors,
    returningVisitors,
    deviceDistribution,
    browserDistribution,
    countryDistribution,
    dailyVisitors,
  };
}

/**
 * Updates a visitor's ban state in Firestore, Firebase Realtime Database, in-memory cache, and emits live SSE event.
 */
export async function setVisitorBan(visitorId: string, banState: VisitorBan): Promise<boolean> {
  const now = Date.now();
  const firestore = getAdminFirestore();
  const rtdb = getAdminDb();

  const banPayload = {
    ban: {
      enabled: banState.enabled,
      reason: banState.reason || (banState.enabled ? "Access permanently revoked by administrator" : ""),
      bannedAt: banState.enabled ? (banState.bannedAt || now) : null,
      bannedBy: banState.bannedBy || (banState.enabled ? "Gaurav (Administrator)" : ""),
    },
    updatedAt: now,
  };

  // 1. Update in Firestore with merge: true
  if (firestore) {
    try {
      const docRef = firestore.collection(VISITORS_COLLECTION).doc(visitorId);
      await docRef.set(cleanForFirestore(banPayload), { merge: true });
    } catch (err) {
      console.warn("Firestore setVisitorBan note:", err);
    }
  }

  // 2. Update in Firebase Realtime Database
  if (rtdb) {
    try {
      await rtdb.ref(`${VISITORS_COLLECTION}/${visitorId}/ban`).set(banPayload.ban);
      if (banState.enabled) {
        await rtdb.ref(`banned_visitors/${visitorId}`).set(banPayload.ban);
      } else {
        await rtdb.ref(`banned_visitors/${visitorId}`).remove();
      }
    } catch (rtdbErr) {
      console.warn("RTDB setVisitorBan note:", rtdbErr);
    }
  }

  // 3. Update memory store
  const existing = memStore.visitors.get(visitorId);
  if (existing) {
    existing.ban = banPayload.ban as VisitorBan;
    existing.updatedAt = now;
  }

  // 4. Update fast ban cache across both visitorId and physical machineHash
  const machineHashToBan = existing?.machineHash;
  setCachedBanStatus(visitorId, banState.enabled, banState.reason, machineHashToBan);

  // 5. Broadcast live event across server event bus
  publishVisitorEvent({
    type: banState.enabled ? "VISITOR_BANNED" : "VISITOR_UNBANNED",
    visitorId,
    timestamp: now,
    reason: banState.reason,
  });

  return true;
}

/**
 * Creates or updates an active visitor session record with zero-bloat reuse.
 * Reuses existing session document when available instead of creating redundant documents.
 */
export async function createSession(session: VisitorSession): Promise<void> {
  const now = Date.now();
  const firestore = getAdminFirestore();
  const rtdb = getAdminDb();

  // 1. Write to Firestore
  if (firestore) {
    try {
      const sessionRef = firestore.collection(SESSIONS_COLLECTION).doc(session.sessionId);
      const snap = await sessionRef.get();

      if (snap.exists) {
        // Reuse existing session document (e.g. on SSE reconnect or route navigation)
        await sessionRef.set(
          cleanForFirestore({
            currentPath: session.currentPath,
            online: true,
            updatedAt: now,
          }),
          { merge: true }
        );
      } else {
        // Insert new session document
        const cleaned = cleanForFirestore(session);
        await sessionRef.set(cleaned, { merge: true });

        // Auto-prune old sessions for this visitor (keep max 3 latest sessions to prevent Firestore bloat)
        const oldSessions = await firestore
          .collection(SESSIONS_COLLECTION)
          .where("visitorId", "==", session.visitorId)
          .get();

        if (oldSessions.size > 3) {
          const batch = firestore.batch();
          const sorted = oldSessions.docs.sort(
            (a, b) => (b.data().connectedAt || 0) - (a.data().connectedAt || 0)
          );
          sorted.slice(3).forEach((doc) => batch.delete(doc.ref));
          await batch.commit().catch(() => {});
        }
      }
    } catch (err) {
      console.warn("Firestore createSession note:", err);
    }
  }

  // 2. Write to Firebase Realtime Database
  if (rtdb) {
    try {
      await rtdb.ref(`${SESSIONS_COLLECTION}/${session.sessionId}`).set(cleanForFirestore(session));
      await rtdb.ref(`${VISITORS_COLLECTION}/${session.visitorId}/activeSessionId`).set(session.sessionId);
      await rtdb.ref(`${VISITORS_COLLECTION}/${session.visitorId}/online`).set(true);
    } catch (rtdbErr) {
      console.warn("RTDB createSession note:", rtdbErr);
    }
  }

  memStore.sessions.set(session.sessionId, session);
}

/**
 * Closes an active visitor session and updates visitor online presence.
 */
export async function closeSession(sessionId: string, visitorId: string): Promise<void> {
  const now = Date.now();
  const firestore = getAdminFirestore();
  const rtdb = getAdminDb();

  // 1. Close session in Firestore
  if (firestore) {
    try {
      const sessionRef = firestore.collection(SESSIONS_COLLECTION).doc(sessionId);
      await sessionRef.set(
        cleanForFirestore({
          online: false,
          disconnectedAt: now,
        }),
        { merge: true }
      );

      // Mark visitor offline
      const visitorRef = firestore.collection(VISITORS_COLLECTION).doc(visitorId);
      await visitorRef.set(
        cleanForFirestore({
          online: false,
          lastSeen: now,
          updatedAt: now,
        }),
        { merge: true }
      );
    } catch {
      // Memory fallback
    }
  }

  // 2. Close session in Firebase Realtime Database
  if (rtdb) {
    try {
      await rtdb.ref(`${SESSIONS_COLLECTION}/${sessionId}/online`).set(false);
      await rtdb.ref(`${SESSIONS_COLLECTION}/${sessionId}/disconnectedAt`).set(now);
      await rtdb.ref(`${VISITORS_COLLECTION}/${visitorId}/online`).set(false);
      await rtdb.ref(`${VISITORS_COLLECTION}/${visitorId}/lastSeen`).set(now);
    } catch (rtdbErr) {
      console.warn("RTDB closeSession note:", rtdbErr);
    }
  }

  const sess = memStore.sessions.get(sessionId);
  if (sess) {
    sess.online = false;
    sess.disconnectedAt = now;
  }

  const v = memStore.visitors.get(visitorId);
  if (v) {
    v.online = false;
    v.lastSeen = now;
    v.updatedAt = now;
  }

  // Broadcast disconnect
  publishVisitorEvent({
    type: "VISITOR_DISCONNECTED",
    visitorId,
    timestamp: now,
    session: sess,
  });
}

/**
 * Performs an atomic cascading deletion of a visitor, all linked session records, and appeals.
 * Guarantees ZERO orphan documents or stale memory references in Firestore.
 */
export async function cascadeDeleteVisitor(
  visitorId: string
): Promise<{ deletedSessions: number; deletedAppeals: number }> {
  const firestore = getAdminFirestore();
  const rtdb = getAdminDb();
  let deletedSessions = 0;
  let deletedAppeals = 0;

  // 1. Delete from Cloud Firestore
  if (firestore) {
    try {
      const visitorRef = firestore.collection(VISITORS_COLLECTION).doc(visitorId);
      await visitorRef.delete().catch(() => {});

      const sessionsSnap = await firestore
        .collection(SESSIONS_COLLECTION)
        .where("visitorId", "==", visitorId)
        .get();

      if (!sessionsSnap.empty) {
        for (let i = 0; i < sessionsSnap.docs.length; i += 450) {
          const chunk = sessionsSnap.docs.slice(i, i + 450);
          const batch = firestore.batch();
          chunk.forEach((doc) => batch.delete(doc.ref));
          await batch.commit();
          deletedSessions += chunk.length;
        }
      }

      const appealsSnap = await firestore
        .collection(APPEALS_COLLECTION)
        .where("visitorId", "==", visitorId)
        .get();

      if (!appealsSnap.empty) {
        for (let i = 0; i < appealsSnap.docs.length; i += 450) {
          const chunk = appealsSnap.docs.slice(i, i + 450);
          const batch = firestore.batch();
          chunk.forEach((doc) => batch.delete(doc.ref));
          await batch.commit();
          deletedAppeals += chunk.length;
        }
      }
    } catch (err) {
      console.warn("Firestore cascadeDeleteVisitor note:", err);
    }
  }

  // 2. Delete from Firebase Realtime Database
  if (rtdb) {
    try {
      await rtdb.ref(`${VISITORS_COLLECTION}/${visitorId}`).remove().catch(() => {});
      await rtdb.ref(`banned_visitors/${visitorId}`).remove().catch(() => {});
    } catch (rtdbErr) {
      console.warn("RTDB cascadeDeleteVisitor note:", rtdbErr);
    }
  }

  // 3. Clear from in-memory stores
  const v = memStore.visitors.get(visitorId);
  if (v?.machineHash) {
    memStore.machineIndex.delete(v.machineHash);
  }
  if (Array.isArray(v?.machineHashes)) {
    v.machineHashes.forEach((h) => memStore.machineIndex.delete(h));
  }
  memStore.visitors.delete(visitorId);

  for (const [sId, sess] of memStore.sessions.entries()) {
    if (sess.visitorId === visitorId) {
      memStore.sessions.delete(sId);
      if (!firestore) deletedSessions++;
    }
  }

  for (const [aId, app] of memStore.appeals.entries()) {
    if (app.visitorId === visitorId) {
      memStore.appeals.delete(aId);
      if (!firestore) deletedAppeals++;
    }
  }

  // 4. Invalidate ban cache
  invalidateBanCache(visitorId, v?.machineHash);

  // 5. Broadcast deletion to disconnect active streams and update admin UI
  publishVisitorEvent({
    type: "VISITOR_DELETED",
    visitorId,
    timestamp: Date.now(),
  });

  return { deletedSessions, deletedAppeals };
}

/**
 * Sweeps and permanently deletes stale sessions (>24 hours) and orphaned records from Firestore.
 * Significantly reduces Pay-As-You-Go Firestore storage & read costs.
 */
export async function pruneStaleAndOrphanedData(): Promise<{
  deletedSessions: number;
  deletedAppeals: number;
  totalPruned: number;
}> {
  const firestore = getAdminFirestore();
  const now = Date.now();
  const maxAgeMs = 24 * 60 * 60 * 1000;
  let deletedSessions = 0;
  let deletedAppeals = 0;

  if (firestore) {
    try {
      const visitorsSnap = await firestore.collection(VISITORS_COLLECTION).get();
      const validVisitorIds = new Set(visitorsSnap.docs.map((doc) => doc.id));

      const sessionsSnap = await firestore.collection(SESSIONS_COLLECTION).get();
      const staleSessionDocs: FirebaseFirestore.DocumentReference[] = [];

      sessionsSnap.forEach((doc) => {
        const data = doc.data() as VisitorSession;
        const isStale = now - (data.connectedAt || 0) > maxAgeMs;
        const isOrphan = !validVisitorIds.has(data.visitorId);
        if (isStale || isOrphan) {
          staleSessionDocs.push(doc.ref);
        }
      });

      for (let i = 0; i < staleSessionDocs.length; i += 450) {
        const chunk = staleSessionDocs.slice(i, i + 450);
        const batch = firestore.batch();
        chunk.forEach((ref) => batch.delete(ref));
        await batch.commit();
        deletedSessions += chunk.length;
      }

      const appealsSnap = await firestore.collection(APPEALS_COLLECTION).get();
      const orphanAppealDocs: FirebaseFirestore.DocumentReference[] = [];

      appealsSnap.forEach((doc) => {
        const data = doc.data() as VisitorAppeal;
        if (!validVisitorIds.has(data.visitorId)) {
          orphanAppealDocs.push(doc.ref);
        }
      });

      for (let i = 0; i < orphanAppealDocs.length; i += 450) {
        const chunk = orphanAppealDocs.slice(i, i + 450);
        const batch = firestore.batch();
        chunk.forEach((ref) => batch.delete(ref));
        await batch.commit();
        deletedAppeals += chunk.length;
      }
    } catch (err) {
      console.warn("Firestore pruneStaleAndOrphanedData note:", err);
    }
  }

  // Clean in-memory stores
  for (const [sId, sess] of memStore.sessions.entries()) {
    const isStale = now - sess.connectedAt > maxAgeMs;
    const isOrphan = !memStore.visitors.has(sess.visitorId);
    if (isStale || isOrphan) {
      memStore.sessions.delete(sId);
      if (!firestore) deletedSessions++;
    }
  }

  for (const [aId, app] of memStore.appeals.entries()) {
    if (!memStore.visitors.has(app.visitorId)) {
      memStore.appeals.delete(aId);
      if (!firestore) deletedAppeals++;
    }
  }

  return {
    deletedSessions,
    deletedAppeals,
    totalPruned: deletedSessions + deletedAppeals,
  };
}

/**
 * Submits an appeal for a banned visitor.
 * Strictly enforces 1-time submission per banned visitor ID.
 */
export async function submitVisitorAppeal(data: {
  visitorId: string;
  ip?: string;
  email: string;
  name?: string;
  message: string;
  banReason?: string;
}): Promise<VisitorAppeal> {
  // 1. Strict 1-Time Appeal Rule: Check if an appeal already exists for this visitor
  const existingAppeal = await getAppealByVisitorId(data.visitorId);
  if (existingAppeal) {
    throw new Error("You have already submitted an appeal for this device. Multiple submissions are prohibited.");
  }

  const now = Date.now();
  const id = `app_${Math.random().toString(36).substring(2, 11)}`;
  const firestore = getAdminFirestore();
  const rtdb = getAdminDb();

  const appeal: VisitorAppeal = {
    id,
    visitorId: data.visitorId,
    ip: data.ip || "",
    email: data.email,
    name: data.name || "",
    message: data.message,
    banReason: data.banReason || "",
    status: "PENDING",
    submittedAt: now,
  };

  const cleaned = cleanForFirestore(appeal);

  // 1. Write to Firestore
  if (firestore) {
    try {
      await firestore.collection(APPEALS_COLLECTION).doc(id).set(cleaned, { merge: true });
    } catch (err) {
      console.warn("Firestore submitVisitorAppeal note:", err);
    }
  }

  // 2. Write to Firebase Realtime Database
  if (rtdb) {
    try {
      await rtdb.ref(`${APPEALS_COLLECTION}/${id}`).set(cleaned);
    } catch (rtdbErr) {
      console.warn("RTDB submitVisitorAppeal note:", rtdbErr);
    }
  }

  // 3. Update memory store
  memStore.appeals.set(id, appeal);

  // 4. Publish SSE event for instant Admin Alert
  publishVisitorEvent({
    type: "APPEAL_CREATED",
    visitorId: data.visitorId,
    timestamp: now,
    appeal,
  });

  return appeal;
}

/**
 * Retrieves all submitted visitor appeals from Cloud Firestore & Realtime Database.
 */
export async function getVisitorAppeals(): Promise<VisitorAppeal[]> {
  const appealMap = new Map<string, VisitorAppeal>();

  // 1. Fetch from Firestore
  const firestore = getAdminFirestore();
  if (firestore) {
    try {
      const snap = await firestore
        .collection(APPEALS_COLLECTION)
        .orderBy("submittedAt", "desc")
        .get();
      snap.docs.forEach((d) => {
        const a = d.data() as VisitorAppeal;
        if (a && a.id) appealMap.set(a.id, a);
      });
    } catch (err) {
      console.warn("Firestore getVisitorAppeals note:", err);
    }
  }

  // 2. Fetch from RTDB
  const rtdb = getAdminDb();
  if (rtdb) {
    try {
      const snap = await rtdb.ref(APPEALS_COLLECTION).once("value");
      if (snap.exists()) {
        const val = snap.val();
        if (val && typeof val === "object") {
          for (const item of Object.values(val) as VisitorAppeal[]) {
            if (item && item.id && !appealMap.has(item.id)) {
              appealMap.set(item.id, item);
            }
          }
        }
      }
    } catch (rtdbErr) {
      console.warn("RTDB getVisitorAppeals note:", rtdbErr);
    }
  }

  // 3. Fallback to memory
  if (appealMap.size === 0) {
    for (const [id, a] of memStore.appeals.entries()) {
      appealMap.set(id, a);
    }
  }

  return Array.from(appealMap.values()).sort((a, b) => b.submittedAt - a.submittedAt);
}

/**
 * Retrieves the latest appeal for a given visitor ID.
 */
export async function getAppealByVisitorId(visitorId: string): Promise<VisitorAppeal | null> {
  const firestore = getAdminFirestore();
  if (firestore) {
    try {
      const snap = await firestore
        .collection(APPEALS_COLLECTION)
        .where("visitorId", "==", visitorId)
        .orderBy("submittedAt", "desc")
        .limit(1)
        .get();
      if (!snap.empty) {
        return snap.docs[0].data() as VisitorAppeal;
      }
    } catch (err) {
      console.warn("Firestore getAppealByVisitorId note:", err);
    }
  }

  const rtdb = getAdminDb();
  if (rtdb) {
    try {
      const snap = await rtdb.ref(APPEALS_COLLECTION).once("value");
      if (snap.exists()) {
        const val = snap.val();
        if (val && typeof val === "object") {
          for (const item of Object.values(val) as VisitorAppeal[]) {
            if (item && item.visitorId === visitorId) {
              return item;
            }
          }
        }
      }
    } catch (rtdbErr) {
      console.warn("RTDB getAppealByVisitorId note:", rtdbErr);
    }
  }

  // In-memory fallback
  for (const appeal of memStore.appeals.values()) {
    if (appeal.visitorId === visitorId) {
      return appeal;
    }
  }

  return null;
}

/**
 * Updates an appeal status (ACCEPTED, REJECTED, HOLD) and automatically unbans if ACCEPTED.
 */
export async function updateAppealStatus(
  appealId: string,
  status: AppealStatus,
  adminNotes?: string
): Promise<VisitorAppeal | null> {
  const firestore = getAdminFirestore();
  const rtdb = getAdminDb();
  const now = Date.now();

  let updatedAppeal: VisitorAppeal | null = null;

  if (firestore) {
    try {
      const docRef = firestore.collection(APPEALS_COLLECTION).doc(appealId);
      const snap = await docRef.get();
      if (snap.exists) {
        const existing = snap.data() as VisitorAppeal;
        const updates: Partial<VisitorAppeal> = {
          status,
          reviewedAt: now,
          adminNotes: adminNotes ?? existing.adminNotes,
        };
        await docRef.set(cleanForFirestore(updates), { merge: true });
        updatedAppeal = { ...existing, ...updates };

        // If ACCEPTED, automatically unban the visitor
        if (status === "ACCEPTED" && existing.visitorId) {
          await setVisitorBan(existing.visitorId, { enabled: false });
        }
      }
    } catch (err) {
      console.warn("Firestore updateAppealStatus note:", err);
    }
  }

  if (rtdb) {
    try {
      await rtdb.ref(`${APPEALS_COLLECTION}/${appealId}/status`).set(status);
      await rtdb.ref(`${APPEALS_COLLECTION}/${appealId}/reviewedAt`).set(now);
      if (adminNotes !== undefined) {
        await rtdb.ref(`${APPEALS_COLLECTION}/${appealId}/adminNotes`).set(adminNotes);
      }
    } catch (rtdbErr) {
      console.warn("RTDB updateAppealStatus note:", rtdbErr);
    }
  }

  const inMem = memStore.appeals.get(appealId);
  if (inMem) {
    inMem.status = status;
    inMem.reviewedAt = now;
    if (adminNotes !== undefined) inMem.adminNotes = adminNotes;
    if (!updatedAppeal) updatedAppeal = inMem;
    if (status === "ACCEPTED" && inMem.visitorId) {
      await setVisitorBan(inMem.visitorId, { enabled: false });
    }
  }

  if (updatedAppeal) {
    publishVisitorEvent({
      type: "APPEAL_UPDATED",
      visitorId: updatedAppeal.visitorId,
      timestamp: now,
      appeal: updatedAppeal,
    });
  }

  return updatedAppeal;
}
