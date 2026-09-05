export interface LegalSection {
  id: string; // URL anchor slug (e.g. "anonymity", "assistant-terms", "whatsapp-terms")
  heading: string; // Display title (e.g. "2. Right to Confidential & Anonymous Communication")
  filterMode: "all" | "contact" | "assistant" | "whatsapp"; // Spotlight tab binding
  contentMarkdown: string; // Markdown / HTML body text
  order: number; // Display sequence
}

export interface LegalDocument {
  id: "terms_active" | "privacy_active";
  docType: "TERMS" | "PRIVACY";
  title: string; // "Terms of Service" | "Privacy Policy"
  publishedVersion: string; // e.g. "1.0.0"
  publishedAt: string; // ISO 8601 UTC
  effectiveDate: string; // "January 1, 2026"
  lastUpdatedDate: string; // "August 29, 2026"
  jurisdiction: string; // "Standard Global" | "Privacy-First"
  sections: LegalSection[];
  version: number; // Concurrency check counter
  updatedAt: string;

  // Private Draft Container (Completely excluded from public queries)
  draft?: {
    version: string;
    effectiveDate: string;
    lastUpdatedDate: string;
    changeSummary: string;
    isMaterialChange: boolean;
    sections: LegalSection[];
    savedAt: string;
    savedByAdmin: string;
  };
}

export interface LegalHistoryDocument {
  id: string;
  docType: "TERMS" | "PRIVACY";
  version: string;
  publishedAt: string;
  publishedByAdmin: string;
  effectiveDate: string;
  lastUpdatedDate: string;
  changeSummary: string;
  isMaterialChange: boolean;
  sectionsSnapshot: LegalSection[];
  notificationJobId?: string | null;
  createdAt: string;
}

export type LegalJobStatus =
  | "QUEUED"
  | "PROCESSING"
  | "COMPLETED"
  | "PARTIAL_FAILURE"
  | "RETRYING"
  | "FAILED";

export type RecipientDeliveryStatus = "PENDING" | "SENT" | "FAILED";

export interface LegalNotificationJobDocument {
  id: string;
  docType: "TERMS" | "PRIVACY";
  version: string;
  effectiveDate: string;
  changeSummary: string;
  isMaterialChange: boolean;
  status: LegalJobStatus;

  // Distributed Lease Semantics
  leaseExpiresAt?: number | null; // Epoch ms when current lease expires
  leaseOwnerToken?: string | null; // Unique worker UUID holding lease (worker_<nanoid>)
  claimedAt?: number | null; // Epoch ms when current lease was acquired

  // Snapshot Status Flag
  isSnapshotResolved: boolean; // True once eligible recipients are frozen in subcollection

  createdAt: string;
  startedAt?: string | null;
  updatedAt: string;
  completedAt?: string | null;

  // Authoritative Derived Operational Counters
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  pendingCount: number;
  retryCount: number;

  createdBy: string;
  lastError?: string | null;
}

export interface LegalNotificationRecipientRecord {
  id: string;
  email: string;
  name?: string;
  type: "VISITOR" | "ADMIN_AUDIT";
  status: RecipientDeliveryStatus;
  attempts: number;
  maxAttempts: number; // Default: 3
  isPermanentFailure?: boolean;
  lastError?: string | null;
  sentAt?: string | null;
  brevoMessageId?: string | null;
  idempotencyKey: string; // Deterministic Brevo provider key
  updatedAt: string;
}

export interface PublishLegalParams {
  docType: "TERMS" | "PRIVACY";
  expectedVersion: number;
  version: string;
  effectiveDate: string;
  lastUpdatedDate: string;
  changeSummary?: string;
  isMaterialChange: boolean;
  sections: LegalSection[];
  adminEmail: string;
}
