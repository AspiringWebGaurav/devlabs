import { getAdminFirestore } from "../firebase-admin";
import { adminLogger } from "../logger";
import type { Firestore, Query, DocumentData, QueryDocumentSnapshot } from "firebase-admin/firestore";

export interface FirestoreQueryOptions {
  limit?: number;
  startAfterDoc?: QueryDocumentSnapshot<DocumentData>;
  orderByField?: string;
  orderDirection?: "asc" | "desc";
  whereConditions?: Array<{
    field: string;
    operator: "<" | "<=" | "==" | "!=" | ">=" | ">" | "array-contains" | "in" | "array-contains-any" | "not-in";
    value: unknown;
  }>;
}

export interface FirestoreQueryResult<T> {
  docs: T[];
  lastDoc: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
  totalFetched: number;
}

class FirestoreDataSource {
  private getDb(): Firestore | null {
    return getAdminFirestore();
  }

  /**
   * Retrieves a single document by ID from a specified collection.
   */
  public async getDocument<T>(collectionName: string, docId: string): Promise<T | null> {
    const startTime = Date.now();
    const db = this.getDb();
    if (!db) {
      adminLogger.warn("FirestoreDataSource:getDocument", "Firestore Admin App not configured", { collectionName, docId });
      return null;
    }

    try {
      const docRef = db.collection(collectionName).doc(docId);
      const snapshot = await docRef.get();
      adminLogger.latency(`Firestore:getDocument:${collectionName}`, Date.now() - startTime, { docId });

      if (!snapshot.exists) return null;
      return { id: snapshot.id, ...snapshot.data() } as T;
    } catch (err) {
      adminLogger.error(`Firestore:getDocument:${collectionName}`, err, `Failed to get doc ${docId}`);
      throw err;
    }
  }

