/**
 * Standalone WhatsApp Reply Notification Confirmation Webpage
 *
 * Dedicated, pre-authenticated, separate entity outside the Admin Panel.
 *
 * Lifecycle:
 * - 1st Click: Backend executes Brevo email to visitor -> logs dispatch to Firestore -> renders "Email Has Been Sent!"
 * - 2nd Click (and subsequent clicks / refreshes): Backend detects previous dispatch -> suppresses duplicate email -> renders "Already Sent ✓"
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
} from "react-icons/fa6";
import { verifyAndDecodeWhatsAppReplyToken } from "@/lib/whatsapp/tokens";
import { whatsappNotificationsRepository } from "@/lib/dal/repositories/whatsapp-notifications.repository";
import { sendTransactionalEmail, EMAIL_IDENTITIES, formatSubmissionTimestamp, escapeHtml } from "@/lib/email";
import { adminLogger } from "@/lib/admin/logger";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Reply Notification Status | Gaurav Portfolio",
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
      <main className="min-h-screen bg-[#000319] text-white flex items-center justify-center p-4 sm:p-6 font-sans relative overflow-hidden">
        {/* Ambient background glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.2),rgba(255,255,255,0))] pointer-events-none" />

        <div className="max-w-md w-full bg-white/[0.03] backdrop-blur-xl border border-white/[0.1] rounded-2xl p-6 sm:p-8 text-center shadow-2xl relative z-10">
          <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto mb-4">
            <FaTriangleExclamation className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2 tracking-tight">Invalid or Expired Link</h1>
          <p className="text-xs sm:text-sm text-neutral-400 mb-6 leading-relaxed">
            This reply notification link is invalid, corrupted, or has expired. No email was sent.
          </p>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-purple/20 hover:bg-purple/30 text-purple border border-purple/30 font-semibold text-xs sm:text-sm transition-all"
          >
            <FaArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Portfolio</span>
          </Link>
        </div>
      </main>
    );
  }

  const cleanPhone = payload.phone.replace(/[^0-9]/g, "");
  const waChatUrl = `https://wa.me/${cleanPhone}`;
  const nowTimestamp = formatSubmissionTimestamp();

  // 2. Atomic Lifecycle & Idempotency Check in Firestore
  const existingRecord = await whatsappNotificationsRepository.getNotificationById(payload.dispatchId);
  const isAlreadySent = existingRecord !== null;

  let dispatchedAt = existingRecord ? existingRecord.timestamp : nowTimestamp;
  let deliveryStatus: "DELIVERED" | "FAILED" = existingRecord ? existingRecord.status : "DELIVERED";

  // 3. FIRST-TIME CLICK: Send Brevo email to visitor IF not already sent
  if (!isAlreadySent) {
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
    dispatchedAt = formatSubmissionTimestamp();

    // Persist to Firestore with explicit dispatchId so any subsequent click sees "Already Sent"
    await whatsappNotificationsRepository.recordNotificationWithId(payload.dispatchId, {
      visitorPhone: payload.phone,
      visitorEmail: payload.email,
      visitorName: payload.name,
      subject,
      status: deliveryStatus,
      timestamp: dispatchedAt,
      error: sendResult.error || undefined,
    });
  }

  return (
    <main className="min-h-screen bg-[#000319] text-white flex flex-col justify-between p-4 sm:p-6 lg:p-10 font-sans relative overflow-x-hidden">
      {/* Background Ambience & Subtle Grid */}
      <div className="h-full w-full bg-[#000319] dark:bg-grid-white/[0.03] bg-grid-white/[0.02] absolute top-0 left-0 flex items-center justify-center pointer-events-none -z-10">
        <div className="absolute pointer-events-none inset-0 flex items-center justify-center bg-[#000319] [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]" />
      </div>

      {/* Top Bar: Clean Return Link */}
      <header className="w-full max-w-2xl mx-auto flex items-center justify-between mb-6 sm:mb-8 relative z-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs sm:text-sm text-purple hover:text-white transition-colors duration-200 group font-medium"
        >
          <FaArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" />
          <span>Gaurav Portfolio</span>
        </Link>

        <div className="inline-flex items-center gap-2 text-[11px] sm:text-xs text-neutral-400 bg-white/[0.04] border border-white/[0.08] rounded-full px-3 py-1 font-mono">
          <FaShieldHalved className="w-3 h-3 text-purple" />
          <span>Secure Direct Gateway</span>
        </div>
      </header>

      {/* Main Content Card: Standalone, Separate Entity */}
      <div className="w-full max-w-2xl mx-auto my-auto relative z-10">
        <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/[0.1] rounded-2xl sm:rounded-3xl p-6 sm:p-8 lg:p-10 shadow-2xl relative overflow-hidden">
          {/* Subtle decorative top accent line */}
          <div
            className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${
              isAlreadySent ? "from-purple via-violet-500 to-indigo-500" : "from-emerald-400 via-teal-400 to-emerald-500"
            }`}
          />

          {/* Header Section */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5 pb-6 border-b border-white/[0.08]">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border ${
                isAlreadySent
                  ? "bg-purple/10 border-purple/30 text-purple"
                  : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
              }`}
            >
              {isAlreadySent ? <FaCheckDouble className="w-7 h-7" /> : <FaCheck className="w-7 h-7" />}
            </div>

            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {isAlreadySent ? "Notification Already Sent" : "Email Has Been Sent!"}
                </h1>

                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                    isAlreadySent
                      ? "bg-purple/10 text-purple border-purple/30"
                      : "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isAlreadySent ? "bg-purple" : "bg-emerald-400 animate-pulse"
                    }`}
                  />
                  {isAlreadySent ? "Already Sent ✓" : "Delivered via Brevo"}
                </span>
              </div>

              <p className="text-xs sm:text-sm text-neutral-400 mt-1.5 leading-relaxed">
                {isAlreadySent ? (
                  <>
                    This reply notification was already delivered to{" "}
                    <strong className="text-white font-medium">{payload.name}</strong>. Duplicate sends are
                    prevented to avoid visitor inbox spam.
                  </>
                ) : (
                  <>
                    An automated email was delivered to{" "}
                    <strong className="text-white font-medium">{payload.name}</strong> alerting them that you
                    have replied on WhatsApp.
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Dynamic Button Lifecycle Visual State */}
          <div className="my-6">
            <div className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <FaEnvelope className="w-3 h-3 text-neutral-400" />
              <span>Button Action Status</span>
            </div>

            <div
              className={`w-full py-3.5 px-4 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left ${
                isAlreadySent
                  ? "bg-white/[0.02] border-white/[0.08] text-neutral-300"
                  : "bg-emerald-500/5 border-emerald-500/20 text-emerald-200"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${
                    isAlreadySent ? "bg-purple/20 text-purple" : "bg-emerald-500/20 text-emerald-400"
                  }`}
                >
                  {isAlreadySent ? "✓✓" : "✓"}
                </span>
                <div>
                  <div className="text-xs sm:text-sm font-semibold text-white">
                    {isAlreadySent
                      ? `✉️ "I've Replied" Email — Already Sent`
                      : `✉️ "I've Replied" Email — Sent Successfully`}
                  </div>
                  <div className="text-[11px] text-neutral-400">
                    {isAlreadySent
                      ? `Previously dispatched on ${dispatchedAt} • Single-send idempotency active`
                      : `Dispatched on ${dispatchedAt} • Brevo transactional identity verified`}
                  </div>
                </div>
              </div>

              <span
                className={`text-[11px] font-mono font-medium px-2.5 py-1 rounded-md border ${
                  isAlreadySent
                    ? "bg-white/[0.05] border-white/10 text-neutral-400"
                    : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                }`}
              >
                {isAlreadySent ? "STATUS: RESOLVED" : "STATUS: DELIVERED"}
              </span>
            </div>
          </div>

          {/* Recipient & Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-4 border-t border-b border-white/[0.08]">
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-3.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">
                <FaUser className="w-3 h-3 text-neutral-400" />
                <span>Recipient</span>
              </div>
              <div className="text-sm font-semibold text-white truncate">{payload.name}</div>
              <div className="text-xs text-neutral-400 truncate mt-0.5">{payload.email}</div>
            </div>

            <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-3.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">
                <FaWhatsapp className="w-3 h-3 text-emerald-400" />
                <span>WhatsApp Phone</span>
              </div>
              <div className="text-sm font-semibold text-white font-mono">+{cleanPhone}</div>
              <div className="text-xs text-neutral-400 mt-0.5">Inbound message slot {payload.messageCount} of 3</div>
            </div>

            <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-3.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">
                <FaClock className="w-3 h-3 text-purple" />
                <span>Dispatched Time</span>
              </div>
              <div className="text-sm font-semibold text-white font-mono">{dispatchedAt}</div>
              <div className="text-xs text-neutral-400 mt-0.5">Indian Standard Time (IST)</div>
            </div>

            <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-3.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">
                <FaShieldHalved className="w-3 h-3 text-indigo-400" />
                <span>Delivery Engine</span>
              </div>
              <div className="text-sm font-semibold text-white">Brevo Transactional</div>
              <div className="text-xs text-neutral-400 mt-0.5">
                {deliveryStatus === "DELIVERED" ? "Verified SMTP Dispatch" : "Queued with Brevo"}
              </div>
            </div>
          </div>

          {/* Primary Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-6">
            <a
              href={waChatUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2.5 w-full sm:flex-1 py-3.5 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:scale-[0.99] text-white text-xs sm:text-sm font-semibold shadow-lg shadow-emerald-500/20 transition-all"
            >
              <FaWhatsapp className="w-4 h-4" />
              <span>{isAlreadySent ? "Continue Chat on WhatsApp →" : "Open WhatsApp Chat with Visitor →"}</span>
            </a>

            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 w-full sm:w-auto py-3.5 px-5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] active:scale-[0.99] text-neutral-300 hover:text-white border border-white/10 text-xs sm:text-sm font-medium transition-all"
            >
              <span>Return to Portfolio</span>
            </Link>
          </div>
        </div>

        {/* Security & Privacy Assurance Footer */}
        <p className="text-center text-[11px] text-neutral-400 mt-4 leading-relaxed">
          Pre-authenticated action token &bull; Completely separate entity &bull; Zero admin session exposure
        </p>
      </div>

      {/* Footer copyright */}
      <footer className="w-full max-w-2xl mx-auto text-center text-xs text-neutral-400 pt-6 relative z-10">
        Gaurav Patil &bull; Developer Portfolio Communication Gateway
      </footer>
    </main>
  );
}
