import { BaseRepository } from "../base.repository";
import { firestoreDataSource } from "@/lib/dal/datasource/firestore";
import type { HeroDocument } from "@/types/portfolio";
import type { RepositoryResult } from "../types";
import { SEED_HERO } from "../seed-data";

export class HeroRepository extends BaseRepository {
  private collectionName = "portfolio_hero";
  private docId = "hero_main";

  constructor() {
    super("HeroRepository");
  }

  public async getHero(): Promise<RepositoryResult<HeroDocument>> {
    return this.executeQuery("getHero", async () => {
      const doc = await firestoreDataSource.getDocument<HeroDocument>(this.collectionName, this.docId);
      if (!doc) {
        return SEED_HERO;
      }
      return doc;
    });
  }

  public async updateHero(
    data: Partial<Omit<HeroDocument, "id">> & { expectedVersion?: number }
  ): Promise<RepositoryResult<HeroDocument>> {
    return this.executeMutation("updateHero", async () => {
      const current = (await this.getHero()).data || SEED_HERO;
      if (
        data.expectedVersion !== undefined &&
        current.version !== undefined &&
        data.expectedVersion !== current.version
      ) {
        throw new Error(
          `Concurrency Conflict: Document is at version ${current.version}, expected ${data.expectedVersion}`
        );
      }
      const fields = { ...data };
      delete fields.expectedVersion;
      const updated: HeroDocument = {
        ...current,
        ...fields,
        id: "hero_main",
        updatedAt: new Date().toISOString(),
        version: (current.version || 1) + 1,
      };

      await firestoreDataSource.setDocument(this.collectionName, this.docId, updated, true);
      return updated;
    });
  }

  public async seedIfEmpty(): Promise<void> {
    const doc = await firestoreDataSource.getDocument<HeroDocument>(this.collectionName, this.docId);
    if (!doc) {
      await firestoreDataSource.setDocument(this.collectionName, this.docId, SEED_HERO, true);
    }
  }
}

export const heroRepository = new HeroRepository();
