import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { verifyTurnstileToken } from "@/lib/security/turnstile";
import { sanitizeAndValidateText } from "@/lib/contact/profanity-filter";
import { checkContactRateLimit, recordContactSubmission } from "@/lib/contact/rate-limiter";
import { getNextSynchronizedLeadNumber } from "@/lib/contact/lead-counter";
import {
  sendTransactionalEmail,
  generateInternalNotificationHtml,
  generateVisitorAutoReplyHtml,
  formatSubmissionTimestamp,
  EMAIL_IDENTITIES,
} from "@/lib/email";
import { validateEmail, validateName, validateMessage, MESSAGE_MIN_CHARS, MESSAGE_MAX_CHARS } from "@/lib/contact/validation";
import { evaluateContentModeration } from "@/lib/security/ai-moderation";
import { inquiriesRepository } from "@/lib/admin/repositories";
import { getRequestContext } from "@/lib/api/context";
import { isLifecycleLockActive } from "@/lib/dal/lifecycle/lock";
import { ApiError, createApiErrorResponse } from "@/lib/api/error";

export const dynamic = "force-dynamic";

const ContactSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(60, "Name must be under 60 characters"),
  email: z.string().max(120),
  role: z.string().max(100).optional(),
  subject: z.string().max(250).optional(),
  category: z.string().max(250).optional(),
  message: z
    .string()
    .min(MESSAGE_MIN_CHARS, `Message must be at least ${MESSAGE_MIN_CHARS} characters`)
    .max(MESSAGE_MAX_CHARS, `Message must be under ${MESSAGE_MAX_CHARS} characters`),
  turnstileToken: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const { requestId, clientIp } = getRequestContext(request);

  // 0. Maintenance Lock Guard during Database Lifecycle Reset
  if (await isLifecycleLockActive()) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "SERVICE_UNAVAILABLE",
          message: "Database maintenance in progress. Please retry in a few moments.",
          retryable: true,
          requestId,
        },
      },
      { status: 503, headers: { "Retry-After": "5", "x-request-id": requestId } }
    );
  }

  try {
    // 1. Content-Length Protection (Max 1MB)
    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > 1048576) {
      throw new ApiError("PAYLOAD_TOO_LARGE", "Request payload exceeds 1MB limit.");
    }

    const rawBody = await request.json().catch(() => null);
    if (!rawBody) {
      throw new ApiError("VALIDATION_FAILED", "Invalid JSON payload in request.");
    }

    // 2. Synchronous Schema Validation
    const parsed = ContactSchema.safeParse(rawBody);
    if (!parsed.success) {
      const issue = parsed.error.issues[0]?.message || "Validation failed on submitted fields.";
      throw new ApiError("VALIDATION_FAILED", issue);
    }

    const { name, email, role, subject, category, message, turnstileToken } = parsed.data;

    // Strict Field Validations
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      throw new ApiError("VALIDATION_FAILED", emailValidation.error);
    }

    const nameValidation = validateName(name);
    if (!nameValidation.isValid) {
      throw new ApiError("VALIDATION_FAILED", nameValidation.error);
    }

    const messageValidation = validateMessage(message);
    if (!messageValidation.isValid) {
      throw new ApiError("VALIDATION_FAILED", messageValidation.error);
    }

    // 3. Multi-Tier Anti-Abuse Rate Limiting
    const rateLimitCheck = await checkContactRateLimit(clientIp, email);
    if (!rateLimitCheck.allowed) {
      throw new ApiError(
        "RATE_LIMITED_HOURLY",
        rateLimitCheck.reason || "Submission rate limit exceeded. Please try again later.",
        rateLimitCheck.retryAfterSeconds
      );
    }

    // 4. Concurrent Security Gate: Turnstile Bot Verification + AI Moderation
    const [turnstileResult, aiModeration] = await Promise.all([
      turnstileToken ? verifyTurnstileToken(turnstileToken, clientIp) : Promise.resolve({ success: true, error: undefined }),
      evaluateContentModeration(message),
    ]);

    // Fail-Closed Turnstile Bot Mitigation
    if (!turnstileResult.success) {
      throw new ApiError(
        "BOT_CHALLENGE_FAILED",
        turnstileResult.error || "Cloudflare security challenge verification failed. Please try again."
      );
    }

    // Sanitization Checks
    const nameSanitization = sanitizeAndValidateText(name, "Full Name", 2, 100);
    const messageSanitization = sanitizeAndValidateText(message, "Message", 10, 2000);

    if (!nameSanitization.isValid) {
      throw new ApiError(
        "PROFANITY_DETECTED",
        nameSanitization.error || "Your name contains disallowed terms. Please revise."
      );
    }

    if (!messageSanitization.isValid) {
      throw new ApiError(
        "PROFANITY_DETECTED",
        messageSanitization.error || "Your message contains prohibited language. Please revise."
      );
    }

    if (aiModeration.flagged) {
      throw new ApiError(
        "TOXICITY_BLOCKED",
        aiModeration.reason || "Your message was flagged by automated moderation. Please revise."
      );
    }

    const selectedRole = role?.trim() || "Visitor / Other";
    const selectedSubject = subject?.trim() || category?.trim() || "General Inquiry";
    const selectedCategory = category?.trim() || selectedSubject;

    // 5. Authoritative Lead Number Generation
    const leadNumber = await getNextSynchronizedLeadNumber();

    // 6. Pre-Dispatch Durable State Record (inquiries/{operationId})
    const operationId = `inq_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    const payloadHash = crypto
      .createHash("sha256")
      .update(`${email.trim().toLowerCase()}:${messageSanitization.sanitizedText}`)
      .digest("hex");

    await inquiriesRepository.createInquiry({
      id: operationId,
      name: nameSanitization.sanitizedText,
      email: email.trim().toLowerCase(),
      subject: selectedSubject,
      message: messageSanitization.sanitizedText,
      createdAt: new Date().toISOString(),
      status: "unread",
      leadNumber,
      requestId,
      payloadHash,
      durableStatus: "PROCESSING",
      deliveries: {
        ownerNotification: { state: "PENDING" },
        visitorAutoReply: { state: "PENDING" },
      },
    });

    // 7. Concurrent Dual Brevo Dispatch (Promise.allSettled within single bounded deadline)
    const formattedTime = formatSubmissionTimestamp();
    const internalRecipient =
      process.env.BREVO_NOTIFICATION_RECIPIENT ||
      process.env.ADMIN_EMAIL ||
      "gauravpatil5737@gmail.com";

    const internalHtml = generateInternalNotificationHtml(
      {
        name: nameSanitization.sanitizedText,
        email: email.trim().toLowerCase(),
        role: selectedRole,
        category: selectedCategory,
        message: messageSanitization.sanitizedText,
        leadNumber,
      },
      formattedTime
    );

    const emailSubject = `New Contact Inquiry (Lead #${leadNumber}): ${nameSanitization.sanitizedText} [${selectedRole}]`;
    const internalPlainText = `Hi Gaurav,\n\nFrom: ${nameSanitization.sanitizedText} (${selectedRole})\nEmail: ${email.trim().toLowerCase()}\nReceived: ${formattedTime} • Lead #${leadNumber}\n\nMessage:\n${messageSanitization.sanitizedText}`;

    const autoReplyHtml = generateVisitorAutoReplyHtml({
      name: nameSanitization.sanitizedText,
    });
    const autoReplyPlainText = `Hi ${nameSanitization.sanitizedText.split(" ")[0]},\n\nThanks for reaching out through my portfolio. I've received your message and will get back to you as soon as possible.\n\nGaurav Patil\nhttps://gauravpatil.online`;

    const [ownerResult, visitorResult] = await Promise.allSettled([
      sendTransactionalEmail({
        purpose: "CONTACT_FORM",
        to: [{ email: internalRecipient, name: "Gaurav Patil" }],
        replyTo: { email: email.trim().toLowerCase(), name: nameSanitization.sanitizedText },
        subject: emailSubject,
        htmlContent: internalHtml,
        textContent: internalPlainText,
        tags: ["portfolio_inquiry", "internal_notification"],
        idempotencyKey: `${operationId}_owner`,
      }),
      sendTransactionalEmail({
        purpose: "CONTACT_FORM_AUTO_REPLY",
        to: [{ email: email.trim().toLowerCase(), name: nameSanitization.sanitizedText }],
        replyTo: { email: EMAIL_IDENTITIES.HELLO.primary.email, name: "Gaurav Patil" },
        subject: "Thanks for contacting Gaurav Patil",
        htmlContent: autoReplyHtml,
        textContent: autoReplyPlainText,
        headers: {
          "X-Auto-Response-Suppress": "OOF, AutoReply",
          "Auto-Submitted": "auto-replied",
        },
        tags: ["portfolio_auto_reply", "visitor_confirmation"],
        idempotencyKey: `${operationId}_visitor`,
      }),
    ]);

    // 8. Reconcile Deliveries & Update Durable State
    const ownerSuccess = ownerResult.status === "fulfilled" && ownerResult.value.success;
    const visitorSuccess = visitorResult.status === "fulfilled" && visitorResult.value.success;

    const ownerState = ownerSuccess
      ? ("SENT" as const)
      : ownerResult.status === "rejected"
      ? ("DELIVERY_UNCERTAIN" as const)
      : ("FAILED" as const);

    const visitorState = visitorSuccess
      ? ("SENT" as const)
      : visitorResult.status === "rejected"
      ? ("DELIVERY_UNCERTAIN" as const)
      : ("FAILED" as const);

    const isFullyConfirmed = ownerSuccess && visitorSuccess;
    const isDeliveryUncertain =
      ownerState === "DELIVERY_UNCERTAIN" ||
      visitorState === "DELIVERY_UNCERTAIN" ||
      (!ownerSuccess && visitorSuccess) ||
      (ownerSuccess && !visitorSuccess);

    const aggregateStatus = isFullyConfirmed
      ? ("CONFIRMED" as const)
      : isDeliveryUncertain
      ? ("DELIVERY_UNCERTAIN" as const)
      : ("FAILED" as const);

    // Update Firestore record with terminal delivery outcomes
    await inquiriesRepository.updateInquiryDeliveries(operationId, {
      durableStatus: aggregateStatus,
      deliveries: {
        ownerNotification: {
          state: ownerState,
          brevoMessageId: ownerResult.status === "fulfilled" ? ownerResult.value.messageId : undefined,
          dispatchedAt: new Date().toISOString(),
          error: ownerResult.status === "fulfilled" ? ownerResult.value.error : String(ownerResult.reason),
        },
        visitorAutoReply: {
          state: visitorState,
          brevoMessageId: visitorResult.status === "fulfilled" ? visitorResult.value.messageId : undefined,
          dispatchedAt: new Date().toISOString(),
          error: visitorResult.status === "fulfilled" ? visitorResult.value.error : String(visitorResult.reason),
        },
      },
    }).catch((err: unknown) => {
      console.warn("Failed to update inquiry delivery status:", err);
    });

    // Record submission for rate limiting
    recordContactSubmission(clientIp, email);

    // 9. Return Standardized Response Contract
    if (isFullyConfirmed) {
      return NextResponse.json(
        {
          success: true,
          leadNumber,
          requestId,
          messageId: operationId,
        },
        { status: 201, headers: { "x-request-id": requestId } }
      );
    }

    if (aggregateStatus === "DELIVERY_UNCERTAIN") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "DELIVERY_UNCERTAIN",
            message: "Submission received but confirmation is pending. Please verify before resending.",
            retryable: false,
            requestId,
          },
          leadNumber,
          messageId: operationId,
        },
        { status: 502, headers: { "x-request-id": requestId } }
      );
    }

    // Both failed
    throw new ApiError("GATEWAY_UNAVAILABLE", "Failed to dispatch email notification. Please try again.");
  } catch (err: unknown) {
    return createApiErrorResponse(err, requestId);
  }
}
