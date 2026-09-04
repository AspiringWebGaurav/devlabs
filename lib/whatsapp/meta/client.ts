/**
 * Meta Graph API Client
 * 
 * Direct HTTP client for WhatsApp Cloud API:
 * - Text messages
 * - Interactive Quick-Reply buttons
 * - Document (PDF) dispatching
 * Zero Redis, zero database queues, sub-second latency.
 */

import { getWhatsAppConfig } from "../config/whatsapp.config";
import { adminLogger } from "@/lib/admin/logger";
import type { MetaSendMessageResponse, MetaApiErrorResponse } from "../types";

export interface SendMessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface QuickReplyButton {
  id: string;
  title: string;
}

export class WhatsAppMetaClient {
  /**
   * Dispatches a free-form text message directly to recipient phone via Meta Cloud API.
   */
  public static async sendTextMessage(toPhone: string, bodyText: string): Promise<SendMessageResult> {
    return this.postGraphMessage(toPhone, {
      type: "text",
      text: {
        preview_url: false,
        body: bodyText,
      },
    });
  }

  /**
   * Dispatches interactive quick-reply buttons (up to 3 clickable buttons).
   */
  public static async sendQuickReplyButtons(
    toPhone: string,
    bodyText: string,
    buttons: QuickReplyButton[],
    footerText?: string
  ): Promise<SendMessageResult> {
    // Meta Graph API hard ceiling: interactive body text must be <= 1024 characters
    if (bodyText.length > 1024) {
      const textResult = await this.sendTextMessage(toPhone, bodyText);
      if (!textResult.success) {
        return textResult;
      }
      bodyText = "Select an option below to proceed:";
    }

    return this.postGraphMessage(toPhone, {
      type: "interactive",
      interactive: {
        type: "button",
        body: {
          text: bodyText,
        },
        ...(footerText ? { footer: { text: footerText.slice(0, 60) } } : {}),
        action: {
          buttons: buttons.slice(0, 3).map((btn) => ({
            type: "reply",
            reply: {
              id: btn.id,
              title: btn.title.slice(0, 20), // Meta 20 character title limit
            },
          })),
        },
      },
    });
  }

  /**
   * Dispatches an actual document file (e.g. PDF Resume) directly into WhatsApp.
   */
  public static async sendDocumentMessage(
    toPhone: string,
    documentUrl: string,
    fileName: string,
    caption?: string
  ): Promise<SendMessageResult> {
    return this.postGraphMessage(toPhone, {
      type: "document",
      document: {
        link: documentUrl,
        filename: fileName,
        caption: caption || undefined,
      },
    });
  }

  /**
   * Internal helper executing direct POST to Meta Graph API.
   */
  private static async postGraphMessage(
    toPhone: string,
    payloadDetails: Record<string, unknown>
  ): Promise<SendMessageResult> {
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
          ...payloadDetails,
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
