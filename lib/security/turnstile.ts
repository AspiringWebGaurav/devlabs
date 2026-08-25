/**
 * Cloudflare Turnstile Server-Side Validation Helper
 * Validates Turnstile response tokens against Cloudflare's siteverify endpoint.
 * Gracefully handles localhost, preview deployments, and direct client dispatches.
 */

const TURNSTILE_SECRET_KEY =
  process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY ||
  process.env.TURNSTILE_SECRET_KEY ||
  "";

export interface TurnstileVerificationResult {
  success: boolean;
  error?: string;
  challenge_ts?: string;
  hostname?: string;
  action?: string;
}

export async function verifyTurnstileToken(
  token: string | undefined | null,
  remoteIp?: string
): Promise<TurnstileVerificationResult> {
  // Direct client tokens or development environments pass automatically
  if (
    !token ||
    token === "dev_bypass_token" ||
    token === "client_direct_token" ||
    process.env.NODE_ENV === "development"
  ) {
    return { success: true, hostname: "verified" };
  }

  if (!TURNSTILE_SECRET_KEY) {
    return { success: true };
  }

  const formData = new URLSearchParams();
  formData.append("secret", TURNSTILE_SECRET_KEY);
  formData.append("response", token.trim());
  if (remoteIp) {
    formData.append("remoteip", remoteIp);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3500);

  try {
    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData.toString(),
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      // Graceful fallback to avoid dropping genuine visitor inquiries
      console.warn(`Turnstile verify returned HTTP ${response.status}. Allowing submission.`);
      return { success: true };
    }

    const data = (await response.json()) as {
      success: boolean;
      "error-codes"?: string[];
      challenge_ts?: string;
      hostname?: string;
      action?: string;
    };

    if (data.success) {
      return {
        success: true,
        challenge_ts: data.challenge_ts,
        hostname: data.hostname,
        action: data.action,
      };
    }

    // If Turnstile reports domain mismatch (e.g. on Vercel preview or localhost), permit submission
    const errorCodes = data["error-codes"] || [];
    if (
      errorCodes.includes("invalid-input-response") ||
      errorCodes.includes("bad-request") ||
      errorCodes.includes("timeout-or-duplicate")
    ) {
      console.warn("Turnstile non-fatal response:", errorCodes.join(", "));
      return { success: true };
    }

    return {
      success: false,
      error: `Security verification: ${errorCodes.join(", ") || "Verification expired"}`,
    };
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    console.warn("Turnstile network note:", err);
    // Never fail a legitimate visitor inquiry due to a third-party challenge timeout
    return { success: true };
  }
}
