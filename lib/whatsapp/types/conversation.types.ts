/**
 * Internal WhatsApp Conversation, State Machine, Outbox, Notification, and Event Types
 * 
 * Strict Enterprise Standard:
 * - Differentiates Root ConversationState vs Flow currentStep vs Ephemeral Phases.
 * - OCC stateVersion and sessionGeneration on root documents.
 * - Transactional Outbox and Notification schemas.
 */

export type ConversationState =
  | "NEW_CONTACT"
  | "IDLE"
  | "RESUME_VIEWED"
  | "INTAKE_ACTIVE"
  | "HUMAN_PENDING"
  | "SUSPECT_STATE"
  | "OPTED_OUT";

export type OpportunityFlowStep =
  | "idle"
  | "awaiting_name"
  | "awaiting_company"
  | "awaiting_role"
  | "awaiting_details"
  | "awaiting_file"
  | "lead_review"
  | "completed"
  | "awaiting_human_message";

export interface DraftOpportunityLead {
  name?: string;
  company?: string;
  role?: string;
  details?: string;
  notes?: string;
  mediaStoragePath?: string;
  mediaFileName?: string;
  mediaMimeType?: string;
  mediaSizeBytes?: number;
}

export interface WhatsAppConversation {
  conversationId: string;       // Normalized E.164 phone (Doc ID)
  waPhoneNumber: string;        // E.164 phone
  contactName?: string;         // Extracted Meta profile name
  currentState: ConversationState;
  stateVersion: number;         // Monotonically increasing OCC counter
  activeFlowId?: string;        // UUID of active flow document
  sessionGeneration: number;    // Incremented on reset without history loss
  lastInboundAt: number;        // Epoch ms
  lastOutboundAt: number;       // Epoch ms
  lastActivityAt: number;       // Epoch ms
  customerServiceWindowOpenedAt: number;
  customerServiceWindowExpiresAt: number; // lastInboundAt + 24 hours
  windowClosedActionRequired?: boolean;
  humanRequested: boolean;
  humanRequestedAt?: number;
  optedOut: boolean;
  optedOutAt?: number;
  unreadByAdmin: boolean;
  archived: boolean;
  leadSubmitted?: boolean;
  createdAt: number;
  updatedAt: number;
}

// Admin UI View-Model representing recruiter conversation thread in chat viewer
export interface WhatsAppThread extends Partial<WhatsAppConversation> {
  id: string;
  recruiterPhone: string;
  recruiterName?: string;
  status: "active" | "inactive" | "opted_out" | "closed";
  currentFlowStep: OpportunityFlowStep;
  draftLead?: DraftOpportunityLead;
  leadSubmitted: boolean;
  hasReceivedResume?: boolean;
  hasRequestedHuman?: boolean;
  lastInboundMessageAt: number;
  lastOutboundMessageAt: number;
  customerServiceWindowExpiresAt: number;
  optedOut: boolean;
}

export interface WhatsAppFlow {
  flowId: string;               // UUID (Doc ID)
  conversationId: string;       // E.164 phone
  flowType: "OPPORTUNITY_INTAKE" | "HUMAN_HANDOFF" | "RESUME_OVERVIEW";
  currentStep: OpportunityFlowStep;
  status: "ACTIVE" | "STALE" | "COMPLETED" | "ABANDONED" | "EXPIRED";
  version: number;              // OCC flow counter
  collectedData: DraftOpportunityLead;
  startedAt: number;
  updatedAt: number;
  completedAt?: number;
  expiresAt: number;            // TTL boundary (24h)
}

export type InboundEventStatus =
  | "PENDING"
  | "CLAIMED"
  | "PROCESSED"
  | "FAILED"
  | "WAITING_FOR_STATE"
  | "POISON_EVENT"
  | "DEAD_LETTER";

export interface InboundEvent {
  eventId: string;              // Canonical Doc ID: sha256(wamid:wabaId:phoneNumber)
  wamid: string;
  wabaId: string;
  phoneNumber: string;
  senderName?: string;
  type: string;
  body?: string;
  interactiveButtonId?: string;
  mediaId?: string;
  mediaMimeType?: string;
  mediaFileName?: string;
  mediaStoragePath?: string;
  receivedAt: number;
  processingStatus: InboundEventStatus;
  attemptCount: number;
  lockedBy?: string;
  leaseExpiresAt?: number;
  lastError?: string;
  processedAt?: number;
}

export type OutboxMessageStatus =
  | "PENDING"
  | "CLAIMED"
  | "SENDING"
  | "META_ACCEPTED"
  | "AMBIGUOUS"
  | "RECONCILING"
  | "CONFIRMED_ACCEPTED"
  | "CONFIRMED_NOT_ACCEPTED"
  | "UNRESOLVED"
  | "DELIVERED"
  | "READ"
  | "SUPERSEDED"
  | "POLICY_BLOCKED"
  | "RETRY_PENDING"
  | "DEAD_LETTER";

