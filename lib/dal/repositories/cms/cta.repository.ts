import { BaseRepository } from "../base.repository";
import { firestoreDataSource } from "@/lib/dal/datasource/firestore";
import type { CtaDocument } from "@/types/portfolio";
import type { RepositoryResult } from "../types";
import { SEED_CTA } from "../seed-data";

export class CtaRepository extends BaseRepository {
  private collectionName = "portfolio_cta";
  private docId = "cta_main";

  constructor() {
    super("CtaRepository");
  }

  public async getCta(): Promise<RepositoryResult<CtaDocument>> {
    return this.executeQuery("getCta", async () => {
      const doc = await firestoreDataSource.getDocument<CtaDocument>(this.collectionName, this.docId);
      if (!doc) {
        return SEED_CTA;
      }
      return doc;
    });
  }

  public async updateCta(
    data: Partial<Omit<CtaDocument, "id">> & { expectedVersion?: number }
  ): Promise<RepositoryResult<CtaDocument>> {
    return this.executeMutation("updateCta", async () => {
      const current = (await this.getCta()).data || SEED_CTA;
      if (
        data.expectedVersion !== undefined &&
        current.version !== undefined &&
        data.expectedVersion !== current.version
      ) {
        throw new Error(
          `Concurrency Conflict: CTA is at version ${current.version}, expected ${data.expectedVersion}`
        );
      }

      const fields = { ...data };
      delete fields.expectedVersion;
      const updated: CtaDocument = {
        ...current,
        ...fields,
        id: "cta_main",
        updatedAt: new Date().toISOString(),
        version: (current.version || 1) + 1,
      };

      await firestoreDataSource.setDocument(this.collectionName, this.docId, updated, true);
      return updated;
    });
  }

  public async seedIfEmpty(): Promise<void> {
    const doc = await firestoreDataSource.getDocument<CtaDocument>(this.collectionName, this.docId);
    if (!doc) {
      await firestoreDataSource.setDocument(this.collectionName, this.docId, SEED_CTA, true);
    }
  }
}

export const ctaRepository = new CtaRepository();
