/**
 * Pure Canonical Send Validator
 *
 * Isomorphic utility module with zero React, zero browser-only, and zero server-only
 * dependencies. Provides canonical send eligibility evaluation, HTML-safe meaningful word
 * counting, and deterministic send-block reasons across the Admin Mail Center.
 */

import type { MailRecipient, MailSenderKey } from "@/lib/dal/repositories/types";

export const BLOCKED_ATTACHMENT_EXTENSIONS = new Set([
  ".exe",
  ".bat",
  ".cmd",
  ".sh",
  ".vbs",
  ".msi",
  ".dll",
  ".scr",
  ".com",
  ".pif",
  ".application",
  ".gadget",
  ".msp",
  ".hta",
  ".cpl",
  ".msc",
  ".jar",
]);

export interface RawSendInput {
  senderKey?: MailSenderKey | string;
  to?: MailRecipient[] | string;
  cc?: MailRecipient[] | string;
  bcc?: MailRecipient[] | string;
  subject?: string;
  body?: string;
  attachments?: ({
    id?: string;
    name: string;
    sizeBytes: number;
    contentType?: string;
    content?: string;
  })[];
  isPending?: boolean;
  isSavingDraft?: boolean;
  isDiscarding?: boolean;
  hasConflict?: boolean;
  attachmentError?: string | null;
}

export interface NormalizedSendSnapshot {
  senderKey: string;
  to: string[];
  cc: string[];
  bcc: string[];
  rawToCount: number;
  invalidEmailTokens: string[];
  subject: string;
  body: string;
  meaningfulWordCount: number;
  attachments: {
    id?: string;
    name: string;
    sizeBytes: number;
    contentType: string;
  }[];
  totalAttachmentBytes: number;
  hasDuplicateAttachmentNames: boolean;
  hasBlockedAttachmentExtensions: boolean;
  hasSingleAttachmentTooLarge: boolean;
  isPending: boolean;
  isSavingDraft: boolean;
  isDiscarding: boolean;
  hasConflict: boolean;
  attachmentError: string | null;
}

export type SendBlockReason =
  | "IN_FLIGHT_OPERATION"
  | "DRAFT_CONFLICT"
  | "ATTACHMENT_ERROR"
  | "MISSING_SENDER"
  | "MISSING_RECIPIENT"
  | "INVALID_RECIPIENT"
  | "RECIPIENT_LIMIT_EXCEEDED"
  | "MISSING_SUBJECT"
  | "SUBJECT_TOO_LONG"
  | "INSUFFICIENT_BODY_WORDS"
  | "BODY_TOO_LONG"
  | "ATTACHMENT_LIMIT_EXCEEDED"
  | "ATTACHMENT_TOO_LARGE"
  | "ATTACHMENT_BLOCKED_TYPE"
  | "ATTACHMENT_DUPLICATE_NAME"
  | "READY";

export interface SendValidationResult {
  canSend: boolean;
  reason: SendBlockReason;
  wordCount: number;
  tooltipText: string;
  errorMessage?: string;
  field?: "to" | "subject" | "body" | "attachments" | "senderKey";
}

/**
 * Validates whether a single email address conforms to standard syntax (RFC 5322).
 */
export function isValidEmailAddress(email: string): boolean {
  if (!email || typeof email !== "string") return false;
  const trimmed = email.trim();
  if (trimmed.length < 5 || trimmed.length > 254) return false;
  // Strict format: user@domain.tld with standard alphanumeric characters and valid domain
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return emailRegex.test(trimmed);
}

/**
 * Normalizes email input into validated address arrays while recording any invalid tokens.
 */
