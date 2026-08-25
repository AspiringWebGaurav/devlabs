/**
 * Enterprise Contact Form Validation & Typo Detection
 * Validates names, emails (with domain typo detection), and message constraints.
 */

import { checkProfanity } from "./profanity-filter";

// Common domain typos mapped to their canonical equivalents
const DOMAIN_TYPO_MAP: Record<string, string> = {
  "gmal.com": "gmail.com",
  "gmaill.com": "gmail.com",
  "gamil.com": "gmail.com",
  "gmial.com": "gmail.com",
  "gmai.com": "gmail.com",
  "gmale.com": "gmail.com",
  "gmaul.com": "gmail.com",
  "gmail.con": "gmail.com",
  "gmail.co": "gmail.com",
  "gemail.com": "gmail.com",

  "hotmial.com": "hotmail.com",
  "hotmai.com": "hotmail.com",
  "hotmil.com": "hotmail.com",
  "hotmale.com": "hotmail.com",
  "hotmail.con": "hotmail.com",

  "yaho.com": "yahoo.com",
  "yahooo.com": "yahoo.com",
  "yaboo.com": "yahoo.com",
  "yaho.co": "yahoo.com",
  "yahoo.con": "yahoo.com",

  "outlok.com": "outlook.com",
  "outloo.com": "outlook.com",
  "outllok.com": "outlook.com",
  "outlook.con": "outlook.com",

  "iclud.com": "icloud.com",
  "iclou.com": "icloud.com",
  "icloud.con": "icloud.com",

  "protonmai.com": "protonmail.com",
  "protonmial.com": "protonmail.com",
};

// Known test/fake domains to reject
const BLOCKED_DOMAINS = new Set([
  "test.com",
  "testing.com",
  "fake.com",
  "asdf.com",
  "tempmail.com",
  "mailinator.com",
  "10minutemail.com",
  "guerrillamail.com",
  "throwaway.com",
  "example.com",
  "sample.com",
]);

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  suggestion?: string;
}

/**
 * Validates user full name.
 * Length: 2 - 60 characters.
 */
export function validateName(name: string): ValidationResult {
  const trimmed = name.trim();
  if (!trimmed) {
    return { isValid: false, error: "Please enter your name." };
  }
  if (trimmed.length < 2) {
    return { isValid: false, error: "Name must be at least 2 characters." };
  }
  if (trimmed.length > 60) {
    return { isValid: false, error: "Name must be under 60 characters." };
  }
  // Check for letters
  if (!/[a-zA-Z\u00C0-\u024F\u1E00-\u1EFF]/.test(trimmed)) {
    return { isValid: false, error: "Name must contain letters." };
  }
  const profanityCheck = checkProfanity(trimmed);
  if (profanityCheck.hasProfanity) {
    return { isValid: false, error: "Name contains disallowed or offensive terms. Please use your real name." };
  }
  return { isValid: true };
}

/**
 * Validates email address syntax and checks for common typo domains (e.g. gmal.com).
 */
export function validateEmail(email: string): ValidationResult {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) {
    return { isValid: false, error: "Please provide an email address." };
  }

  // RFC 5322 standard-compliant syntax check
  const emailRegex =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;

  if (!emailRegex.test(trimmed) || trimmed.includes("..")) {
    return {
      isValid: false,
      error: "Please enter a valid email address (e.g. name@domain.com).",
    };
  }

  const parts = trimmed.split("@");
  if (parts.length !== 2) {
    return { isValid: false, error: "Invalid email structure." };
  }

  const domain = parts[1].toLowerCase();

  // Check for common typo domains
  if (DOMAIN_TYPO_MAP[domain]) {
    const suggestedDomain = DOMAIN_TYPO_MAP[domain];
    return {
      isValid: false,
      error: `Invalid domain @${domain}. Did you mean @${suggestedDomain}?`,
      suggestion: `${parts[0]}@${suggestedDomain}`,
    };
  }

  // Reject known throwaway / test domains
  if (BLOCKED_DOMAINS.has(domain)) {
    return {
      isValid: false,
      error: "Please provide a valid personal or company email address.",
    };
  }

  // Check TLD length
  const domainParts = domain.split(".");
  const tld = domainParts[domainParts.length - 1];
  if (!tld || tld.length < 2) {
    return {
      isValid: false,
      error: "Email domain must include a valid top-level extension (e.g. .com).",
    };
  }

  return { isValid: true };
}

/**
 * Helper to accurately count words in a text string.
 */
export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
}

/**
 * Validates message content.
 * Standard professional portfolio message limit: 2 - 100 words (min 10 characters).
 */
export const MESSAGE_MIN_WORDS = 2;
export const MESSAGE_MAX_WORDS = 100;
export const MESSAGE_MIN_CHARS = 10;
export const MESSAGE_MAX_CHARS = 1000;

