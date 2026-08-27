import { BaseRepository } from "./base.repository";
import { firestoreDataSource } from "@/lib/dal/datasource/firestore";
import { storageDataSource, type StorageFileMetadata } from "@/lib/dal/datasource/storage";
import { adminLogger } from "@/lib/admin/logger";
import type {
  StorageAssetLedgerDocument,
  ProjectDocument,
  ClientDocument,
  ExperienceDocument,
  TestimonialDocument,
  BentoCardDocument,
  SeoDocument,
} from "@/types/portfolio";
import type { RepositoryResult } from "./types";
import {
  SEED_PROJECTS,
  SEED_CLIENTS,
  SEED_EXPERIENCE,
  SEED_TESTIMONIALS,
  SEED_CARDS,
  SEED_SEO,
} from "./seed-data";

export interface MediaAuditReport {
  totalLedgerRecords: number;
  totalPhysicalObjects: number;
  brokenReferences: StorageAssetLedgerDocument[]; // In ledger, missing in storage
  unmanagedObjects: string[];                     // In storage, missing in ledger
  unattachedAssets: StorageAssetLedgerDocument[];  // In ledger, not attached to any entity
  pendingDeletion: StorageAssetLedgerDocument[];   // Marked pending deletion
  activelyReferencedPaths: number;
}

export class MediaRepository extends BaseRepository {
  private collectionName = "storage_assets";

  constructor() {
    super("MediaRepository");
  }

  /**
   * Retrieves all asset ledger entries.
   */
  public async getAssets(): Promise<RepositoryResult<StorageAssetLedgerDocument[]>> {
    return this.executeQuery("getAssets", async () => {
      const docs = await firestoreDataSource.getAllDocuments<StorageAssetLedgerDocument>(
        this.collectionName,
        "createdAt",
        "desc"
      );
      return docs || [];
    });
  }

