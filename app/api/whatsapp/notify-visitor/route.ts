/**
 * 1-Click Visitor Notification API Route
 *
 * Triggered securely by Gaurav via signed link inside the admin email alert.
 * Sends an email notification to the visitor via Brevo alerting them that Gaurav has replied on WhatsApp.
 */

import { NextRequest } from "next/server";
import { verifyNotifyVisitorSignature } from "@/lib/whatsapp/notifications";
import { sendTransactionalEmail, EMAIL_IDENTITIES, escapeHtml } from "@/lib/email";
import { adminLogger } from "@/lib/admin/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<Response> {
  const searchParams = req.nextUrl.searchParams;
  const email = searchParams.get("email")?.trim().toLowerCase() || "";
  const phone = searchParams.get("phone")?.replace(/[^0-9]/g, "") || "";
  const name = searchParams.get("name")?.trim() || "Visitor";
  const sig = searchParams.get("sig")?.trim() || "";

  // 1. Verify HMAC cryptographic signature
  const isValid = verifyNotifyVisitorSignature(email, phone, sig);
  if (!isValid) {
    adminLogger.warn("WhatsApp:NotifyVisitorForbidden", "Invalid or missing HMAC signature", {
      email,
      phone,
    });
    return new Response(
      `<!DOCTYPE html><html><body style="font-family:sans-serif;padding:30px;text-align:center;"><h2>Invalid or Expired Link</h2><p>This notification link is invalid or has been modified.</p></body></html>`,
      {
        status: 403,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      }
    );
  }

  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const cleanPhone = phone;

  // 2. WhatsApp bot phone number to return to
  const rawBotPhone = process.env.NEXT_PUBLIC_WHATSAPP_PHONE_NUMBER || "15556693652";
  const botPhone = rawBotPhone.replace(/[^0-9]/g, "");
  const returnWaUrl = `https://wa.me/${botPhone}`;

  // 3. Dispatch notification email to the visitor via Brevo
  const subject = `Gaurav Patil replied to your message on WhatsApp`;
  const textContent =
    `Hi ${name},\n\n` +
    `Gaurav Patil has replied to your message on WhatsApp!\n\n` +
    `Tap the link below to open WhatsApp and continue your conversation:\n` +
    `${returnWaUrl}\n\n` +
    `Best regards,\n` +
    `Gaurav Patil`;

  const htmlContent = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:460px;margin:0 auto;padding:24px 18px;background:#FAFAFA;border:1px solid #E2E8F0;border-radius:12px;color:#0F172A;text-align:center;box-sizing:border-box;">
      <div style="width:48px;height:48px;background:#DCFCE7;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:12px;">
        <span style="font-size:24px;line-height:1;">💬</span>
      </div>
      <h2 style="margin:0 0 8px 0;font-size:18px;color:#0F172A;font-weight:700;">Gaurav has replied!</h2>
      <p style="margin:0 0 18px 0;font-size:14px;color:#475569;line-height:1.5;">
        Hi <strong>${safeName}</strong>, Gaurav Patil has just replied to your message on WhatsApp. Tap below to view his message and continue the conversation.
      </p>
      <div style="margin-bottom:16px;">
        <a href="${returnWaUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:12px 24px;background:#25D366;color:#FFFFFF;text-decoration:none;font-weight:600;font-size:14px;border-radius:8px;">
          Open WhatsApp Chat &rarr;
        </a>
      </div>
      <p style="margin:0;font-size:11.5px;color:#94A3B8;">
        Gaurav Patil &bull; Official Portfolio Communication
      </p>
    </div>
  `;

  const sendResult = await sendTransactionalEmail({
    purpose: "CONTACT_FORM",
    identity: EMAIL_IDENTITIES.HELLO,
    to: [{ email, name }],
    subject,
    htmlContent,
    textContent,
    tags: ["whatsapp_visitor_alert"],
    idempotencyKey: `wa_visitor_notified_${cleanPhone}_${Date.now()}`,
  });

  if (!sendResult.success) {
    adminLogger.error("WhatsApp:NotifyVisitorFailed", new Error(sendResult.error || "Brevo failed to send"));
    return new Response(
      `<!DOCTYPE html><html><body style="font-family:sans-serif;padding:30px;text-align:center;"><h2>Delivery Issue</h2><p>Could not dispatch email notification at this moment.</p></body></html>`,
      {
        status: 500,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      }
    );
  }

  // 4. Render clean confirmation page for Gaurav
  const confirmationHtml = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Visitor Notified</title>
        <style>
          * { box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #FAFAFA;
            margin: 0;
            padding: 20px 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
          }
          .card {
            max-width: 420px;
            width: 100%;
            background: #FFFFFF;
            border: 1px solid #E2E8F0;
            border-radius: 12px;
            padding: 24px 20px;
            text-align: center;
            box-shadow: 0 4px 16px rgba(0,0,0,0.04);
          }
          .icon {
            width: 44px;
            height: 44px;
            border-radius: 50%;
            background: #DCFCE7;
            color: #16A34A;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 22px;
            font-weight: 700;
            margin-bottom: 12px;
          }
          h1 {
            font-size: 18px;
            margin: 0 0 8px 0;
            color: #0F172A;
          }
          p {
            font-size: 13.5px;
            color: #64748B;
            margin: 0 0 20px 0;
            line-height: 1.5;
          }
          .email-chip {
            display: inline-block;
            background: #F1F5F9;
            color: #334155;
            font-weight: 600;
            padding: 2px 8px;
            border-radius: 4px;
            word-break: break-all;
          }
          .btn {
            display: block;
            width: 100%;
            padding: 12px;
            background: #25D366;
            color: #FFFFFF;
            text-decoration: none;
            font-weight: 600;
            font-size: 14px;
            border-radius: 8px;
            margin-bottom: 10px;
          }
          .btn-secondary {
            display: block;
            width: 100%;
            padding: 11px;
            background: #F1F5F9;
            color: #475569;
            text-decoration: none;
            font-weight: 600;
            font-size: 13px;
            border-radius: 8px;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon">&#10003;</div>
          <h1>Email Notification Sent!</h1>
          <p>An email was delivered to <span class="email-chip">${safeEmail}</span> letting ${safeName} know you have replied on WhatsApp.</p>
          <a href="https://wa.me/${cleanPhone}" class="btn">Open Chat with ${safeName} on WhatsApp &rarr;</a>
          <a href="javascript:window.close()" class="btn-secondary">Close Window</a>
        </div>
      </body>
    </html>
  `;

  return new Response(confirmationHtml, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