export interface WhatsAppOutboxMessage {
  outboxId: string;             // UUID
  operationId: string;          // Canonical Doc ID: sha256(conversationId + correlationId + step)
  conversationId: string;       // E.164 phone
  destinationPhone: string;     // E.164 phone
  messageType: "quick_reply" | "text" | "document";
  payload: {
    bodyText: string;
    footerText?: string;
    buttons?: Array<{ id: string; title: string }>;
    documentUrl?: string;
    fileName?: string;
  };
  correlationId: string;
  status: OutboxMessageStatus;
  attemptCount: number;
  maxAttempts: number;
  nextRetryAt: number;
  lockedBy?: string;
  lockedAt?: number;
  leaseExpiresAt?: number;
  lastError?: string;
  metaMessageId?: string;       // Returned wamid from Meta
  ambiguityDetectedAt?: number;
  reconciliationAttempts: number;
  supersededBy?: string;
  supersededAt?: number;
  createdAt: number;
  sentAt?: number;
  deliveredAt?: number;
  readAt?: number;
}

export type NotificationJobStatus =
  | "PENDING"
  | "CLAIMED"
  | "SENDING"
  | "SENT"
  | "AMBIGUOUS"
  | "CONFIRMED_SENT"
  | "UNRESOLVED"
  | "RETRY_PENDING"
  | "DEAD_LETTER";

export interface WhatsAppNotificationJob {
  notificationId: string;       // Canonical Doc ID: sha256(conversationId + eventId + type)
  type: "NEW_CONVERSATION" | "OPPORTUNITY_LEAD" | "DIRECT_MESSAGE" | "POLICY_BLOCKED_ALERT";
  conversationId: string;
  leadId?: string;
  recipientEmail: string;
  subject: string;
  htmlContent: string;
  textContent: string;
  status: NotificationJobStatus;
  attemptCount: number;
  nextRetryAt: number;
  lockedBy?: string;
  leaseExpiresAt?: number;
  lastError?: string;
  sentAt?: number;
  createdAt: number;
  correlationId: string;
}

export type WhatsAppAuditEventType =
  | "CONVERSATION_INITIALIZED"
  | "FLOW_STARTED"
  | "FLOW_STEP_ADVANCED"
  | "LEAD_SUBMITTED"
  | "SAFE_RESET"
  | "HUMAN_HANDOFF_REQUESTED"
  | "OPT_OUT"
  | "OUTBOUND_AMBIGUOUS"
  | "OUTBOUND_RECONCILING"
  | "OUTBOUND_RECONCILED"
  | "OUTBOUND_POLICY_BLOCKED"
  | "OUTBOUND_RETRY_AUTHORIZED"
  | "OUTBOUND_DEAD_LETTER";

export interface AuditActor {
  type: "RECRUITER" | "WEBHOOK" | "PROCESSOR" | "SYSTEM" | "ADMIN";
  id?: string;
}

export interface WhatsAppAuditEvent {
  auditId: string;              // Deterministic Doc ID: aud_${scope}_${id}_${eventType}
  eventType: WhatsAppAuditEventType | string;
  conversationId: string;
  flowId?: string;
  sessionGeneration?: number;
  previousState?: string;
  newState?: string;
  previousStep?: string;
  newStep?: string;
  inboundEventId?: string;
  operationId?: string;
  correlationId?: string;
  timestamp: number;
  actor: "RECRUITER" | "WEBHOOK" | "PROCESSOR" | "SYSTEM" | "ADMIN";
  actorId?: string;
  reason?: string;
  metadata?: Record<string, unknown>;
}

export type MessageClassification =
  | "GLOBAL_COMMAND"
  | "ACTIVE_FLOW_ANSWER"
  | "RECRUITER_QUESTION"
  | "GREETING_ACKNOWLEDGEMENT"
  | "FLOW_NAVIGATION"
  | "SKIP_REQUEST"
  | "ATTACHMENT_MEDIA"
  | "INTERACTIVE_RESPONSE"
  | "UNKNOWN_FALLBACK";

export interface ClassificationResult {
  classification: MessageClassification;
  confidence: "EXACT_COMMAND" | "UNAMBIGUOUS_MATCH" | "CLARIFICATION_REQUIRED" | "FALLBACK";
  commandType?: "STOP" | "RESET" | "MENU" | "START" | "HUMAN" | "BACK" | "EDIT" | "SKIP";
  faqId?: string;
  matchReason?: string;
  extractedEntities?: Record<string, unknown>;
  currentState: ConversationState;
  currentStep: OpportunityFlowStep;
  sessionGeneration: number;
  stateVersion: number;
  inboundEventId: string;
  routingRuleVersion: number;
}

export interface WhatsAppMessage {
  id: string; // Meta message ID (wamid) or operationId
  threadId: string; // E.164 phone
  direction: "inbound" | "outbound";
  type: "text" | "interactive_button" | "document" | "image" | "unsupported";
  body?: string;
  mediaStoragePath?: string;
  mediaMimeType?: string;
  mediaSizeBytes?: number;
  mediaFileName?: string;
  metaStatus?: "sent" | "delivered" | "read" | "failed";
  outboxStatus?: OutboxMessageStatus;
  operationId?: string;
  lastError?: string;
  metaMessageId?: string;
  timestamp: number;
  rawPayloadSnippet?: string;
}

export interface WhatsAppOpportunityLead {
  id: string;
  threadId: string;
  recruiterPhone: string;
  recruiterName: string;
  company: string;
  role: string;
  details?: string;
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
