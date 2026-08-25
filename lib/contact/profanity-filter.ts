/**
 * Enhanced Multi-Lingual Profanity & Abuse Filter (English, Hindi, Marathi, Devanagari)
 * Features:
 * - Anti-Evasion De-Obfuscation (Homoglyphs, Leetspeak, Spaced Words, Repeating Characters)
 * - Phonetic & Fuzzy Levenshtein Distance Matching
 * - Comprehensive English, Hindi/Hinglish, Marathi/Marathinglish & Devanagari Dictionaries
 * - Zero-Latency In-Memory Execution
 */

// 1. English Explicit & Abusive Terms
const ENGLISH_PROFANITY = [
  "fuck",
  "fucker",
  "fucking",
  "fucked",
  "fuckoff",
  "fuckyou",
  "motherfucker",
  "shit",
  "bullshit",
  "bitch",
  "bitches",
  "bitching",
  "asshole",
  "arsehole",
  "dick",
  "dickhead",
  "cunt",
  "cunts",
  "bastard",
  "pussy",
  "slut",
  "whore",
  "cock",
  "cocksucker",
  "twat",
  "wanker",
  "prick",
  "nigger",
  "nigga",
  "faggot",
  "retard",
  "jackass",
  "douchebag",
  "fuk",
  "fukk",
  "fakyu",
  "phuck",
  "stfu",
];

// 2. Hindi & Hinglish Abusive Terms
const HINDI_PROFANITY = [
  "chutiya",
  "chutiye",
  "chootiya",
  "chutiyapa",
  "chutya",
  "madarchod",
  "madarchot",
  "madarjaat",
  "bhenchod",
  "behenchod",
  "benchod",
  "bhosdike",
  "bhosadike",
  "bhosdiwala",
  "bhosada",
  "bhosda",
  "gaand",
  "gand",
  "gandu",
  "gaandu",
  "gandfaad",
  "lauda",
  "lawda",
  "loda",
  "lodha",
  "harami",
  "kamina",
  "kaminey",
  "kuttiya",
  "kutte",
  "randi",
  "raand",
  "rande",
  "chut",
  "chooth",
  "jhant",
  "jhaant",
  "chod",
  "chudai",
  "chudwa",
  "tatte",
  "tatton",
  "bhadwe",
  "bhadwa",
  "bhadve",
  "saala",
  "saale",
  "kamine",
  "hijra",
  "chhakka",
  "lodu",
  "suar",
  "maderchod",
];

// 3. Marathi & Marathinglish Abusive Terms
const MARATHI_PROFANITY = [
  "lavdya",
  "laudya",
  "lavde",
  "laude",
  "zavlya",
  "zhavlya",
  "zhavadya",
  "zhavadye",
  "zhavla",
  "zhavali",
  "bhadva",
  "bhadvya",
  "bhadwe",
  "bhadve",
  "gandit",
  "gandit ghal",
  "ganditghal",
  "gandmarli",
  "gandfatli",
  "aai zhavli",
  "aaizhavli",
  "aaighalya",
  "aai ghalya",
  "aaichigand",
  "aai chi gand",
  "bapachya",
  "bokachya",
  "mulyachya",
  "shembya",
  "raandya",
  "randya",
  "chavtola",
  "landya",
  "kutryachya",
  "kutryachya aai",
];

// 4. Devanagari Script (Hindi & Marathi abusive terms)
const DEVANAGARI_PROFANITY = [
  "मादरचोद",
  "मादरचोत",
  "भेनचोद",
  "बहनचोद",
  "भोसडीके",
  "भोसडीवाला",
  "भोसडा",
  "चुतिया",
  "चुतिये",
  "चूत",
  "गांड",
  "गांडू",
  "लवडे",
  "लवड्या",
  "लौडा",
  "लौडे",
  "हरामी",
  "कमीना",
  "कमीने",
  "रांड",
  "रांडी",
  "झावल्या",
  "झावड्या",
  "झावला",
  "आई घाuser",
  "आईची गांड",
  "आई झावली",
  "भडवा",
  "भडव्या",
  "भडवे",
  "झांट",
  "तट्टे",
  "हिजडा",
  "छक्का",
  "कुत्रीच्या",
];

