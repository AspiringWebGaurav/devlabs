import { BaseRepository } from "./base.repository";
import { firestoreDataSource } from "@/lib/dal/datasource/firestore";
import { SEED_TERMS_DOCUMENT, SEED_PRIVACY_DOCUMENT } from "./seed-data";
import { adminLogger } from "@/lib/admin/logger";
import { formatBrevoIdempotencyKey } from "@/lib/email/brevo";
import { PRIMARY_ADMIN_EMAIL } from "@/lib/admin/constants";
import type {
  LegalDocument,
  LegalHistoryDocument,
  LegalNotificationJobDocument,
  LegalNotificationRecipientRecord,
  LegalJobStatus,
  PublishLegalParams,
  RecipientDeliveryStatus,
} from "@/types/legal";
import type { RepositoryResult } from "./types";
import { createHash } from "crypto";

export class LegalDocumentsRepository extends BaseRepository {
  constructor() {
    super("LegalDocumentsRepository");
  }

  private getDocId(docType: "TERMS" | "PRIVACY"): "terms_active" | "privacy_active" {
    return docType === "TERMS" ? "terms_active" : "privacy_active";
  }

  private hashEmail(email: string): string {
    return createHash("sha256").update(email.trim().toLowerCase()).digest("hex").slice(0, 20);
  }

  /**
   * Seeds active legal documents if uninitialized.
   */
  public async seedIfEmpty(): Promise<void> {
    try {
      const terms = await firestoreDataSource.getDocument<LegalDocument>(
        "portfolio_legal_docs",
        "terms_active"
      );
      if (!terms) {
        await firestoreDataSource.setDocument(
          "portfolio_legal_docs",
          "terms_active",
          SEED_TERMS_DOCUMENT
        );
        adminLogger.info("LegalDocumentsRepository:seedIfEmpty", "Seeded default terms_active document");
      }

      const privacy = await firestoreDataSource.getDocument<LegalDocument>(
        "portfolio_legal_docs",
        "privacy_active"
      );
      if (!privacy) {
        await firestoreDataSource.setDocument(
          "portfolio_legal_docs",
          "privacy_active",
          SEED_PRIVACY_DOCUMENT
        );
        adminLogger.info("LegalDocumentsRepository:seedIfEmpty", "Seeded default privacy_active document");
      }
    } catch (err) {
      adminLogger.error("LegalDocumentsRepository:seedIfEmpty", err, "Failed to seed legal documents");
    }
  }

  /**
   * Fetches the public published legal document (draft excluded).
   */
  public async getPublicDocument(
    docType: "TERMS" | "PRIVACY"
  ): Promise<RepositoryResult<Omit<LegalDocument, "draft">>> {
    const docId = this.getDocId(docType);

    return this.executeQuery("getPublicDocument", async () => {
      let doc = await firestoreDataSource.getDocument<LegalDocument>("portfolio_legal_docs", docId);

      if (!doc) {
        await this.seedIfEmpty();
        doc = await firestoreDataSource.getDocument<LegalDocument>("portfolio_legal_docs", docId);
      }

      if (!doc) {
        doc = docType === "TERMS" ? SEED_TERMS_DOCUMENT : SEED_PRIVACY_DOCUMENT;
      }

      // Strip private draft container from public return
      const { draft: _draft, ...publicDoc } = doc;
      void _draft;
      return publicDoc;
    });
  }

  /**
   * Fetches the full document for superadmin including draft state.
   */
  public async getAdminDocument(
    docType: "TERMS" | "PRIVACY"
  ): Promise<RepositoryResult<LegalDocument>> {
    const docId = this.getDocId(docType);

    return this.executeQuery("getAdminDocument", async () => {
      let doc = await firestoreDataSource.getDocument<LegalDocument>("portfolio_legal_docs", docId);

      if (!doc) {
        await this.seedIfEmpty();
        doc = await firestoreDataSource.getDocument<LegalDocument>("portfolio_legal_docs", docId);
      }

      if (!doc) {
        doc = docType === "TERMS" ? SEED_TERMS_DOCUMENT : SEED_PRIVACY_DOCUMENT;
      }

      return doc;
    });
  }

