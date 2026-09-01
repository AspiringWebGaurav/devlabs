import { BaseRepository } from "./base.repository";
import { firestoreDataSource } from "../datasource/firestore";
import { EMAIL_IDENTITIES } from "@/lib/email/identities";
import type {
  AcquireReplyLockResult,
  InquiryItem,
  PaginatedResult,
  PaginationOptions,
  RepositoryResult,
} from "./types";

class InquiriesRepository extends BaseRepository {
  constructor() {
    super("InquiriesRepository");
  }

  /**
   * Fetches paginated contact form messages with cursor support.
   */
  public async getInquiries(
    options: PaginationOptions = {}
  ): Promise<RepositoryResult<PaginatedResult<InquiryItem>>> {
    const pageSize = options.pageSize || 10;

    return this.executeQuery("getInquiries", async () => {
      const result = await firestoreDataSource.queryCollection<InquiryItem>("inquiries", {
        limit: pageSize,
        orderByField: "createdAt",
        orderDirection: "desc",
      });

      return {
        items: result.docs,
        total: result.totalFetched,
        page: options.page || 1,
        pageSize,
        hasMore: result.hasMore,
        nextCursor: result.lastDoc ? result.lastDoc.id : undefined,
      };
    });
  }

  /**
   * Retrieves a single inquiry record by document ID from Firestore.
   */
  public async getInquiryById(
    id: string
  ): Promise<RepositoryResult<InquiryItem | null>> {
    return this.executeQuery("getInquiryById", async () => {
      return await firestoreDataSource.getDocument<InquiryItem>("inquiries", id);
    });
  }

  /**
   * Atomically acquires an in-flight reply lock on the inquiry document.
   * Serializes concurrent requests while allowing genuine new replies to proceed.
   */
  public async acquireReplyLock(
    id: string,
    idempotencyKey: string
  ): Promise<RepositoryResult<AcquireReplyLockResult>> {
    return this.executeQuery(
      "acquireReplyLock",
      async () => {
        return await firestoreDataSource.runTransaction(async (transaction, db) => {
          const docRef = db.collection("inquiries").doc(id);
          const snapshot = await transaction.get(docRef);
          const now = Date.now();

          if (!snapshot.exists) {
            return {
              acquired: false,
              error: "Inquiry not found.",
            };
          }

          const data = snapshot.data() as InquiryItem;

          // 1. If this exact operation key has already completed and been recorded, return existing messageId
          if (data.activeReplyKey === idempotencyKey && data.replyMessageId && data.repliedAt) {
            return {
              acquired: false,
              alreadyReplied: true,
              existingMessageId: data.replyMessageId,
              error: "This reply operation has already completed.",
            };
          }

          // 2. If locked by an active in-flight send request
          if (data.replyLockUntil && data.replyLockUntil > now) {
            return {
              acquired: false,
              inProgress: true,
              error: "A reply send operation is currently in-flight for this inquiry. Please wait a moment.",
            };
          }

          // 3. Atomically acquire 30-second concurrency lock for this operation
          transaction.set(
            docRef,
            {
              replyLockUntil: now + 30000,
              activeReplyKey: idempotencyKey,
            },
            { merge: true }
          );

          return {
            acquired: true,
          };
        });
      },
      { id, idempotencyKey }
    );
  }

  /**
   * Releases an in-flight reply lock if dispatch fails before Brevo acceptance.
   */
  public async releaseReplyLock(id: string): Promise<RepositoryResult<void>> {
    return this.executeQuery(
      "releaseReplyLock",
      async () => {
        await firestoreDataSource.setDocument("inquiries", id, { replyLockUntil: null }, true);
      },
      { id }
    );
  }

  /**
   * Creates and persists a new inquiry record in Firestore collection "inquiries".
   */
  public async createInquiry(
    inquiryData: Omit<InquiryItem, "id"> & { id?: string }
  ): Promise<RepositoryResult<InquiryItem>> {
    const id = inquiryData.id || `inq_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const record: InquiryItem = {
      id,
      name: inquiryData.name,
      email: inquiryData.email,
      subject: inquiryData.subject,
      message: inquiryData.message,
      createdAt: inquiryData.createdAt || new Date().toISOString(),
      status: inquiryData.status || "unread",
      leadNumber: inquiryData.leadNumber,
      requestId: inquiryData.requestId,
      payloadHash: inquiryData.payloadHash,
      durableStatus: inquiryData.durableStatus,
      deliveries: inquiryData.deliveries,
    };

    return this.executeQuery(
      "createInquiry",
      async () => {
        await firestoreDataSource.setDocument("inquiries", id, record, true);
        return record;
      },
      { id, email: record.email }
    );
  }

  /**
   * Updates delivery status for an inquiry.
   */
  public async updateInquiryDeliveries(
    id: string,
    update: Partial<Pick<InquiryItem, "durableStatus" | "deliveries" | "status">>
  ): Promise<RepositoryResult<void>> {
    return this.executeQuery(
      "updateInquiryDeliveries",
      async () => {
        await firestoreDataSource.setDocument("inquiries", id, update, true);
      },
      { id }
    );
  }

  /**
   * Updates an inquiry's status (unread, read, archived) in Firestore.
   */
  public async updateInquiryStatus(
    id: string,
    status: InquiryItem["status"]
  ): Promise<RepositoryResult<void>> {
    return this.executeQuery(
      "updateInquiryStatus",
      async () => {
        await firestoreDataSource.setDocument("inquiries", id, { status }, true);
      },
      { id, status }
    );
  }

  /**
   * Records a reply to an inquiry and marks it as read.
   * Atomically clears the 30-second lock upon finalization.
   */
  public async recordInquiryReply(
    id: string,
    replyData: {
      replyMessage: string;
      replyMessageId?: string;
      repliedAt?: string;
      senderIdentity?: string;
      idempotencyKey?: string;
    }
  ): Promise<RepositoryResult<void>> {
    const updatePayload: Record<string, unknown> = {
      status: "read",
      repliedAt: replyData.repliedAt || new Date().toISOString(),
      replyMessage: replyData.replyMessage,
      replyMessageId: replyData.replyMessageId,
      senderIdentity: replyData.senderIdentity || EMAIL_IDENTITIES.SECURITY.primaryEmail,
      activeReplyKey: replyData.idempotencyKey || null,
      replyLockUntil: null,
    };

    return this.executeQuery(
      "recordInquiryReply",
      async () => {
        await firestoreDataSource.setDocument("inquiries", id, updatePayload, true);
      },
      { id, replyMessageId: replyData.replyMessageId }
    );
  }
}

export const inquiriesRepository = new InquiriesRepository();
