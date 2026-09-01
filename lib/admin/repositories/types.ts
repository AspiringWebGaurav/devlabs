export interface RepositoryResult<T> {
  success: boolean;
  data: T | null;
  error?: string;
  timestamp: string;
}

export interface PaginationOptions {
  page?: number;
  pageSize?: number;
  cursor?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  nextCursor?: string;
}

export interface PortfolioServiceItem {
  id: string;
  name: string;
  status: "operational" | "degraded" | "maintenance" | "inactive";
  endpoint: string;
  latencyMs: number;
  lastChecked: string;
  version: string;
}

export interface InquiryItem {
  id: string;
  name: string;
  email: string;
  subject?: string;
  message: string;
  createdAt: string;
  status: "unread" | "read" | "archived";
  repliedAt?: string;
  replyMessage?: string;
  replyMessageId?: string;
  senderIdentity?: string;
  replyLockUntil?: number | null;
  activeReplyKey?: string;
  // Durable Inquiry Extension Fields
  leadNumber?: number;
  requestId?: string;
  payloadHash?: string;
  durableStatus?: "PROCESSING" | "CONFIRMED" | "FAILED" | "DELIVERY_UNCERTAIN";
  deliveries?: {
    ownerNotification?: {
      state: "PENDING" | "SENT" | "FAILED" | "DELIVERY_UNCERTAIN";
      brevoMessageId?: string;
      dispatchedAt?: string;
      error?: string;
    };
    visitorAutoReply?: {
      state: "PENDING" | "SENT" | "FAILED" | "DELIVERY_UNCERTAIN";
      brevoMessageId?: string;
      dispatchedAt?: string;
      error?: string;
    };
  };
}

export interface AcquireReplyLockResult {
  acquired: boolean;
  alreadyReplied?: boolean;
  inProgress?: boolean;
  existingMessageId?: string;
  error?: string;
}

export type MailSenderKey =
  | "SECURITY"
  | "HELP"
  | "HELLO"
  | "NO_REPLY"
  | "LEGACY_SECURITY"
  | "LEGACY_HELP"
  | "LEGACY_HELLO"
  | "LEGACY_NO_REPLY";

export type MailSendStatus = "DRAFT" | "PENDING" | "SENDING" | "SENT" | "FAILED" | "DELIVERY_UNCERTAIN";

export interface MailRecipient {
  email: string;
  name?: string;
}

export interface MailDocument {
  id: string; // idempotencyKey
  senderKey: MailSenderKey;
  senderEmail: string;
  senderName: string;
  replyTo: string;
  to: MailRecipient[];
  cc?: MailRecipient[];
  bcc?: MailRecipient[];
  subject: string;
  textBody: string;
  htmlBody?: string;
  status: MailSendStatus;
  brevoMessageId?: string;
  errorMessage?: string;
  sentByAdminEmail: string;
  createdAt: string; // ISO 8601
  sentAt?: string; // ISO 8601
  updatedAt: number; // Epoch ms for lock staleness detection
}

export interface MailDraftDocument {
  id: string;
  senderKey: MailSenderKey;
  to: MailRecipient[];
  cc?: MailRecipient[];
  bcc?: MailRecipient[];
  subject: string;
  body: string;
  savedByAdminEmail: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string; // ISO 8601 (createdAt + 30 days) for Firestore TTL
}