  /**
   * Saves an uncommitted draft inside the active document.
   */
  public async saveDraft(
    docType: "TERMS" | "PRIVACY",
    draftData: NonNullable<LegalDocument["draft"]>
  ): Promise<RepositoryResult<void>> {
    const docId = this.getDocId(docType);

    return this.executeMutation("saveDraft", async () => {
      await firestoreDataSource.setDocument(
        "portfolio_legal_docs",
        docId,
        {
          draft: draftData,
          updatedAt: new Date().toISOString(),
        },
        true
      );
    });
  }

  /**
   * Discards the active draft.
   */
  public async discardDraft(docType: "TERMS" | "PRIVACY"): Promise<RepositoryResult<void>> {
    const docId = this.getDocId(docType);

    return this.executeMutation("discardDraft", async () => {
      await firestoreDataSource.runTransaction(async (transaction, db) => {
        const docRef = db.collection("portfolio_legal_docs").doc(docId);
        const snap = await transaction.get(docRef);
        if (!snap.exists) return;

        const data = snap.data() as LegalDocument;
        delete data.draft;
        transaction.set(docRef, { ...data, updatedAt: new Date().toISOString() });
      });
    });
  }

  /**
   * Publishes a legal document revision.
   * Atomically commits active document, historical record, and durable notification job metadata
   * within ONE single Firestore transaction.
   */
  public async publishDocument(
    params: PublishLegalParams
  ): Promise<RepositoryResult<{ publishedDoc: LegalDocument; historyDocId: string; jobId?: string }>> {
    const docId = this.getDocId(params.docType);
    const historyDocId = `hist_${params.docType.toLowerCase()}_v${params.version.replace(/\./g, "_")}`;
    const jobId = params.isMaterialChange
      ? `job_legal_${params.docType.toLowerCase()}_${params.version.replace(/\./g, "_")}`
      : undefined;

    return this.executeMutation("publishDocument", async () => {
      const result = await firestoreDataSource.runTransaction(async (transaction, db) => {
        const activeDocRef = db.collection("portfolio_legal_docs").doc(docId);
        const activeSnap = await transaction.get(activeDocRef);

        let currentActive: LegalDocument;
        if (!activeSnap.exists) {
          currentActive = params.docType === "TERMS" ? SEED_TERMS_DOCUMENT : SEED_PRIVACY_DOCUMENT;
        } else {
          currentActive = activeSnap.data() as LegalDocument;
        }

        // Optimistic concurrency control verification
        if (currentActive.version !== params.expectedVersion) {
          throw new Error(
            `Concurrency Conflict: Document version was updated in another session. Expected v${params.expectedVersion}, found v${currentActive.version}.`
          );
        }

        const now = new Date().toISOString();

        // 1. Snapshot previous version into immutable history
        const historyDocRef = db.collection("portfolio_legal_history").doc(historyDocId);
        const historyData: LegalHistoryDocument = {
          id: historyDocId,
          docType: params.docType,
          version: currentActive.publishedVersion,
          publishedAt: currentActive.publishedAt,
          publishedByAdmin: params.adminEmail,
          effectiveDate: currentActive.effectiveDate,
          lastUpdatedDate: currentActive.lastUpdatedDate,
          changeSummary: params.changeSummary || "",
          isMaterialChange: params.isMaterialChange,
          sectionsSnapshot: currentActive.sections,
          notificationJobId: jobId || null,
          createdAt: now,
        };
        transaction.set(historyDocRef, historyData);

        // 2. Promote draft/parameters to root active published document
        const updatedActiveDoc: LegalDocument = {
          id: docId,
          docType: params.docType,
          title: params.docType === "TERMS" ? "Terms of Service" : "Privacy Policy",
          publishedVersion: params.version,
          publishedAt: now,
          effectiveDate: params.effectiveDate,
          lastUpdatedDate: params.lastUpdatedDate,
          jurisdiction: currentActive.jurisdiction || "Standard Global",
          sections: params.sections,
          version: currentActive.version + 1,
          updatedAt: now,
          // Clear draft sub-container upon publish
        };
        transaction.set(activeDocRef, updatedActiveDoc);

        // 3. For material changes, create durable notification job metadata in the exact same transaction
        if (params.isMaterialChange && jobId) {
          const jobDocRef = db.collection("legal_notification_jobs").doc(jobId);
          const jobData: LegalNotificationJobDocument = {
            id: jobId,
            docType: params.docType,
            version: params.version,
            effectiveDate: params.effectiveDate,
            changeSummary: params.changeSummary || "",
            isMaterialChange: true,
            status: "QUEUED",
            leaseExpiresAt: null,
            leaseOwnerToken: null,
            claimedAt: null,
            isSnapshotResolved: false,
            createdAt: now,
            startedAt: null,
            updatedAt: now,
            completedAt: null,
            totalRecipients: 0,
            sentCount: 0,
            failedCount: 0,
            pendingCount: 0,
            retryCount: 0,
            createdBy: params.adminEmail,
            lastError: null,
          };
          transaction.set(jobDocRef, jobData);
        }

        return {
          publishedDoc: updatedActiveDoc,
          historyDocId,
          jobId,
        };
      });

      return result;
    });
  }

