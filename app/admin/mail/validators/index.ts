import { z } from "zod";
import { isDraftEmpty } from "@/lib/mail/draft-normalizer";
import { countMeaningfulWords } from "@/lib/mail/send-validator";

export const BLOCKED_ATTACHMENT_EXTENSIONS = new Set([
  ".exe", ".bat", ".cmd", ".sh", ".vbs", ".msi", ".dll", ".scr",
  ".com", ".pif", ".application", ".gadget", ".wsf", ".cpl", ".hta",
  ".jar", ".ps1", ".vb", ".vbe", ".jse", ".ws", ".wsc", ".msc"
]);

/**
 * Sanitizes an attachment filename to prevent path traversal, control character injection,
 * and dangerous executable execution while preserving normal international characters.
 */
export function sanitizeAttachmentFilename(rawName: string): string {
  let clean = rawName
    .replace(/[\x00-\x1F\x7F]/g, "")
    .replace(/[\r\n]/g, "")
    .replace(/[/\\]/g, "_")
    .replace(/\.\.+/g, ".")
    .trim();

  // Strip leading/trailing dots or spaces
  clean = clean.replace(/^[.\s]+|[.\s]+$/g, "");

  if (!clean || clean.length === 0) {
    clean = "attachment_" + Date.now();
  }

  return clean.substring(0, 120);
}

/**
 * Validates Base64 encoding structure and computes exact decoded byte size.
 */
export function validateBase64Payload(content: string): { valid: boolean; decodedSizeBytes: number; error?: string } {
  const clean = content.replace(/^data:[^;]+;base64,/, "").trim();
  if (!clean || clean.length === 0) {
    return { valid: false, decodedSizeBytes: 0, error: "Attachment content is empty." };
  }

  // Base64 character set validation
  const base64Regex = /^[A-Za-z0-9+/]+={0,2}$/;
  if (clean.length % 4 !== 0 || !base64Regex.test(clean)) {
    return { valid: false, decodedSizeBytes: 0, error: "Invalid Base64 encoding format." };
  }

  let padding = 0;
  if (clean.endsWith("==")) padding = 2;
  else if (clean.endsWith("=")) padding = 1;
  const decodedSizeBytes = Math.floor((clean.length * 3) / 4) - padding;

  return { valid: true, decodedSizeBytes };
}

export const MailRecipientSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Invalid email address format.")
    .max(120, "Email must be under 120 characters.")
    .refine((val) => !/[\r\n]/.test(val), "Email must not contain newline characters."),
  name: z
    .string()
    .trim()
    .max(60, "Recipient name must be under 60 characters.")
    .refine((val) => !/[\r\n]/.test(val), "Name must not contain newline characters.")
    .optional(),
});

export const MailAttachmentPayloadSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Attachment filename is required.")
      .max(120, "Filename must be under 120 characters.")
      .refine((val) => !/[\r\n\x00-\x1F]/.test(val), "Filename contains invalid characters.")
      .refine((val) => !val.includes("/") && !val.includes("\\"), "Filename cannot contain path separators.")
      .refine((val) => {
        const ext = val.substring(val.lastIndexOf(".")).toLowerCase();
        return !BLOCKED_ATTACHMENT_EXTENSIONS.has(ext);
      }, "Executable and script file attachments are blocked."),
    sizeBytes: z.number().int().min(1, "File cannot be empty.").max(5 * 1024 * 1024, "Single file cannot exceed 5MB."),
    contentType: z.string().max(100).optional(),
    content: z.string().min(1, "Attachment content is required."),
  })
  .refine(
    (data) => {
      const b64Check = validateBase64Payload(data.content);
      if (!b64Check.valid) return false;
      // Ensure decoded binary is within 5MB limit
      if (b64Check.decodedSizeBytes > 5 * 1024 * 1024) return false;
      // Ensure declared size matches decoded size within 2KB tolerance (accounting for client header estimations)
      const diff = Math.abs(b64Check.decodedSizeBytes - data.sizeBytes);
      return diff <= 2048;
    },
    {
      message: "Attachment content is malformed or payload size does not match declared sizeBytes.",
      path: ["content"],
    }
  );

