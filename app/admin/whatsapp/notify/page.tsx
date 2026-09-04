/**
 * WhatsApp 1-Click Visitor Notification Gateway Page
 *
 * Triggered securely by Gaurav via signed link inside the admin email alert or via Admin Panel.
 * Automatically executes the visitor notification email (with idempotency to prevent duplicate sends),
 * logs the event to Firestore, and renders a fully responsive Swiss Light Admin confirmation page
 * with real-time dynamic email notification history below.
 */

import React from "react";
import { cookies } from "next/headers";
import Link from "next/link";
import { ADMIN_COOKIE_NAME } from "@/lib/admin/constants";
import { verifyAdminSession } from "@/lib/admin/auth";
import { AdminPageContainer } from "@/components/admin";
import { verifyNotifyVisitorSignature } from "@/lib/whatsapp/notifications";
import { sendTransactionalEmail, EMAIL_IDENTITIES, formatSubmissionTimestamp, escapeHtml } from "@/lib/email";
import { whatsappNotificationsRepository } from "@/lib/dal/repositories/whatsapp-notifications.repository";
import { adminLogger } from "@/lib/admin/logger";
import { WhatsAppNotifyClient } from "./components/WhatsAppNotifyClient";
import { FaTriangleExclamation } from "react-icons/fa6";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    email?: string;
    phone?: string;
    name?: string;
    sig?: string;
  }>;
}

export default async function WhatsAppNotifyPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const rawEmail = params.email?.trim().toLowerCase() || "";
  const rawPhone = params.phone?.replace(/[^0-9]/g, "") || "";
  const rawName = params.name?.trim() || "Visitor";
  const rawSig = params.sig?.trim() || "";

  // 1. Dual Authorization: Validate HMAC Signature OR Active Admin Session
  const isSignatureValid = verifyNotifyVisitorSignature(rawEmail, rawPhone, rawSig);

  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  const adminSession = sessionToken ? await verifyAdminSession(sessionToken) : null;
  const isAdminAuthenticated = adminSession !== null;

  if (!isSignatureValid && !isAdminAuthenticated) {
    adminLogger.warn("WhatsApp:NotifyVisitorUnauthorized", "Access denied: invalid signature and unauthenticated", {
      email: rawEmail,
      phone: rawPhone,
    });

    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-4 font-admin-sans">
        <div className="max-w-md w-full bg-white border border-[#E2E8F0] rounded-xl p-6 text-center shadow-xs">
          <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto mb-3">
            <FaTriangleExclamation className="w-6 h-6" />
          </div>
          <h1 className="text-base font-bold text-neutral-900 mb-1">Invalid or Expired Link</h1>
          <p className="text-xs text-neutral-500 mb-4 leading-relaxed">
            This notification trigger link is invalid, expired, or has missing authentication parameters.
          </p>
          <Link
            href="/admin/login"
            className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-semibold transition-all"
          >
            Sign in to Admin Dashboard &rarr;
          </Link>
        </div>
      </div>
    );
  }

  const visitorEmail = rawEmail || "visitor@example.com";
  const visitorPhone = rawPhone || "15556693652";
  const visitorName = rawName;
  const dispatchedAt = formatSubmissionTimestamp();

  // 2. Idempotency Check: Was a notification sent to this phone in the last 2 minutes?
  let isAlreadySent = false;
  if (rawPhone) {
    isAlreadySent = await whatsappNotificationsRepository.wasRecentlyNotified(rawPhone, 2);
  }

  // 3. Dispatch Email to Visitor via Brevo IF not already recently notified
  if (!isAlreadySent && rawEmail && rawPhone) {
    const rawBotPhone = process.env.NEXT_PUBLIC_WHATSAPP_PHONE_NUMBER || "15556693652";
    const botPhone = rawBotPhone.replace(/[^0-9]/g, "");
    const returnWaUrl = `https://wa.me/${botPhone}`;

    const safeName = escapeHtml(visitorName);
    const subject = `Gaurav Patil replied to your message on WhatsApp`;
    const textContent =
      `Hi ${visitorName},\n\n` +
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
      to: [{ email: visitorEmail, name: visitorName }],
      subject,
      htmlContent,
      textContent,
      tags: ["whatsapp_visitor_alert"],
      idempotencyKey: `wa_notif_${rawPhone}_${Date.now()}`,
    });

    // 4. Record to Firestore via Repository
    await whatsappNotificationsRepository.recordNotification({
      visitorPhone: rawPhone,
      visitorEmail,
      visitorName,
      subject,
      status: sendResult.success ? "DELIVERED" : "FAILED",
      timestamp: dispatchedAt,
      error: sendResult.error || undefined,
    });
  }

  // 5. Retrieve dynamic history of all dispatched notifications
  const recentRecords = await whatsappNotificationsRepository.getRecentNotifications(30);

  return (
    <AdminPageContainer
      breadcrumb="OPERATIONS"
      subtitle="Recruiter Communication"
      title="WhatsApp Notification Gateway"
    >
      <WhatsAppNotifyClient
        initialRecords={recentRecords}
        recipientEmail={visitorEmail}
        recipientName={visitorName}
        recipientPhone={visitorPhone}
        isAlreadySent={isAlreadySent}
        dispatchedAt={dispatchedAt}
      />
    </AdminPageContainer>
  );
}
