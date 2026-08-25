import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyTurnstileToken } from "@/lib/security/turnstile";
import { sanitizeAndValidateText } from "@/lib/contact/profanity-filter";
import { checkContactRateLimit, recordContactSubmission } from "@/lib/contact/rate-limiter";
import { getNextSynchronizedLeadNumber } from "@/lib/contact/lead-counter";
import { dispatchContactFormWorkflow } from "@/lib/email";
import { validateEmail, validateName, validateMessage, MESSAGE_MIN_CHARS, MESSAGE_MAX_CHARS } from "@/lib/contact/validation";
import { evaluateContentModeration } from "@/lib/security/ai-moderation";

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
  try {
    const rawBody = await request.json().catch(() => null);
    if (!rawBody) {
      return NextResponse.json(
        { success: false, error: "Invalid JSON payload in request." },
        { status: 400 }
      );
    }

    // 1. Zod Schema Validation
    const parsed = ContactSchema.safeParse(rawBody);
    if (!parsed.success) {
      const issue =
        parsed.error.issues[0]?.message ||
        "Validation failed on submitted fields.";
      return NextResponse.json(
        { success: false, error: issue },
        { status: 400 }
      );
    }

    const { name, email, role, subject, category, message, turnstileToken } = parsed.data;

    // 2. Strict Email Typo & Format Validation
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      return NextResponse.json(
        { success: false, error: emailValidation.error },
        { status: 400 }
      );
    }

    const nameValidation = validateName(name);
    if (!nameValidation.isValid) {
      return NextResponse.json(
        { success: false, error: nameValidation.error },
        { status: 400 }
      );
    }

    const messageValidation = validateMessage(message);
    if (!messageValidation.isValid) {
      return NextResponse.json(
        { success: false, error: messageValidation.error },
        { status: 400 }
      );
    }

    // 3. Extract Client IP
    const forwardedFor = request.headers.get("x-forwarded-for");
    const realIp = request.headers.get("x-real-ip");
    const clientIp = forwardedFor
      ? forwardedFor.split(",")[0].trim()
      : realIp || "127.0.0.1";

    // 3. Multi-Tier Anti-Abuse Rate Limiting (IP Burst, IP Hourly, Email Hourly & Global Surge)
    const rateLimitCheck = await checkContactRateLimit(clientIp, email);
    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: rateLimitCheck.reason || "Submission rate limit exceeded. Please try again later.",
          retryAfter: rateLimitCheck.retryAfterSeconds,
        },
        { status: 429 }
      );
    }

    // 4. Cloudflare Turnstile Bot Verification (Server-Side)
    if (turnstileToken) {
      const turnstileResult = await verifyTurnstileToken(turnstileToken, clientIp);
      if (!turnstileResult.success) {
        return NextResponse.json(
          {
            success: false,
            error:
              turnstileResult.error ||
              "Cloudflare security challenge verification failed. Please try again.",
          },
          { status: 403 }
        );
      }
    }

    // 5. Multi-Layer Profanity & AI Content Moderation Filtering
    const nameSanitization = sanitizeAndValidateText(name, "Full Name", 2, 100);
    const messageSanitization = sanitizeAndValidateText(message, "Message", 10, 2000);

    if (!nameSanitization.isValid) {
      return NextResponse.json(
        {
          success: false,
          error: nameSanitization.error || "Your name contains disallowed terms. Please revise.",
        },
        { status: 422 }
      );
    }

    if (!messageSanitization.isValid) {
      return NextResponse.json(
        {
          success: false,
          error: messageSanitization.error || "Your message contains prohibited language. Please revise.",
        },
        { status: 422 }
      );
    }

    // Deep AI & Public Moderation Verification (OpenAI / Perspective / PurgoMalum)
    const aiModeration = await evaluateContentModeration(message);
    if (aiModeration.flagged) {
      return NextResponse.json(
        {
          success: false,
          error: aiModeration.reason || "Your message was flagged for abusive or toxic language. Please revise.",
        },
        { status: 422 }
      );
    }

    const selectedRole = role?.trim() || "Visitor / Other";
    const selectedSubject = subject?.trim() || category?.trim() || "General Inquiry";
    const selectedCategory = category?.trim() || selectedSubject;

    // 6. Generate Synchronized Lead Number
    const leadNumber = await getNextSynchronizedLeadNumber();

    // 7. Dispatch Dual Brevo Transactional Emails (Lead Alert + Auto-Reply Template #1)
    let emailResult = {
      internalEmailSent: false,
      autoReplySent: false,
      errors: [] as string[],
    };

    try {
      emailResult = await dispatchContactFormWorkflow({
        name: nameSanitization.sanitizedText,
        email: email.trim().toLowerCase(),
        role: selectedRole,
        subject: selectedSubject,
        category: selectedCategory,
        message: messageSanitization.sanitizedText,
        ip: clientIp,
        leadNumber,
      });
    } catch (err) {
      console.warn("Brevo contact email dispatch note:", err);
      emailResult = {
        internalEmailSent: false,
        autoReplySent: false,
        errors: [String(err)],
      };
    }

    const emailDelivered =
      emailResult.internalEmailSent || emailResult.autoReplySent;

    // Reject if both email operations failed completely (guarantees Zero Orphaned DB records)
    if (!emailDelivered) {
      const detailError =
        emailResult.errors[0] ||
        "Email delivery failed. Please try again or reach out directly.";
      return NextResponse.json(
        {
          success: false,
          error:
            "Failed to dispatch message via email gateway. Please try again later.",
          detail:
            process.env.NODE_ENV === "development" ? detailError : undefined,
        },
        { status: 502 }
      );
    }

    // Record verified rate-limit entry only upon successful email dispatch
    recordContactSubmission(clientIp, email);

    // 8. Persist Verified Message to Firebase Realtime Database (/messages)
    const now = Date.now();
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const messageRecord = {
      id: messageId,
      leadNumber,
      name: nameSanitization.sanitizedText,
      email: email.trim().toLowerCase(),
      role: selectedRole,
      subject: selectedSubject,
      category: selectedCategory,
      message: messageSanitization.sanitizedText,
      createdAt: now,
      date: new Date(now).toISOString(),
      ip: clientIp,
      status: "unread",
    };

    const FIREBASE_DB_URL = (
      process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL ||
      process.env.FIREBASE_DATABASE_URL ||
      ""
    ).replace(/\/$/, "");

    if (FIREBASE_DB_URL) {
      try {
        await fetch(`${FIREBASE_DB_URL}/messages/${messageId}.json`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(messageRecord),
          cache: "no-store",
        });
      } catch (rtdbErr) {
        console.warn("RTDB message persistence note:", rtdbErr);
      }
    }

    return NextResponse.json({
      success: true,
      messageId,
      leadNumber,
      emailDelivered,
      autoReplyDelivered: emailResult.autoReplySent,
      timestamp: messageRecord.date,
    });
  } catch (err: unknown) {
    const error = err as Error;
    console.error("Unhandled contact submission error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error.message ||
          "An unexpected error occurred while processing your message.",
      },
      { status: 500 }
    );
  }
}
