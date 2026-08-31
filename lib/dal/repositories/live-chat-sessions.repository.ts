import { BaseRepository } from "./base.repository";
import { firestoreDataSource } from "../datasource/firestore";

export type LiveChatSessionStatus = "ACTIVE" | "REVOKED" | "EXPIRED";

export interface LiveChatSessionDocument {
  sessionId: string;
  email: string;
  name: string;
  clientIp: string;
  userAgent?: string;
  status: LiveChatSessionStatus;
  createdAt: number;
  expiresAt: number;
  revokedAt?: number;
}

export class LiveChatSessionsRepository extends BaseRepository {
  private static readonly COLLECTION_NAME = "live_chat_sessions";

  constructor() {
    super("LiveChatSessionsRepository");
  }

  /**
   * Creates and registers a new authenticated visitor session in Firestore.
   */
  public async createSession(doc: LiveChatSessionDocument): Promise<void> {
    await this.executeMutation("createSession", async () => {
      await firestoreDataSource.setDocument(
        LiveChatSessionsRepository.COLLECTION_NAME,
        doc.sessionId,
        doc
      );
    });
  }

  /**
   * Retrieves a session document by its unique sessionId.
   */
  public async getSession(sessionId: string): Promise<LiveChatSessionDocument | null> {
    const res = await this.executeQuery("getSession", async () => {
      return await firestoreDataSource.getDocument<LiveChatSessionDocument>(
        LiveChatSessionsRepository.COLLECTION_NAME,
        sessionId
      );
    });
    return res.data;
  }

  /**
   * Atomically revokes an active session.
   */
  public async revokeSession(sessionId: string): Promise<void> {
    await this.executeMutation("revokeSession", async () => {
      const now = Date.now();
      await firestoreDataSource.setDocument(
        LiveChatSessionsRepository.COLLECTION_NAME,
        sessionId,
        {
          status: "REVOKED",
          revokedAt: now,
        },
        true
      );
    });
  }

  /**
   * Purges revoked or expired sessions older than the retention threshold (7 days).
   */
  public async purgeExpiredSessions(beforeTimestamp: number): Promise<number> {
    const res = await this.executeMutation("purgeExpiredSessions", async () => {
      const candidates = await firestoreDataSource.queryCollection<LiveChatSessionDocument>(
        LiveChatSessionsRepository.COLLECTION_NAME,
        {
          whereConditions: [
            { field: "status", operator: "in", value: ["EXPIRED", "REVOKED"] },
            { field: "expiresAt", operator: "<=", value: beforeTimestamp },
          ],
          limit: 50,
        }
      );

      if (candidates.docs.length === 0) return 0;

      const batchOps = candidates.docs.map((doc) => ({
        type: "delete" as const,
        collection: LiveChatSessionsRepository.COLLECTION_NAME,
        id: doc.sessionId,
      }));

      await firestoreDataSource.executeBatch(batchOps);
      return candidates.docs.length;
    });

    return res.data || 0;
  }
}

export const liveChatSessionsRepository = new LiveChatSessionsRepository();
