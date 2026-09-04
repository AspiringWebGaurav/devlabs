/**
 * WhatsApp Notification Repository
 *
 * Implements 4-Tier DAL pipeline:
 * UI -> Repositories -> DataSources (firestoreDataSource) -> Cloud Infrastructure
 *
 * Manages storage and retrieval of automated email notifications dispatched
 * to visitors alerting them that Gaurav has replied on WhatsApp.
 */

import { firestoreDataSource } from "@/lib/dal/datasource/firestore";
import { adminLogger } from "@/lib/admin/logger";
import { formatSubmissionTimestamp } from "@/lib/email";

export interface WhatsAppNotificationRecord {
  id: string;
  visitorPhone: string;
  visitorEmail: string;
  visitorName: string;
  subject: string;
  status: "DELIVERED" | "FAILED" | "PROCESSING";
  timestamp: string; // ISO 8601 string
  createdAt: number; // Unix timestamp in milliseconds
  error?: string;
}

export interface AtomicNotificationDispatchResult {
  shouldSend: boolean;
  isAlreadySent: boolean;
  record: WhatsAppNotificationRecord;
}

const COLLECTION_NAME = "whatsapp_notifications";

export class WhatsAppNotificationsRepository {
  /**
   * Records a dispatched notification into Firestore.
   */
  public async recordNotification(
    record: Omit<WhatsAppNotificationRecord, "id" | "createdAt">
  ): Promise<WhatsAppNotificationRecord> {
    const createdAt = Date.now();
    const cleanPhone = record.visitorPhone.replace(/[^0-9]/g, "");
    const id = `wa_notif_${cleanPhone}_${createdAt}`;

    const newRecord: WhatsAppNotificationRecord = {
      ...record,
      id,
      visitorPhone: cleanPhone,
      visitorEmail: record.visitorEmail.trim().toLowerCase(),
      createdAt,
    };

    try {
      await firestoreDataSource.setDocument(COLLECTION_NAME, id, newRecord);
      adminLogger.info("WhatsAppNotificationsRepository:recordNotification", "Recorded notification event", {
        id,
        phone: cleanPhone,
        email: record.visitorEmail,
      });
      return newRecord;
    } catch (err) {
      adminLogger.error("WhatsAppNotificationsRepository:recordNotification", err, "Failed to record notification");
      return newRecord; // Return record even if logging failed to not block UI
    }
  }

  /**
   * Retrieves the most recent dispatched notifications, sorted newest first.
   */
  public async getRecentNotifications(limitCount = 30): Promise<WhatsAppNotificationRecord[]> {
    try {
      const result = await firestoreDataSource.queryCollection<WhatsAppNotificationRecord>(COLLECTION_NAME, {
        orderByField: "createdAt",
        orderDirection: "desc",
        limit: limitCount,
      });

      return result.docs;
    } catch (err) {
      adminLogger.error("WhatsAppNotificationsRepository:getRecentNotifications", err, "Failed to load notifications");
      return [];
    }
  }

  /**
   * Checks whether a notification was already sent to this phone number within the last N minutes (idempotency).
   */
  public async wasRecentlyNotified(phone: string, withinMinutes = 2): Promise<boolean> {
    const cleanPhone = phone.replace(/[^0-9]/g, "");
    if (!cleanPhone) return false;

    const thresholdTime = Date.now() - withinMinutes * 60 * 1000;

    try {
      const result = await firestoreDataSource.queryCollection<WhatsAppNotificationRecord>(COLLECTION_NAME, {
        whereConditions: [
          { field: "visitorPhone", operator: "==", value: cleanPhone },
          { field: "createdAt", operator: ">=", value: thresholdTime },
        ],
        limit: 1,
      });

      return result.docs.length > 0;
    } catch (err) {
      adminLogger.warn("WhatsAppNotificationsRepository:wasRecentlyNotified", "Could not check recent notifications", {
        error: err,
        phone: cleanPhone,
      });
      return false;
    }
  }

  /**
   * Retrieves a single notification record by its unique dispatch ID.
   */
  public async getNotificationById(id: string): Promise<WhatsAppNotificationRecord | null> {
    try {
      return await firestoreDataSource.getDocument<WhatsAppNotificationRecord>(COLLECTION_NAME, id);
    } catch (err) {
      adminLogger.error("WhatsAppNotificationsRepository:getNotificationById", err, "Failed to load notification by id", { id });
      return null;
    }
  }

  /**
   * Records a notification with an explicit, predetermined dispatch ID (for strict single-click idempotency).
   */
  public async recordNotificationWithId(
    id: string,
    record: Omit<WhatsAppNotificationRecord, "id" | "createdAt">
  ): Promise<WhatsAppNotificationRecord> {
    const createdAt = Date.now();
    const cleanPhone = record.visitorPhone.replace(/[^0-9]/g, "");

    const newRecord: WhatsAppNotificationRecord = {
      ...record,
      id,
      visitorPhone: cleanPhone,
      visitorEmail: record.visitorEmail.trim().toLowerCase(),
      createdAt,
    };

    try {
      await firestoreDataSource.setDocument(COLLECTION_NAME, id, newRecord);
      adminLogger.info("WhatsAppNotificationsRepository:recordNotificationWithId", "Recorded notification event with custom ID", {
        id,
        phone: cleanPhone,
        email: record.visitorEmail,
      });
      return newRecord;
    } catch (err) {
      adminLogger.error("WhatsAppNotificationsRepository:recordNotificationWithId", err, "Failed to record notification with ID", { id });
      return newRecord;
    }
  }

