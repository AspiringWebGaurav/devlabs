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

export interface WhatsAppNotificationRecord {
  id: string;
  visitorPhone: string;
  visitorEmail: string;
  visitorName: string;
  subject: string;
  status: "DELIVERED" | "FAILED";
  timestamp: string; // ISO 8601 string
  createdAt: number; // Unix timestamp in milliseconds
  error?: string;
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
}

export const whatsappNotificationsRepository = new WhatsAppNotificationsRepository();
