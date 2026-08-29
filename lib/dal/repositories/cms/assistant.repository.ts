import { BaseRepository } from "../base.repository";
import { firestoreDataSource } from "@/lib/dal/datasource/firestore";
import type { AssistantDocument } from "@/types/portfolio";
import type { RepositoryResult } from "../types";
import { SEED_ASSISTANT } from "../seed-data";

export class AssistantRepository extends BaseRepository {
  private collectionName = "portfolio_assistant";
  private docId = "assistant_main";

  constructor() {
    super("AssistantRepository");
  }

  public async getAssistant(): Promise<RepositoryResult<AssistantDocument>> {
    return this.executeQuery("getAssistant", async () => {
      const doc = await firestoreDataSource.getDocument<AssistantDocument>(this.collectionName, this.docId);
      if (!doc) {
        return SEED_ASSISTANT;
      }
      return doc;
    });
  }

  public async updateAssistant(
    data: Partial<Omit<AssistantDocument, "id">> & { expectedVersion?: number }
  ): Promise<RepositoryResult<AssistantDocument>> {
    return this.executeMutation("updateAssistant", async () => {
      const current = (await this.getAssistant()).data || SEED_ASSISTANT;
      if (
        data.expectedVersion !== undefined &&
        current.version !== undefined &&
        data.expectedVersion !== current.version
      ) {
        throw new Error(
          `Concurrency Conflict: Assistant is at version ${current.version}, expected ${data.expectedVersion}`
        );
      }

      const fields = { ...data };
      delete fields.expectedVersion;
      const updated: AssistantDocument = {
        ...current,
        ...fields,
        id: "assistant_main",
        updatedAt: new Date().toISOString(),
        version: (current.version || 1) + 1,
      };

      await firestoreDataSource.setDocument(this.collectionName, this.docId, updated, true);
      return updated;
    });
  }

  public async seedIfEmpty(): Promise<void> {
    const doc = await firestoreDataSource.getDocument<AssistantDocument>(this.collectionName, this.docId);
    if (!doc) {
      await firestoreDataSource.setDocument(this.collectionName, this.docId, SEED_ASSISTANT, true);
    }
  }
}

export const assistantRepository = new AssistantRepository();