  /**
   * Resolves the eligible recipient set ONCE and freezes it into the recipients subcollection.
   */
  public async resolveRecipientSnapshot(
    jobId: string
  ): Promise<RepositoryResult<{ totalRecipients: number }>> {
    return this.executeMutation("resolveRecipientSnapshot", async () => {
      const db = firestoreDataSource["getDb"]?.() || null;
      if (!db) throw new Error("Firestore Admin not configured");

      const jobRef = db.collection("legal_notification_jobs").doc(jobId);
      const jobSnap = await jobRef.get();
      if (!jobSnap.exists) throw new Error(`Job ${jobId} not found`);

      const jobData = jobSnap.data() as LegalNotificationJobDocument;
      if (jobData.isSnapshotResolved) {
        return { totalRecipients: jobData.totalRecipients };
      }

      const thirtyDaysAgoIso = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      // Query verified Live Chat sessions within application's 30-day window
      const sessionsSnap = await db
        .collection("live_chat_sessions")
        .where("createdAt", ">=", thirtyDaysAgoIso)
        .get();

      const uniqueRecipients = new Map<string, { email: string; name?: string }>();

      for (const doc of sessionsSnap.docs) {
        const s = doc.data();
        if (s.status === "REVOKED") continue;
        if (!s.email || typeof s.email !== "string") continue;

        const cleanEmail = s.email.trim().toLowerCase();
        if (!uniqueRecipients.has(cleanEmail)) {
          uniqueRecipients.set(cleanEmail, {
            email: cleanEmail,
            name: typeof s.visitorName === "string" ? s.visitorName : undefined,
          });
        }
      }

      // Prepare recipient records
      const recipientRecords: LegalNotificationRecipientRecord[] = [];
      const now = new Date().toISOString();

      // 1. Add Visitor Recipients
      for (const [cleanEmail, r] of uniqueRecipients.entries()) {
        const recipId = `recip_${this.hashEmail(cleanEmail)}`;
        recipientRecords.push({
          id: recipId,
          email: r.email,
          name: r.name,
          type: "VISITOR",
          status: "PENDING",
          attempts: 0,
          maxAttempts: 3,
          isPermanentFailure: false,
          sentAt: null,
          brevoMessageId: null,
          idempotencyKey: formatBrevoIdempotencyKey(
            `legal_notif:${jobData.docType}:${jobData.version}:${cleanEmail}`
          ),
          updatedAt: now,
        });
      }

      // 2. Add Dedicated Admin Audit Copy
      recipientRecords.push({
        id: "admin_audit",
        email: PRIMARY_ADMIN_EMAIL,
        name: "Gaurav Patil",
        type: "ADMIN_AUDIT",
        status: "PENDING",
        attempts: 0,
        maxAttempts: 3,
        isPermanentFailure: false,
        sentAt: null,
        brevoMessageId: null,
        idempotencyKey: formatBrevoIdempotencyKey(
          `legal_audit:${jobData.docType}:${jobData.version}:${PRIMARY_ADMIN_EMAIL.toLowerCase()}`
        ),
        updatedAt: now,
      });

      // Batch write recipients into subcollection
      const batchSize = 400;
      for (let i = 0; i < recipientRecords.length; i += batchSize) {
        const chunk = recipientRecords.slice(i, i + batchSize);
        const batch = db.batch();

        for (const record of chunk) {
          const recRef = jobRef.collection("recipients").doc(record.id);
          batch.set(recRef, record);
        }

        await batch.commit();
      }

      // Update parent job snapshot status and derived counters
      const totalCount = recipientRecords.length;
      await jobRef.update({
        isSnapshotResolved: true,
        totalRecipients: totalCount,
        pendingCount: totalCount,
        sentCount: 0,
        failedCount: 0,
        updatedAt: now,
      });

      return { totalRecipients: totalCount };
    });
  }

