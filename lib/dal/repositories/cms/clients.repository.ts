import { BaseRepository } from "../base.repository";
import { firestoreDataSource, type BatchOperation } from "@/lib/dal/datasource/firestore";
import { storageDataSource } from "@/lib/dal/datasource/storage";
import type { ClientDocument } from "@/types/portfolio";
import type { RepositoryResult } from "../types";
import { SEED_CLIENTS } from "../seed-data";

export class ClientsRepository extends BaseRepository {
  private collectionName = "portfolio_clients";

  constructor() {
    super("ClientsRepository");
  }

  public async getClients(): Promise<RepositoryResult<ClientDocument[]>> {
    return this.executeQuery("getClients", async () => {
      const docs = await firestoreDataSource.getAllDocuments<ClientDocument>(
        this.collectionName,
        "order",
        "asc"
      );

      if (!docs || docs.length === 0) {
        return SEED_CLIENTS;
      }

      return docs.sort((a, b) => (a.order || 0) - (b.order || 0));
    });
  }

  public async getClientById(id: string): Promise<RepositoryResult<ClientDocument | null>> {
    return this.executeQuery("getClientById", async () => {
      const doc = await firestoreDataSource.getDocument<ClientDocument>(this.collectionName, id);
      if (doc) return doc;
      const seed = SEED_CLIENTS.find((c) => c.id === id);
      return seed || null;
    });
  }

  public async createClient(
    data: Omit<ClientDocument, "id" | "createdAt" | "updatedAt" | "version" | "order"> & { order?: number }
  ): Promise<RepositoryResult<ClientDocument>> {
    return this.executeMutation("createClient", async () => {
      const existing = (await this.getClients()).data || [];
      const id = `client_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const now = new Date().toISOString();
      const order = data.order !== undefined ? data.order : existing.length + 1;

      const newClient: ClientDocument = {
        ...data,
        id,
        order,
        createdAt: now,
        updatedAt: now,
        version: 1,
      };

      await firestoreDataSource.setDocument(this.collectionName, id, newClient, false);
      return newClient;
    });
  }

  public async updateClient(
    id: string,
    data: Partial<Omit<ClientDocument, "id" | "createdAt">> & { expectedVersion?: number }
  ): Promise<RepositoryResult<ClientDocument>> {
    return this.executeMutation("updateClient", async () => {
      const current = await firestoreDataSource.getDocument<ClientDocument>(this.collectionName, id);
      if (!current) throw new Error(`Client with ID ${id} not found`);

      if (
        data.expectedVersion !== undefined &&
        current.version !== undefined &&
        data.expectedVersion !== current.version
      ) {
        throw new Error(
          `Concurrency Conflict: Client is at version ${current.version}, expected ${data.expectedVersion}`
        );
      }

      const fields = { ...data };
      delete fields.expectedVersion;
      const updated: ClientDocument = {
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

  public async deleteClient(id: string): Promise<RepositoryResult<boolean>> {
    return this.executeMutation("deleteClient", async () => {
      const client = await firestoreDataSource.getDocument<ClientDocument>(this.collectionName, id);
      if (!client) return true;

      if (client.iconStoragePath && !client.iconStoragePath.startsWith("/")) {
        try {
          await storageDataSource.deleteFile(client.iconStoragePath);
        } catch {}
      }

      if (client.nameImgStoragePath && !client.nameImgStoragePath.startsWith("/")) {
        try {
          await storageDataSource.deleteFile(client.nameImgStoragePath);
        } catch {}
      }

      await firestoreDataSource.deleteDocument(this.collectionName, id);
      return true;
    });
  }

  public async reorderClients(orderedIds: string[]): Promise<RepositoryResult<boolean>> {
    return this.executeMutation("reorderClients", async () => {
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
    const docs = await firestoreDataSource.getAllDocuments<ClientDocument>(this.collectionName);
    if (!docs || docs.length === 0) {
      for (const c of SEED_CLIENTS) {
        await firestoreDataSource.setDocument(this.collectionName, c.id, c, true);
      }
    }
  }
}

export const clientsRepository = new ClientsRepository();
