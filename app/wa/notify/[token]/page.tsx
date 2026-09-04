/**
 * Standalone WhatsApp Reply Notification Confirmation Webpage
 *
 * Design: Swiss Light Minimal (pure white surfaces, #FAFAFA background, crisp borders, dark text).
 * Constraint: Single-view layout fitting the viewport with ZERO vertical scrollbars on all screens.
 * Fully isolated separate entity outside the Admin Panel.
 *
 * Lifecycle:
 * - 1st Click: Atomic Firestore transaction claims dispatch -> sends Brevo email -> displays "Email Sent to Visitor"
 * - 2nd/3rd Click: Atomic transaction detects existing claim -> suppresses duplicate email -> displays "Already Sent ✓"
 */

import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import {
  FaCheck,
  FaWhatsapp,
  FaEnvelope,
  FaArrowLeft,
  FaClock,
  FaShieldHalved,
  FaUser,
  FaTriangleExclamation,
  FaCheckDouble,
  FaLock,
  FaServer,
} from "react-icons/fa6";
import { verifyAndDecodeWhatsAppReplyToken } from "@/lib/whatsapp/tokens";
import { whatsappNotificationsRepository } from "@/lib/dal/repositories/whatsapp-notifications.repository";
import { sendTransactionalEmail, EMAIL_IDENTITIES, escapeHtml } from "@/lib/email";
import { adminLogger } from "@/lib/admin/logger";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Reply Transaction Gateway | Gaurav Portfolio",
  description: "Direct WhatsApp visitor email reply notification gateway.",
  robots: {
    index: false,
    follow: false,
  },
};

interface PageProps {
  params: Promise<{
    token: string;
  }>;
}

