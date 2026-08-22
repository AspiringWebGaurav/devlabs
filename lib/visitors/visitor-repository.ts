import { getAdminFirestore } from "@/lib/admin/firebase-admin";
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
      // Memory fallback
    }
  }

  return null;
}

/**
 * Upserts a visitor record into Firestore.
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
  const rawMfp = data.machineHash?.trim();

  // If machineHash is present, check if this physical device already has a registered visitor document
  let targetVisitorId = visitorId;
  if (rawMfp) {
    const existingByMfp = await findVisitorByMachineHash(rawMfp);
    if (existingByMfp && existingByMfp.id) {
      targetVisitorId = existingByMfp.id;
    }
  }

  // 1. Attempt Firestore write
  if (firestore) {
    try {
      const docRef = firestore.collection(VISITORS_COLLECTION).doc(targetVisitorId);
      const snap = await docRef.get();

      if (!snap.exists) {
        const newVisitor: Visitor = {
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

        const cleanedDoc = cleanForFirestore(newVisitor);
        await docRef.set(cleanedDoc, { merge: true });

        // Update memory & ban cache
        memStore.visitors.set(targetVisitorId, newVisitor);
        if (rawMfp) memStore.machineIndex?.set(rawMfp, targetVisitorId);
        setCachedBanStatus(targetVisitorId, false, undefined, rawMfp);
        return newVisitor;
      } else {
        const existing = snap.data() as Visitor;
        const ipHistory = Array.isArray(existing.ipHistory) ? [...existing.ipHistory] : [];
        if (data.currentIP && !ipHistory.includes(data.currentIP)) {
          ipHistory.push(data.currentIP);
        }

        const machineHashes = Array.isArray(existing.machineHashes) ? [...existing.machineHashes] : [];
        if (rawMfp && !machineHashes.includes(rawMfp)) {
          machineHashes.push(rawMfp);
        }

        // Increment totalVisits ONLY if inactivity period has lapsed (prevents hard refresh spam)
        const isSessionExpired = now - (existing.lastSeen || 0) > SESSION_INACTIVITY_MS;
        const totalVisits = (existing.totalVisits || 1) + (isSessionExpired ? 1 : 0);
        const totalPages = (existing.totalPages || 1) + (data.incrementPage ? 1 : 0);

        const updated: Partial<Visitor> = {
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

        const cleanedUpdate = cleanForFirestore(updated);
        await docRef.set(cleanedUpdate, { merge: true });

        const completeVisitor: Visitor = {
          ...existing,
          ...updated,
        } as Visitor;

        // Cache ban state in memory for O(1) checks
        if (existing.ban) {
          setCachedBanStatus(targetVisitorId, existing.ban.enabled, existing.ban.reason, rawMfp || existing.machineHash);
        }

        memStore.visitors.set(targetVisitorId, completeVisitor);
        if (rawMfp) memStore.machineIndex?.set(rawMfp, targetVisitorId);
        return completeVisitor;
      }
    } catch (err) {
      console.warn("Firestore upsertVisitor note:", err);
    }
  }

  // 2. Fallback to in-memory store
  const existing = memStore.visitors.get(targetVisitorId);
  if (!existing) {
    const newVisitor: Visitor = {
      id: targetVisitorId,
      machineHash: rawMfp || undefined,
      machineHashes: rawMfp ? [rawMfp] : [],
      firstSeen: now,
      lastSeen: now,
      totalVisits: 1,
      totalPages: 1,
      online: true,
      currentPath: data.currentPath || "/",
      referrer: data.referrer,
      currentIP: data.currentIP || "Unknown",
      ipHistory: [data.currentIP || "Unknown"],
      geo: data.geo,
      device: data.device,
      browser: data.browser,
      viewport: data.viewport,
      activeSessionId: data.activeSessionId,
      ban: { enabled: false },
      createdAt: now,
      updatedAt: now,
    };
    memStore.visitors.set(targetVisitorId, newVisitor);
    if (rawMfp) memStore.machineIndex?.set(rawMfp, targetVisitorId);
    setCachedBanStatus(targetVisitorId, false, undefined, rawMfp);
    return newVisitor;
  } else {
    const ipHistory = [...existing.ipHistory];
    if (data.currentIP && !ipHistory.includes(data.currentIP)) {
      ipHistory.push(data.currentIP);
    }

    const machineHashes = Array.isArray(existing.machineHashes) ? [...existing.machineHashes] : [];
    if (rawMfp && !machineHashes.includes(rawMfp)) {
      machineHashes.push(rawMfp);
    }

    const isSessionExpired = now - (existing.lastSeen || 0) > SESSION_INACTIVITY_MS;
    const updated: Visitor = {
      ...existing,
      machineHash: rawMfp || existing.machineHash,
      machineHashes,
      lastSeen: now,
      totalVisits: existing.totalVisits + (isSessionExpired ? 1 : 0),
      totalPages: existing.totalPages + (data.incrementPage ? 1 : 0),
      online: true,
      currentPath: data.currentPath || existing.currentPath,
      referrer: data.referrer !== undefined ? data.referrer : existing.referrer,
      currentIP: data.currentIP || existing.currentIP,
      ipHistory: ipHistory.slice(-20),
      geo: data.geo || existing.geo,
      device: data.device || existing.device,
      browser: data.browser || existing.browser,
      viewport: data.viewport || existing.viewport,
      activeSessionId: data.activeSessionId || existing.activeSessionId,
      updatedAt: now,
    };
    memStore.visitors.set(targetVisitorId, updated);
    if (rawMfp) memStore.machineIndex?.set(rawMfp, targetVisitorId);
    return updated;
  }
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
      return null;
    } catch {
      // Fall through to memory
    }
  }

  return memStore.visitors.get(visitorId) || null;
}

/**
 * Lists all visitors for the admin panel with optional filtering.
 */
