/**
 * Server-Side AI & Public API Content Moderation Engine
 * Evaluates messages against OpenAI Moderation, Google Perspective API, or PurgoMalum.
 * Includes strict timeout fail-safes so requests never hang.
 */

import { checkProfanity } from "@/lib/contact/profanity-filter";

export interface AIModerationResult {
  flagged: boolean;
  reason?: string;
  source: "in_engine" | "openai" | "perspective" | "purgomalum";
  score?: number;
}

/**
 * 1. OpenAI Free Moderation API (omni-moderation-latest)
 */
async function checkOpenAIModeration(text: string, apiKey: string): Promise<AIModerationResult | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2500);

  try {
    const res = await fetch("https://api.openai.com/v1/moderations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        input: text,
        model: "omni-moderation-latest",
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) return null;

    const data = await res.json();
    const result = data?.results?.[0];

    if (result?.flagged) {
      return {
        flagged: true,
        reason: "Message flagged by AI Moderation for abusive or hostile content.",
        source: "openai",
      };
    }

    return { flagged: false, source: "openai" };
  } catch {
    clearTimeout(timeoutId);
    return null;
  }
}

/**
 * 2. Google Perspective API (Jigsaw)
 */
async function checkPerspectiveAPI(text: string, apiKey: string): Promise<AIModerationResult | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2500);

  try {
    const url = `https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze?key=${apiKey}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        comment: { text },
        languages: ["en", "hi", "mr"],
        requestedAttributes: {
          TOXICITY: {},
          SEVERE_TOXICITY: {},
          INSULT: {},
          THREAT: {},
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) return null;

    const data = await res.json();
    const toxicityScore = data?.attributeScores?.TOXICITY?.summaryScore?.value || 0;
    const severeToxicityScore = data?.attributeScores?.SEVERE_TOXICITY?.summaryScore?.value || 0;
    const insultScore = data?.attributeScores?.INSULT?.summaryScore?.value || 0;

    if (toxicityScore > 0.65 || severeToxicityScore > 0.5 || insultScore > 0.7) {
      return {
        flagged: true,
        reason: "Message flagged by Perspective API for toxic or abusive language.",
        source: "perspective",
        score: Math.max(toxicityScore, severeToxicityScore, insultScore),
      };
    }

    return { flagged: false, source: "perspective", score: toxicityScore };
  } catch {
    clearTimeout(timeoutId);
    return null;
  }
}

/**
 * 3. PurgoMalum Public Profanity REST API
 */
async function checkPurgoMalum(text: string): Promise<AIModerationResult | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 1800);

  try {
    const url = `https://www.purgomalum.com/service/containsprofanity?text=${encodeURIComponent(text)}`;
    const res = await fetch(url, {
      method: "GET",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) return null;

    const textResponse = await res.text();
    if (textResponse.trim() === "true") {
      return {
        flagged: true,
        reason: "Message contains restricted profanity terms.",
        source: "purgomalum",
      };
    }

    return { flagged: false, source: "purgomalum" };
  } catch {
    clearTimeout(timeoutId);
    return null;
  }
}

/**
 * Master Hybrid Abuse & Moderation Evaluator:
 * 1. Checks in-engine local multi-lingual matrix (0ms latency, catches Hindi/Marathi/English/Devanagari).
 * 2. If clean, checks configured Public APIs (OpenAI / Perspective / PurgoMalum).
 * 3. Gracefully fails safe if external APIs are unavailable.
 */
export async function evaluateContentModeration(text: string): Promise<AIModerationResult> {
  // Stage 1: In-Engine Multi-Lingual Algorithmic Inspection
  const localCheck = checkProfanity(text);
  if (localCheck.hasProfanity) {
    return {
      flagged: true,
      reason: localCheck.error || "Message contains abusive or offensive language.",
      source: "in_engine",
    };
  }

  // Stage 2: OpenAI Moderation (If key configured)
  const openAiKey = process.env.OPENAI_API_KEY;
  if (openAiKey) {
    const openAiResult = await checkOpenAIModeration(text, openAiKey);
    if (openAiResult && openAiResult.flagged) {
      return openAiResult;
    }
  }

  // Stage 3: Google Perspective API (If key configured)
  const perspectiveKey = process.env.PERSPECTIVE_API_KEY;
  if (perspectiveKey) {
    const perspectiveResult = await checkPerspectiveAPI(text, perspectiveKey);
    if (perspectiveResult && perspectiveResult.flagged) {
      return perspectiveResult;
    }
  }

  // Stage 4: Public API Web Check (PurgoMalum)
  const purgoResult = await checkPurgoMalum(text);
  if (purgoResult && purgoResult.flagged) {
    return purgoResult;
  }

  return { flagged: false, source: "in_engine" };
}
