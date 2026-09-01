import { NextRequest, NextResponse } from "next/server";
import { liveChatRepository } from "@/lib/dal/repositories/live-chat.repository";
import { getRequestContext } from "@/lib/api/context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET: Retrieves the live chat conversation transcript for Gaurav's passwordless Magic Link Room.
 */
export async function GET(req: NextRequest) {
  const { requestId } = getRequestContext(req);
  try {
    const { searchParams } = new URL(req.url);
    const threadId = searchParams.get("threadId");
    const token = searchParams.get("token");

    if (!threadId || !token) {
      return NextResponse.json(
        { ok: false, code: "UNAUTHORIZED", message: "Missing authentication parameters for chat room." },
        { status: 401, headers: { "x-request-id": requestId } }
      );
    }

    const threadRes = await liveChatRepository.getThreadByIdAndToken(threadId, token);
    const thread = threadRes.data;

    if (!thread) {
      return NextResponse.json(
        { ok: false, code: "FORBIDDEN", message: "Invalid or expired chat room access link." },
        { status: 403, headers: { "x-request-id": requestId } }
      );
    }

    const messagesRes = await liveChatRepository.getMessagesForThread(thread.id);

    return NextResponse.json(
      {
        ok: true,
        thread,
        messages: messagesRes.data || [],
      },
      { status: 200, headers: { "x-request-id": requestId } }
    );
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      { ok: false, code: "INTERNAL_ERROR", message: error.message || "Failed to load chat room." },
      { status: 500, headers: { "x-request-id": requestId } }
    );
  }
}