export async function listVisitors(options?: {
  limit?: number;
  search?: string;
  status?: "all" | "online" | "banned";
}): Promise<Visitor[]> {
  const maxLimit = options?.limit || 100;
  const firestore = getAdminFirestore();

  if (firestore) {
    try {
      const snap = await firestore
        .collection(VISITORS_COLLECTION)
        .orderBy("lastSeen", "desc")
        .limit(maxLimit)
        .get();

      let results: Visitor[] = [];
      snap.forEach((doc) => {
        results.push(doc.data() as Visitor);
      });

      if (results.length > 0) {
        if (options?.status === "online") {
          results = results.filter((v) => v.online);
        } else if (options?.status === "banned") {
          results = results.filter((v) => v.ban?.enabled);
        }

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

        return results;
      }
    } catch (err) {
      console.warn("Firestore listVisitors note:", err);
    }
  }

  // Memory fallback
  let list = Array.from(memStore.visitors.values()).sort((a, b) => b.lastSeen - a.lastSeen);
  if (options?.status === "online") list = list.filter((v) => v.online);
  if (options?.status === "banned") list = list.filter((v) => v.ban?.enabled);
  if (options?.search) {
    const q = options.search.toLowerCase();
    list = list.filter(
      (v) =>
        v.id.toLowerCase().includes(q) ||
        v.geo?.country?.toLowerCase().includes(q) ||
        v.currentPath?.toLowerCase().includes(q)
    );
  }
  return list.slice(0, maxLimit);
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
 * Updates a visitor's ban state in Firestore, in-memory cache, and emits live SSE event.
 */
export async function setVisitorBan(visitorId: string, banState: VisitorBan): Promise<boolean> {
  const now = Date.now();
  const firestore = getAdminFirestore();

  const banPayload = {
    ban: {
      enabled: banState.enabled,
      reason: banState.reason || (banState.enabled ? "Access permanently revoked by administrator" : ""),
      bannedAt: banState.enabled ? (banState.bannedAt || now) : null,
      bannedBy: banState.bannedBy || (banState.enabled ? "Gaurav (Administrator)" : ""),
    },
    updatedAt: now,
  };

  // 1. Update in Firestore with merge: true (never fails with 5 NOT_FOUND)
  if (firestore) {
    try {
      const docRef = firestore.collection(VISITORS_COLLECTION).doc(visitorId);
      await docRef.set(cleanForFirestore(banPayload), { merge: true });
    } catch (err) {
      console.warn("Firestore setVisitorBan note:", err);
    }
  }

  // 2. Update memory store
  const existing = memStore.visitors.get(visitorId);
  if (existing) {
    existing.ban = banPayload.ban as VisitorBan;
    existing.updatedAt = now;
  }

  // 3. Update fast ban cache across both visitorId and physical machineHash
  const machineHashToBan = existing?.machineHash;
  setCachedBanStatus(visitorId, banState.enabled, banState.reason, machineHashToBan);

  // 4. Broadcast live event across server event bus
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
  memStore.sessions.set(session.sessionId, session);
}

/**
 * Closes an active visitor session and updates visitor online presence.
 */
export async function closeSession(sessionId: string, visitorId: string): Promise<void> {
  const now = Date.now();
  const firestore = getAdminFirestore();

  // Close session
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
  let deletedSessions = 0;
  let deletedAppeals = 0;

  if (firestore) {
    try {
      // 1. Delete visitor document
      const visitorRef = firestore.collection(VISITORS_COLLECTION).doc(visitorId);
      await visitorRef.delete().catch(() => {});

      // 2. Query and delete all linked session documents in batched chunks
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

      // 3. Query and delete all linked appeal documents
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

  // 4. Clear from in-memory stores
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

  // 5. Invalidate ban cache
  invalidateBanCache(visitorId, v?.machineHash);

  // 6. Broadcast deletion to disconnect active streams and update admin UI
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
  const now = Date.now();
  const firestore = getAdminFirestore();
  let deletedSessions = 0;
  let deletedAppeals = 0;
  const maxAgeMs = 24 * 60 * 60 * 1000; // 24 hours

  if (firestore) {
    try {
      // 1. Fetch all valid visitor IDs
      const visitorsSnap = await firestore.collection(VISITORS_COLLECTION).get();
      const validVisitorIds = new Set<string>();
      visitorsSnap.forEach((doc) => validVisitorIds.add(doc.id));

      // 2. Fetch all session documents
      const sessionsSnap = await firestore.collection(SESSIONS_COLLECTION).get();
      const sessionDocsToDelete: FirebaseFirestore.DocumentReference[] = [];

      sessionsSnap.forEach((doc) => {
        const data = doc.data();
        const connectedAt = data.connectedAt || 0;
        const isStale = now - connectedAt > maxAgeMs;
        const isOrphan = !data.visitorId || !validVisitorIds.has(data.visitorId);

        if (isStale || isOrphan) {
          sessionDocsToDelete.push(doc.ref);
        }
      });

      // Batch delete in chunks of 450
      for (let i = 0; i < sessionDocsToDelete.length; i += 450) {
        const chunk = sessionDocsToDelete.slice(i, i + 450);
        const batch = firestore.batch();
        chunk.forEach((ref) => batch.delete(ref));
        await batch.commit();
        deletedSessions += chunk.length;
      }

      // 3. Fetch all appeals and delete orphans
      const appealsSnap = await firestore.collection(APPEALS_COLLECTION).get();
      const appealDocsToDelete: FirebaseFirestore.DocumentReference[] = [];

      appealsSnap.forEach((doc) => {
        const data = doc.data();
        if (!data.visitorId || !validVisitorIds.has(data.visitorId)) {
          appealDocsToDelete.push(doc.ref);
        }
      });

      for (let i = 0; i < appealDocsToDelete.length; i += 450) {
        const chunk = appealDocsToDelete.slice(i, i + 450);
        const batch = firestore.batch();
        chunk.forEach((ref) => batch.delete(ref));
        await batch.commit();
        deletedAppeals += chunk.length;
      }
    } catch (err) {
      console.warn("Firestore pruneStaleAndOrphanedData note:", err);
    }
  }

  // 4. Clean in-memory stores
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

  if (firestore) {
    try {
      const cleaned = cleanForFirestore(appeal);
      await firestore.collection(APPEALS_COLLECTION).doc(id).set(cleaned, { merge: true });
    } catch (err) {
      console.warn("Firestore submitVisitorAppeal note:", err);
    }
  }

  // Also persist in memory store fallback
  memStore.appeals.set(id, appeal);

  // Publish SSE event for instant Admin Alert
  publishVisitorEvent({
    type: "APPEAL_CREATED",
    visitorId: data.visitorId,
    timestamp: now,
    appeal,
  });

  return appeal;
}

/**
 * Retrieves all submitted visitor appeals from Cloud Firestore with in-memory fallback.
 */
export async function getVisitorAppeals(): Promise<VisitorAppeal[]> {
  const firestore = getAdminFirestore();
  if (firestore) {
    try {
      const snap = await firestore
        .collection(APPEALS_COLLECTION)
        .orderBy("submittedAt", "desc")
        .get();
      if (!snap.empty) {
        return snap.docs.map((d) => d.data() as VisitorAppeal);
      }
    } catch (err) {
      console.warn("Firestore getVisitorAppeals note:", err);
    }
  }

  // In-memory fallback
  return Array.from(memStore.appeals.values()).sort((a, b) => b.submittedAt - a.submittedAt);
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

        // If ACCEPTED, automatically unban the visitor in Firestore, BanCache, and SSE!
        if (status === "ACCEPTED" && existing.visitorId) {
          await setVisitorBan(existing.visitorId, { enabled: false });
        }

        // Publish event for real-time admin sync
        publishVisitorEvent({
          type: "APPEAL_UPDATED",
          visitorId: existing.visitorId,
          timestamp: now,
          appeal: updatedAppeal,
        });
      }
    } catch (err) {
      console.warn("Firestore updateAppealStatus note:", err);
    }
  }

  // Memory fallback update if firestore was not available or document was in memStore
  if (!updatedAppeal && memStore.appeals.has(appealId)) {
    const existing = memStore.appeals.get(appealId)!;
    updatedAppeal = {
      ...existing,
      status,
      reviewedAt: now,
      adminNotes: adminNotes ?? existing.adminNotes,
    };
    memStore.appeals.set(appealId, updatedAppeal);

    if (status === "ACCEPTED" && existing.visitorId) {
      await setVisitorBan(existing.visitorId, { enabled: false });
    }

    publishVisitorEvent({
      type: "APPEAL_UPDATED",
      visitorId: existing.visitorId,
      timestamp: now,
      appeal: updatedAppeal,
    });
  }

  return updatedAppeal;
}