// Homoglyph replacement table (Cyrillic / Greek lookalikes to Latin)
const HOMOGLYPHS: Record<string, string> = {
  "а": "a", // Cyrillic small letter a
  "е": "e", // Cyrillic small letter ie
  "о": "o", // Cyrillic small letter o
  "р": "p", // Cyrillic small letter er
  "с": "c", // Cyrillic small letter es
  "у": "y", // Cyrillic small letter u
  "х": "x", // Cyrillic small letter ha
  "і": "i", // Cyrillic small letter byelorussian-ukrainian i
  "ј": "j", // Cyrillic small letter je
  "ѕ": "s", // Cyrillic small letter dze
  "А": "A",
  "В": "B",
  "Е": "E",
  "К": "K",
  "М": "M",
  "Н": "H",
  "О": "O",
  "Р": "P",
  "С": "C",
  "Т": "T",
  "Х": "X",
};

// Leetspeak normalization map
const LEET_MAP: Record<string, string> = {
  "@": "a",
  "4": "a",
  "8": "b",
  "3": "e",
  "1": "i",
  "!": "i",
  "|": "i",
  "0": "o",
  "$": "s",
  "5": "s",
  "7": "t",
  "+": "t",
  "v": "u",
  "ph": "f",
};

// Combined dictionary
const ALL_TERMS = [
  ...ENGLISH_PROFANITY,
  ...HINDI_PROFANITY,
  ...MARATHI_PROFANITY,
  ...DEVANAGARI_PROFANITY,
];

// Pre-indexed single words for O(1) set lookup and multi-word phrases
const SINGLE_WORD_SET = new Set(
  ALL_TERMS.filter((t) => !t.includes(" ")).map((t) => t.toLowerCase())
);
const MULTI_WORD_PHRASES = ALL_TERMS.filter((t) => t.includes(" ")).map((t) => ({
  phrase: t.toLowerCase(),
  spaceless: t.toLowerCase().replace(/\s+/g, ""),
}));
const HIGH_SEVERITY_STEMS = ALL_TERMS.filter((t) => !t.includes(" ") && t.length >= 4).map((t) => t.toLowerCase());

/**
 * Normalizes text by removing homoglyphs, leetspeak, invisible unicode, and separators.
 */