  /**
   * Executes a cursor-paginated, filtered query against a specified collection.
   */
  public async queryCollection<T>(
    collectionName: string,
    options: FirestoreQueryOptions = {}
  ): Promise<FirestoreQueryResult<T>> {
    const startTime = Date.now();
    const db = this.getDb();
    if (!db) {
      adminLogger.warn("FirestoreDataSource:queryCollection", "Firestore Admin App not configured", { collectionName });
      return { docs: [], lastDoc: null, hasMore: false, totalFetched: 0 };
    }

    try {
      let q: Query<DocumentData> = db.collection(collectionName);

      if (options.whereConditions && options.whereConditions.length > 0) {
        for (const cond of options.whereConditions) {
          q = q.where(cond.field, cond.operator, cond.value);
        }
      }

      if (options.orderByField) {
        q = q.orderBy(options.orderByField, options.orderDirection || "desc");
      }

      if (options.startAfterDoc) {
        q = q.startAfter(options.startAfterDoc);
      }

      const limit = options.limit || 20;
      q = q.limit(limit + 1); // fetch 1 extra to determine hasMore

      const snapshot = await q.get();
      const rawDocs = snapshot.docs;
      const hasMore = rawDocs.length > limit;
      const resultDocs = hasMore ? rawDocs.slice(0, limit) : rawDocs;
      const lastDoc = resultDocs.length > 0 ? resultDocs[resultDocs.length - 1] : null;

      const items: T[] = resultDocs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as T[];

      adminLogger.latency(`Firestore:queryCollection:${collectionName}`, Date.now() - startTime, {
        limit,
        fetched: items.length,
        hasMore,
      });

      return {
        docs: items,
        lastDoc,
        hasMore,
        totalFetched: items.length,
      };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      const isMissingIndex =
        errMsg.includes("requires an index") ||
        errMsg.includes("FAILED_PRECONDITION") ||
        (typeof err === "object" && err !== null && "code" in err && (err as { code: unknown }).code === 9);

      if (isMissingIndex) {
        const urlMatch = errMsg.match(/https:\/\/console\.firebase\.google\.com[^\s"']+/);
        const indexUrl = urlMatch ? urlMatch[0] : null;

        adminLogger.warn(
          `Firestore:queryCollection:${collectionName}:resilientFallback`,
          "Firestore compound index is pending or missing. Safely serving query via resilient in-memory index fallback.",
          {
            collectionName,
            indexUrl,
            orderByField: options.orderByField,
            whereCount: options.whereConditions?.length || 0,
          }
        );

        try {
          // Fallback: Query with whereConditions only (bypassing missing composite index requirement)
          let fallbackQ: Query<DocumentData> = db.collection(collectionName);
          if (options.whereConditions && options.whereConditions.length > 0) {
            for (const cond of options.whereConditions) {
              fallbackQ = fallbackQ.where(cond.field, cond.operator, cond.value);
            }
          }

          const limit = options.limit || 20;
          // Fetch up to limit * 3 (or max 100) to allow accurate in-memory sort
          fallbackQ = fallbackQ.limit(Math.min(limit * 3, 100));

          let fallbackSnap;
          try {
            fallbackSnap = await fallbackQ.get();
          } catch (whereErr) {
            // If multi-where failed due to compound index requirement, query with first where condition
            if (options.whereConditions && options.whereConditions.length > 1) {
              const firstCond = options.whereConditions[0];
              const singleQ = db.collection(collectionName).where(firstCond.field, firstCond.operator, firstCond.value).limit(Math.min(limit * 4, 150));
              fallbackSnap = await singleQ.get();
            } else {
              throw whereErr;
            }
          }

          let items: T[] = fallbackSnap.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as T[];

          // In-memory filter for remaining where conditions
          if (options.whereConditions && options.whereConditions.length > 1) {
            for (let i = 1; i < options.whereConditions.length; i++) {
              const cond = options.whereConditions[i];
              items = items.filter((doc: unknown) => {
                const rec = doc as Record<string, unknown>;
                const val = rec[cond.field];
                switch (cond.operator) {
                  case "==": return val === cond.value;
                  case "!=": return val !== cond.value;
                  case "<": return typeof val === "number" && typeof cond.value === "number" ? val < cond.value : String(val) < String(cond.value);
                  case "<=": return typeof val === "number" && typeof cond.value === "number" ? val <= cond.value : String(val) <= String(cond.value);
                  case ">": return typeof val === "number" && typeof cond.value === "number" ? val > cond.value : String(val) > String(cond.value);
                  case ">=": return typeof val === "number" && typeof cond.value === "number" ? val >= cond.value : String(val) >= String(cond.value);
                  case "in": return Array.isArray(cond.value) && cond.value.includes(val);
                  default: return true;
                }
              });
            }
          }

          // In-memory sort by orderByField
          if (options.orderByField) {
            const field = options.orderByField;
            const dir = (options.orderDirection || "desc") === "asc" ? 1 : -1;
            items.sort((a: unknown, b: unknown) => {
              const recA = a as Record<string, unknown>;
              const recB = b as Record<string, unknown>;
              const va = recA[field];
              const vb = recB[field];
              if (va === vb) return 0;
              if (va == null) return 1;
              if (vb == null) return -1;
              return va > vb ? dir : -dir;
            });
          }

          const hasMore = items.length > limit;
          const resultItems = items.slice(0, limit);
          const lastDoc = fallbackSnap.docs.length > 0 ? fallbackSnap.docs[Math.min(resultItems.length - 1, fallbackSnap.docs.length - 1)] : null;

          return {
            docs: resultItems,
            lastDoc,
            hasMore,
            totalFetched: resultItems.length,
          };
        } catch (fallbackErr) {
          adminLogger.error(`Firestore:queryCollection:${collectionName}:fallbackFailed`, fallbackErr, "Fallback query also failed");
          throw err;
        }
      }

      adminLogger.error(`Firestore:queryCollection:${collectionName}`, err, "Failed to query collection");
      throw err;
    }
  }

  /**
   * Sets or overwrites a document in a collection.
   */
  public async setDocument<T extends DocumentData>(collectionName: string, docId: string, data: T, merge = true): Promise<void> {
    const startTime = Date.now();
    const db = this.getDb();
    if (!db) throw new Error("Firestore Admin App not configured");

    try {
      await db.collection(collectionName).doc(docId).set(data, { merge });
      adminLogger.latency(`Firestore:setDocument:${collectionName}`, Date.now() - startTime, { docId });
    } catch (err) {
      adminLogger.error(`Firestore:setDocument:${collectionName}`, err, `Failed to set doc ${docId}`);
      throw err;
    }
  }

  /**
   * Deletes a document from a collection.
   */
  public async deleteDocument(collectionName: string, docId: string): Promise<void> {
    const startTime = Date.now();
    const db = this.getDb();
    if (!db) throw new Error("Firestore Admin App not configured");

    try {
      await db.collection(collectionName).doc(docId).delete();
      adminLogger.latency(`Firestore:deleteDocument:${collectionName}`, Date.now() - startTime, { docId });
    } catch (err) {
      adminLogger.error(`Firestore:deleteDocument:${collectionName}`, err, `Failed to delete doc ${docId}`);
      throw err;
    }
  }

  /**
   * Executes a callback inside an atomic Firestore transaction.
   */
  public async runTransaction<T>(
    updateFunction: (
      transaction: import("firebase-admin/firestore").Transaction,
      db: Firestore
    ) => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();
    const db = this.getDb();
    if (!db) throw new Error("Firestore Admin App not configured");

    try {
      const result = await db.runTransaction(async (transaction) => {
        return await updateFunction(transaction, db);
      });
      adminLogger.latency("Firestore:runTransaction", Date.now() - startTime);
      return result;
    } catch (err) {
      adminLogger.error("Firestore:runTransaction", err, "Transaction failed to commit");
      throw err;
    }
  }
}

export const firestoreDataSource = new FirestoreDataSource();

