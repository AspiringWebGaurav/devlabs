import { NextRequest, NextResponse } from "next/server";
import {
  extractClientIp,
  validateCsrfOrigin,
  isLiveChatEnabled,
} from "@/lib/assistant/session";
import { resendOtp } from "@/lib/assistant/services/live-chat-otp.service";
import { getRequestContext } from "@/lib/api/context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { requestId } = getRequestContext(req);
  // 1. Kill Switch Check
  if (!isLiveChatEnabled()) {
    return NextResponse.json(
      { ok: false, code: "FEATURE_DISABLED", message: "Live Chat is currently offline." },
      { status: 503, headers: { "x-request-id": requestId } }
    );
  }

  // 2. CSRF Origin Check
  if (!validateCsrfOrigin(req)) {
    return NextResponse.json(
      { ok: false, code: "CSRF_ORIGIN_REJECTED", message: "Cross-origin request rejected." },
      { status: 403, headers: { "x-request-id": requestId } }
    );
  }

  try {
    // Early request size check: Max 16KB raw payload
    const contentLength = req.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > 16384) {
      return NextResponse.json(
        { ok: false, code: "PAYLOAD_TOO_LARGE", message: "Request payload exceeds 16KB limit." },
        { status: 413 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { ok: false, code: "VALIDATION_ERROR", message: "Invalid request payload." },
        { status: 400 }
      );
    }

    const { email } = body as { email?: unknown };

    if (!email || typeof email !== "string" || email.trim().length === 0) {
      return NextResponse.json(
        { ok: false, code: "VALIDATION_ERROR", message: "Please provide a valid email address." },
        { status: 400 }
      );
    }

    const clientIp = extractClientIp(req);
    const userAgent = req.headers.get("user-agent") || undefined;

    const result = await resendOtp({
      email: email.trim(),
      clientIp,
      userAgent,
      requestHeaders: req.headers,
    });

    if (!result.success) {
      const statusCode =
        result.errorCode === "RATE_LIMITED"
          ? 429
          : result.errorCode === "OTP_SUPERSEDED"
          ? 400
          : 502;

      const headers: Record<string, string> = {};
      if (result.cooldownSeconds) {
        headers["Retry-After"] = result.cooldownSeconds.toString();
      }

      return NextResponse.json(
        {
          ok: false,
          code: result.errorCode || "GATEWAY_UNAVAILABLE",
          message: result.error || "Failed to resend verification code.",
          cooldownSeconds: result.cooldownSeconds,
        },
        { status: statusCode, headers }
      );
    }

    return NextResponse.json({
      ok: true,
      challengeId: result.challengeId,
      message: "New verification code sent to your email.",
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      { ok: false, code: "INTERNAL_ERROR", message: error.message || "An unexpected error occurred." },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { ok: false, code: "METHOD_NOT_ALLOWED", message: "Method Not Allowed" },
    { status: 405 }
  );
}
