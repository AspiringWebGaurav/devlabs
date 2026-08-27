import { BaseRepository } from "../base.repository";
import { firestoreDataSource } from "@/lib/dal/datasource/firestore";
import type { BentoCardDocument } from "@/types/portfolio";
import type { RepositoryResult } from "../types";
import { SEED_CARDS } from "../seed-data";

export class CardsRepository extends BaseRepository {
  private collectionName = "portfolio_cards";

  constructor() {
    super("CardsRepository");
  }

  public async getCards(): Promise<RepositoryResult<BentoCardDocument[]>> {
    return this.executeQuery("getCards", async () => {
      const docs = await firestoreDataSource.getAllDocuments<BentoCardDocument>(
        this.collectionName,
        "slotIndex",
        "asc"
      );

      // Create a slot-indexed map populated with baseline SEED_CARDS (slots 1..6)
      const slotMap = new Map<number, BentoCardDocument>();
      for (const seed of SEED_CARDS) {
        slotMap.set(seed.slotIndex, seed);
      }

      // Overlay any saved documents from Firestore over the baseline seeds
      if (docs && docs.length > 0) {
        for (const doc of docs) {
          const slot = doc.slotIndex || parseInt(String(doc.id).replace(/\D/g, ""), 10);
          if (slot >= 1 && slot <= 6) {
            const base = slotMap.get(slot) || doc;
            slotMap.set(slot, { ...base, ...doc, slotIndex: slot });
          }
        }
      }

      // Return all 6 sorted slots
      return Array.from(slotMap.values()).sort((a, b) => (a.slotIndex || 0) - (b.slotIndex || 0));
    });
  }

  public async getCardBySlot(slotIndex: number): Promise<RepositoryResult<BentoCardDocument | null>> {
    return this.executeQuery("getCardBySlot", async () => {
      const docId = `card_0${slotIndex}`;
      const doc = await firestoreDataSource.getDocument<BentoCardDocument>(this.collectionName, docId);
      if (doc) return doc;
      const seed = SEED_CARDS.find((c) => c.slotIndex === slotIndex);
      return seed || null;
    });
  }

  public async updateCard(
    docId: string,
    data: Partial<Omit<BentoCardDocument, "id" | "slotIndex">> & { expectedVersion?: number }
  ): Promise<RepositoryResult<BentoCardDocument>> {
    return this.executeMutation("updateCard", async () => {
      const existing = await firestoreDataSource.getDocument<BentoCardDocument>(this.collectionName, docId);
      const seed = SEED_CARDS.find((c) => c.id === docId);
      const current = existing || seed;
      if (!current) throw new Error(`Card with ID ${docId} not found`);

      if (
        data.expectedVersion !== undefined &&
        current.version !== undefined &&
        data.expectedVersion !== current.version
      ) {
        throw new Error(
          `Concurrency Conflict: Card is at version ${current.version}, expected ${data.expectedVersion}`
        );
      }

      const fields = { ...data };
      delete fields.expectedVersion;
      const updated: BentoCardDocument = {
        ...current,
        ...fields,
        id: docId,
        slotIndex: current.slotIndex,
        updatedAt: new Date().toISOString(),
        version: (current.version || 1) + 1,
      };

      await firestoreDataSource.setDocument(this.collectionName, docId, updated, true);
      return updated;
    });
  }

  public async resetCardToDefault(slotIndex: number): Promise<RepositoryResult<BentoCardDocument>> {
    return this.executeMutation("resetCardToDefault", async () => {
      const seed = SEED_CARDS.find((c) => c.slotIndex === slotIndex);
      if (!seed) throw new Error(`Default card for slot ${slotIndex} not found`);

      const docId = seed.id;
      const updated: BentoCardDocument = {
        ...seed,
        updatedAt: new Date().toISOString(),
        version: 1,
      };

      await firestoreDataSource.setDocument(this.collectionName, docId, updated, true);
      return updated;
    });
  }

  public async seedIfEmpty(): Promise<void> {
    const docs = await firestoreDataSource.getAllDocuments<BentoCardDocument>(this.collectionName);
    if (!docs || docs.length === 0) {
      for (const card of SEED_CARDS) {
        await firestoreDataSource.setDocument(this.collectionName, card.id, card, true);
      }
    }
  }
}

export const cardsRepository = new CardsRepository();
