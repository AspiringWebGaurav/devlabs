import { BaseRepository } from "../base.repository";
import { firestoreDataSource, type BatchOperation } from "@/lib/dal/datasource/firestore";
import type { SocialLinkDocument } from "@/types/portfolio";
import type { RepositoryResult } from "../types";
import { SEED_SOCIAL_LINKS } from "../seed-data";

export class SocialRepository extends BaseRepository {
  private collectionName = "portfolio_social_links";

  constructor() {
    super("SocialRepository");
  }

  public async getSocialLinks(): Promise<RepositoryResult<SocialLinkDocument[]>> {
    return this.executeQuery("getSocialLinks", async () => {
      const docs = await firestoreDataSource.getAllDocuments<SocialLinkDocument>(
        this.collectionName,
        "order",
        "asc"
      );

      if (!docs || docs.length === 0) {
        return SEED_SOCIAL_LINKS;
      }

      return docs.sort((a, b) => (a.order || 0) - (b.order || 0));
    });
  }

  public async getSocialLinkById(id: string): Promise<RepositoryResult<SocialLinkDocument | null>> {
    return this.executeQuery("getSocialLinkById", async () => {
      const doc = await firestoreDataSource.getDocument<SocialLinkDocument>(this.collectionName, id);
      if (doc) return doc;
      const seed = SEED_SOCIAL_LINKS.find((s) => s.id === id);
      return seed || null;
    });
  }

  public async createSocialLink(
    data: Omit<SocialLinkDocument, "id" | "updatedAt" | "version">
  ): Promise<RepositoryResult<SocialLinkDocument>> {
    return this.executeMutation("createSocialLink", async () => {
      const id = `soc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const now = new Date().toISOString();

      const newSocial: SocialLinkDocument = {
        ...data,
        id,
        updatedAt: now,
        version: 1,
      };

      await firestoreDataSource.setDocument(this.collectionName, id, newSocial, false);
      return newSocial;
    });
  }

  public async updateSocialLink(
    id: string,
    data: Partial<Omit<SocialLinkDocument, "id">> & { expectedVersion?: number }
  ): Promise<RepositoryResult<SocialLinkDocument>> {
    return this.executeMutation("updateSocialLink", async () => {
      const current = await firestoreDataSource.getDocument<SocialLinkDocument>(this.collectionName, id);
      if (!current) throw new Error(`Social link with ID ${id} not found`);

      if (
        data.expectedVersion !== undefined &&
        current.version !== undefined &&
        data.expectedVersion !== current.version
      ) {
        throw new Error(
          `Concurrency Conflict: Social Link is at version ${current.version}, expected ${data.expectedVersion}`
        );
      }

      const fields = { ...data };
      delete fields.expectedVersion;
      const updated: SocialLinkDocument = {
        ...current,
        ...fields,
        id,
        updatedAt: new Date().toISOString(),
        version: (current.version || 1) + 1,
      };

      await firestoreDataSource.setDocument(this.collectionName, id, updated, true);
      return updated;
    });
  }

  public async deleteSocialLink(id: string): Promise<RepositoryResult<boolean>> {
    return this.executeMutation("deleteSocialLink", async () => {
      await firestoreDataSource.deleteDocument(this.collectionName, id);
      return true;
    });
  }

  public async reorderSocialLinks(orderedIds: string[]): Promise<RepositoryResult<boolean>> {
    return this.executeMutation("reorderSocialLinks", async () => {
      const operations: BatchOperation[] = orderedIds.map((id, index) => ({
        type: "set",
        collection: this.collectionName,
        id,
        data: {
          order: index + 1,
          updatedAt: new Date().toISOString(),
        },
        merge: true,
      }));

      await firestoreDataSource.executeBatch(operations);
      return true;
    });
  }

  public async seedIfEmpty(): Promise<void> {
    const docs = await firestoreDataSource.getAllDocuments<SocialLinkDocument>(this.collectionName);
    if (!docs || docs.length === 0) {
      for (const s of SEED_SOCIAL_LINKS) {
        await firestoreDataSource.setDocument(this.collectionName, s.id, s, true);
      }
    }
  }
}

export const socialRepository = new SocialRepository();
