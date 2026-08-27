import { BaseRepository } from "../base.repository";
import { firestoreDataSource, type BatchOperation } from "@/lib/dal/datasource/firestore";
import { storageDataSource } from "@/lib/dal/datasource/storage";
import type { ExperienceDocument } from "@/types/portfolio";
import type { RepositoryResult } from "../types";
import { SEED_EXPERIENCE } from "../seed-data";

export class ExperienceRepository extends BaseRepository {
  private collectionName = "portfolio_experience";

  constructor() {
    super("ExperienceRepository");
  }

  public async getExperience(): Promise<RepositoryResult<ExperienceDocument[]>> {
    return this.executeQuery("getExperience", async () => {
      const docs = await firestoreDataSource.getAllDocuments<ExperienceDocument>(
        this.collectionName,
        "order",
        "asc"
      );

      if (!docs || docs.length === 0) {
        return SEED_EXPERIENCE;
      }

      return docs.sort((a, b) => (a.order || 0) - (b.order || 0));
    });
  }

  public async getExperienceById(id: string): Promise<RepositoryResult<ExperienceDocument | null>> {
    return this.executeQuery("getExperienceById", async () => {
      const doc = await firestoreDataSource.getDocument<ExperienceDocument>(this.collectionName, id);
      if (doc) return doc;
      const seed = SEED_EXPERIENCE.find((e) => e.id === id);
      return seed || null;
    });
  }

  public async createExperience(
    data: Omit<ExperienceDocument, "id" | "createdAt" | "updatedAt" | "version" | "order"> & { order?: number }
  ): Promise<RepositoryResult<ExperienceDocument>> {
    return this.executeMutation("createExperience", async () => {
      const existing = (await this.getExperience()).data || [];
      const id = `exp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const now = new Date().toISOString();
      const order = data.order !== undefined ? data.order : existing.length + 1;

      const newExperience: ExperienceDocument = {
        ...data,
        id,
        order,
        createdAt: now,
        updatedAt: now,
        version: 1,
      };

      await firestoreDataSource.setDocument(this.collectionName, id, newExperience, false);
      return newExperience;
    });
  }

  public async updateExperience(
    id: string,
    data: Partial<Omit<ExperienceDocument, "id" | "createdAt">> & { expectedVersion?: number }
  ): Promise<RepositoryResult<ExperienceDocument>> {
    return this.executeMutation("updateExperience", async () => {
      const current = await firestoreDataSource.getDocument<ExperienceDocument>(this.collectionName, id);
      if (!current) throw new Error(`Experience with ID ${id} not found`);

      if (
        data.expectedVersion !== undefined &&
        current.version !== undefined &&
        data.expectedVersion !== current.version
      ) {
        throw new Error(
          `Concurrency Conflict: Experience is at version ${current.version}, expected ${data.expectedVersion}`
        );
      }

      const fields = { ...data };
      delete fields.expectedVersion;
      const updated: ExperienceDocument = {
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

  public async deleteExperience(id: string): Promise<RepositoryResult<boolean>> {
    return this.executeMutation("deleteExperience", async () => {
      const exp = await firestoreDataSource.getDocument<ExperienceDocument>(this.collectionName, id);
      if (!exp) return true;

      if (exp.thumbnailStoragePath && !exp.thumbnailStoragePath.startsWith("/")) {
        try {
          await storageDataSource.deleteFile(exp.thumbnailStoragePath);
        } catch {}
      }

      await firestoreDataSource.deleteDocument(this.collectionName, id);
      return true;
    });
  }

  public async reorderExperience(orderedIds: string[]): Promise<RepositoryResult<boolean>> {
    return this.executeMutation("reorderExperience", async () => {
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
    const docs = await firestoreDataSource.getAllDocuments<ExperienceDocument>(this.collectionName);
    if (!docs || docs.length === 0) {
      for (const e of SEED_EXPERIENCE) {
        await firestoreDataSource.setDocument(this.collectionName, e.id, e, true);
      }
    }
  }
}

export const experienceRepository = new ExperienceRepository();
