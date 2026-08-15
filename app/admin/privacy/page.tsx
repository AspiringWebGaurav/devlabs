"use client";

import React from "react";
import Link from "next/link";
import { FaArrowLeft, FaShieldHalved, FaLock, FaDatabase, FaClock } from "react-icons/fa6";

export default function AdminPrivacyPage() {
  return (
    <div className="min-h-screen bg-[#FAFAFA] text-black selection:bg-black selection:text-white font-sans antialiased">
      {/* Hairline Grid Background */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#F0F0F0_1px,transparent_1px),linear-gradient(to_bottom,#F0F0F0_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none -z-10 opacity-70" />

      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-[#E5E7EB] px-6 sm:px-16 py-4 flex items-center justify-between">
        <Link href="/admin" className="text-xl sm:text-2xl font-bold tracking-tight text-black hover:opacity-80 transition-opacity">
          admin panel<span className="text-[#A855F7]">.</span>
        </Link>

        <Link
          href="/admin/login"
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-sm bg-[#F5F5F5] hover:bg-black text-[#171717] hover:text-white text-xs font-mono transition-all"
        >
          <FaArrowLeft className="w-3 h-3" />
          <span>Back to Sign In</span>
        </Link>
      </header>

      {/* Main Document Body */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-8">
        {/* Title Header */}
        <div className="space-y-2 border-b border-[#E5E7EB] pb-6">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono tracking-widest text-[#737373] uppercase font-semibold">
              DATA GOVERNANCE &bull; PRIVACY PROTOCOL
            </span>
            <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">
              ZERO-API-KEY TOTP
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-black flex items-center gap-3">
            <FaLock className="w-6 h-6 text-[#A855F7]" />
            <span>Admin Privacy & Data Policy</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#64748B]">
            Data handling, Google Authenticator Base32 cryptographic tokens, and storage standards for Gaurav Portfolio.
          </p>
        </div>

        {/* Privacy Sections */}
        <div className="bg-white border border-[#E5E7EB] rounded-sm p-6 sm:p-10 space-y-8 text-xs sm:text-sm text-[#374151] leading-relaxed shadow-xs">
          <section className="space-y-3">
            <h2 className="text-base font-bold text-black flex items-center gap-2">
              <FaDatabase className="w-4 h-4 text-[#A855F7]" />
              1. Information We Collect & Process
            </h2>
            <p>
              The admin panel processes minimal administrative data strictly necessary for security and content management:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-[#525252]">
              <li>Google Account profile metadata (Email, Display Name, Avatar URL).</li>
              <li>One-Time Password (OTP) delivery targets and 5-minute cryptographic verification hashes.</li>
              <li>Google Authenticator Base32 cryptographic secret keys stored securely in Upstash Redis.</li>
              <li>Inquiry contact messages, email subscribers, and showcase portfolio articles.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-black flex items-center gap-2">
              <FaShieldHalved className="w-4 h-4 text-[#A855F7]" />
              2. Google Authenticator (TOTP) Security Standards
            </h2>
            <p>
              TOTP codes are generated and verified locally using the mathematical RFC 6238 standard with zero third-party API keys. Secret keys are transmitted solely during QR Code generation over encrypted HTTPS connections.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-black flex items-center gap-2">
              <FaClock className="w-4 h-4 text-[#A855F7]" />
              3. Cookie & Session Governance
            </h2>
            <p>
              We utilize secure HTTP cookies (<code className="bg-[#F5F5F5] px-1.5 py-0.5 rounded-xs font-mono text-black font-semibold">admin_session</code>) scoped with <code className="bg-[#F5F5F5] px-1.5 py-0.5 rounded-xs font-mono text-black">SameSite=Lax</code> and 8-hour expiry timestamps. No commercial trackers, third-party analytics pixels, or advertising identifiers are deployed.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-black flex items-center gap-2">
              <FaLock className="w-4 h-4 text-[#A855F7]" />
              4. Right to Complete Deletion (Zero Retention)
            </h2>
            <p>
              In accordance with zero-retention standards, all messages, subscribers, and cache keys can be wiped to exactly 0 instantaneously using the Database Services module.
            </p>
          </section>
        </div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between text-xs font-mono text-[#737373] pt-4">
          <Link href="/admin/terms" className="text-black hover:underline flex items-center gap-1.5">
            <FaShieldHalved className="w-3 h-3 text-[#A855F7]" />
            <span>Read Terms of Service &rarr;</span>
          </Link>
          <Link href="/admin/login" className="hover:text-black transition-colors">
            Return to Sign In &bull;
          </Link>
        </div>
      </main>
    </div>
  );
}
