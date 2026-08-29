import { BaseRepository } from "./base.repository";
import { firestoreDataSource } from "../datasource/firestore";
import type {
  MailDocument,
  MailDraftDocument,
  MailSendStatus,
  PaginatedResult,
  PaginationOptions,
  RepositoryResult,
} from "./types";

export interface InitiateSendLockResult {
  acquired: boolean;
  existingStatus?: MailSendStatus;
  existingMessageId?: string;
  error?: string;
}

export class MailRepository extends BaseRepository {
  constructor() {
    super("MailRepository");
  }

  /**
   * Retrieves an immutable send record by its idempotencyKey.
   */
  public async getMailById(id: string): Promise<RepositoryResult<MailDocument | null>> {
    return this.executeQuery("getMailById", async () => {
      const doc = await firestoreDataSource.getDocument<MailDocument>("admin_mails", id);
      if (!doc) return null;

      // Reconcile stale SENDING (>30s) to DELIVERY_UNCERTAIN on read
      if (doc.status === "SENDING" && Date.now() - doc.updatedAt > 30000) {
        doc.status = "DELIVERY_UNCERTAIN";
        doc.errorMessage = "Operation interrupted before provider confirmation was recorded.";
        await firestoreDataSource.setDocument(
          "admin_mails",
          id,
          { status: "DELIVERY_UNCERTAIN", errorMessage: doc.errorMessage, updatedAt: Date.now() },
          true
        );
      }

      return doc;
    }, { id });
  }

  /**
   * Retrieves cursor-paginated sent mail history.
   */
  public async getSentMails(
    options: PaginationOptions = {}
  ): Promise<RepositoryResult<PaginatedResult<MailDocument>>> {
    const pageSize = Math.min(options.pageSize || 20, 50);

    return this.executeQuery("getSentMails", async () => {
      const result = await firestoreDataSource.queryCollection<MailDocument>("admin_mails", {
        limit: pageSize,
        orderByField: "createdAt",
        orderDirection: "desc",
      });

      const now = Date.now();
      const reconciledDocs = await Promise.all(
        result.docs.map(async (doc) => {
          if (doc.status === "SENDING" && now - doc.updatedAt > 30000) {
            doc.status = "DELIVERY_UNCERTAIN";
            doc.errorMessage = "Operation interrupted before provider confirmation was recorded.";
            await firestoreDataSource.setDocument(
              "admin_mails",
              doc.id,
              { status: "DELIVERY_UNCERTAIN", errorMessage: doc.errorMessage, updatedAt: now },
              true
            ).catch(() => {});
          }
          return doc;
        })
      );

      return {
        items: reconciledDocs,
        total: result.totalFetched,
        page: options.page || 1,
        pageSize,
        hasMore: result.hasMore,
        nextCursor: result.lastDoc ? result.lastDoc.id : undefined,
      };
    }, { pageSize });
  }

  /**
   * Atomically acquires an in-flight send lock in admin_mails keyed by idempotencyKey.
   * Uses an atomic Firestore transaction to eliminate race conditions between concurrent requests.
   */
  public async initiateSendLock(
    idempotencyKey: string,
    mailData: Omit<MailDocument, "id" | "status" | "createdAt" | "updatedAt">
  ): Promise<RepositoryResult<InitiateSendLockResult>> {
    return this.executeMutation("initiateSendLock", async () => {
      return await firestoreDataSource.runTransaction(async (transaction, db) => {
        const docRef = db.collection("admin_mails").doc(idempotencyKey);
        const snapshot = await transaction.get(docRef);
        const now = Date.now();

        if (snapshot.exists) {
          const existing = snapshot.data() as MailDocument;

          if (existing.status === "SENT") {
            return {
              acquired: false,
              existingStatus: "SENT",
              existingMessageId: existing.brevoMessageId,
              error: "This email was already sent successfully.",
            };
          }

          if (existing.status === "SENDING") {
            if (now - existing.updatedAt < 30000) {
              return {
                acquired: false,
                existingStatus: "SENDING",
                error: "Send operation is currently in progress. Please wait.",
              };
            }

            // Interrupted send -> reconcile to DELIVERY_UNCERTAIN
            transaction.set(
              docRef,
              { status: "DELIVERY_UNCERTAIN", errorMessage: "Operation timed out in-flight.", updatedAt: now },
              { merge: true }
            );
            return {
              acquired: false,
              existingStatus: "DELIVERY_UNCERTAIN",
              error: "Delivery status unconfirmed. Automatic resend is blocked to prevent duplicates.",
            };
          }

          if (existing.status === "DELIVERY_UNCERTAIN") {
            return {
              acquired: false,
              existingStatus: "DELIVERY_UNCERTAIN",
              error: "Delivery status unconfirmed. Automatic resend is blocked to prevent duplicates.",
            };
          }

          if (existing.status === "FAILED") {
            return {
              acquired: false,
              existingStatus: "FAILED",
              error: "Previous send operation failed. Please start a new compose operation.",
            };
          }
        }

        // Atomically create initial SENDING record
        const initialRecord: MailDocument = {
          ...mailData,
          id: idempotencyKey,
          status: "SENDING",
          createdAt: new Date(now).toISOString(),
          updatedAt: now,
        };

        transaction.set(docRef, initialRecord);
        return { acquired: true };
      });
    }, { idempotencyKey, senderKey: mailData.senderKey, toCount: mailData.to.length });
  }

