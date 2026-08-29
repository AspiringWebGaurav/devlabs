/**
 * Pure Canonical Draft Normalizer
 *
 * Isomorphic utility module with zero React, zero browser-only, and zero server-only
 * dependencies. Provides canonical normalization, emptiness evaluation, and deterministic
 * equality comparison for drafts across the Admin Mail Center.
 */

import type { MailRecipient, MailSenderKey } from "@/lib/dal/repositories/types";

export interface NormalizedAttachmentItem {
  id?: string;
  name: string;
  sizeBytes: number;
  contentType: string;
}

export interface NormalizedDraftSnapshot {
  senderKey: MailSenderKey;
  to: string[];        // Unique lowercase email addresses, sorted alphabetically
  cc: string[];        // Unique lowercase email addresses, sorted alphabetically (excluding 'to')
  bcc: string[];       // Unique lowercase email addresses, sorted alphabetically (excluding 'to' and 'cc')
  subject: string;     // Trimmed single-line subject
  body: string;        // CRLF (\r\n) normalized to LF (\n), outer whitespace trimmed
  attachments: NormalizedAttachmentItem[]; // Sorted deterministically
}

export interface RawDraftInput {
  senderKey?: MailSenderKey;
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
  })[];
}

/**
 * Extracts a normalized, deduplicated list of lowercase email addresses from
 * either a formatted comma/semicolon/newline string or MailRecipient array.
 */
export function extractNormalizedEmails(raw: MailRecipient[] | string | undefined): string[] {
  if (!raw) return [];

  const rawTokens: string[] = Array.isArray(raw)
    ? raw.map((r) => (typeof r === "string" ? r : r.email || ""))
    : raw.split(/[,;\n]+/);

  const emailSet = new Set<string>();

  for (const token of rawTokens) {
    const trimmed = token.trim();
    if (!trimmed) continue;

    // Handle "Name <email@domain.com>" format or plain "email@domain.com"
    const match = trimmed.match(/^(?:.*?<)?([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})>?$/);
    if (match && match[1]) {
      emailSet.add(match[1].toLowerCase().trim());
    } else if (trimmed.includes("@") && !trimmed.includes("<") && !trimmed.includes(">")) {
      emailSet.add(trimmed.toLowerCase().trim());
    }
  }

  return Array.from(emailSet).sort();
}

/**
 * Produces a canonical, deterministic snapshot representation of any draft payload.
 */
export function normalizeDraftState(input: RawDraftInput): NormalizedDraftSnapshot {
  const senderKey = input.senderKey || "HELLO";

  const toEmails = extractNormalizedEmails(input.to);
  const toSet = new Set(toEmails);

  const rawCcEmails = extractNormalizedEmails(input.cc);
  const ccEmails = rawCcEmails.filter((email) => !toSet.has(email));
  const ccSet = new Set(ccEmails);

  const rawBccEmails = extractNormalizedEmails(input.bcc);
  const bccEmails = rawBccEmails.filter((email) => !toSet.has(email) && !ccSet.has(email));

  const cleanSubject = (input.subject || "").replace(/[\r\n]+/g, " ").trim();
  const cleanBody = (input.body || "").replace(/\r\n/g, "\n").trim();

  const normalizedAttachments: NormalizedAttachmentItem[] = (input.attachments || [])
    .map((att) => ({
      id: att.id || undefined,
      name: (att.name || "").trim(),
      sizeBytes: Number(att.sizeBytes) || 0,
      contentType: (att.contentType || "application/octet-stream").trim().toLowerCase(),
    }))
    .filter((att) => att.name.length > 0 && att.sizeBytes > 0)
    .sort((a, b) => {
      // Deterministic sort by ID (if both exist), or name + size
      if (a.id && b.id) return a.id.localeCompare(b.id);
      const nameCmp = a.name.localeCompare(b.name);
      if (nameCmp !== 0) return nameCmp;
      return a.sizeBytes - b.sizeBytes;
    });

  return {
    senderKey,
    to: toEmails,
    cc: ccEmails,
    bcc: bccEmails,
    subject: cleanSubject,
    body: cleanBody,
    attachments: normalizedAttachments,
  };
}

/**
 * The Canonical Empty-Draft Rule (Single Source of Truth)
 *
 * A draft is EMPTY if and only if ALL four of the following conditions hold:
 * 1. to.length === 0
 * 2. subject.trim() === ""
 * 3. body.trim() === ""
 * 4. attachments.length === 0
 *
 * Note: CC, BCC, or Sender selection alone do NOT make a draft saveable.
 */
export function isDraftEmpty(input: NormalizedDraftSnapshot | RawDraftInput): boolean {
  const snapshot = "to" in input && Array.isArray(input.to) && typeof input.subject === "string"
    ? (input as NormalizedDraftSnapshot)
    : normalizeDraftState(input as RawDraftInput);

  return (
    snapshot.to.length === 0 &&
    snapshot.subject.length === 0 &&
    snapshot.body.length === 0 &&
    snapshot.attachments.length === 0
  );
}

/**
 * Evaluates semantic equality between two canonical draft snapshots.
 */
export function isDraftEqual(a: NormalizedDraftSnapshot, b: NormalizedDraftSnapshot): boolean {
  if (a.senderKey !== b.senderKey) return false;
  if (a.subject !== b.subject) return false;
  if (a.body !== b.body) return false;

  if (a.to.length !== b.to.length) return false;
  for (let i = 0; i < a.to.length; i++) {
    if (a.to[i] !== b.to[i]) return false;
  }

  if (a.cc.length !== b.cc.length) return false;
  for (let i = 0; i < a.cc.length; i++) {
    if (a.cc[i] !== b.cc[i]) return false;
  }

  if (a.bcc.length !== b.bcc.length) return false;
  for (let i = 0; i < a.bcc.length; i++) {
    if (a.bcc[i] !== b.bcc[i]) return false;
  }

  if (a.attachments.length !== b.attachments.length) return false;
  for (let i = 0; i < a.attachments.length; i++) {
    const attA = a.attachments[i];
    const attB = b.attachments[i];
    if (attA.id && attB.id && attA.id !== attB.id) return false;
    if (attA.name !== attB.name) return false;
    if (attA.sizeBytes !== attB.sizeBytes) return false;
    if (attA.contentType !== attB.contentType) return false;
  }

  return true;
}
