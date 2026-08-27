import { BaseRepository } from "./base.repository";
import { firestoreDataSource } from "../datasource/firestore";
import type { InquiryItem, PaginatedResult, PaginationOptions, RepositoryResult } from "./types";

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
    };

    return this.executeQuery("createInquiry", async () => {
      await firestoreDataSource.setDocument("inquiries", id, record, false);
      return record;
    }, { id, email: record.email });
  }

  /**
   * Updates an inquiry's status (unread, read, archived) in Firestore.
   */
  public async updateInquiryStatus(
    id: string,
    status: InquiryItem["status"]
  ): Promise<RepositoryResult<void>> {
    return this.executeQuery("updateInquiryStatus", async () => {
      await firestoreDataSource.setDocument("inquiries", id, { status }, true);
    }, { id, status });
  }

  /**
   * Records a reply to an inquiry and marks it as read.
   */
  public async recordInquiryReply(
    id: string,
    replyData: {
      replyMessage: string;
      replyMessageId?: string;
      repliedAt?: string;
      senderIdentity?: string;
    }
  ): Promise<RepositoryResult<void>> {
    const updatePayload: Partial<InquiryItem> = {
      status: "read",
      repliedAt: replyData.repliedAt || new Date().toISOString(),
      replyMessage: replyData.replyMessage,
      replyMessageId: replyData.replyMessageId,
      senderIdentity: replyData.senderIdentity || "security@gauravservices.eu.cc",
    };

    return this.executeQuery("recordInquiryReply", async () => {
      await firestoreDataSource.setDocument("inquiries", id, updatePayload, true);
    }, { id, replyMessageId: replyData.replyMessageId });
  }
}

export const inquiriesRepository = new InquiriesRepository();

