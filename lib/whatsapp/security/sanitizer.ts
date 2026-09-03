/**
 * WhatsApp Data Sanitizer & Masking Utilities
 */

/**
 * Normalizes an arbitrary phone string into clean E.164 format (+[country][number])
 */
export function normalizeE164(phone: string): string {
  const cleaned = phone.replace(/[^0-9+]/g, "");
  if (cleaned.startsWith("+")) {
    return cleaned;
  }
  return `+${cleaned}`;
}

/**
 * Validates whether a phone number strictly conforms to canonical E.164 format (+[1-9][0-9]{6,14})
 */
export function isValidE164(phone: string): boolean {
  if (!phone || typeof phone !== "string") return false;
  const normalized = normalizeE164(phone);
  return /^\+[1-9]\d{6,14}$/.test(normalized);
}

/**
 * Masks a phone number for safe observability logs (e.g. "+91 98765 ****0")
 */
export function maskPhone(phone: string): string {
  if (!phone) return "[EMPTY_PHONE]";
  const norm = normalizeE164(phone);
  if (norm.length <= 6) return "***";
  const start = norm.slice(0, norm.length - 4);
  const end = norm.slice(-2);
  return `${start}**${end}`;
}

/**
 * Sanitizes user input text (truncation, stripping null/control bytes)
 */
export function sanitizeText(text: string, maxLength = 1000): string {
  if (!text) return "";
  return text
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, maxLength);
}

/**
 * Generates a clean filename safe from path traversal attacks
 */
export function sanitizeFileName(originalName = "document.pdf"): string {
  const basename = originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const ext = basename.includes(".") ? basename.split(".").pop() : "bin";
  return `${Date.now()}_${crypto.randomUUID()}.${ext}`;
}
