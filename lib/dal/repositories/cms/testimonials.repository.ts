import { BaseRepository } from "../base.repository";
import { firestoreDataSource, type BatchOperation } from "@/lib/dal/datasource/firestore";
import { storageDataSource } from "@/lib/dal/datasource/storage";
import type { TestimonialDocument } from "@/types/portfolio";
import type { RepositoryResult } from "../types";
import { SEED_TESTIMONIALS } from "../seed-data";

export class TestimonialsRepository extends BaseRepository {
  private collectionName = "portfolio_testimonials";

  constructor() {
    super("TestimonialsRepository");
  }

  public async getTestimonials(): Promise<RepositoryResult<TestimonialDocument[]>> {
    return this.executeQuery("getTestimonials", async () => {
      const docs = await firestoreDataSource.getAllDocuments<TestimonialDocument>(
        this.collectionName,
        "order",
        "asc"
      );

      if (!docs || docs.length === 0) {
        return SEED_TESTIMONIALS;
      }

      return docs.sort((a, b) => (a.order || 0) - (b.order || 0));
    });
  }

  public async getTestimonialById(id: string): Promise<RepositoryResult<TestimonialDocument | null>> {
    return this.executeQuery("getTestimonialById", async () => {
      const doc = await firestoreDataSource.getDocument<TestimonialDocument>(this.collectionName, id);
      if (doc) return doc;
      const seed = SEED_TESTIMONIALS.find((t) => t.id === id);
      return seed || null;
    });
  }

  public async createTestimonial(
    data: Omit<TestimonialDocument, "id" | "createdAt" | "updatedAt" | "version" | "order"> & { order?: number }
  ): Promise<RepositoryResult<TestimonialDocument>> {
    return this.executeMutation("createTestimonial", async () => {
      const existing = (await this.getTestimonials()).data || [];
      const id = `test_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const now = new Date().toISOString();
      const order = data.order !== undefined ? data.order : existing.length + 1;

      const newTestimonial: TestimonialDocument = {
        ...data,
        id,
        order,
        createdAt: now,
        updatedAt: now,
        version: 1,
      };

      await firestoreDataSource.setDocument(this.collectionName, id, newTestimonial, false);
      return newTestimonial;
    });
  }

  public async updateTestimonial(
    id: string,
    data: Partial<Omit<TestimonialDocument, "id" | "createdAt">> & { expectedVersion?: number }
  ): Promise<RepositoryResult<TestimonialDocument>> {
    return this.executeMutation("updateTestimonial", async () => {
      const current = await firestoreDataSource.getDocument<TestimonialDocument>(this.collectionName, id);
      if (!current) throw new Error(`Testimonial with ID ${id} not found`);

      if (
        data.expectedVersion !== undefined &&
        current.version !== undefined &&
        data.expectedVersion !== current.version
      ) {
        throw new Error(
          `Concurrency Conflict: Testimonial is at version ${current.version}, expected ${data.expectedVersion}`
        );
      }

      const fields = { ...data };
      delete fields.expectedVersion;
      const updated: TestimonialDocument = {
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

  public async deleteTestimonial(id: string): Promise<RepositoryResult<boolean>> {
    return this.executeMutation("deleteTestimonial", async () => {
      const testimonial = await firestoreDataSource.getDocument<TestimonialDocument>(this.collectionName, id);
      if (!testimonial) return true;

      if (testimonial.avatarStoragePath && !testimonial.avatarStoragePath.startsWith("/")) {
        try {
          await storageDataSource.deleteFile(testimonial.avatarStoragePath);
        } catch {}
      }

      await firestoreDataSource.deleteDocument(this.collectionName, id);
      return true;
    });
  }

  public async reorderTestimonials(orderedIds: string[]): Promise<RepositoryResult<boolean>> {
    return this.executeMutation("reorderTestimonials", async () => {
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
    const docs = await firestoreDataSource.getAllDocuments<TestimonialDocument>(this.collectionName);
    if (!docs || docs.length === 0) {
      for (const t of SEED_TESTIMONIALS) {
        await firestoreDataSource.setDocument(this.collectionName, t.id, t, true);
      }
    }
  }
}

export const testimonialsRepository = new TestimonialsRepository();