export function parseAndValidateEmails(raw: MailRecipient[] | string | undefined): {
  validEmails: string[];
  invalidTokens: string[];
  rawCount: number;
} {
  if (!raw) return { validEmails: [], invalidTokens: [], rawCount: 0 };

  const rawTokens: string[] = Array.isArray(raw)
    ? raw.map((r) => (typeof r === "string" ? r : r.email || ""))
    : raw.split(/[,;\n]+/);

  const emailSet = new Set<string>();
  const invalidTokens: string[] = [];
  let rawCount = 0;

  for (const token of rawTokens) {
    const trimmed = token.trim();
    if (!trimmed) continue;
    rawCount++;

    // Support "Name <email@domain.com>" or plain "email@domain.com"
    const match = trimmed.match(/^(?:.*?<)?([^<>]+)>?$/);
    const candidateEmail = match && match[1] ? match[1].trim() : trimmed;

    if (isValidEmailAddress(candidateEmail)) {
      emailSet.add(candidateEmail.toLowerCase());
    } else {
      invalidTokens.push(trimmed);
    }
  }

  return {
    validEmails: Array.from(emailSet).sort(),
    invalidTokens,
    rawCount,
  };
}

/**
 * Counts visible human-readable words in message body text.
 * Strips HTML tags, decodes standard HTML entities, collapses whitespace,
 * ignores punctuation-only tokens, and returns the meaningful word count.
 */
export function countMeaningfulWords(text: string | undefined): number {
  if (!text || typeof text !== "string") return 0;

  // 1. Normalize CRLF to LF
  let cleaned = text.replace(/\r\n/g, "\n");

  // 2. Remove HTML/XML tags and replace with whitespace to preserve word separation
  cleaned = cleaned.replace(/<[^>]*>/g, " ");

  // 3. Decode standard HTML entities
  cleaned = cleaned
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");

  // 4. Collapse whitespace
  cleaned = cleaned.trim();
  if (!cleaned) return 0;

  // 5. Split by whitespace and filter out empty / punctuation-only tokens
  const tokens = cleaned.split(/\s+/);
  let meaningfulWords = 0;

  for (const token of tokens) {
    // Check if token contains at least one letter, number, or CJK/Unicode word character
    if (/[\p{L}\p{N}]/u.test(token)) {
      meaningfulWords++;
    }
  }

  return meaningfulWords;
}

/**
 * Normalizes composer state into an immutable canonical snapshot.
 */
export function normalizeSendInput(input: RawSendInput): NormalizedSendSnapshot {
  const senderKey = (input.senderKey || "HELLO").trim();

  const toParsed = parseAndValidateEmails(input.to);
  const ccParsed = parseAndValidateEmails(input.cc);
  const bccParsed = parseAndValidateEmails(input.bcc);

  const toSet = new Set(toParsed.validEmails);
  const ccEmails = ccParsed.validEmails.filter((email) => !toSet.has(email));
  const ccSet = new Set(ccEmails);
  const bccEmails = bccParsed.validEmails.filter((email) => !toSet.has(email) && !ccSet.has(email));

  const invalidEmailTokens = [
    ...toParsed.invalidTokens,
    ...ccParsed.invalidTokens,
    ...bccParsed.invalidTokens,
  ];

  const cleanSubject = (input.subject || "").replace(/[\r\n]+/g, " ").trim();
  const cleanBody = (input.body || "").replace(/\r\n/g, "\n").trim();
  const meaningfulWordCount = countMeaningfulWords(cleanBody);

  let totalAttachmentBytes = 0;
  let hasBlockedAttachmentExtensions = false;
  let hasSingleAttachmentTooLarge = false;
  const attachmentNames = new Set<string>();
  let hasDuplicateAttachmentNames = false;

  const normalizedAttachments = (input.attachments || []).map((att) => {
    const name = (att.name || "").trim();
    const sizeBytes = Number(att.sizeBytes) || 0;
    const contentType = (att.contentType || "application/octet-stream").trim().toLowerCase();

    totalAttachmentBytes += sizeBytes;

    if (sizeBytes > 5 * 1024 * 1024) {
      hasSingleAttachmentTooLarge = true;
    }

    const ext = name.substring(name.lastIndexOf(".")).toLowerCase();
    if (BLOCKED_ATTACHMENT_EXTENSIONS.has(ext)) {
      hasBlockedAttachmentExtensions = true;
    }

    const lowerName = name.toLowerCase();
    if (attachmentNames.has(lowerName)) {
      hasDuplicateAttachmentNames = true;
    } else {
      attachmentNames.add(lowerName);
    }

    return {
      id: att.id || undefined,
      name,
      sizeBytes,
      contentType,
    };
  });

  return {
    senderKey,
    to: toParsed.validEmails,
    cc: ccEmails,
    bcc: bccEmails,
    rawToCount: toParsed.rawCount,
    invalidEmailTokens,
    subject: cleanSubject,
    body: cleanBody,
    meaningfulWordCount,
    attachments: normalizedAttachments,
    totalAttachmentBytes,
    hasDuplicateAttachmentNames,
    hasBlockedAttachmentExtensions,
    hasSingleAttachmentTooLarge,
    isPending: Boolean(input.isPending),
    isSavingDraft: Boolean(input.isSavingDraft),
    isDiscarding: Boolean(input.isDiscarding),
    hasConflict: Boolean(input.hasConflict),
    attachmentError: input.attachmentError || null,
  };
}

