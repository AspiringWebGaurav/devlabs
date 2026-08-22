/**
 * EmailJS Contact Form Dispatcher
 * Dispatches dual notifications:
 * 1. Admin Lead Notification (contact_form -> gauravpatil5737@gmail.com)
 * 2. Visitor Auto-Confirmation (user_confirmation -> visitor email)
 */

const CONTACT_SERVICE_ID =
  process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || "";

const VISITOR_TEMPLATE_ID =
  process.env.NEXT_PUBLIC_EMAILJS_VISITOR_TEMPLATE_ID || "";

const ADMIN_TEMPLATE_ID =
  process.env.NEXT_PUBLIC_EMAILJS_ADMIN_TEMPLATE_ID ||
  process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID ||
  "";

const CONTACT_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY || "";

const ADMIN_RECIPIENT_EMAIL =
  process.env.ADMIN_EMAIL || "gauravpatil5737@gmail.com";

export interface ContactDispatchParams {
  name: string;
  email: string;
  category: string;
  message: string;
  ip?: string;
}

export interface ContactDispatchResult {
  adminEmailSent: boolean;
  visitorEmailSent: boolean;
  errors: string[];
}

/**
 * Sends a single EmailJS payload via official REST API.
 * Guaranteed 1:1 execution with zero duplicate retries.
 */
async function sendEmailJsPayload(
  templateId: string,
  templateParams: Record<string, string>
): Promise<{ success: boolean; error?: string }> {
  const payload: Record<string, unknown> = {
    service_id: CONTACT_SERVICE_ID,
    template_id: templateId,
    user_id: CONTACT_PUBLIC_KEY,
    template_params: templateParams,
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  try {
    const origin =
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

    const res = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: origin,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      return { success: true };
    }

    const errText = await res.text();
    console.warn(`EmailJS (template: ${templateId}) HTTP ${res.status}:`, errText);

    return {
      success: false,
      error: `EmailJS HTTP ${res.status}: ${errText || "Check EmailJS template setup"}`,
    };
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    const error = err as Error;
    return {
      success: false,
      error: error.name === "AbortError" ? "Email dispatch timeout (6s)." : "Network connection failed.",
    };
  }
}

/**
 * Resolves the active base URL dynamically (Localhost vs Production Domain).
 */
export function resolveBaseUrl(): string {
  if (process.env.NODE_ENV === "development") {
    return "http://localhost:3000";
  }
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }
  return "https://gauravpatil.online";
}

/**
 * Dispatches Admin Notification and Visitor Confirmation emails sequentially with safety delay.
 */
export async function dispatchContactEmails(
  params: ContactDispatchParams
): Promise<ContactDispatchResult> {
  const baseUrl = resolveBaseUrl();
  const now = new Date();
  const formattedTime =
    now.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }) +
    " at " +
    now.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Kolkata",
    }) +
    " IST";

  const errors: string[] = [];

  // 1. Dispatch Admin Notification Payload (Goes strictly to gauravpatil5737@gmail.com)
  const adminParams: Record<string, string> = {
    to_email: ADMIN_RECIPIENT_EMAIL,
    to_name: "Gaurav Patil",
    from_name: "Gaurav's Portfolio Services",
    from_email: "gauravsbackendservices@outlook.com",
    reply_to: "gauravsbackendservices@outlook.com",
    sender_name: params.name.trim(),
    name: params.name.trim(),
    email: params.email.trim(),
    category: params.category || "General Inquiry",
    ip: params.ip || "Direct Web",
    portfolio_url: baseUrl,
    admin_url: `${baseUrl}/admin`,
    app_url: baseUrl,
    subject: `New message from ${params.name}`,
    message: params.message.trim(),
    timestamp: formattedTime,
  };

  // 2. Dispatch Visitor Confirmation Payload (Goes dynamically to visitor email)
  const visitorParams: Record<string, string> = {
    to_email: params.email.trim(),
    email: params.email.trim(),
    user_email: params.email.trim(),
    recipient_email: params.email.trim(),
    client_email: params.email.trim(),
    to_name: params.name.trim(),
    name: params.name.trim(),
    user_name: params.name.trim(),
    from_name: "Gaurav's Portfolio Services",
    from_email: "gauravsbackendservices@outlook.com",
    reply_to: ADMIN_RECIPIENT_EMAIL,
    category: params.category || "General Inquiry",
    portfolio_url: baseUrl,
    admin_url: `${baseUrl}/admin`,
    app_url: baseUrl,
    subject: `Hi ${params.name} your inquiry is in my inbox`,
    message: params.message.trim(),
    timestamp: formattedTime,
  };

  // Step 1: Dispatch Admin Notification FIRST (Exactly 1 time)
  const adminResult = await sendEmailJsPayload(ADMIN_TEMPLATE_ID, adminParams);
  const adminEmailSent = adminResult.success;
  if (!adminResult.success && adminResult.error) {
    errors.push(`Admin notification note: ${adminResult.error}`);
  }

  // Step 2: Add 500ms delay between dispatches for EmailJS API stability and rate-limit prevention
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Step 3: Dispatch Visitor Confirmation SECOND (Exactly 1 time)
  const visitorResult = await sendEmailJsPayload(VISITOR_TEMPLATE_ID, visitorParams);
  const visitorEmailSent = visitorResult.success;
  if (!visitorResult.success && visitorResult.error) {
    errors.push(`Visitor confirmation note: ${visitorResult.error}`);
  }

  return {
    adminEmailSent,
    visitorEmailSent,
    errors,
  };
}