  /**
   * Finalizes the state of a send operation after Brevo HTTP resolution.
   * Atomically commits status finalization and revision-safe draft cleanup inside a transaction.
   */
  public async finalizeSendStatus(
    idempotencyKey: string,
    params: {
      status: "SENT" | "FAILED" | "DELIVERY_UNCERTAIN";
      brevoMessageId?: string;
      errorMessage?: string;
      draftIdToDelete?: string;
      expectedRevision?: number;
    }
  ): Promise<RepositoryResult<void>> {
    return this.executeMutation("finalizeSendStatus", async () => {
      const now = Date.now();
      const updatePayload: Partial<MailDocument> = {
        status: params.status,
        updatedAt: now,
        ...(params.brevoMessageId && { brevoMessageId: params.brevoMessageId }),
        ...(params.errorMessage && { errorMessage: params.errorMessage }),
        ...(params.status === "SENT" && { sentAt: new Date(now).toISOString() }),
      };

      await firestoreDataSource.runTransaction(async (transaction, db) => {
        const mailDocRef = db.collection("admin_mails").doc(idempotencyKey);
        transaction.set(mailDocRef, updatePayload, { merge: true });

        // Revision-safe draft cleanup: only delete if draft in Firestore matches expectedRevision
        if (params.status === "SENT" && params.draftIdToDelete) {
          const draftDocRef = db.collection("admin_mail_drafts").doc(params.draftIdToDelete);
          const draftSnap = await transaction.get(draftDocRef);

          if (draftSnap.exists) {
            const existingDraft = draftSnap.data() as MailDraftDocument;
            const currentDraftRev = existingDraft.revision ?? 1;

            // If expectedRevision was specified, ensure it still matches
            if (params.expectedRevision === undefined || currentDraftRev === params.expectedRevision) {
              transaction.delete(draftDocRef);
            }
            // If revision changed (e.g. edited to 6 in another tab), deletion is skipped to preserve newer work
          }
        }
      });
    }, { idempotencyKey, finalStatus: params.status, messageId: params.brevoMessageId, draftIdToDelete: params.draftIdToDelete, expectedRevision: params.expectedRevision });
  }

  /**
   * Retrieves all active drafts for an admin, automatically cleaning expired drafts (>30d).
   */
  public async getDrafts(adminEmail: string): Promise<RepositoryResult<MailDraftDocument[]>> {
    return this.executeQuery("getDrafts", async () => {
      const result = await firestoreDataSource.queryCollection<MailDraftDocument>("admin_mail_drafts", {
        limit: 50,
        orderByField: "updatedAt",
        orderDirection: "desc",
      });

      const now = new Date();
      const activeDrafts: MailDraftDocument[] = [];

      for (const draft of result.docs) {
        const isExpired = draft.expiresAt && new Date(draft.expiresAt) <= now;
        if (isExpired) {
          // Lazy background prune
          firestoreDataSource.deleteDocument("admin_mail_drafts", draft.id).catch(() => {});
        } else if (draft.savedByAdminEmail?.toLowerCase() === adminEmail.toLowerCase()) {
          activeDrafts.push(draft);
        }
      }

      return activeDrafts;
    }, { adminEmail });
  }

