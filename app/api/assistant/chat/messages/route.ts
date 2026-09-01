import { NextRequest, NextResponse } from "next/server";
import {
  getAuthenticatedVisitor,
  extractClientIp,
  validateCsrfOrigin,
} from "@/lib/assistant/session";
import { checkLiveChatRateLimit, recordLiveChatAction } from "@/lib/assistant/services/live-chat-rate-limiter";
import {
  createLiveChatAlertJob,
  triggerAlertJobProcessing,
} from "@/lib/assistant/services/live-chat-alert-jobs.service";
import { inquiriesRepository } from "@/lib/admin/repositories";
import { liveChatRepository } from "@/lib/dal/repositories/live-chat.repository";
import { getNextSynchronizedLeadNumber } from "@/lib/contact/lead-counter";
import { getRequestContext } from "@/lib/api/context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET: Retrieves the conversation transcript and lock status for the active authenticated visitor.
 */
export async function GET(req: NextRequest) {
  const { requestId } = getRequestContext(req);
  try {
    const visitor = await getAuthenticatedVisitor(req);
    if (!visitor) {
      return NextResponse.json(
        { ok: false, code: "SESSION_INVALID", message: "Authentication required." },
        { status: 401, headers: { "x-request-id": requestId } }
      );
    }

    const threadRes = await liveChatRepository.getOrCreateThreadForVisitor({
      visitorName: visitor.name,
      visitorEmail: visitor.email,
      sessionId: visitor.sessionId,
    });

    const thread = threadRes.data;
    if (!thread) {
      return NextResponse.json(
        { ok: false, code: "INTERNAL_ERROR", message: "Failed to initialize conversation thread." },
        { status: 500 }
      );
    }

    const messagesRes = await liveChatRepository.getMessagesForThread(thread.id);

    return NextResponse.json({
      ok: true,
      thread,
      messages: messagesRes.data || [],
      isVisitorLocked: thread.isVisitorLocked === true,
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      { ok: false, code: "INTERNAL_ERROR", message: error.message || "Failed to load conversation." },
      { status: 500 }
    );
  }
}

/**
 * POST: Dispatches a verified visitor message to Gaurav, locks visitor input, and notifies Gaurav via magic link email.
 */
export async function POST(req: NextRequest) {
  const { requestId } = getRequestContext(req);
  try {
    // 1. Validate Origin / CSRF Defense
    if (!validateCsrfOrigin(req)) {
      return NextResponse.json(
        { ok: false, code: "CSRF_DETECTED", message: "Cross-site request forgery protection triggered." },
        { status: 403, headers: { "x-request-id": requestId } }
      );
    }

    // 2. Authentication Check via HttpOnly signed session
    const visitor = await getAuthenticatedVisitor(req);
    if (!visitor) {
      return NextResponse.json(
        { ok: false, code: "SESSION_INVALID", message: "Authentication required. Please complete verification." },
        { status: 401, headers: { "x-request-id": requestId } }
      );
    }

    // 3. Body Parsing & Content Validation
    const body = await req.json().catch(() => null);
    const { body: messageText } = (body || {}) as { body?: unknown };

    if (!messageText || typeof messageText !== "string") {
      return NextResponse.json(
        { ok: false, code: "VALIDATION_ERROR", message: "Message content cannot be empty." },
        { status: 400 }
      );
    }

    const trimmedMessage = messageText.trim();
    if (trimmedMessage.length < 2) {
      return NextResponse.json(
        { ok: false, code: "VALIDATION_ERROR", message: "Message must be at least 2 characters." },
        { status: 400 }
      );
    }

    if (Array.from(trimmedMessage).length > 1000) {
      return NextResponse.json(
        { ok: false, code: "MESSAGE_TOO_LARGE", message: "Message exceeds 1,000 character limit." },
        { status: 400 }
      );
    }

    // 4. Rate Limiting Check
    const clientIp = extractClientIp(req);
    const rateLimit = await checkLiveChatRateLimit({
      clientIp,
      sessionId: visitor.sessionId,
      type: "MESSAGE",
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { ok: false, code: "RATE_LIMITED", message: rateLimit.reason || "Rate limit reached. Please wait a moment." },
        { status: 429 }
      );
    }

    // 5. Retrieve Thread and Enforce Strict Turn-Based Lock
    const threadRes = await liveChatRepository.getOrCreateThreadForVisitor({
      visitorName: visitor.name,
      visitorEmail: visitor.email,
      sessionId: visitor.sessionId,
    });

    const currentThread = threadRes.data;
    if (!currentThread) {
      return NextResponse.json(
        { ok: false, code: "INTERNAL_ERROR", message: "Failed to initialize conversation thread." },
        { status: 500 }
      );
    }

    // If visitor is currently locked waiting for Gaurav's reply, reject duplicate sends
    if (currentThread.isVisitorLocked) {
      return NextResponse.json(
        {
          ok: false,
          code: "AWAITING_REPLY",
          message: "Your message is pending review. Please wait for Gaurav to reply before sending another message.",
        },
        { status: 429 }
      );
    }

    recordLiveChatAction({
      clientIp,
      sessionId: visitor.sessionId,
      type: "MESSAGE",
    });

    // 6. Append Visitor Message to Thread and Lock Input
    const appendRes = await liveChatRepository.appendVisitorMessage({
      threadId: currentThread.id,
      text: trimmedMessage,
      visitorName: visitor.name,
      visitorEmail: visitor.email,
    });

    if (!appendRes.data) {
      return NextResponse.json(
        { ok: false, code: "INTERNAL_ERROR", message: "Failed to record message." },
        { status: 500 }
      );
    }

    // 7. Save Inquiry to Inquiries Collection for Admin Panel Records
    const leadNumber = await getNextSynchronizedLeadNumber().catch(() => 1);
    const inquiryId = `inq_live_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    await inquiriesRepository
      .createInquiry({
        id: inquiryId,
        name: visitor.name,
        email: visitor.email,
        subject: `Live Chat Lead #${leadNumber} from ${visitor.name}`,
        message: trimmedMessage,
        status: "unread",
        createdAt: new Date().toISOString(),
      })
      .catch((err) => {
        console.warn("Non-fatal: Inquiries repository save warning:", err);
      });

    // 8. Persist Durable Alert Job in Firestore BEFORE returning HTTP response
    const baseUrl = req.nextUrl.origin;
    const alertJob = await createLiveChatAlertJob({
      requestId,
      threadId: currentThread.id,
      messageId: appendRes.data.message.id,
      visitorName: visitor.name,
      visitorEmail: visitor.email,
      messageText: trimmedMessage,
      adminToken: currentThread.adminToken,
      baseUrl,
    }).catch((err) => {
      console.warn("Non-fatal: LiveChatAlertJob creation exception:", err);
      return null;
    });

    // 9. Trigger background worker processing asynchronously
    if (alertJob) {
      triggerAlertJobProcessing(alertJob.id);
    }

    return NextResponse.json(
      {
        ok: true,
        message: appendRes.data.message,
        thread: appendRes.data.thread,
        isVisitorLocked: true,
        alertJobId: alertJob?.id || null,
        alertJobStatus: alertJob?.status || "PENDING",
      },
      { headers: { "x-request-id": requestId } }
    );
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      { ok: false, code: "INTERNAL_ERROR", message: error.message || "Failed to deliver message." },
      { status: 500 }
    );
  }
}