  /**
   * Retrieves a preview list of eligible recipients who will receive broadcast emails upon publication.
   */
  public async getEligibleRecipientsPreview(): Promise<
    RepositoryResult<{ email: string; name?: string; type: string }[]>
  > {
    return this.executeQuery("getEligibleRecipientsPreview", async () => {
      const db = firestoreDataSource["getDb"]?.() || null;
      const list: { email: string; name?: string; type: string }[] = [];
      const seen = new Set<string>();

      if (db) {
        try {
          const thirtyDaysAgoIso = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
          const sessionsSnap = await db
            .collection("live_chat_sessions")
            .where("createdAt", ">=", thirtyDaysAgoIso)
            .get();

          for (const doc of sessionsSnap.docs) {
            const s = doc.data();
            if (s.status === "REVOKED") continue;
            if (!s.email || typeof s.email !== "string") continue;
            const clean = s.email.trim().toLowerCase();
            if (!seen.has(clean)) {
              seen.add(clean);
              list.push({
                email: clean,
                name: typeof s.visitorName === "string" ? s.visitorName : undefined,
                type: "VISITOR",
              });
            }
          }
        } catch (err) {
          adminLogger.warn("LegalDocumentsRepository:getEligibleRecipientsPreview", "Live chat scan note", { error: err });
        }
      }

      if (!seen.has(PRIMARY_ADMIN_EMAIL.toLowerCase())) {
        list.push({
          email: PRIMARY_ADMIN_EMAIL,
          name: "Gaurav Patil",
          type: "ADMIN",
        });
      }

      return list;
    });
  }

  /**
   * Retrieves a notification job document.
   */
  public async getNotificationJob(
    jobId: string
  ): Promise<RepositoryResult<LegalNotificationJobDocument | null>> {
    return this.executeQuery("getNotificationJob", async () => {
      return await firestoreDataSource.getDocument<LegalNotificationJobDocument>(
        "legal_notification_jobs",
        jobId
      );
    });
  }

  /**
   * Retrieves all recent notification jobs for dashboard display.
   */
  public async getRecentNotificationJobs(
    limit = 15
  ): Promise<RepositoryResult<LegalNotificationJobDocument[]>> {
    return this.executeQuery("getRecentNotificationJobs", async () => {
      const res = await firestoreDataSource.queryCollection<LegalNotificationJobDocument>(
        "legal_notification_jobs",
        {
          limit,
          orderByField: "createdAt",
          orderDirection: "desc",
        }
      );
      return res.docs;
    });
  }

  /**
   * Retrieves recipient records from the job subcollection.
   */
  public async getJobRecipients(
    jobId: string,
    limitCount = 50
  ): Promise<RepositoryResult<LegalNotificationRecipientRecord[]>> {
    return this.executeQuery("getJobRecipients", async () => {
      const db = firestoreDataSource["getDb"]?.() || null;
      if (!db) return [];

      const snap = await db
        .collection("legal_notification_jobs")
        .doc(jobId)
        .collection("recipients")
        .limit(limitCount)
        .get();

      return snap.docs.map((d) => d.data() as LegalNotificationRecipientRecord);
    });
  }

