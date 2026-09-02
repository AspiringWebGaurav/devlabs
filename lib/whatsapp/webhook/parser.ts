/**
 * Webhook Multi-Entry Payload Parser & Iterator
 * 
 * Iterates through every entry, change, message, and status update
 * without assuming single-item arrays (messages[0]).
 */

import type { MetaWebhookPayload, MetaInboundMessage, MetaMessageStatus } from "../types";
import { normalizeE164, sanitizeText } from "../security/sanitizer";

export interface ParsedInboundMessage {
  id: string; // Meta wamid
  from: string; // Normalized E.164 phone
  senderName?: string;
  timestamp: number;
  type: "text" | "interactive_button" | "document" | "image" | "unsupported";
  body?: string;
  interactiveButtonId?: string;
  mediaId?: string;
  mediaMimeType?: string;
  mediaFileName?: string;
}

export interface ParsedMessageStatus {
  id: string; // Target wamid
  status: "sent" | "delivered" | "read" | "failed";
  recipientPhone: string;
  timestamp: number;
}

export interface WebhookParseResult {
  inboundMessages: ParsedInboundMessage[];
  statusUpdates: ParsedMessageStatus[];
  unknownEventCount: number;
}

export function parseWebhookPayload(payload: MetaWebhookPayload): WebhookParseResult {
  const inboundMessages: ParsedInboundMessage[] = [];
  const statusUpdates: ParsedMessageStatus[] = [];
  let unknownEventCount = 0;

  if (!payload.entry || !Array.isArray(payload.entry)) {
    return { inboundMessages, statusUpdates, unknownEventCount };
  }

  for (const entry of payload.entry) {
    for (const change of entry.changes || []) {
      const value = change.value;
      if (!value) continue;

      // Extract sender profile name if provided in contacts array
      const contactMap = new Map<string, string>();
      if (Array.isArray(value.contacts)) {
        for (const contact of value.contacts) {
          if (contact.wa_id && contact.profile?.name) {
            contactMap.set(contact.wa_id, contact.profile.name);
          }
        }
      }

      // 1. Process Inbound Messages (Iterate all messages independently)
      if (Array.isArray(value.messages)) {
        for (const msg of value.messages) {
          const parsed = parseSingleInboundMessage(msg, contactMap);
          if (parsed) {
            inboundMessages.push(parsed);
          }
        }
      }

      // 2. Process Status Updates (Iterate all statuses independently)
      if (Array.isArray(value.statuses)) {
        for (const status of value.statuses) {
          const parsedStatus = parseSingleStatus(status);
          if (parsedStatus) {
            statusUpdates.push(parsedStatus);
          }
        }
      }

      // Track non-standard events
      if (!value.messages && !value.statuses) {
        unknownEventCount++;
      }
    }
  }

  return { inboundMessages, statusUpdates, unknownEventCount };
}

function parseSingleInboundMessage(
  msg: MetaInboundMessage,
  contactMap: Map<string, string>
): ParsedInboundMessage | null {
  if (!msg.id || !msg.from) return null;

  const fromPhone = normalizeE164(msg.from);
  const rawWaId = msg.from.replace(/[^0-9]/g, "");
  const senderName = contactMap.get(rawWaId) || contactMap.get(fromPhone) || undefined;
  const timestamp = parseInt(msg.timestamp, 10) * 1000 || Date.now();

  // Text message
  if (msg.type === "text" && msg.text?.body) {
    return {
      id: msg.id,
      from: fromPhone,
      senderName,
      timestamp,
      type: "text",
      body: sanitizeText(msg.text.body),
    };
  }

  // Interactive Quick Reply Button
  if (msg.type === "interactive" && msg.interactive?.type === "button_reply") {
    const button = msg.interactive.button_reply;
    return {
      id: msg.id,
      from: fromPhone,
      senderName,
      timestamp,
      type: "interactive_button",
      body: sanitizeText(button?.title || ""),
      interactiveButtonId: button?.id,
    };
  }

  // Legacy Button
  if (msg.type === "button" && msg.button?.text) {
    return {
      id: msg.id,
      from: fromPhone,
      senderName,
      timestamp,
      type: "interactive_button",
      body: sanitizeText(msg.button.text),
      interactiveButtonId: msg.button.payload,
    };
  }

  // Document (e.g. Job Description, Resume)
  if (msg.type === "document" && msg.document?.id) {
    return {
      id: msg.id,
      from: fromPhone,
      senderName,
      timestamp,
      type: "document",
      mediaId: msg.document.id,
      mediaMimeType: msg.document.mime_type,
      mediaFileName: msg.document.filename,
      body: sanitizeText(msg.document.caption || msg.document.filename || ""),
    };
  }

  // Image
  if (msg.type === "image" && msg.image?.id) {
    return {
      id: msg.id,
      from: fromPhone,
      senderName,
      timestamp,
      type: "image",
      mediaId: msg.image.id,
      mediaMimeType: msg.image.mime_type,
      body: sanitizeText(msg.image.caption || ""),
    };
  }

  // Unsupported or other types (location, audio, sticker)
  return {
    id: msg.id,
    from: fromPhone,
    senderName,
    timestamp,
    type: "unsupported",
    body: `[Unsupported message type: ${msg.type}]`,
  };
}

function parseSingleStatus(status: MetaMessageStatus): ParsedMessageStatus | null {
  if (!status.id || !status.status) return null;

  return {
    id: status.id,
    status: status.status,
    recipientPhone: normalizeE164(status.recipient_id || ""),
    timestamp: parseInt(status.timestamp, 10) * 1000 || Date.now(),
  };
}
