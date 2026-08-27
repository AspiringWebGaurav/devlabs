import { BaseRepository } from "../base.repository";
import { firestoreDataSource, type BatchOperation } from "@/lib/dal/datasource/firestore";
import type { PhaseDocument } from "@/types/portfolio";
import type { RepositoryResult } from "../types";
import { SEED_PHASES } from "../seed-data";

export class ApproachRepository extends BaseRepository {
  private collectionName = "portfolio_phases";

  constructor() {
    super("ApproachRepository");
  }

  public async getPhases(): Promise<RepositoryResult<PhaseDocument[]>> {
    return this.executeQuery("getPhases", async () => {
      const docs = await firestoreDataSource.getAllDocuments<PhaseDocument>(
        this.collectionName,
        "order",
        "asc"
      );

      if (!docs || docs.length === 0) {
        return SEED_PHASES;
      }

      return docs.sort((a, b) => (a.order || 0) - (b.order || 0));
    });
  }

  public async getPhaseById(id: string): Promise<RepositoryResult<PhaseDocument | null>> {
    return this.executeQuery("getPhaseById", async () => {
      const doc = await firestoreDataSource.getDocument<PhaseDocument>(this.collectionName, id);
      if (doc) return doc;
      const seed = SEED_PHASES.find((p) => p.id === id);
      return seed || null;
    });
  }

  public async createPhase(
    data: Omit<PhaseDocument, "id" | "createdAt" | "updatedAt" | "version" | "order"> & { order?: number }
  ): Promise<RepositoryResult<PhaseDocument>> {
    return this.executeMutation("createPhase", async () => {
      const existing = (await this.getPhases()).data || [];
      const id = `phase_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const now = new Date().toISOString();
      const order = data.order !== undefined ? data.order : existing.length + 1;

      const newPhase: PhaseDocument = {
        ...data,
        id,
        order,
        animationSpeed: Math.max(0.1, Math.min(10.0, data.animationSpeed || 1.0)),
        createdAt: now,
        updatedAt: now,
        version: 1,
      };

      await firestoreDataSource.setDocument(this.collectionName, id, newPhase, false);
      return newPhase;
    });
  }

  public async updatePhase(
    id: string,
    data: Partial<Omit<PhaseDocument, "id" | "createdAt">> & { expectedVersion?: number }
  ): Promise<RepositoryResult<PhaseDocument>> {
    return this.executeMutation("updatePhase", async () => {
      const current = await firestoreDataSource.getDocument<PhaseDocument>(this.collectionName, id);
      if (!current) throw new Error(`Phase with ID ${id} not found`);

      if (
        data.expectedVersion !== undefined &&
        current.version !== undefined &&
        data.expectedVersion !== current.version
      ) {
        throw new Error(
          `Concurrency Conflict: Phase is at version ${current.version}, expected ${data.expectedVersion}`
        );
      }

      const fields = { ...data };
      delete fields.expectedVersion;
      const updated: PhaseDocument = {
        ...current,
        ...fields,
        id,
        animationSpeed:
          fields.animationSpeed !== undefined
            ? Math.max(0.1, Math.min(10.0, fields.animationSpeed))
            : current.animationSpeed,
        updatedAt: new Date().toISOString(),
        version: (current.version || 1) + 1,
      };

      await firestoreDataSource.setDocument(this.collectionName, id, updated, true);
      return updated;
    });
  }

  public async deletePhase(id: string): Promise<RepositoryResult<boolean>> {
    return this.executeMutation("deletePhase", async () => {
      await firestoreDataSource.deleteDocument(this.collectionName, id);
      return true;
    });
  }

  public async reorderPhases(orderedIds: string[]): Promise<RepositoryResult<boolean>> {
    return this.executeMutation("reorderPhases", async () => {
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
    const docs = await firestoreDataSource.getAllDocuments<PhaseDocument>(this.collectionName);
    if (!docs || docs.length === 0) {
      for (const p of SEED_PHASES) {
        await firestoreDataSource.setDocument(this.collectionName, p.id, p, true);
      }
    }
  }
}

export const approachRepository = new ApproachRepository();
