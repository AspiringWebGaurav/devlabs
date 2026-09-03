/**
 * Webhook Account & Phone Ownership Validation
 * 
 * Verifies that the incoming webhook payload belongs to the configured
 * WhatsApp Business Account and Phone Number ID to reject cross-account events.
 */

import { getWhatsAppConfig } from "../config/whatsapp.config";
import { adminLogger } from "@/lib/admin/logger";
import type { MetaWebhookPayload } from "../types";

export interface OwnershipValidationResult {
  valid: boolean;
  reason?: string;
  wabaId?: string;
}

export function validateWebhookOwnership(payload: MetaWebhookPayload): OwnershipValidationResult {
  const config = getWhatsAppConfig();
  const entryWabaId = payload.entry && payload.entry.length > 0 ? payload.entry[0].id : undefined;

  // 1. Verify WABA Account ID if present in payload entry
  if (config.businessAccountId && entryWabaId) {
    if (entryWabaId !== config.businessAccountId) {
      adminLogger.warn("WhatsApp:OwnershipMismatch", "WABA Account ID mismatch", {
        receivedWabaId: entryWabaId,
        expectedWabaId: config.businessAccountId,
      });
      return {
        valid: false,
        reason: `Mismatched WABA Account ID: expected ${config.businessAccountId}, got ${entryWabaId}`,
      };
    }
  }

  // 2. Verify Phone Number ID if present in changes metadata
  if (config.phoneNumberId && payload.entry) {
    for (const entry of payload.entry) {
      for (const change of entry.changes || []) {
        const phoneId = change.value?.metadata?.phone_number_id;
        if (phoneId && phoneId !== config.phoneNumberId) {
          adminLogger.warn("WhatsApp:OwnershipMismatch", "Phone Number ID mismatch", {
            receivedPhoneId: phoneId,
            expectedPhoneId: config.phoneNumberId,
          });
          return {
            valid: false,
            reason: `Mismatched Phone Number ID: expected ${config.phoneNumberId}, got ${phoneId}`,
          };
        }
      }
    }
  }

  return { valid: true, wabaId: entryWabaId };
}
