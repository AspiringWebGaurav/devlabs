/**
 * Strongly Typed Meta WhatsApp Cloud API Webhook Payloads
 * Based on official Meta Webhook specifications for WhatsApp Business Platform.
 */

export interface MetaWebhookPayload {
  object: "whatsapp_business_account" | string;
  entry?: MetaWebhookEntry[];
}

export interface MetaWebhookEntry {
  id: string; // WhatsApp Business Account ID (WABA ID)
  changes?: MetaWebhookChange[];
}

export interface MetaWebhookChange {
  field: "messages" | string;
  value?: MetaWebhookValue;
}

export interface MetaWebhookValue {
  messaging_product: "whatsapp" | string;
  metadata?: {
    display_phone_number?: string;
    phone_number_id?: string;
  };
  contacts?: Array<{
    profile?: {
      name?: string;
    };
    wa_id: string; // E.164 phone number without plus prefix
  }>;
  messages?: MetaInboundMessage[];
  statuses?: MetaMessageStatus[];
  errors?: MetaWebhookError[];
}

export interface MetaInboundMessage {
  id: string; // Meta message ID (wamid.HBgM...)
  from: string; // Sender phone number (E.164 without plus)
  timestamp: string; // Unix timestamp string
  type: "text" | "interactive" | "button" | "document" | "image" | "audio" | "video" | "sticker" | "location" | "contacts" | "unknown";
  text?: {
    body: string;
  };
  interactive?: {
    type: "button_reply" | "list_reply";
    button_reply?: {
      id: string;
      title: string;
    };
    list_reply?: {
      id: string;
      title: string;
      description?: string;
    };
  };
  button?: {
    text: string;
    payload?: string;
  };
  document?: MetaMediaObject;
  image?: MetaMediaObject;
  audio?: MetaMediaObject;
  video?: MetaMediaObject;
  errors?: MetaWebhookError[];
}

export interface MetaMediaObject {
  id: string; // Media ID for Graph API retrieval
  mime_type: string;
  sha256?: string;
  filename?: string;
  caption?: string;
}

export interface MetaMessageStatus {
  id: string; // wamid of the outbound message
  status: "sent" | "delivered" | "read" | "failed";
  timestamp: string;
  recipient_id: string;
  conversation?: {
    id: string;
    origin?: {
      type: string;
    };
    expiration_timestamp?: string;
  };
  pricing?: {
    billable: boolean;
    pricing_model: string;
    category: string;
  };
  errors?: MetaWebhookError[];
}

export interface MetaWebhookError {
  code: number;
  title: string;
  message?: string;
  error_data?: {
    details?: string;
  };
}
