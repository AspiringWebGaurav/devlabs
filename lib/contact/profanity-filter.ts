/**
 * Heuristic Profanity & Abuse Filter for Contact Inquiries
 * Protects administrator from spam, automated bot patterns, and malicious content.
 */

const SUSPICIOUS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript:/gi,
  /onload\s*=/gi,
  /onerror\s*=/gi,
  /data:text\/html/gi,
  /\b(buy\s+viagra|casino\s+online|crypto\s+doubler|free\s+robux|nigerian\s+prince|telegram\s+pump|porn\s+video)\b/gi,
];

export interface TextSanitizationResult {
  isValid: boolean;
  sanitizedText: string;
  error?: string;
}

/**
 * Strips dangerous HTML tags and checks for spam/abuse patterns.
 */
export function sanitizeAndValidateText(
  input: string,
  fieldName: string,
  minLength = 2,
  maxLength = 1000
): TextSanitizationResult {
  if (!input || typeof input !== "string") {
    return {
      isValid: false,
      sanitizedText: "",
      error: `${fieldName} is required.`,
    };
  }

  const trimmed = input.trim();

  if (trimmed.length < minLength) {
    return {
      isValid: false,
      sanitizedText: trimmed,
      error: `${fieldName} must be at least ${minLength} characters.`,
    };
  }

  if (trimmed.length > maxLength) {
    return {
      isValid: false,
      sanitizedText: trimmed.slice(0, maxLength),
      error: `${fieldName} must not exceed ${maxLength} characters.`,
    };
  }

  // Check for suspicious script injection or high-confidence spam
  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        isValid: false,
        sanitizedText: trimmed,
        error: `Inquiry rejected: ${fieldName} contains restricted or suspicious characters.`,
      };
    }
  }

  // Sanitize HTML entities to prevent any injection
  const sanitized = trimmed
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");

  return {
    isValid: true,
    sanitizedText: sanitized,
  };
}