  /**
   * Registers a newly uploaded asset in the ledger in UNATTACHED status.
   */
  public async registerUpload(asset: {
    fileName: string;
    storagePath: string;
    publicUrl: string;
    mimeType: string;
    sizeBytes: number;
    uploadedByAdmin: string;
  }): Promise<RepositoryResult<StorageAssetLedgerDocument>> {
    return this.executeMutation("registerUpload", async () => {
      const id = `asset_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const now = new Date().toISOString();

      const doc: StorageAssetLedgerDocument = {
        id,
        fileName: asset.fileName,
        storagePath: asset.storagePath,
        publicUrl: asset.publicUrl,
        mimeType: asset.mimeType,
        sizeBytes: asset.sizeBytes,
        status: "UNATTACHED",
        uploadedByAdmin: asset.uploadedByAdmin,
        createdAt: now,
        updatedAt: now,
      };

      await firestoreDataSource.setDocument(this.collectionName, id, doc, false);
      adminLogger.info("MediaRepository:registerUpload", "Asset uploaded and registered", { storagePath: asset.storagePath, id });
      return doc;
    });
  }

  /**
   * Commits 1:1 ownership of an asset to an entity document.
   */
  public async attachAsset(
    storagePath: string,
    owningEntityCollection: string,
    owningDocumentId: string,
    owningFieldKey: string
  ): Promise<RepositoryResult<StorageAssetLedgerDocument>> {
    return this.executeMutation("attachAsset", async () => {
      const queryRes = await firestoreDataSource.queryCollection<StorageAssetLedgerDocument>(
        this.collectionName,
        {
          whereConditions: [{ field: "storagePath", operator: "==", value: storagePath }],
          limit: 1,
        }
      );

      const existing = queryRes.docs[0];
      const now = new Date().toISOString();

      if (existing) {
        // Enforce 1:1 ownership: reject if already attached to a different document
        if (
          existing.status === "ATTACHED" &&
          existing.owningDocumentId &&
          existing.owningDocumentId !== owningDocumentId
        ) {
          throw new Error(`Asset ${storagePath} is already owned by ${existing.owningDocumentId}`);
        }

        const updated: StorageAssetLedgerDocument = {
          ...existing,
          status: "ATTACHED",
          owningEntityCollection,
          owningDocumentId,
          owningFieldKey,
          updatedAt: now,
        };

        await firestoreDataSource.setDocument(this.collectionName, existing.id, updated, true);
        adminLogger.info("MediaRepository:attachAsset", "Asset attached to entity", { storagePath, owningDocumentId });
        return updated;
      } else {
        // Auto-register legacy or direct uploaded file
        const id = `asset_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const fileName = storagePath.split("/").pop() || storagePath;
        const newDoc: StorageAssetLedgerDocument = {
          id,
          fileName,
          storagePath,
          publicUrl: storagePath.startsWith("http") ? storagePath : `/api/media/${encodeURIComponent(storagePath)}`,
          mimeType: "image/webp",
          sizeBytes: 0,
          status: "ATTACHED",
          owningEntityCollection,
          owningDocumentId,
          owningFieldKey,
          uploadedByAdmin: "system",
          createdAt: now,
          updatedAt: now,
        };

        await firestoreDataSource.setDocument(this.collectionName, id, newDoc, false);
        adminLogger.info("MediaRepository:autoRegisterAndAttach", "Asset auto registered and attached", { storagePath, owningDocumentId });
        return newDoc;
      }
    });
  }

  /**
   * Collects all storagePath strings actively referenced across all CMS entities in Firestore.
   */
  public async getActiveCmsReferencePaths(): Promise<Set<string>> {
    const referencedPaths = new Set<string>();

    // Baseline Seed References (Always protected from deletion)
    for (const p of SEED_PROJECTS) {
      if (p.coverImageStoragePath) referencedPaths.add(p.coverImageStoragePath);
      if (p.coverImage) referencedPaths.add(p.coverImage);
      if (p.iconLists) for (const icon of p.iconLists) referencedPaths.add(icon);
    }
    for (const c of SEED_CLIENTS) {
      if (c.iconStoragePath) referencedPaths.add(c.iconStoragePath);
      if (c.iconUrl) referencedPaths.add(c.iconUrl);
      if (c.nameImgStoragePath) referencedPaths.add(c.nameImgStoragePath);
      if (c.nameImgUrl) referencedPaths.add(c.nameImgUrl);
    }
    for (const e of SEED_EXPERIENCE) {
      if (e.thumbnailStoragePath) referencedPaths.add(e.thumbnailStoragePath);
      if (e.thumbnailUrl) referencedPaths.add(e.thumbnailUrl);
    }
    for (const t of SEED_TESTIMONIALS) {
      if (t.avatarStoragePath) referencedPaths.add(t.avatarStoragePath);
      if (t.avatarUrl) referencedPaths.add(t.avatarUrl);
    }
    for (const card of SEED_CARDS) {
      if (card.img) referencedPaths.add(card.img);
      if (card.spareImg) referencedPaths.add(card.spareImg);
    }
    if (SEED_SEO.ogImageStoragePath) referencedPaths.add(SEED_SEO.ogImageStoragePath);
    if (SEED_SEO.ogImageUrl) referencedPaths.add(SEED_SEO.ogImageUrl);

    try {
      const [projects, clients, experiences, testimonials, cards, seoDocs] = await Promise.all([
        firestoreDataSource.getAllDocuments<ProjectDocument>("portfolio_projects"),
        firestoreDataSource.getAllDocuments<ClientDocument>("portfolio_clients"),
        firestoreDataSource.getAllDocuments<ExperienceDocument>("portfolio_experience"),
        firestoreDataSource.getAllDocuments<TestimonialDocument>("portfolio_testimonials"),
        firestoreDataSource.getAllDocuments<BentoCardDocument>("portfolio_cards"),
        firestoreDataSource.getAllDocuments<SeoDocument>("portfolio_seo"),
      ]);

      // Projects
      for (const p of projects) {
        if (p.coverImageStoragePath) referencedPaths.add(p.coverImageStoragePath);
        if (p.coverImage) referencedPaths.add(p.coverImage);
        if (p.iconLists) {
          for (const icon of p.iconLists) referencedPaths.add(icon);
        }
      }

      // Clients
      for (const c of clients) {
        if (c.iconStoragePath) referencedPaths.add(c.iconStoragePath);
        if (c.iconUrl) referencedPaths.add(c.iconUrl);
        if (c.nameImgStoragePath) referencedPaths.add(c.nameImgStoragePath);
        if (c.nameImgUrl) referencedPaths.add(c.nameImgUrl);
      }

      // Experience
      for (const e of experiences) {
        if (e.thumbnailStoragePath) referencedPaths.add(e.thumbnailStoragePath);
        if (e.thumbnailUrl) referencedPaths.add(e.thumbnailUrl);
      }

      // Testimonials
      for (const t of testimonials) {
        if (t.avatarStoragePath) referencedPaths.add(t.avatarStoragePath);
        if (t.avatarUrl) referencedPaths.add(t.avatarUrl);
      }

      // Cards
      for (const card of cards) {
        if (card.img) referencedPaths.add(card.img);
        if (card.spareImg) referencedPaths.add(card.spareImg);
      }

      // SEO
      for (const s of seoDocs) {
        if (s.ogImageStoragePath) referencedPaths.add(s.ogImageStoragePath);
        if (s.ogImageUrl) referencedPaths.add(s.ogImageUrl);
      }
    } catch (err) {
      adminLogger.warn("MediaRepository:getActiveCmsReferencePaths", "Failed to query some collections for active references", { error: String(err) });
    }

    return referencedPaths;
  }

  /**
   * Purges an asset from physical storage and removes its ledger record after verifying zero active references.
   */
  public async purgeAsset(storagePath: string): Promise<RepositoryResult<boolean>> {
    return this.executeMutation("purgeAsset", async () => {
      // 1. Safety check: Verify the asset is not actively referenced by any CMS entity
      const activeRefs = await this.getActiveCmsReferencePaths();
      if (activeRefs.has(storagePath)) {
        throw new Error(`Cannot purge asset "${storagePath}": Actively referenced by a CMS document.`);
      }

      // 2. Physical delete
      try {
        await storageDataSource.deleteFile(storagePath);
      } catch (err) {
        adminLogger.warn("MediaRepository:purgeAsset", `Physical delete skipped/failed for ${storagePath}`, { error: String(err) });
      }

      // 3. Remove ledger record
      const queryRes = await firestoreDataSource.queryCollection<StorageAssetLedgerDocument>(
        this.collectionName,
        {
          whereConditions: [{ field: "storagePath", operator: "==", value: storagePath }],
          limit: 10,
        }
      );

      for (const doc of queryRes.docs) {
        await firestoreDataSource.deleteDocument(this.collectionName, doc.id);
      }

      adminLogger.info("MediaRepository:purgeAsset:completed", "Purge completed", { storagePath });
      return true;
    });
  }

  /**
   * Audits storage assets against physical bucket files and active CMS entity references.
   */
  public async auditLedger(): Promise<RepositoryResult<MediaAuditReport>> {
    return this.executeQuery("auditLedger", async () => {
      const [ledgerDocs, physicalFiles, activeRefs] = await Promise.all([
        firestoreDataSource.getAllDocuments<StorageAssetLedgerDocument>(this.collectionName),
        storageDataSource.listFiles(),
        this.getActiveCmsReferencePaths(),
      ]);

      const physicalPathSet = new Set(physicalFiles.map((f) => f.name));
      const ledgerPathSet = new Set(ledgerDocs.map((d) => d.storagePath));

      const brokenReferences = ledgerDocs.filter(
        (doc) => !doc.storagePath.startsWith("/") && !physicalPathSet.has(doc.storagePath)
      );

      const unmanagedObjects = physicalFiles
        .filter((f) => !ledgerPathSet.has(f.name))
        .map((f) => f.name);

      const unattachedAssets = ledgerDocs.filter((doc) => doc.status === "UNATTACHED");
      const pendingDeletion = ledgerDocs.filter((doc) => doc.status === "PENDING_DELETION");

      return {
        totalLedgerRecords: ledgerDocs.length,
        totalPhysicalObjects: physicalFiles.length,
        brokenReferences,
        unmanagedObjects,
        unattachedAssets,
        pendingDeletion,
        activelyReferencedPaths: activeRefs.size,
      };
    });
  }

  /**
   * Sweeps confirmed unmanaged objects and unattached assets older than retentionHours.
   * Enforces strict multi-point safety validation before performing ANY deletion.
   */
  public async sweepOrphans(
    retentionHours = 24
  ): Promise<RepositoryResult<{ deletedCount: number; skippedCount: number; reconciledCount: number }>> {
    return this.executeMutation("sweepOrphans", async () => {
      const audit = (await this.auditLedger()).data;
      if (!audit) return { deletedCount: 0, skippedCount: 0, reconciledCount: 0 };

      const activeRefs = await this.getActiveCmsReferencePaths();
      const physicalFiles: StorageFileMetadata[] = await storageDataSource.listFiles();
      const fileMetadataMap = new Map<string, StorageFileMetadata>(
        physicalFiles.map((f) => [f.name, f])
      );

      let deletedCount = 0;
      let skippedCount = 0;
      let reconciledCount = 0;
      const cutoffTime = Date.now() - retentionHours * 60 * 60 * 1000;

      // 1. Process unmanaged physical objects
      for (const path of audit.unmanagedObjects) {
        // Safety Check A: Is it actively referenced by a CMS document?
        if (activeRefs.has(path)) {
          adminLogger.info("MediaSweeper:reconcileUnmanaged", "Actively referenced in CMS; keeping and registering", { path });
          // Auto-reconcile by registering into ledger
          await this.attachAsset(path, "unknown_entity", "auto_reconciled", "image");
          reconciledCount++;
          continue;
        }

        // Safety Check B: Has the physical object passed the retention age threshold?
        const fileMeta = fileMetadataMap.get(path);
        const fileUpdatedTime = fileMeta ? new Date(fileMeta.updated).getTime() : 0;
        if (fileUpdatedTime > cutoffTime) {
          adminLogger.info("MediaSweeper:skipRecentUnmanaged", "Recent upload skipped", { path, ageMs: Date.now() - fileUpdatedTime });
          skippedCount++;
          continue; // Recent upload, keep safe
        }

        // Passed all safety gates -> Safe to delete
        try {
          await storageDataSource.deleteFile(path);
          adminLogger.info("MediaSweeper:deletedUnmanaged", "Deleted unmanaged physical object", { path });
          deletedCount++;
        } catch (err) {
          adminLogger.warn("MediaSweeper:deleteFailed", "Failed to delete unmanaged file", { path, error: String(err) });
          skippedCount++;
        }
      }

      // 2. Process aged unattached assets
      for (const asset of audit.unattachedAssets) {
        // Safety Check A: Is it actively referenced despite being marked UNATTACHED?
        if (activeRefs.has(asset.storagePath)) {
          adminLogger.info("MediaSweeper:reconcileUnattached", "Reconciled actively referenced unattached asset", { storagePath: asset.storagePath, id: asset.id });
          await firestoreDataSource.setDocument(
            this.collectionName,
            asset.id,
            { status: "ATTACHED", updatedAt: new Date().toISOString() },
            true
          );
          reconciledCount++;
          continue;
        }

        // Safety Check B: Retention threshold
        const createdAt = new Date(asset.createdAt).getTime();
        if (createdAt >= cutoffTime) {
          skippedCount++;
          continue; // In-retention window
        }

        // Passed all safety gates -> Safe to delete
        try {
          await storageDataSource.deleteFile(asset.storagePath);
          await firestoreDataSource.deleteDocument(this.collectionName, asset.id);
          adminLogger.info("MediaSweeper:deletedUnattached", "Deleted aged unattached asset", { storagePath: asset.storagePath, id: asset.id });
          deletedCount++;
        } catch (err) {
          adminLogger.warn("MediaSweeper:unattachedDeleteFailed", "Failed to delete unattached asset", { storagePath: asset.storagePath, error: String(err) });
          skippedCount++;
        }
      }

      // 3. Process pending deletions
      for (const asset of audit.pendingDeletion) {
        // Safety Check: Verify entity hasn't re-referenced the asset
        if (activeRefs.has(asset.storagePath)) {
          adminLogger.warn("MediaSweeper:abortedPendingDeletion", "Asset was re-referenced by CMS document; restored to ATTACHED", {
            storagePath: asset.storagePath,
          });
          await firestoreDataSource.setDocument(
            this.collectionName,
            asset.id,
            { status: "ATTACHED", updatedAt: new Date().toISOString() },
            true
          );
          reconciledCount++;
          continue;
        }

        try {
          await storageDataSource.deleteFile(asset.storagePath);
          await firestoreDataSource.deleteDocument(this.collectionName, asset.id);
          adminLogger.info("MediaSweeper:deletedPending", "Deleted pending asset", { storagePath: asset.storagePath, id: asset.id });
          deletedCount++;
        } catch (err) {
          adminLogger.warn("MediaSweeper:pendingDeleteFailed", "Failed to delete pending asset", { storagePath: asset.storagePath, error: String(err) });
          skippedCount++;
        }
      }

      adminLogger.info("MediaSweeper:sweepCompleted", "Orphan sweep finished", { deletedCount, skippedCount, reconciledCount });
      return { deletedCount, skippedCount, reconciledCount };
    });
  }
}

export const mediaRepository = new MediaRepository();
