import { NextRequest, NextResponse } from "next/server";
import { verifyTurnstileToken } from "@/lib/security/turnstile";
import { extractClientIp } from "@/lib/assistant/session";
import { cloudflareRepository } from "@/lib/dal/repositories/cms/cloudflare.repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const { token } = (body || {}) as { token?: string };

    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { ok: false, error: "Missing security verification token." },
        { status: 400 }
      );
    }

    const clientIp = extractClientIp(req);

    // Check if Admin enabled simulated downtime
    const cfRes = await cloudflareRepository.getCloudflareSettings();
    if (cfRes.data?.isSimulatedDowntime) {
      return NextResponse.json(
        { ok: false, error: "Simulated Cloudflare downtime / network connection conflict." },
        { status: 403 }
      );
    }
    const secretKeyOverride =
      process.env.ASSISTANT_TURNSTILE_SECRET_KEY ||
      process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY;

    const verification = await verifyTurnstileToken(
      token,
      clientIp,
      secretKeyOverride
    );

    if (!verification.success) {
      return NextResponse.json(
        { ok: false, error: verification.error || "Turnstile challenge verification failed." },
        { status: 403 }
      );
    }

    return NextResponse.json({
      ok: true,
      verifiedAt: Date.now(),
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      { ok: false, error: error.message || "Failed to verify security token." },
      { status: 500 }
    );
  }
}