export const MailAttachmentMetaSchema = z.object({
  id: z.string().max(120).optional(),
  name: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .refine((val) => !/[\r\n\x00-\x1F]/.test(val), "Filename contains invalid characters.")
    .refine((val) => !val.includes("/") && !val.includes("\\"), "Filename cannot contain path separators.")
    .refine((val) => {
      const ext = val.substring(val.lastIndexOf(".")).toLowerCase();
      return !BLOCKED_ATTACHMENT_EXTENSIONS.has(ext);
    }, "Executable file metadata is not permitted."),
  sizeBytes: z.number().int().min(0).max(10 * 1024 * 1024),
  contentType: z.string().max(100).optional(),
});

export const SendMailSchema = z
  .object({
    idempotencyKey: z.string().min(10, "Invalid idempotency key format.").max(64),
    draftId: z.string().max(64).optional(),
    expectedRevision: z.number().int().min(1).optional(),
    senderKey: z.enum([
      "SECURITY",
      "HELP",
      "HELLO",
      "NO_REPLY",
      "LEGACY_SECURITY",
      "LEGACY_HELP",
      "LEGACY_HELLO",
      "LEGACY_NO_REPLY",
    ]),
    to: z
      .array(MailRecipientSchema)
      .min(1, "At least one 'To' recipient is required.")
      .max(50, "Maximum 50 recipients permitted per email."),
    cc: z.array(MailRecipientSchema).max(50).optional(),
    bcc: z.array(MailRecipientSchema).max(50).optional(),
    subject: z
      .string()
      .trim()
      .min(1, "Subject line is required.")
      .max(200, "Subject must be under 200 characters.")
      .refine((val) => !/[\r\n]/.test(val), "Subject must not contain newline characters."),
    body: z
      .string()
      .trim()
      .min(1, "Message content is required.")
      .max(10000, "Message content must be under 10,000 characters.")
      .refine((val) => countMeaningfulWords(val) >= 3, {
        message: "Message must contain at least 3 meaningful words.",
      }),
    attachments: z.array(MailAttachmentPayloadSchema).max(5, "Maximum 5 attachments allowed.").optional(),
  })
  .refine(
    (data) => {
      const totalRecipients = data.to.length + (data.cc?.length || 0) + (data.bcc?.length || 0);
      return totalRecipients <= 50;
    },
    {
      message: "Total combined recipients (To + CC + BCC) cannot exceed 50.",
      path: ["to"],
    }
  )
  .refine(
    (data) => {
      if (!data.attachments || data.attachments.length === 0) return true;
      const totalBytes = data.attachments.reduce((sum, att) => sum + att.sizeBytes, 0);
      return totalBytes <= 10 * 1024 * 1024;
    },
    {
      message: "Total attachments size cannot exceed 10MB.",
      path: ["attachments"],
    }
  )
  .refine(
    (data) => {
      if (!data.attachments || data.attachments.length <= 1) return true;
      const names = data.attachments.map((a) => a.name.toLowerCase());
      return new Set(names).size === names.length;
    },
    {
      message: "Duplicate attachment filenames are not permitted.",
      path: ["attachments"],
    }
  );

export const SaveDraftSchema = z
  .object({
    id: z.string().max(64).optional(),
    createOperationId: z.string().max(120).optional(),
    expectedRevision: z.number().int().min(1).optional(),
    senderKey: z
      .enum([
        "SECURITY",
        "HELP",
        "HELLO",
        "NO_REPLY",
        "LEGACY_SECURITY",
        "LEGACY_HELP",
        "LEGACY_HELLO",
        "LEGACY_NO_REPLY",
      ])
      .default("HELLO"),
    to: z.array(MailRecipientSchema).default([]),
    cc: z.array(MailRecipientSchema).default([]),
    bcc: z.array(MailRecipientSchema).default([]),
    subject: z.string().max(200).default(""),
    body: z.string().max(10000).default(""),
    attachments: z.array(MailAttachmentMetaSchema).max(5).default([]),
  })
  .refine(
    (data) => !isDraftEmpty(data),
    {
      message: "EMPTY_DRAFT: Draft must contain at least one recipient, subject, body text, or attachment.",
      path: ["body"],
    }
  );

export const MailQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().optional(),
});


