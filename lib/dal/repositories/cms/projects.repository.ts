import { BaseRepository } from "../base.repository";
import { firestoreDataSource, type BatchOperation } from "@/lib/dal/datasource/firestore";
import { storageDataSource } from "@/lib/dal/datasource/storage";
import type { ProjectDocument } from "@/types/portfolio";
import type { RepositoryResult } from "../types";
import { SEED_PROJECTS } from "../seed-data";

export class ProjectsRepository extends BaseRepository {
  private collectionName = "portfolio_projects";

  constructor() {
    super("ProjectsRepository");
  }

  public async getProjects(): Promise<RepositoryResult<ProjectDocument[]>> {
    return this.executeQuery("getProjects", async () => {
      const docs = await firestoreDataSource.getAllDocuments<ProjectDocument>(
        this.collectionName,
        "order",
        "asc"
      );

      if (!docs || docs.length === 0) {
        return SEED_PROJECTS;
      }

      return docs.sort((a, b) => (a.order || 0) - (b.order || 0));
    });
  }

  public async getProjectById(id: string): Promise<RepositoryResult<ProjectDocument | null>> {
    return this.executeQuery("getProjectById", async () => {
      const doc = await firestoreDataSource.getDocument<ProjectDocument>(this.collectionName, id);
      if (doc) return doc;
      const seed = SEED_PROJECTS.find((p) => p.id === id);
      return seed || null;
    });
  }

  public async createProject(
    data: Omit<ProjectDocument, "id" | "createdAt" | "updatedAt" | "version" | "order"> & { order?: number }
  ): Promise<RepositoryResult<ProjectDocument>> {
    return this.executeMutation("createProject", async () => {
      const existing = (await this.getProjects()).data || [];
      const id = `proj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const now = new Date().toISOString();
      const order = data.order !== undefined ? data.order : existing.length + 1;

      const newProject: ProjectDocument = {
        ...data,
        id,
        order,
        createdAt: now,
        updatedAt: now,
        version: 1,
      };

      await firestoreDataSource.setDocument(this.collectionName, id, newProject, false);
      return newProject;
    });
  }

  public async updateProject(
    id: string,
    data: Partial<Omit<ProjectDocument, "id" | "createdAt">> & { expectedVersion?: number }
  ): Promise<RepositoryResult<ProjectDocument>> {
    return this.executeMutation("updateProject", async () => {
      const current = await firestoreDataSource.getDocument<ProjectDocument>(this.collectionName, id);
      if (!current) throw new Error(`Project with ID ${id} not found`);

      if (
        data.expectedVersion !== undefined &&
        current.version !== undefined &&
        data.expectedVersion !== current.version
      ) {
        throw new Error(
          `Concurrency Conflict: Project is at version ${current.version}, expected ${data.expectedVersion}`
        );
      }

      const fields = { ...data };
      delete fields.expectedVersion;
      const updated: ProjectDocument = {
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

  public async deleteProject(id: string): Promise<RepositoryResult<boolean>> {
    return this.executeMutation("deleteProject", async () => {
      const project = await firestoreDataSource.getDocument<ProjectDocument>(this.collectionName, id);
      if (!project) return true;

      if (project.coverImageStoragePath && !project.coverImageStoragePath.startsWith("/")) {
        try {
          await storageDataSource.deleteFile(project.coverImageStoragePath);
        } catch {}
      }

      await firestoreDataSource.deleteDocument(this.collectionName, id);
      return true;
    });
  }

  public async reorderProjects(orderedIds: string[]): Promise<RepositoryResult<boolean>> {
    return this.executeMutation("reorderProjects", async () => {
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
    const docs = await firestoreDataSource.getAllDocuments<ProjectDocument>(this.collectionName);
    if (!docs || docs.length === 0) {
      for (const proj of SEED_PROJECTS) {
        await firestoreDataSource.setDocument(this.collectionName, proj.id, proj, true);
      }
    }
  }
}

export const projectsRepository = new ProjectsRepository();
