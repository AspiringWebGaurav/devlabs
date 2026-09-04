"use server";

import { cookies } from "next/headers";
import { ADMIN_COOKIE_NAME } from "@/lib/admin/constants";
import { verifyAdminSession } from "@/lib/admin/auth";
import {
  whatsappNotificationsRepository,
  type WhatsAppNotificationRecord,
} from "@/lib/dal/repositories/whatsapp-notifications.repository";

/**
 * Dynamically re-fetches the latest WhatsApp notification history from Firestore.
 */
export async function refreshNotificationHistoryAction(): Promise<{
  success: boolean;
  records: WhatsAppNotificationRecord[];
  error?: string;
}> {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
    if (sessionToken) {
      await verifyAdminSession(sessionToken);
    }

    // Note: We permit read if admin session exists or within this workflow
    const records = await whatsappNotificationsRepository.getRecentNotifications(30);
    return { success: true, records };
  } catch (err) {
    return {
      success: false,
      records: [],
      error: err instanceof Error ? err.message : "Failed to refresh notification history",
    };
  }
}
