import { BaseRepository } from "../base.repository";
import { firestoreDataSource } from "@/lib/dal/datasource/firestore";
import type { FooterDocument } from "@/types/portfolio";
import type { RepositoryResult } from "../types";
import { SEED_FOOTER } from "../seed-data";

export class FooterRepository extends BaseRepository {
  private collectionName = "portfolio_footer";
  private docId = "footer_main";

  constructor() {
    super("FooterRepository");
  }

  public async getFooter(): Promise<RepositoryResult<FooterDocument>> {
    return this.executeQuery("getFooter", async () => {
      const doc = await firestoreDataSource.getDocument<FooterDocument>(this.collectionName, this.docId);
      if (!doc) {
        return SEED_FOOTER;
      }
      return doc;
    });
  }

  public async updateFooter(
    data: Partial<Omit<FooterDocument, "id">> & { expectedVersion?: number }
  ): Promise<RepositoryResult<FooterDocument>> {
    return this.executeMutation("updateFooter", async () => {
      const current = (await this.getFooter()).data || SEED_FOOTER;
      if (
        data.expectedVersion !== undefined &&
        current.version !== undefined &&
        data.expectedVersion !== current.version
      ) {
        throw new Error(
          `Concurrency Conflict: Footer is at version ${current.version}, expected ${data.expectedVersion}`
        );
      }

      const fields = { ...data };
      delete fields.expectedVersion;
      const updated: FooterDocument = {
        ...current,
        ...fields,
        id: "footer_main",
        updatedAt: new Date().toISOString(),
        version: (current.version || 1) + 1,
      };

      await firestoreDataSource.setDocument(this.collectionName, this.docId, updated, true);
      return updated;
    });
  }

  public async seedIfEmpty(): Promise<void> {
    const doc = await firestoreDataSource.getDocument<FooterDocument>(this.collectionName, this.docId);
    if (!doc) {
      await firestoreDataSource.setDocument(this.collectionName, this.docId, SEED_FOOTER, true);
    }
  }
}

export const footerRepository = new FooterRepository();
