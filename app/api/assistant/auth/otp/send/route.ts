import { NextRequest, NextResponse } from "next/server";
import {
  extractClientIp,
  validateCsrfOrigin,
  isLiveChatEnabled,
} from "@/lib/assistant/session";
import { generateAndDispatchOtp } from "@/lib/assistant/services/live-chat-otp.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export async function POST(req: NextRequest) {
  // 1. Kill Switch Check
  if (!isLiveChatEnabled()) {
    return NextResponse.json(
      { ok: false, code: "FEATURE_DISABLED", message: "Live Chat is currently offline." },
      { status: 503 }
    );
  }

  // 2. CSRF Origin Check
  if (!validateCsrfOrigin(req)) {
    return NextResponse.json(
      { ok: false, code: "CSRF_ORIGIN_REJECTED", message: "Cross-origin request rejected." },
      { status: 403 }
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

    const { name, email } = body as { name?: unknown; email?: unknown };

    if (!name || typeof name !== "string" || name.trim().length === 0 || name.trim().length > 100) {
      return NextResponse.json(
        { ok: false, code: "VALIDATION_ERROR", message: "Please provide a valid name (1-100 characters)." },
        { status: 400 }
      );
    }

    if (!email || typeof email !== "string" || !EMAIL_REGEX.test(email.trim()) || email.trim().length > 150) {
      return NextResponse.json(
        { ok: false, code: "VALIDATION_ERROR", message: "Please provide a valid email address." },
        { status: 400 }
      );
    }

    const clientIp = extractClientIp(req);
    const userAgent = req.headers.get("user-agent") || undefined;

    const result = await generateAndDispatchOtp({
      name: name.trim(),
      email: email.trim(),
      clientIp,
      userAgent,
      requestHeaders: req.headers,
    });

    if (!result.success) {
      const statusCode =
        result.errorCode === "RATE_LIMITED"
          ? 429
          : result.errorCode === "GATEWAY_UNAVAILABLE"
          ? 502
          : 400;

      const headers: Record<string, string> = {};
      if (result.retryAfterSeconds) {
        headers["Retry-After"] = result.retryAfterSeconds.toString();
      }

      return NextResponse.json(
        {
          ok: false,
          code: result.errorCode || "GATEWAY_UNAVAILABLE",
          message: result.error || "Failed to dispatch verification code.",
          retryAfter: result.retryAfterSeconds,
        },
        { status: statusCode, headers }
      );
    }

    return NextResponse.json({
      ok: true,
      challengeId: result.challengeId,
      message: "Verification code sent to your email.",
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