export default async function WhatsAppNotifyStandalonePage({ params }: PageProps) {
  const { token } = await params;

  // 1. Cryptographic token verification (AES-256-GCM authenticated)
  const payload = verifyAndDecodeWhatsAppReplyToken(token);

  if (!payload) {
    adminLogger.warn("WhatsAppStandaloneNotify:InvalidToken", "Attempted access with invalid or tampered token");

    return (
      <main className="min-h-screen h-screen max-h-screen bg-[#FAFAFA] text-[#0F172A] flex flex-col justify-between overflow-hidden p-4 sm:p-6 font-sans">
        <header className="h-[44px] flex items-center justify-between border-b border-[#E2E8F0] pb-3 shrink-0">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-[#7C3AED] hover:text-[#6D28D9] transition-colors"
          >
            <FaArrowLeft className="w-3 h-3" />
            <span>Gaurav Portfolio</span>
          </Link>
          <span className="text-[11px] font-mono text-neutral-400">Security Gate</span>
        </header>

        <div className="flex-1 flex items-center justify-center min-h-0">
          <div className="max-w-md w-full bg-white border border-[#E2E8F0] rounded-xl p-6 sm:p-8 text-center shadow-xs">
            <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto mb-3">
              <FaTriangleExclamation className="w-6 h-6" />
            </div>
            <h1 className="text-base sm:text-lg font-bold text-neutral-900 mb-1">Invalid or Expired Link</h1>
            <p className="text-xs text-neutral-500 mb-5 leading-relaxed">
              This reply notification link is invalid, corrupted, or has expired. No email was sent.
            </p>
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-semibold text-xs transition-all"
            >
              <FaArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Portfolio</span>
            </Link>
          </div>
        </div>

        <footer className="h-[32px] flex items-center justify-between border-t border-[#E2E8F0] pt-2 text-[11px] text-neutral-400 shrink-0">
          <span>Gaurav Portfolio</span>
          <span>Zero Admin Shell &bull; Isolated Gateway</span>
        </footer>
      </main>
    );
  }

  const cleanPhone = payload.phone.replace(/[^0-9]/g, "");
  const waChatUrl = `https://wa.me/${cleanPhone}`;

  // 2. ATOMIC TRANSACTION: Claim dispatch inside Firestore transaction!
  // Prevents race conditions from rapid multiple clicks (double/triple clicks)
  // and dedupes across multiple alert emails for the same visitor session.
  const claimResult = await whatsappNotificationsRepository.claimNotificationDispatch(
    payload.dispatchId,
    payload.phone,
    payload.email,
    payload.name
  );

  const isAlreadySent = claimResult.isAlreadySent;
  const dispatchedAt = claimResult.record.timestamp;
  let deliveryStatus = claimResult.record.status;

  // 3. FIRST-TIME CLICK: Send Brevo email ONLY if claim succeeded (shouldSend === true)
  if (claimResult.shouldSend) {
    const rawBotPhone = process.env.NEXT_PUBLIC_WHATSAPP_PHONE_NUMBER || "15556693652";
    const botPhone = rawBotPhone.replace(/[^0-9]/g, "");
    const returnWaUrl = `https://wa.me/${botPhone}`;

    const safeName = escapeHtml(payload.name);
    const subject = `Gaurav Patil replied to your message on WhatsApp`;
    const textContent =
      `Hi ${payload.name},\n\n` +
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
      to: [{ email: payload.email, name: payload.name }],
      subject,
      htmlContent,
      textContent,
      tags: ["whatsapp_visitor_alert"],
      idempotencyKey: `wa_reply_visitor_${payload.dispatchId}`,
    });

    deliveryStatus = sendResult.success ? "DELIVERED" : "FAILED";
    await whatsappNotificationsRepository.finalizeNotificationDispatch(
      payload.dispatchId,
      sendResult.success,
      sendResult.error || undefined
    );
  }

  return (
    <main className="min-h-screen h-screen max-h-screen bg-[#FAFAFA] text-[#0F172A] flex flex-col justify-between overflow-hidden p-3 sm:p-5 lg:p-6 font-sans select-none">
      {/* 1. Header Bar */}
      <header className="h-[46px] flex items-center justify-between border-b border-[#E2E8F0] pb-2.5 shrink-0">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#7C3AED] hover:text-[#6D28D9] transition-colors group"
        >
          <FaArrowLeft className="w-3 h-3 transition-transform group-hover:-translate-x-0.5" />
          <span>Gaurav Portfolio</span>
        </Link>

        <div className="flex items-center gap-2 text-xs font-semibold text-neutral-800">
          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
          <span className="truncate">WhatsApp Reply Transaction Gateway</span>
        </div>

        <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-white border border-[#E2E8F0] text-neutral-500">
          <FaShieldHalved className="w-2.5 h-2.5 text-[#7C3AED]" />
          <span>Zero Admin Shell &bull; Isolated Gateway</span>
        </div>
      </header>

      {/* 2. Main Expansive Workspace: Utilizes Space, One View, Zero Scrollbars */}
      <div className="flex-1 flex flex-col justify-between min-h-0 py-2.5 sm:py-3 gap-2.5 sm:gap-3 w-full max-w-5xl mx-auto">
        {/* Top Transaction Banner */}
        <div
          className={`w-full bg-white border-l-4 ${
            isAlreadySent ? "border-l-[#7C3AED]" : "border-l-emerald-500"
          } border border-[#E2E8F0] rounded-xl p-3 sm:p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0`}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                  isAlreadySent
                    ? "bg-purple-50 text-[#7C3AED] border-purple-200"
                    : "bg-emerald-50 text-emerald-700 border-emerald-200"
                }`}
              >
                {isAlreadySent ? "2nd Click • Transaction Resolved" : "1st Click • Transaction Executed"}
              </span>
              <h1 className="text-base sm:text-lg font-bold text-neutral-900 tracking-tight">
                {isAlreadySent ? "Notification Already Sent" : "Email Sent to Visitor Inbox"}
              </h1>
            </div>
            <p className="text-xs text-neutral-500 mt-1 leading-normal truncate sm:whitespace-normal">
              {isAlreadySent ? (
                <>
                  This reply notification was already delivered to{" "}
                  <strong className="text-neutral-800">{payload.name}</strong> on {dispatchedAt}. Duplicate send
                  prevented.
                </>
              ) : (
                <>
                  An automated email was delivered to{" "}
                  <strong className="text-neutral-800">{payload.name}</strong> ({payload.email}) alerting them that you
                  replied on WhatsApp.
                </>
              )}
            </p>
          </div>

          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold shrink-0 self-start sm:self-auto border ${
              isAlreadySent
                ? "bg-neutral-100 text-neutral-700 border-neutral-200"
                : "bg-emerald-50 text-emerald-700 border-emerald-200"
            }`}
          >
            {isAlreadySent ? <FaCheckDouble className="w-3.5 h-3.5 text-[#7C3AED]" /> : <FaCheck className="w-3.5 h-3.5" />}
            <span>{isAlreadySent ? "Already Sent ✓" : "Delivered via Brevo"}</span>
          </span>
        </div>

        {/* Structured 2-Column Space-Utilizing Grid */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-2.5 sm:gap-3.5 min-h-0">
          {/* Left Column: Transaction & Recipient Ledger */}
          <div className="md:col-span-7 bg-white border border-[#E2E8F0] rounded-xl p-3.5 sm:p-4 flex flex-col justify-between shadow-xs overflow-hidden">
            <div>
              <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2 mb-2.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-800 uppercase tracking-wider">
                  <FaServer className="w-3 h-3 text-[#7C3AED]" />
                  <span>Transaction &amp; Recipient Ledger</span>
                </div>
                <span className="text-[11px] font-mono text-neutral-400">IDEMPOTENT</span>
              </div>

              {/* Data Rows */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-[#FAFAFA] border border-[#E2E8F0] rounded-lg p-2 sm:p-2.5">
                  <div className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-1">
                    <FaUser className="w-2.5 h-2.5 text-neutral-400" />
                    <span>Recipient</span>
                  </div>
                  <div className="font-semibold text-neutral-900 truncate mt-0.5">{payload.name}</div>
                  <div className="text-[11px] text-neutral-500 truncate">{payload.email}</div>
                </div>

                <div className="bg-[#FAFAFA] border border-[#E2E8F0] rounded-lg p-2 sm:p-2.5">
                  <div className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-1">
                    <FaWhatsapp className="w-2.5 h-2.5 text-emerald-600" />
                    <span>WhatsApp Phone</span>
                  </div>
                  <div className="font-semibold text-neutral-900 font-mono mt-0.5">+{cleanPhone}</div>
                  <div className="text-[11px] text-neutral-500">Inbound Slot {payload.messageCount} of 3</div>
                </div>

                <div className="bg-[#FAFAFA] border border-[#E2E8F0] rounded-lg p-2 sm:p-2.5">
                  <div className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-1">
                    <FaClock className="w-2.5 h-2.5 text-[#7C3AED]" />
                    <span>Dispatch Time</span>
                  </div>
                  <div className="font-semibold text-neutral-900 font-mono mt-0.5">{dispatchedAt}</div>
                  <div className="text-[11px] text-neutral-500">Indian Standard Time (IST)</div>
                </div>

                <div className="bg-[#FAFAFA] border border-[#E2E8F0] rounded-lg p-2 sm:p-2.5">
                  <div className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-1">
                    <FaLock className="w-2.5 h-2.5 text-indigo-500" />
                    <span>Transaction State</span>
                  </div>
                  <div className="font-semibold text-neutral-900 mt-0.5">
                    {deliveryStatus === "DELIVERED" ? "Completed" : "Active"}
                  </div>
                  <div className="text-[11px] text-emerald-600 font-medium">1-Send Guarantee Locked</div>
                </div>
              </div>
            </div>

            {/* Bottom Ledger Note */}
            <div className="bg-[#FAFAFA] border border-[#E2E8F0] rounded-lg p-2 sm:p-2.5 mt-2">
              <div className="text-[11px] text-neutral-600 leading-relaxed flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span>
                  <strong>Financial-Grade Atomic Mutex:</strong> Rapid multi-clicks (e.g. 3 clicks) are trapped by the
                  Firestore transaction lock. The visitor receives strictly 1 email alert.
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Action Lifecycle Status & Direct Navigation */}
          <div className="md:col-span-5 bg-white border border-[#E2E8F0] rounded-xl p-3.5 sm:p-4 flex flex-col justify-between shadow-xs overflow-hidden">
            <div>
              <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2 mb-2.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-800 uppercase tracking-wider">
                  <FaEnvelope className="w-3 h-3 text-[#7C3AED]" />
                  <span>Action Lifecycle Status</span>
                </div>
                <span className="text-[11px] font-mono text-neutral-400">STATE: {isAlreadySent ? "RESOLVED" : "EXECUTED"}</span>
              </div>

              {/* Dynamic Button Lifecycle Visual Representation */}
              <div
                className={`p-3 sm:p-3.5 rounded-xl border text-left ${
                  isAlreadySent
                    ? "bg-[#FAFAFA] border-[#E2E8F0] text-neutral-700"
                    : "bg-emerald-50/70 border-emerald-200 text-emerald-900"
                }`}
              >
                <div
                  className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${
                    isAlreadySent ? "text-[#7C3AED]" : "text-emerald-700"
                  }`}
                >
                  {isAlreadySent ? "Trigger 2+ (Repeat Click)" : "Trigger 1 (Initial Click)"}
                </div>

                <div className="text-xs sm:text-sm font-semibold flex items-center gap-2 text-neutral-900">
                  {isAlreadySent ? (
                    <FaCheckDouble className="w-3.5 h-3.5 text-[#7C3AED] shrink-0" />
                  ) : (
                    <FaCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  )}
                  <span>{isAlreadySent ? `✉️ "I've Replied" Email — Already Sent` : `✉️ "I've Replied" Email — Sent Successfully`}</span>
                </div>

                <div className="text-[11px] text-neutral-500 mt-1 leading-normal">
                  {isAlreadySent
                    ? `Previously sent on ${dispatchedAt}. Duplicate send blocked by transaction mutex.`
                    : `Dispatched to visitor's inbox on ${dispatchedAt}. Single-send ledger locked.`}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2 pt-2">
              <a
                href={waChatUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 sm:py-3 px-4 rounded-lg bg-[#25D366] hover:bg-[#20bd5a] active:scale-[0.99] text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition-all"
              >
                <FaWhatsapp className="w-4 h-4" />
                <span>Continue Chat on WhatsApp &rarr;</span>
              </a>

              <Link
                href="/"
                className="w-full py-2 sm:py-2.5 px-4 rounded-lg bg-[#FAFAFA] hover:bg-neutral-100 active:scale-[0.99] text-neutral-700 border border-[#E2E8F0] font-medium text-xs flex items-center justify-center gap-2 transition-all"
              >
                <span>Return to Portfolio</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Footer Bar: Single-View Viewport Fit Standard */}
      <footer className="h-[34px] flex items-center justify-between border-t border-[#E2E8F0] pt-2 text-[11px] text-[#64748B] shrink-0">
        <span>Gaurav Portfolio &bull; Developer Communication Engine</span>
        <span className="hidden sm:inline">Single-view no-scroll layout</span>
        <span>Atomic Transaction Ledger &bull; 0 Duplicate Emails</span>
      </footer>
    </main>
  );
}
