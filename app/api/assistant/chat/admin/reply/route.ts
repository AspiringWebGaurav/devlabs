import { NextRequest, NextResponse } from "next/server";
import { liveChatRepository } from "@/lib/dal/repositories/live-chat.repository";
import { dispatchLiveChatVisitorReplyEmail } from "@/lib/email/brevo";
import { getRequestContext } from "@/lib/api/context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST: Dispatches Gaurav's reply from the Magic Link Admin Room, unlocks the visitor, and sends an email alert to the visitor.
 */
export async function POST(req: NextRequest) {
  const { requestId } = getRequestContext(req);
  try {
    const body = await req.json().catch(() => null);
    const { threadId, token, message } = (body || {}) as {
      threadId?: string;
      token?: string;
      message?: string;
    };

    if (!threadId || !token) {
      return NextResponse.json(
        { ok: false, code: "UNAUTHORIZED", message: "Missing authentication parameters." },
        { status: 401, headers: { "x-request-id": requestId } }
      );
    }

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json(
        { ok: false, code: "VALIDATION_ERROR", message: "Message content cannot be empty." },
        { status: 400, headers: { "x-request-id": requestId } }
      );
    }

    const trimmedMessage = message.trim();

    // 1. Verify Admin Token & Retrieve Thread
    const threadRes = await liveChatRepository.getThreadByIdAndToken(threadId, token);
    const thread = threadRes.data;

    if (!thread) {
      return NextResponse.json(
        { ok: false, code: "FORBIDDEN", message: "Invalid or expired chat room token." },
        { status: 403, headers: { "x-request-id": requestId } }
      );
    }

    // 2. Append Gaurav's Reply to Thread and Unlock Visitor Turn
    const appendRes = await liveChatRepository.appendAdminReply({
      threadId: thread.id,
      text: trimmedMessage,
      adminName: "Gaurav Patil",
    });

    if (!appendRes.data) {
      return NextResponse.json(
        { ok: false, code: "INTERNAL_ERROR", message: "Failed to record reply." },
        { status: 500, headers: { "x-request-id": requestId } }
      );
    }

    // 3. Dispatch Guaranteed Brevo Notification Email to Visitor (Online or Offline)
    const baseUrl = req.nextUrl.origin;
    const emailResult = await dispatchLiveChatVisitorReplyEmail({
      visitorName: thread.visitorName,
      visitorEmail: thread.visitorEmail,
      adminName: "Gaurav Patil",
      replySnippet: trimmedMessage,
      capabilityToken: "",
      threadId: thread.id,
      baseUrl,
      requestHeaders: req.headers,
    }).catch((err: unknown) => {
      console.warn("Non-fatal: Visitor reply email dispatch warning:", err);
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    });

    return NextResponse.json(
      {
        ok: true,
        message: appendRes.data.message,
        thread: appendRes.data.thread,
        emailDelivered: emailResult.success,
      },
      { status: 200, headers: { "x-request-id": requestId } }
    );
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      { ok: false, code: "INTERNAL_ERROR", message: error.message || "Failed to post reply." },
      { status: 500, headers: { "x-request-id": requestId } }
    );
  }
}
