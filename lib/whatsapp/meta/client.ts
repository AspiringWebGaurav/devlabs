/**
 * Meta Graph API Client
 * 
 * Minimal, direct HTTP client for WhatsApp Cloud API.
 * Dispatches text messages directly to Meta's endpoint without database or Redis queues.
 */

import { getWhatsAppConfig } from "../config/whatsapp.config";
import { adminLogger } from "@/lib/admin/logger";
import type { MetaSendMessageResponse, MetaApiErrorResponse } from "../types";

export interface SendMessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export class WhatsAppMetaClient {
  /**
   * Dispatches a free-form text message directly to recipient phone via Meta Cloud API.
   */
  public static async sendTextMessage(toPhone: string, bodyText: string): Promise<SendMessageResult> {
    try {
      const config = getWhatsAppConfig();

      if (!config.phoneNumberId || !config.accessToken) {
        adminLogger.error("WhatsApp:MissingConfig", new Error("Missing WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_ACCESS_TOKEN"));
        return { success: false, error: "Missing WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_ACCESS_TOKEN" };
      }

      // Format recipient: digits only (no leading plus) per Meta Cloud API format
      const formattedRecipient = toPhone.replace(/[^0-9]/g, "");
      const url = `${config.graphBaseUrl}/${config.phoneNumberId}/messages`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: formattedRecipient,
          type: "text",
          text: {
            preview_url: false,
            body: bodyText,
          },
        }),
      });

      if (!response.ok) {
        let errorMsg = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorJson = (await response.json()) as MetaApiErrorResponse;
          if (errorJson.error?.message) {
            errorMsg = errorJson.error.message;
          }
        } catch {
          // Fall back to status text
        }

        adminLogger.error("WhatsApp:MetaApiSendFailed", new Error(errorMsg), "Meta Graph API send error", {
          status: response.status,
          recipient: formattedRecipient,
        });

        return { success: false, error: errorMsg };
      }

      const data = (await response.json()) as MetaSendMessageResponse;
      const messageId = data.messages?.[0]?.id || `wamid_${Date.now()}`;

      adminLogger.info("WhatsApp:MessageSent", "Message successfully dispatched via Meta API", {
        to: formattedRecipient,
        messageId,
      });

      return { success: true, messageId };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      adminLogger.error("WhatsApp:MetaApiError", err, "Network error calling Meta API");
      return { success: false, error: errorMsg };
    }
  }
}
