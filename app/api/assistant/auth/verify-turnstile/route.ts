import { NextRequest, NextResponse } from "next/server";
import { verifyTurnstileToken } from "@/lib/security/turnstile";
import { cloudflareRepository } from "@/lib/dal/repositories/cms/cloudflare.repository";
import { getRequestContext } from "@/lib/api/context";
import { ApiError, createApiErrorResponse } from "@/lib/api/error";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { requestId, clientIp } = getRequestContext(req);

  try {
    const body = await req.json().catch(() => null);
    const { token } = (body || {}) as { token?: string };

    if (!token || typeof token !== "string") {
      throw new ApiError("VALIDATION_FAILED", "Missing security verification token.");
    }

    // Check if Admin enabled simulated downtime
    const cfRes = await cloudflareRepository.getCloudflareSettings();
    if (cfRes.data?.isSimulatedDowntime) {
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