export function deobfuscateText(text: string): {
  normalized: string;
  squeezed: string;
  spaceless: string;
} {
  let cleaned = text;

  // 1. Replace homoglyphs
  for (const [homo, latin] of Object.entries(HOMOGLYPHS)) {
    cleaned = cleaned.split(homo).join(latin);
  }

  cleaned = cleaned.toLowerCase();

  // 2. Leet substitutions
  for (const [leet, normal] of Object.entries(LEET_MAP)) {
    cleaned = cleaned.split(leet).join(normal);
  }

  // 3. Remove zero-width characters and obfuscation punctuation between letters
  cleaned = cleaned.replace(/[\u200B-\u200D\uFEFF]/g, "");
  const normalized = cleaned.replace(/[._\-*~`^#$@!/\\|]/g, "");

  // 4. Repetition squeezer (e.g. fuuuuck -> fuck, chuuutttiya -> chutiya)
  const squeezed = normalized.replace(/(.)\1{2,}/g, "$1");

  // 5. Spaceless representation to catch spaced-out words (e.g. "f u c k y o u")
  const spaceless = squeezed.replace(/\s+/g, "");

  return { normalized, squeezed, spaceless };
}

/**
 * Computes Levenshtein distance between two strings for fuzzy matching.
 */
function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const d: number[][] = [];
  for (let i = 0; i <= m; i++) d[i] = [i];
  for (let j = 0; j <= n; j++) d[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1, // deletion
        d[i][j - 1] + 1, // insertion
        d[i - 1][j - 1] + cost // substitution
      );
    }
  }
  return d[m][n];
}

export interface ProfanityCheckResult {
  hasProfanity: boolean;
  matchedTerm?: string;
  score?: number;
  error?: string;
}

/**
 * Advanced Multi-Layer Profanity Detector:
 * - O(1) Fast Set Word Lookup (Raw, Normalized, Squeezed)
 * - Multi-word phrase scanning
 * - Spaceless Substring Check
 * - Fuzzy Levenshtein Distance Match (distance <= 1 on key terms)
 */
export function checkProfanity(text: string): ProfanityCheckResult {
  if (!text || typeof text !== "string") {
    return { hasProfanity: false };
  }

  const rawLower = text.toLowerCase();
  const { normalized, squeezed, spaceless } = deobfuscateText(text);

  const rawWords = rawLower.split(/[\s,./!?;:()\[\]{}"'+=_*-]+/).filter(Boolean);
  const normalizedWords = normalized.split(/[\s,./!?;:()\[\]{}"'+=_*-]+/).filter(Boolean);
  const squeezedWords = squeezed.split(/[\s,./!?;:()\[\]{}"'+=_*-]+/).filter(Boolean);

  // 1. Fast O(1) Set Word Token Lookups
  for (const word of rawWords) {
    if (SINGLE_WORD_SET.has(word)) {
      return {
        hasProfanity: true,
        matchedTerm: word,
        error: "Message contains prohibited or abusive language. Please maintain a professional tone.",
      };
    }
  }
  for (const word of normalizedWords) {
    if (SINGLE_WORD_SET.has(word)) {
      return {
        hasProfanity: true,
        matchedTerm: word,
        error: "Message contains prohibited or abusive language. Please maintain a professional tone.",
      };
    }
  }
  for (const word of squeezedWords) {
    if (SINGLE_WORD_SET.has(word)) {
      return {
        hasProfanity: true,
        matchedTerm: word,
        error: "Message contains prohibited or abusive language. Please maintain a professional tone.",
      };
    }
  }

  // 2. Multi-word phrase checks
  for (const { phrase, spaceless: pSpaceless } of MULTI_WORD_PHRASES) {
    if (
      rawLower.includes(phrase) ||
      normalized.includes(phrase) ||
      squeezed.includes(phrase) ||
      spaceless.includes(pSpaceless)
    ) {
      return {
        hasProfanity: true,
        matchedTerm: phrase,
        error: "Message contains prohibited phrases. Please maintain a professional tone.",
      };
    }
  }

  // 3. Spaceless Substring Check for High-Confidence Vulgar Stems
  for (const stem of HIGH_SEVERITY_STEMS) {
    if (spaceless.includes(stem)) {
      return {
        hasProfanity: true,
        matchedTerm: stem,
        error: "Message contains prohibited or abusive words. Please revise your message.",
      };
    }
  }

  // 4. Fuzzy Levenshtein Distance Check on Tokens (Catches intentional typos like "phukk", "chootya")
  for (const word of squeezedWords) {
    if (word.length >= 4) {
      for (const stem of HIGH_SEVERITY_STEMS) {
        if (Math.abs(word.length - stem.length) <= 1) {
          const dist = levenshteinDistance(word, stem);
          if (dist <= 1 && word !== "fact" && word !== "ship" && word !== "beach") {
            return {
              hasProfanity: true,
              matchedTerm: stem,
              error: "Message contains abusive or offensive language. Please maintain a professional tone.",
            };
          }
        }
      }
    }
  }

  return { hasProfanity: false };
}

/**
 * Sanitizes input text, strips malicious scripts/XSS, and verifies multi-lingual cleanliness.
 */
export function sanitizeAndValidateText(
  input: string,
  fieldName: string,
  minLength = 2,
  maxLength = 1000
): { isValid: boolean; sanitizedText: string; error?: string } {
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

  // Check script injection
  const scriptPattern = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>|javascript:|onerror\s*=|onload\s*=|data:text\/html/gi;
  if (scriptPattern.test(trimmed)) {
    return {
      isValid: false,
      sanitizedText: trimmed,
      error: `Inquiry rejected: ${fieldName} contains restricted script characters.`,
    };
  }

  // Multi-layer profanity check
  const profanityResult = checkProfanity(trimmed);
  if (profanityResult.hasProfanity) {
    return {
      isValid: false,
      sanitizedText: trimmed,
      error: profanityResult.error || `${fieldName} contains inappropriate or abusive language.`,
    };
  }

  // Sanitize HTML entities
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