  /**
   * Claims a 90-second lease on a notification job.
   */
  public async claimJobLease(
    jobId: string,
    workerToken: string
  ): Promise<RepositoryResult<{ claimed: boolean; job: LegalNotificationJobDocument }>> {
    return this.executeMutation("claimJobLease", async () => {
      const result = await firestoreDataSource.runTransaction(async (transaction, db) => {
        const jobRef = db.collection("legal_notification_jobs").doc(jobId);
        const snap = await transaction.get(jobRef);
        if (!snap.exists) throw new Error(`Job ${jobId} not found`);

        const job = snap.data() as LegalNotificationJobDocument;
        const now = Date.now();
        const isQueued = job.status === "QUEUED";
        const isExpired = job.status === "PROCESSING" && (job.leaseExpiresAt ?? 0) < now;
        const isRetrying = job.status === "RETRYING";

        if (!isQueued && !isExpired && !isRetrying) {
          return { claimed: false, job };
        }

        const leaseExpiresAt = now + 90_000;
        transaction.update(jobRef, {
          status: "PROCESSING",
          leaseOwnerToken: workerToken,
          claimedAt: now,
          leaseExpiresAt,
          startedAt: job.startedAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

        const updatedJob: LegalNotificationJobDocument = {
          ...job,
          status: "PROCESSING",
          leaseOwnerToken: workerToken,
          claimedAt: now,
          leaseExpiresAt,
        };

        return {
          claimed: true,
          job: updatedJob,
        };
      });

      return result;
    });
  }

  /**
   * Fetches up to 10 pending recipients from the subcollection.
   */
  public async fetchPendingBatch(
    jobId: string,
    batchSize = 10
  ): Promise<RepositoryResult<LegalNotificationRecipientRecord[]>> {
    return this.executeQuery("fetchPendingBatch", async () => {
      const db = firestoreDataSource["getDb"]?.() || null;
      if (!db) return [];

      const snap = await db
        .collection("legal_notification_jobs")
        .doc(jobId)
        .collection("recipients")
        .where("status", "==", "PENDING")
        .limit(batchSize)
        .get();

      return snap.docs.map((d) => d.data() as LegalNotificationRecipientRecord);
    });
  }

  /**
   * Commits batch progress to Firestore with strict stale-worker lease verification.
   */
  public async commitBatchProgress(
    jobId: string,
    workerToken: string,
    updates: Array<{
      id: string;
      status: RecipientDeliveryStatus;
      sentAt?: string | null;
      brevoMessageId?: string | null;
      lastError?: string | null;
      isPermanentFailure?: boolean;
    }>
  ): Promise<RepositoryResult<{ pendingCount: number; status: LegalJobStatus }>> {
    return this.executeMutation("commitBatchProgress", async () => {
      const result = await firestoreDataSource.runTransaction(async (transaction, db) => {
        const jobRef = db.collection("legal_notification_jobs").doc(jobId);
        const snap = await transaction.get(jobRef);
        if (!snap.exists) throw new Error(`Job ${jobId} not found`);

        const job = snap.data() as LegalNotificationJobDocument;

        // Stale Worker Rejection Invariant
        if (job.leaseOwnerToken !== workerToken) {
          throw new Error(
            `StaleWorkerError: Lease was revoked or reclaimed by ${job.leaseOwnerToken}. Write rejected.`
          );
        }
        if ((job.leaseExpiresAt ?? 0) < Date.now()) {
          throw new Error("StaleWorkerError: Lease expired before progress write. Write rejected.");
        }

        let newlySent = 0;
        let newlyFailed = 0;
        const now = new Date().toISOString();

        // 1. Update individual recipient documents
        for (const u of updates) {
          const recipRef = jobRef.collection("recipients").doc(u.id);
          transaction.update(recipRef, {
            status: u.status,
            sentAt: u.sentAt || null,
            brevoMessageId: u.brevoMessageId || null,
            lastError: u.lastError || null,
            isPermanentFailure: u.isPermanentFailure || false,
            attempts: (u as { attempts?: number }).attempts || 1,
            updatedAt: now,
          });

          if (u.status === "SENT") newlySent++;
          if (u.status === "FAILED") newlyFailed++;
        }

        // 2. Transactionally update derived summary counters
        const newSentCount = job.sentCount + newlySent;
        const newFailedCount = job.failedCount + newlyFailed;
        const newPendingCount = Math.max(0, job.pendingCount - (newlySent + newlyFailed));

        let nextStatus: LegalJobStatus = "PROCESSING";
        let completedAt: string | null = null;

        if (newPendingCount === 0) {
          completedAt = now;
          if (newFailedCount > 0 && newSentCount > 0) {
            nextStatus = "PARTIAL_FAILURE";
          } else if (newFailedCount > 0 && newSentCount === 0) {
            nextStatus = "FAILED";
          } else {
            nextStatus = "COMPLETED";
          }
        }

        transaction.update(jobRef, {
          sentCount: newSentCount,
          failedCount: newFailedCount,
          pendingCount: newPendingCount,
          status: nextStatus,
          completedAt,
          leaseExpiresAt: nextStatus === "PROCESSING" ? Date.now() + 90_000 : null,
          leaseOwnerToken: nextStatus === "PROCESSING" ? workerToken : null,
          updatedAt: now,
        });

        return { pendingCount: newPendingCount, status: nextStatus };
      });

      return result;
    });
  }

  /**
   * Resets failed recipients to PENDING for an explicit admin retry.
   */
  public async retryFailedRecipients(jobId: string): Promise<RepositoryResult<void>> {
    return this.executeMutation("retryFailedRecipients", async () => {
      const db = firestoreDataSource["getDb"]?.() || null;
      if (!db) throw new Error("Firestore Admin not configured");

      const jobRef = db.collection("legal_notification_jobs").doc(jobId);
      const snap = await jobRef.get();
      if (!snap.exists) throw new Error(`Job ${jobId} not found`);

      const failedRecipientsSnap = await jobRef
        .collection("recipients")
        .where("status", "==", "FAILED")
        .get();

      if (failedRecipientsSnap.empty) return;

      const batch = db.batch();
      const now = new Date().toISOString();

      for (const doc of failedRecipientsSnap.docs) {
        batch.update(doc.ref, {
          status: "PENDING",
          isPermanentFailure: false,
          updatedAt: now,
        });
      }

      await batch.commit();

      const failedCount = failedRecipientsSnap.size;
      const job = snap.data() as LegalNotificationJobDocument;

      await jobRef.update({
        status: "RETRYING",
        failedCount: Math.max(0, job.failedCount - failedCount),
        pendingCount: job.pendingCount + failedCount,
        retryCount: (job.retryCount || 0) + 1,
        updatedAt: now,
      });
    });
  }

  /**
   * Retrieves version history for a given document type.
   */
  public async getVersionHistory(
    docType: "TERMS" | "PRIVACY"
  ): Promise<RepositoryResult<LegalHistoryDocument[]>> {
    return this.executeQuery("getVersionHistory", async () => {
      const res = await firestoreDataSource.queryCollection<LegalHistoryDocument>(
        "portfolio_legal_history",
        {
          whereConditions: [{ field: "docType", operator: "==", value: docType }],
          orderByField: "createdAt",
          orderDirection: "desc",
          limit: 30,
        }
      );
      return res.docs;
    });
  }

  /**
   * Restores a historical snapshot into the draft slot (forward-only).
   */
  public async restoreVersionAsDraft(
    docType: "TERMS" | "PRIVACY",
    historyId: string,
    adminEmail: string
  ): Promise<RepositoryResult<void>> {
    const docId = this.getDocId(docType);

    return this.executeMutation("restoreVersionAsDraft", async () => {
      const historySnap = await firestoreDataSource.getDocument<LegalHistoryDocument>(
        "portfolio_legal_history",
        historyId
      );
      if (!historySnap) throw new Error(`Historical record ${historyId} not found.`);

      const now = new Date().toISOString();
      const draftData: NonNullable<LegalDocument["draft"]> = {
        version: `${historySnap.version}-restored`,
        effectiveDate: historySnap.effectiveDate,
        lastUpdatedDate: new Date().toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        }),
        changeSummary: `Restored clauses from historical archive v${historySnap.version}`,
        isMaterialChange: false,
        sections: historySnap.sectionsSnapshot,
        savedAt: now,
        savedByAdmin: adminEmail,
      };

      await firestoreDataSource.setDocument(
        "portfolio_legal_docs",
        docId,
        {
          draft: draftData,
          updatedAt: now,
        },
        true
      );
    });
  }
}

export const legalDocumentsRepository = new LegalDocumentsRepository();
