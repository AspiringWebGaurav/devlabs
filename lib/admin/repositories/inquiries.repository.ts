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
}

export const inquiriesRepository = new InquiriesRepository();
