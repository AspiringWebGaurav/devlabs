import { getAdminFirestore } from "@/lib/admin/firebase-admin";
import { adminLogger } from "@/lib/admin/logger";
import type {
  Firestore,
  Query,
  DocumentData,
  QueryDocumentSnapshot,
  WriteBatch,
  Transaction,
} from "firebase-admin/firestore";

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

export type BatchOperation =
  | { type: "set"; collection: string; id: string; data: DocumentData; merge?: boolean }
  | { type: "delete"; collection: string; id: string };

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
   * Retrieves all documents from a collection, optionally sorted.
   */
  public async getAllDocuments<T>(
    collectionName: string,
    orderByField?: string,
    orderDirection: "asc" | "desc" = "asc"
  ): Promise<T[]> {
    const startTime = Date.now();
    const db = this.getDb();
    if (!db) {
      adminLogger.warn("FirestoreDataSource:getAllDocuments", "Firestore Admin App not configured", { collectionName });
      return [];
    }

    try {
      let q: Query<DocumentData> = db.collection(collectionName);
      if (orderByField) {
        q = q.orderBy(orderByField, orderDirection);
      }

      const snapshot = await q.get();
      const items: T[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as T[];

      adminLogger.latency(`Firestore:getAllDocuments:${collectionName}`, Date.now() - startTime, {
        count: items.length,
      });

      return items;
    } catch (err) {
      adminLogger.error(`Firestore:getAllDocuments:${collectionName}`, err, "Failed to get all documents");
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
    } catch (err) {
      adminLogger.error(`Firestore:queryCollection:${collectionName}`, err, "Failed to query collection");
      throw err;
    }
  }

  /**
   * Sets or overwrites a document in a collection.
   */
  public async setDocument<T extends DocumentData>(
    collectionName: string,
    docId: string,
    data: T,
    merge = true
  ): Promise<void> {
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
   * Executes multiple set/delete operations atomically within a single Firestore WriteBatch.
   */
  public async executeBatch(operations: BatchOperation[]): Promise<void> {
    if (operations.length === 0) return;
    const startTime = Date.now();
    const db = this.getDb();
    if (!db) throw new Error("Firestore Admin App not configured");

    try {
      const batch: WriteBatch = db.batch();

      for (const op of operations) {
        const ref = db.collection(op.collection).doc(op.id);
        if (op.type === "set") {
          batch.set(ref, op.data, { merge: op.merge !== false });
        } else if (op.type === "delete") {
          batch.delete(ref);
        }
      }

      await batch.commit();
      adminLogger.latency("Firestore:executeBatch", Date.now() - startTime, {
        operationsCount: operations.length,
      });
    } catch (err) {
      adminLogger.error("Firestore:executeBatch", err, `Batch commit failed with ${operations.length} operations`);
      throw err;
    }
  }

  /**
   * Executes a callback inside an atomic Firestore transaction.
   */
  public async runTransaction<T>(
    updateFunction: (
      transaction: Transaction,
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
