/**
 * Internal WhatsApp Conversation, State Machine, Lead, and Sync Types
 */

export type WhatsAppThreadStatus = "active" | "inactive" | "opted_out" | "closed";

export type OpportunityFlowStep =
  | "idle"
  | "awaiting_name"
  | "awaiting_company"
  | "awaiting_role"
  | "awaiting_details"
  | "awaiting_file";

export interface DraftOpportunityLead {
  name?: string;
  company?: string;
  role?: string;
  notes?: string;
  mediaStoragePath?: string;
  mediaFileName?: string;
}

export interface WhatsAppThread {
  id: string; // E.164 phone number (e.g. +919876543210)
  recruiterPhone: string;
  recruiterName?: string;
  status: WhatsAppThreadStatus;

  // Window & Authorization Tracking
  optedOut: boolean;
  optedOutAt?: number;
  lastInboundMessageAt: number;
  lastOutboundMessageAt: number;
  customerServiceWindowOpenedAt: number;
  customerServiceWindowExpiresAt: number; // lastInboundMessageAt + 24 hours

  // Sequential Opportunity Flow State
  currentFlowStep: OpportunityFlowStep;
  draftLead?: DraftOpportunityLead;

  unreadByAdmin: boolean;
  leadSubmitted: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface WhatsAppMessage {
  id: string; // Meta message ID (wamid)
  threadId: string; // E.164 phone
  direction: "inbound" | "outbound";
  type: "text" | "interactive_button" | "document" | "image" | "unsupported";
  body?: string;

  // Private Storage Reference
  mediaStoragePath?: string;
  mediaMimeType?: string;
  mediaSizeBytes?: number;
  mediaFileName?: string;

  metaStatus?: "sent" | "delivered" | "read" | "failed";
  timestamp: number;
  rawPayloadSnippet?: string;
}

export interface WhatsAppOpportunityLead {
  id: string; // Auto-generated lead ID (e.g. lead_1788...)
  threadId: string;
  recruiterPhone: string;
  recruiterName: string;
  company: string;
  role: string;
  notes?: string;
  mediaStoragePath?: string;
  mediaFileName?: string;
  status: "new" | "reviewed" | "archived";
  createdAt: number;
}

export interface WhatsAppSyncSignal {
  threadId: string;
  eventType: "new_message" | "new_lead" | "status_change";
  timestamp: number;
  unread: boolean;
}
