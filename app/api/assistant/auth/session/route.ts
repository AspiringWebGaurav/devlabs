import { NextRequest, NextResponse } from "next/server";
import {
  getAuthenticatedVisitor,
  validateCsrfOrigin,
} from "@/lib/assistant/session";
import { LIVE_CHAT_COOKIE_NAME, verifyVisitorSession } from "@/lib/assistant/auth";
import { liveChatSessionsRepository } from "@/lib/dal/repositories/live-chat-sessions.repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET: Checks and returns the current visitor session state.
 */
export async function GET(req: NextRequest) {
  try {
    const visitor = await getAuthenticatedVisitor(req);

    if (!visitor) {
      return NextResponse.json({
        ok: true,
        authenticated: false,
      });
    }

    return NextResponse.json({
      ok: true,
      authenticated: true,
      session: {
        email: visitor.email,
        name: visitor.name,
        expiresAt: visitor.session.expiresAt,
      },
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      { ok: false, code: "INTERNAL_ERROR", message: error.message || "An unexpected error occurred." },
      { status: 500 }
    );
  }
}

/**
 * DELETE: Revokes the active session in Firestore and wips the cookie.
 * Invariant: Revocation remains functional even if the live chat kill switch is active.
 */
export async function DELETE(req: NextRequest) {
  // 1. CSRF Origin Check
  if (!validateCsrfOrigin(req)) {
    return NextResponse.json(
      { ok: false, code: "CSRF_ORIGIN_REJECTED", message: "Cross-origin request rejected." },
      { status: 403 }
    );
  }

  try {
    const cookie = req.cookies.get(LIVE_CHAT_COOKIE_NAME);
    if (cookie?.value) {
      const session = verifyVisitorSession(cookie.value);
      if (session?.sessionId) {
        await liveChatSessionsRepository.revokeSession(session.sessionId);
      }
    }

    const response = NextResponse.json({
      ok: true,
      message: "Session signed out successfully.",
    });

    const isProduction = process.env.NODE_ENV === "production";

    // Clear session cookie
    response.cookies.set({
      name: LIVE_CHAT_COOKIE_NAME,
      value: "",
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
      expires: new Date(0),
    });

    return response;
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      { ok: false, code: "INTERNAL_ERROR", message: error.message || "Failed to sign out." },
      { status: 500 }
    );
  }
}
