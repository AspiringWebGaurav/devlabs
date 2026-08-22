import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminFirestore } from "@/lib/admin/firebase-admin";
import { verifyTurnstileToken } from "@/lib/security/turnstile";
import { sanitizeAndValidateText } from "@/lib/contact/profanity-filter";
import { dispatchContactEmails } from "@/lib/contact/emailjs-contact";

export const dynamic = "force-dynamic";

// In-memory rate limiting map: IP -> lastSubmissionTimestamp
const ipRateLimitMap = new Map<string, number>();
const RATE_LIMIT_WINDOW_MS = 10 * 1000; // 10 seconds cooldown per IP

const ContactSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(60, "Name must be under 60 characters"),
  email: z.string().email("Please provide a valid email address").max(100),
  category: z.string().max(40).optional(),
  message: z.string().min(10, "Message must be at least 10 characters").max(1000, "Message must be under 1000 characters"),
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
      const issue = parsed.error.issues[0]?.message || "Validation failed on submitted fields.";
      return NextResponse.json(
        { success: false, error: issue },
        { status: 400 }
      );
    }

    const { name, email, category, message, turnstileToken } = parsed.data;

    // 2. Extract Client IP
    const forwardedFor = request.headers.get("x-forwarded-for");
    const realIp = request.headers.get("x-real-ip");
    const clientIp = forwardedFor ? forwardedFor.split(",")[0].trim() : realIp || "127.0.0.1";

    // 3. IP Rate Limiting (1 submission per 10s cooldown per IP)
    const now = Date.now();
    const lastSub = ipRateLimitMap.get(clientIp);
    if (lastSub && now - lastSub < RATE_LIMIT_WINDOW_MS) {
      const secondsLeft = Math.ceil((RATE_LIMIT_WINDOW_MS - (now - lastSub)) / 1000);
      return NextResponse.json(
        {
          success: false,
          error: `Please wait ${secondsLeft}s before sending another message.`,
          retryAfterSec: secondsLeft,
        },
        { status: 429 }
      );
    }
    // Set timestamp immediately to prevent race-condition double clicks
    ipRateLimitMap.set(clientIp, now);

    // 4. Cloudflare Turnstile Verification
    const turnstileResult = await verifyTurnstileToken(turnstileToken, clientIp);
    if (!turnstileResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: turnstileResult.error || "Security verification failed. Please check Turnstile challenge.",
          isTurnstileError: true,
        },
        { status: 403 }
      );
    }

    // 5. Profanity & Abuse Text Sanitization
    const nameSanitization = sanitizeAndValidateText(name, "Full Name", 2, 60);
    if (!nameSanitization.isValid) {
      return NextResponse.json(
        { success: false, error: nameSanitization.error },
        { status: 400 }
      );
    }

    const messageSanitization = sanitizeAndValidateText(message, "Message", 10, 1000);
    if (!messageSanitization.isValid) {
      return NextResponse.json(
        { success: false, error: messageSanitization.error },
        { status: 400 }
      );
    }

    // 6. Persist to Cloud Firestore & RTDB under 'messages'
    const messageId = `msg_${now}_${Math.random().toString(36).substring(2, 7)}`;
    const selectedCategory = category || "General Inquiry";

    const messageRecord = {
      id: messageId,
      name: nameSanitization.sanitizedText,
      email: email.trim().toLowerCase(),
      category: selectedCategory,
      message: messageSanitization.sanitizedText,
      date: new Date(now).toISOString(),
      createdAt: now,
      ip: clientIp,
      status: "UNREAD",
    };

    const firestore = getAdminFirestore();
    if (firestore) {
      try {
        await firestore.collection("messages").doc(messageId).set(messageRecord, { merge: true });
      } catch (dbErr) {
        console.warn("Firestore message persistence note:", dbErr);
      }
    }

    // 7. Dispatch Dual EmailJS Notifications (Clean direct execution)
    const emailResult = await dispatchContactEmails({
      name: nameSanitization.sanitizedText,
      email: email.trim().toLowerCase(),
      category: selectedCategory,
      message: messageSanitization.sanitizedText,
      ip: clientIp,
    }).catch((err) => {
      console.warn("Email dispatch note:", err);
      return { adminEmailSent: false, visitorEmailSent: false, errors: [String(err)] };
    });

    return NextResponse.json({
      success: true,
      messageId,
      emailDelivered: emailResult.adminEmailSent || emailResult.visitorEmailSent,
      timestamp: messageRecord.date,
    });
  } catch (err: unknown) {
    const error = err as Error;
    console.error("Unhandled contact submission error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "An unexpected error occurred while processing your message.",
      },
      { status: 500 }
    );
  }
}
