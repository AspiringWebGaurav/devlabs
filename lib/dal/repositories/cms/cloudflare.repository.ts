import { BaseRepository } from "../base.repository";
import { firestoreDataSource } from "@/lib/dal/datasource/firestore";
import type { CloudflareSettingsDocument } from "@/types/portfolio";
import type { RepositoryResult } from "../types";
import { SEED_CLOUDFLARE } from "../seed-data";

export class CloudflareRepository extends BaseRepository {
  private collectionName = "portfolio_cloudflare";
  private docId = "cloudflare_main";

  constructor() {
    super("CloudflareRepository");
  }

  public async getCloudflareSettings(): Promise<RepositoryResult<CloudflareSettingsDocument>> {
    return this.executeQuery("getCloudflareSettings", async () => {
      const doc = await firestoreDataSource.getDocument<CloudflareSettingsDocument>(this.collectionName, this.docId);
      if (!doc) {
        return SEED_CLOUDFLARE;
      }
      return doc;
    });
  }

  public async updateCloudflareSettings(
    data: Partial<Omit<CloudflareSettingsDocument, "id">> & { expectedVersion?: number }
  ): Promise<RepositoryResult<CloudflareSettingsDocument>> {
    return this.executeMutation("updateCloudflareSettings", async () => {
      const current = (await this.getCloudflareSettings()).data || SEED_CLOUDFLARE;
      if (
        data.expectedVersion !== undefined &&
        current.version !== undefined &&
        data.expectedVersion !== current.version
      ) {
        throw new Error(
          `Concurrency Conflict: Cloudflare settings are at version ${current.version}, expected ${data.expectedVersion}`
        );
      }

      const fields = { ...data };
      delete fields.expectedVersion;
      const updated: CloudflareSettingsDocument = {
        ...current,
        ...fields,
        id: "cloudflare_main",
        updatedAt: new Date().toISOString(),
        version: (current.version || 1) + 1,
      };

      await firestoreDataSource.setDocument(this.collectionName, this.docId, updated, true);
      return updated;
    });
  }

  public async seedIfEmpty(): Promise<void> {
    const doc = await firestoreDataSource.getDocument<CloudflareSettingsDocument>(this.collectionName, this.docId);
    if (!doc) {
      await firestoreDataSource.setDocument(this.collectionName, this.docId, SEED_CLOUDFLARE, true);
    }
  }
}

export const cloudflareRepository = new CloudflareRepository();
