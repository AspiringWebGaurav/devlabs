import { BaseRepository } from "../base.repository";
import { firestoreDataSource } from "@/lib/dal/datasource/firestore";
import type { NavigationDocument, NavItemConfig } from "@/types/portfolio";
import type { RepositoryResult } from "../types";
import { SEED_NAVIGATION } from "../seed-data";

export class NavigationRepository extends BaseRepository {
  private collectionName = "portfolio_navigation";
  private docId = "nav_main";

  constructor() {
    super("NavigationRepository");
  }

  public async getNavigation(): Promise<RepositoryResult<NavigationDocument>> {
    return this.executeQuery("getNavigation", async () => {
      const doc = await firestoreDataSource.getDocument<NavigationDocument>(this.collectionName, this.docId);
      if (!doc) {
        return SEED_NAVIGATION;
      }
      return doc;
    });
  }

  public async updateNavigation(
    items: NavItemConfig[],
    expectedVersion?: number
  ): Promise<RepositoryResult<NavigationDocument>> {
    return this.executeMutation("updateNavigation", async () => {
      const current = (await this.getNavigation()).data || SEED_NAVIGATION;
      if (
        expectedVersion !== undefined &&
        current.version !== undefined &&
        expectedVersion !== current.version
      ) {
        throw new Error(
          `Concurrency Conflict: Navigation is at version ${current.version}, expected ${expectedVersion}`
        );
      }

      const updated: NavigationDocument = {
        id: "nav_main",
        items: items.map((item, index) => ({
          ...item,
          order: index + 1,
        })),
        updatedAt: new Date().toISOString(),
        version: (current.version || 1) + 1,
      };

      await firestoreDataSource.setDocument(this.collectionName, this.docId, updated, true);
      return updated;
    });
  }

  public async seedIfEmpty(): Promise<void> {
    const doc = await firestoreDataSource.getDocument<NavigationDocument>(this.collectionName, this.docId);
    if (!doc) {
      await firestoreDataSource.setDocument(this.collectionName, this.docId, SEED_NAVIGATION, true);
    }
  }
}

export const navigationRepository = new NavigationRepository();