/**
 * Anti-Abuse Spam & Gibberish Patterns for Message Content
 */
const SPAM_PHRASES = [
  /\b(buy\s+viagra|casino\s+online|crypto\s+doubler|free\s+robux|nigerian\s+prince|telegram\s+pump|porn\s+video|seo\s+backlinks|whatsapp\s+blast|guaranteed\s+roi)\b/i,
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/i,
  /(?:javascript|data|vbscript):/i,
  /on(?:load|error|click|mouseover)\s*=/i,
];

/**
 * Validates message content with Enterprise Anti-Abuse Protections:
 * 1. Length & Word count limits (2 - 100 words, min 10 chars).
 * 2. Real character and language content requirement (at least 4 alphabetical letters).
 * 3. Consecutive repeating character spam (e.g. "aaaaaa", "testiiiiing", "......").
 * 4. Repeating word spam (e.g. "hello hello hello hello").
 * 5. Keyboard mash / unbreakable gibberish (e.g. single word > 35 chars, repeated keys).
 * 6. Link / Phishing abuse (max 2 URLs in a 100-word initial contact note).
 * 7. Malicious injection / high-confidence spam phrase filtering.
 */
export function validateMessage(message: string): ValidationResult {
  const trimmed = message.trim();
  if (!trimmed) {
    return { isValid: false, error: "Please enter your message." };
  }

  // 1. Min character check
  if (trimmed.length < MESSAGE_MIN_CHARS) {
    return {
      isValid: false,
      error: `Message is too short (minimum ${MESSAGE_MIN_CHARS} characters).`,
    };
  }

  // 2. Max word check
  const words = countWords(trimmed);
  if (words < MESSAGE_MIN_WORDS) {
    return {
      isValid: false,
      error: `Please write at least ${MESSAGE_MIN_WORDS} words.`,
    };
  }
  if (words > MESSAGE_MAX_WORDS) {
    return {
      isValid: false,
      error: `Message exceeds the ${MESSAGE_MAX_WORDS} words limit (${words}/${MESSAGE_MAX_WORDS} words).`,
    };
  }

  // 3. Must contain meaningful alphabetical content (prevents pure digits or pure punctuation)
  const letterCount = (trimmed.match(/[a-zA-Z\u00C0-\u024F\u1E00-\u1EFF]/g) || []).length;
  if (letterCount < 4) {
    return {
      isValid: false,
      error: "Message must contain recognizable words or sentences.",
    };
  }

  // 4. Repeated character spam check (5+ identical characters in a row: "aaaaa", ".....", "?????")
  if (/(.)\1{4,}/i.test(trimmed)) {
    return {
      isValid: false,
      error: "Message contains repetitive characters. Please use standard wording.",
    };
  }

  // 5. Repeated word spam check (4+ identical words in a row: "test test test test")
  if (/\b(\w+)\b(?:\s+\1\b){3,}/i.test(trimmed)) {
    return {
      isValid: false,
      error: "Message contains repetitive words. Please provide a clear inquiry.",
    };
  }

  // 6. Keyboard mash / unbreakable gibberish check (single unbroken token > 35 chars)
  const longestWord = trimmed.split(/\s+/).reduce((max, w) => Math.max(max, w.length), 0);
  if (longestWord > 35) {
    return {
      isValid: false,
      error: "Message contains excessively long unbreakable words or gibberish.",
    };
  }

  // 7. Keyboard mash sequence check (e.g. "asdfasdfasdf", "qwerqwerqwer")
  if (/(?:asdf|qwer|zxcv|1234|hjkl|poiuy){3,}/i.test(trimmed)) {
    return {
      isValid: false,
      error: "Message contains repetitive keystroke patterns. Please write a descriptive message.",
    };
  }

  // 8. Link abuse check (Max 2 URLs allowed in 100-word initial contact note)
  const urlMatches = trimmed.match(/https?:\/\/[^\s]+|www\.[^\s]+|t\.me\/[^\s]+|bit\.ly\/[^\s]+/gi) || [];
  if (urlMatches.length > 2) {
    return {
      isValid: false,
      error: "Please limit URLs to at most 2 references in your initial message.",
    };
  }

  // 9. High-confidence malicious patterns & script injection
  for (const pattern of SPAM_PHRASES) {
    if (pattern.test(trimmed)) {
      return {
        isValid: false,
        error: "Message flagged for restricted promotional or script content. Please revise.",
      };
    }
  }

  // 10. Multi-Lingual Profanity Check (English, Hindi/Hinglish, Marathi/Marathinglish, Devanagari)
  const profanityResult = checkProfanity(trimmed);
  if (profanityResult.hasProfanity) {
    return {
      isValid: false,
      error: profanityResult.error || "Message contains abusive or offensive language. Please maintain a professional tone.",
    };
  }

  return { isValid: true };
}
