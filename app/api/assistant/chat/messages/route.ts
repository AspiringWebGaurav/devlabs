import { NextRequest, NextResponse } from "next/server";
import {
  getAuthenticatedVisitor,
  extractClientIp,
  validateCsrfOrigin,
} from "@/lib/assistant/session";
import { checkLiveChatRateLimit, recordLiveChatAction } from "@/lib/assistant/services/live-chat-rate-limiter";
import { inquiriesRepository } from "@/lib/admin/repositories";
import { dispatchContactFormWorkflow } from "@/lib/email";
import { getNextSynchronizedLeadNumber } from "@/lib/contact/lead-counter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST: Dispatches a verified visitor message to Gaurav and records the inquiry.
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Validate Origin / CSRF Defense
    if (!validateCsrfOrigin(req)) {
      return NextResponse.json(
        { ok: false, code: "CSRF_DETECTED", message: "Cross-site request forgery protection triggered." },
        { status: 403 }
      );
    }

    // 2. Authentication Check via HttpOnly signed session
    const visitor = await getAuthenticatedVisitor(req);
    if (!visitor) {
      return NextResponse.json(
        { ok: false, code: "SESSION_INVALID", message: "Authentication required. Please complete verification." },
        { status: 401 }
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

    recordLiveChatAction({
      clientIp,
      sessionId: visitor.sessionId,
      type: "MESSAGE",
    });

    // 5. Generate Lead Number & Save to Inquiries Collection
    const leadNumber = await getNextSynchronizedLeadNumber();
    const inquiryId = `inq_verified_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    await inquiriesRepository.createInquiry({
      id: inquiryId,
      name: visitor.name,
      email: visitor.email,
      subject: `Verified Inquiry from ${visitor.name}`,
      message: trimmedMessage,
      status: "unread",
      createdAt: new Date().toISOString(),
    }).catch((err) => {
      console.warn("Non-fatal: Inquiries repository save warning:", err);
    });

    // 6. Dispatch Email Notification Workflow via Brevo
    const emailResult = await dispatchContactFormWorkflow({
      name: visitor.name,
      email: visitor.email,
      role: "Verified Visitor",
      category: "Chat Bubble Inquiry",
      subject: `Verified Inquiry from ${visitor.name}`,
      message: trimmedMessage,
      leadNumber,
    });

    return NextResponse.json({
      ok: true,
      message: "Your message has been delivered to Gaurav.",
      emailDelivered: emailResult.internalEmailSent,
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      { ok: false, code: "INTERNAL_ERROR", message: error.message || "Failed to deliver message." },
      { status: 500 }
    );
  }
}