  /**
   * Retrieves a single draft by ID.
   */
  public async getDraftById(id: string): Promise<RepositoryResult<MailDraftDocument | null>> {
    return this.executeQuery("getDraftById", async () => {
      return await firestoreDataSource.getDocument<MailDraftDocument>("admin_mail_drafts", id);
    }, { id });
  }

  /**
   * Creates or updates a draft in admin_mail_drafts with atomic revision checking,
   * create-operation idempotency, and 30-day TTL.
   */
  public async saveDraft(
    draftData: Omit<MailDraftDocument, "id" | "createdAt" | "updatedAt" | "expiresAt" | "revision"> & {
      id?: string;
      createOperationId?: string;
      expectedRevision?: number;
    }
  ): Promise<RepositoryResult<MailDraftDocument>> {
    const id = draftData.id || draftData.createOperationId || `draft_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date();
    const expiresDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days TTL

    return this.executeMutation("saveDraft", async () => {
      return await firestoreDataSource.runTransaction(async (transaction, db) => {
        const docRef = db.collection("admin_mail_drafts").doc(id);
        const snapshot = await transaction.get(docRef);

        let finalRevision = 1;
        let createdAt = now.toISOString();

        if (snapshot.exists) {
          const existing = snapshot.data() as MailDraftDocument;
          const currentRevision = existing.revision ?? 1;

          // Idempotent retry check: if creating a new draft with the same createOperationId,
          // return existing created record idempotently without duplicate writes
          if (
            !draftData.id &&
            draftData.createOperationId &&
            existing.createOperationId === draftData.createOperationId &&
            draftData.expectedRevision === undefined
          ) {
            return existing;
          }

          if (draftData.expectedRevision !== undefined && currentRevision !== draftData.expectedRevision) {
            const conflictErr = new Error(
              `DRAFT_CONFLICT: Draft revision mismatch (expected ${draftData.expectedRevision}, found ${currentRevision})`
            );
            (conflictErr as unknown as { code: string; currentRevision: number; serverDraft: MailDraftDocument }).code = "DRAFT_CONFLICT";
            (conflictErr as unknown as { code: string; currentRevision: number; serverDraft: MailDraftDocument }).currentRevision = currentRevision;
            (conflictErr as unknown as { code: string; currentRevision: number; serverDraft: MailDraftDocument }).serverDraft = existing;
            throw conflictErr;
          }

          finalRevision = currentRevision + 1;
          createdAt = existing.createdAt || createdAt;
        }

        const record: MailDraftDocument = {
          id,
          createOperationId: draftData.createOperationId || (snapshot.exists ? (snapshot.data() as MailDraftDocument).createOperationId : undefined),
          senderKey: draftData.senderKey,
          to: draftData.to,
          cc: draftData.cc || [],
          bcc: draftData.bcc || [],
          subject: draftData.subject,
          body: draftData.body,
          attachments: draftData.attachments || [],
          savedByAdminEmail: draftData.savedByAdminEmail,
          createdAt,
          updatedAt: now.toISOString(),
          expiresAt: expiresDate.toISOString(),
          revision: finalRevision,
        };

        transaction.set(docRef, record);
        return record;
      });
    }, { id, admin: draftData.savedByAdminEmail, expectedRevision: draftData.expectedRevision, createOperationId: draftData.createOperationId });
  }

  /**
   * Deletes a draft from admin_mail_drafts inside an atomic transaction.
   */
  public async deleteDraft(id: string, expectedRevision?: number): Promise<RepositoryResult<void>> {
    return this.executeMutation("deleteDraft", async () => {
      return await firestoreDataSource.runTransaction(async (transaction, db) => {
        const docRef = db.collection("admin_mail_drafts").doc(id);
        const snapshot = await transaction.get(docRef);

        if (!snapshot.exists) {
          return;
        }

        const existing = snapshot.data() as MailDraftDocument;
        if (expectedRevision !== undefined && existing.revision !== undefined && existing.revision !== expectedRevision) {
          const conflictErr = new Error(
            `DRAFT_CONFLICT: Cannot delete draft; revision mismatch (expected ${expectedRevision}, found ${existing.revision})`
          );
          (conflictErr as unknown as { code: string; currentRevision: number }).code = "DRAFT_CONFLICT";
          (conflictErr as unknown as { code: string; currentRevision: number }).currentRevision = existing.revision;
          throw conflictErr;
        }

        transaction.delete(docRef);
      });
    }, { id, expectedRevision });
  }
}

export const mailRepository = new MailRepository();
