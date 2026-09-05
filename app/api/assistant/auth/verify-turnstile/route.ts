import { NextRequest, NextResponse } from "next/server";
import { verifyTurnstileToken } from "@/lib/security/turnstile";
import { cloudflareRepository } from "@/lib/dal/repositories/cms/cloudflare.repository";
import { getRequestContext } from "@/lib/api/context";
import { ApiError, createApiErrorResponse } from "@/lib/api/error";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface CachedCloudflareSettings {
  isSimulatedDowntime: boolean;
  expiresAt: number;
}

let cachedCfSettings: CachedCloudflareSettings | null = null;
const CF_SETTINGS_CACHE_TTL_MS = 60_000; // 60 seconds

async function getCachedSimulatedDowntime(): Promise<boolean> {
  const now = Date.now();
  if (cachedCfSettings && now < cachedCfSettings.expiresAt) {
    return cachedCfSettings.isSimulatedDowntime;
  }

  const cfRes = await cloudflareRepository.getCloudflareSettings();
  const isSimulatedDowntime = Boolean(cfRes.data?.isSimulatedDowntime);
  cachedCfSettings = {
    isSimulatedDowntime,
    expiresAt: now + CF_SETTINGS_CACHE_TTL_MS,
  };
  return isSimulatedDowntime;
}

export async function POST(req: NextRequest) {
  const { requestId, clientIp } = getRequestContext(req);

  try {
    const body = await req.json().catch(() => null);
    const { token } = (body || {}) as { token?: string };

    if (!token || typeof token !== "string") {
      throw new ApiError("VALIDATION_FAILED", "Missing security verification token.");
    }

    // Check if Admin enabled simulated downtime (cached 60s to avoid redundant database reads)
    const isSimulatedDowntime = await getCachedSimulatedDowntime();
    if (isSimulatedDowntime) {
      throw new ApiError(
        "BOT_CHALLENGE_FAILED",
        "Simulated Cloudflare downtime / network connection conflict."
      );
    }

    const secretKeyOverride =
      process.env.ASSISTANT_TURNSTILE_SECRET_KEY ||
      process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY;

    // Budget-aware Turnstile challenge verification (3.5s dependency timeout bounded within 5.0s route deadline)
    const verification = await verifyTurnstileToken(
      token,
      clientIp,
      secretKeyOverride
    );

    if (!verification.success) {
      throw new ApiError(
        "BOT_CHALLENGE_FAILED",
        verification.error || "Turnstile challenge verification failed."
      );
    }

    return NextResponse.json(
      {
        ok: true,
        verifiedAt: Date.now(),
      },
      { status: 200, headers: { "x-request-id": requestId } }
    );
  } catch (err: unknown) {
    return createApiErrorResponse(err, requestId);
  }
}