  /**
   * Atomically claims a reply notification dispatch within a single Firestore transaction.
   * Prevents race conditions from rapid multiple clicks (e.g. double or triple click)
   * and blocks duplicate email sends for the same visitor session.
   */
  public async claimNotificationDispatch(
    dispatchId: string,
    phone: string,
    email: string,
    name: string
  ): Promise<AtomicNotificationDispatchResult> {
    const cleanPhone = phone.replace(/[^0-9]/g, "");
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = (name || "Visitor").trim();
    const now = Date.now();
    const nowTimestamp = formatSubmissionTimestamp();

    try {
      return await firestoreDataSource.runTransaction(async (transaction, db) => {
        // 1. Direct dispatch ID check: Has this exact link already been processed?
        const notifRef = db.collection(COLLECTION_NAME).doc(dispatchId);
        const notifSnap = await transaction.get(notifRef);

        if (notifSnap.exists) {
          const data = notifSnap.data() as WhatsAppNotificationRecord;
          return {
            shouldSend: false,
            isAlreadySent: true,
            record: data,
          };
        }

        // 2. Visitor session deduplication: Was this visitor notified within the last 15 minutes?
        const sessionRef = db.collection("whatsapp_sessions").doc(cleanPhone);
        const sessionSnap = await transaction.get(sessionRef);

        if (sessionSnap.exists) {
          const sessionData = sessionSnap.data() || {};
          const lastRepliedAt = typeof sessionData.lastRepliedNotificationAt === "number"
            ? sessionData.lastRepliedNotificationAt
            : 0;

          if (now - lastRepliedAt < 15 * 60 * 1000) {
            const existingTs = sessionData.lastRepliedNotificationTimestamp || nowTimestamp;
            const resolvedRecord: WhatsAppNotificationRecord = {
              id: dispatchId,
              visitorPhone: cleanPhone,
              visitorEmail: cleanEmail,
              visitorName: cleanName,
              subject: "Gaurav Patil replied to your message on WhatsApp",
              status: "DELIVERED",
              timestamp: existingTs,
              createdAt: lastRepliedAt,
            };
            transaction.set(notifRef, resolvedRecord);

            return {
              shouldSend: false,
              isAlreadySent: true,
              record: resolvedRecord,
            };
          }
        }

        // 3. First time! Claim the atomic lock right now inside the transaction!
        const initialRecord: WhatsAppNotificationRecord = {
          id: dispatchId,
          visitorPhone: cleanPhone,
          visitorEmail: cleanEmail,
          visitorName: cleanName,
          subject: "Gaurav Patil replied to your message on WhatsApp",
          status: "PROCESSING",
          timestamp: nowTimestamp,
          createdAt: now,
        };

        transaction.set(notifRef, initialRecord);

        // Update session timestamp atomically
        transaction.set(
          sessionRef,
          {
            lastRepliedNotificationAt: now,
            lastRepliedNotificationTimestamp: nowTimestamp,
          },
          { merge: true }
        );

        return {
          shouldSend: true,
          isAlreadySent: false,
          record: initialRecord,
        };
      });
    } catch (err) {
      adminLogger.error("WhatsAppNotificationsRepository:claimNotificationDispatch", err, "Atomic claim failed, falling back to read", { dispatchId });
      const existing = await this.getNotificationById(dispatchId);
      if (existing) {
        return { shouldSend: false, isAlreadySent: true, record: existing };
      }
      return {
        shouldSend: true,
        isAlreadySent: false,
        record: {
          id: dispatchId,
          visitorPhone: cleanPhone,
          visitorEmail: cleanEmail,
          visitorName: cleanName,
          subject: "Gaurav Patil replied to your message on WhatsApp",
          status: "PROCESSING",
          timestamp: nowTimestamp,
          createdAt: now,
        },
      };
    }
  }

  /**
   * Finalizes the notification dispatch status after Brevo delivery completes.
   */
  public async finalizeNotificationDispatch(
    dispatchId: string,
    success: boolean,
    error?: string
  ): Promise<void> {
    try {
      await firestoreDataSource.setDocument(
        COLLECTION_NAME,
        dispatchId,
        {
          status: success ? "DELIVERED" : "FAILED",
          error: error || null,
          updatedAt: Date.now(),
        },
        true
      );
    } catch (err) {
      adminLogger.error("WhatsAppNotificationsRepository:finalizeNotificationDispatch", err, "Failed to finalize dispatch status", { dispatchId });
    }
  }
}

export const whatsappNotificationsRepository = new WhatsAppNotificationsRepository();