/**
 * Evaluates whether an outbound message is eligible for immediate Brevo dispatch.
 * Returns canSend boolean and deterministic priority-ordered block reason with contextual tooltip.
 */
export function validateSendEligibility(
  input: RawSendInput | NormalizedSendSnapshot
): SendValidationResult {
  const snapshot: NormalizedSendSnapshot =
    "meaningfulWordCount" in input && typeof input.meaningfulWordCount === "number"
      ? (input as NormalizedSendSnapshot)
      : normalizeSendInput(input as RawSendInput);

  // 1. In-flight lifecycle locks
  if (snapshot.isPending || snapshot.isSavingDraft || snapshot.isDiscarding) {
    return {
      canSend: false,
      reason: "IN_FLIGHT_OPERATION",
      wordCount: snapshot.meaningfulWordCount,
      tooltipText: snapshot.isPending ? "Sending via Brevo..." : "Operation in progress...",
      errorMessage: "An operation is currently in flight. Please wait.",
    };
  }

  // 2. Draft conflict active
  if (snapshot.hasConflict) {
    return {
      canSend: false,
      reason: "DRAFT_CONFLICT",
      wordCount: snapshot.meaningfulWordCount,
      tooltipText: "Resolve revision conflict before sending.",
      errorMessage: "Draft was modified in another session. Please resolve conflict before sending.",
    };
  }

  // 3. Attachment processing error
  if (snapshot.attachmentError) {
    return {
      canSend: false,
      reason: "ATTACHMENT_ERROR",
      wordCount: snapshot.meaningfulWordCount,
      tooltipText: "Remove or fix the invalid attachment before sending.",
      errorMessage: snapshot.attachmentError,
      field: "attachments",
    };
  }

  // 4. Missing sender
  if (!snapshot.senderKey) {
    return {
      canSend: false,
      reason: "MISSING_SENDER",
      wordCount: snapshot.meaningfulWordCount,
      tooltipText: "Select a verified sender identity.",
      errorMessage: "Please select a verified sender identity.",
      field: "senderKey",
    };
  }

  // 5. Invalid recipient tokens entered (e.g. user typed an invalid email)
  if (snapshot.invalidEmailTokens.length > 0) {
    return {
      canSend: false,
      reason: "INVALID_RECIPIENT",
      wordCount: snapshot.meaningfulWordCount,
      tooltipText: "Enter a valid recipient email address.",
      errorMessage: `Invalid recipient email address: "${snapshot.invalidEmailTokens[0]}"`,
      field: "to",
    };
  }

  // 6. Missing To recipients (Empty form, CC only, BCC only, Sender only)
  if (snapshot.to.length === 0) {
    return {
      canSend: false,
      reason: "MISSING_RECIPIENT",
      wordCount: snapshot.meaningfulWordCount,
      tooltipText: "Add at least one recipient.",
      errorMessage: "Please specify at least one valid 'To' recipient email address.",
      field: "to",
    };
  }

  // 7. Recipient limit exceeded
  const totalRecipients = snapshot.to.length + snapshot.cc.length + snapshot.bcc.length;
  if (totalRecipients > 50) {
    return {
      canSend: false,
      reason: "RECIPIENT_LIMIT_EXCEEDED",
      wordCount: snapshot.meaningfulWordCount,
      tooltipText: "Total recipients (To + CC + BCC) cannot exceed 50.",
      errorMessage: "Total combined recipients cannot exceed 50.",
      field: "to",
    };
  }

  // 8. Missing subject
  if (snapshot.subject.length === 0) {
    return {
      canSend: false,
      reason: "MISSING_SUBJECT",
      wordCount: snapshot.meaningfulWordCount,
      tooltipText: "Add a subject before sending.",
      errorMessage: "Subject line cannot be empty.",
      field: "subject",
    };
  }

  // 9. Subject too long
  if (snapshot.subject.length > 200) {
    return {
      canSend: false,
      reason: "SUBJECT_TOO_LONG",
      wordCount: snapshot.meaningfulWordCount,
      tooltipText: "Subject line cannot exceed 200 characters.",
      errorMessage: "Subject line cannot exceed 200 characters.",
      field: "subject",
    };
  }

  // 10. Insufficient body words (< 3 meaningful visible words)
  if (snapshot.meaningfulWordCount < 3) {
    return {
      canSend: false,
      reason: "INSUFFICIENT_BODY_WORDS",
      wordCount: snapshot.meaningfulWordCount,
      tooltipText: "Write at least 3 words in your message.",
      errorMessage: `Message must contain at least 3 words (currently ${snapshot.meaningfulWordCount}).`,
      field: "body",
    };
  }

  // 11. Body too long
  if (snapshot.body.length > 10000) {
    return {
      canSend: false,
      reason: "BODY_TOO_LONG",
      wordCount: snapshot.meaningfulWordCount,
      tooltipText: "Message content cannot exceed 10,000 characters.",
      errorMessage: "Message content cannot exceed 10,000 characters.",
      field: "body",
    };
  }

  // 12. Attachment count limit
  if (snapshot.attachments.length > 5) {
    return {
      canSend: false,
      reason: "ATTACHMENT_LIMIT_EXCEEDED",
      wordCount: snapshot.meaningfulWordCount,
      tooltipText: "Maximum 5 attachments allowed.",
      errorMessage: "Maximum 5 attachments allowed per email.",
      field: "attachments",
    };
  }

  // 13. Attachment file size limits
  if (snapshot.hasSingleAttachmentTooLarge || snapshot.totalAttachmentBytes > 10 * 1024 * 1024) {
    return {
      canSend: false,
      reason: "ATTACHMENT_TOO_LARGE",
      wordCount: snapshot.meaningfulWordCount,
      tooltipText: "Attachments exceed maximum allowed size.",
      errorMessage: "Attachments exceed maximum size (5MB per file, 10MB total).",
      field: "attachments",
    };
  }

  // 14. Blocked attachment file types
  if (snapshot.hasBlockedAttachmentExtensions) {
    return {
      canSend: false,
      reason: "ATTACHMENT_BLOCKED_TYPE",
      wordCount: snapshot.meaningfulWordCount,
      tooltipText: "Blocked file type detected in attachments.",
      errorMessage: "Executable and script attachments are blocked for security.",
      field: "attachments",
    };
  }

  // 15. Duplicate attachment filenames
  if (snapshot.hasDuplicateAttachmentNames) {
    return {
      canSend: false,
      reason: "ATTACHMENT_DUPLICATE_NAME",
      wordCount: snapshot.meaningfulWordCount,
      tooltipText: "Duplicate attachment filenames are not permitted.",
      errorMessage: "Duplicate attachment filenames are not permitted.",
      field: "attachments",
    };
  }

  // 16. Form is fully valid and ready to send
  return {
    canSend: true,
    reason: "READY",
    wordCount: snapshot.meaningfulWordCount,
    tooltipText: "Send email immediately via Brevo REST API v3",
  };
}
