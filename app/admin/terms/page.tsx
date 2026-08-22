"use client";

import React from "react";
import Link from "next/link";
import {
  FaScaleBalanced,
  FaShieldHalved,
  FaMobileScreenButton,
  FaClock,
  FaDatabase,
  FaLock,
  FaArrowLeft,
  FaCheck,
  FaFileLines,
} from "react-icons/fa6";

const SECTIONS = [
  { id: "identity", num: "01", title: "Authorized Administrative Identity" },
  { id: "mfa", num: "02", title: "Mandatory 3-Factor Multi-Layer Architecture" },
  { id: "throttling", num: "03", title: "Attempt Throttling, Lockout & Lifetimes" },
  { id: "purge", num: "04", title: "Destructive Operations (Nuclear Purge)" },
  { id: "integrity", num: "05", title: "Audit Trail & Event Log Integrity" },
  { id: "compliance", num: "06", title: "Compliance & Administrative Governance" },
];

export default function AdminTermsPage() {
  return (
    <div className="min-h-screen bg-[#FAFAFA] text-black selection:bg-black selection:text-white font-sans antialiased flex flex-col justify-between">
      {/* Hairline Grid Background */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#F0F0F0_1px,transparent_1px),linear-gradient(to_bottom,#F0F0F0_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none -z-10 opacity-70" />

      {/* Top Sticky Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E5E7EB] px-6 sm:px-12 lg:px-16 py-3.5 flex items-center justify-between transition-colors">
        {/* Left: Brand Logo */}
        <div className="flex items-center gap-6 sm:gap-8">
          <Link
            href="/admin"
            className="text-xl sm:text-2xl font-bold tracking-[-0.04em] text-black hover:opacity-80 transition-opacity"
          >
            admin panel<span className="text-[#A855F7]">.</span>
          </Link>

          {/* Center Tabs: Terms vs Privacy */}
          <nav className="hidden md:flex items-center gap-1.5 p-1 bg-[#F5F5F5] rounded-sm border border-[#E5E7EB] text-xs font-mono">
            <Link
              href="/admin/terms"
              className="px-3.5 py-1.5 rounded-xs bg-black text-white font-bold shadow-2xs flex items-center gap-2"
            >
              <FaScaleBalanced className="w-3 h-3 text-[#CBACF9]" />
              <span>01. Terms of Service</span>
            </Link>
            <Link
              href="/admin/privacy"
              className="px-3.5 py-1.5 rounded-xs text-[#525252] hover:text-black hover:bg-white/80 transition-all flex items-center gap-2"
            >
              <FaShieldHalved className="w-3 h-3 text-[#737373]" />
              <span>02. Privacy & Data Policy</span>
            </Link>
          </nav>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          <Link
            href="/admin/login"
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-sm bg-[#F5F5F5] hover:bg-black text-[#171717] hover:text-white text-xs font-mono transition-all border border-[#E5E7EB] hover:border-black cursor-pointer shadow-2xs"
          >
            <FaArrowLeft className="w-3 h-3" />
            <span>Back to Sign In</span>
          </Link>
        </div>
      </header>

      {/* Main Full-Width Content Container */}
      <main className="w-full flex-1 px-6 sm:px-12 lg:px-16 xl:px-24 py-8 sm:py-12">
        {/* Page Banner Header */}
        <div className="border-b border-[#E5E7EB] pb-6 mb-8 sm:mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-[11px] font-mono tracking-widest text-[#737373] uppercase font-bold">
                SECURITY COMPLIANCE &bull; LEGAL TERMS
              </span>
              <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">
                v4.1 ACTIVE • 3-FACTOR 2FA
              </span>
              <span className="text-[10px] font-mono text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full font-bold">
                MANDATORY 3-LAYER MFA
              </span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-black flex items-center gap-3">
              <FaScaleBalanced className="w-7 h-7 text-[#A855F7]" />
              <span>Admin Subsystem Terms of Service</span>
            </h1>
            <p className="text-xs sm:text-sm text-[#64748B] max-w-4xl">
              Comprehensive governance, multi-layer cryptographic authorization standards, attempt rate-limiting, and destructive data purge operational protocols for Gaurav Portfolio administrators.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-[#737373] shrink-0 bg-white border border-[#E5E7EB] px-3.5 py-2 rounded-sm shadow-2xs">
            <span>LAST REVISED:</span>
            <strong className="text-black">AUGUST 2026</strong>
          </div>
        </div>

        {/* 2-Column Responsive Layout: Left Sticky Index + Right Full-Width Document Body */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Left Column: Sticky Index & Metadata Panel */}
          <aside className="lg:col-span-3 sticky top-20 space-y-6">
            <div className="bg-white border border-[#E5E7EB] rounded-sm p-4 sm:p-5 space-y-4 shadow-xs">
              <div className="flex items-center gap-2 border-b border-[#E5E7EB] pb-3">
                <FaFileLines className="w-3.5 h-3.5 text-[#A855F7]" />
                <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-black">
                  Table of Contents
                </h3>
              </div>
              <nav className="space-y-1 font-mono text-xs">
                {SECTIONS.map((sec) => (
                  <a
                    key={sec.id}
                    href={`#${sec.id}`}
                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-xs text-[#525252] hover:text-black hover:bg-[#F5F5F5] transition-colors leading-tight"
                  >
                    <span className="text-[#A855F7] font-bold text-[10px]">{sec.num}</span>
                    <span className="truncate">{sec.title}</span>
                  </a>
                ))}
              </nav>
            </div>

            {/* Quick Policy Switch Card */}
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-sm p-4 space-y-2.5 text-xs">
              <h4 className="font-bold text-black font-mono uppercase text-[11px] flex items-center gap-1.5">
                <FaShieldHalved className="w-3 h-3 text-[#A855F7]" />
                <span>Related Governance</span>
              </h4>
              <p className="text-[#64748B] text-[11px] leading-relaxed">
                Review data handling, Base32 TOTP secret lifecycle, and zero-retention policies.
              </p>
              <Link
                href="/admin/privacy"
                className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-black hover:text-[#A855F7] transition-colors pt-1"
              >
                <span>Read Privacy & Data Policy &rarr;</span>
              </Link>
            </div>
          </aside>

          {/* Right Column: Full-Width Content Cards */}
          <div className="lg:col-span-9 space-y-6">
            {/* Section 1: Authorized Identity */}
            <section
              id="identity"
              className="bg-white border border-[#E5E7EB] rounded-sm p-6 sm:p-8 space-y-4 shadow-xs"
            >
              <div className="flex items-center gap-3 border-b border-[#F0F0F0] pb-3.5">
                <span className="w-6 h-6 rounded-sm bg-black text-white flex items-center justify-center font-mono text-xs font-bold">
                  01
                </span>
                <h2 className="text-base sm:text-lg font-bold text-black tracking-tight">
                  Authorized Administrative Identity
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-[#374151] leading-relaxed">
                Access to this administrative console is restricted exclusively to designated Gaurav Portfolio administrators. Authentication mandates verified Google OAuth credentials matching:
              </p>
              <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-sm font-mono text-xs text-black font-semibold flex items-center justify-between">
                <span>SUPERADMIN IDENTITY PROTOCOL:</span>
                <code className="text-[#A855F7] bg-white px-2 py-0.5 rounded-xs border border-[#E2E8F0]">
                  SHA256:51244B59... (Encrypted Code Identity)
                </code>
              </div>
              <p className="text-xs sm:text-sm text-[#64748B] leading-relaxed">
                Any attempted access from unauthorized Google accounts, unknown identities, or spoofed headers will be rejected immediately with an automatic security incident log.
              </p>
            </section>

            {/* Section 2: 3-Factor Architecture */}
            <section
              id="mfa"
              className="bg-white border border-[#E5E7EB] rounded-sm p-6 sm:p-8 space-y-4 shadow-xs"
            >
              <div className="flex items-center gap-3 border-b border-[#F0F0F0] pb-3.5">
                <span className="w-6 h-6 rounded-sm bg-black text-white flex items-center justify-center font-mono text-xs font-bold">
                  02
                </span>
                <h2 className="text-base sm:text-lg font-bold text-black tracking-tight flex items-center gap-2">
                  <FaMobileScreenButton className="w-4 h-4 text-[#A855F7]" />
                  <span>Mandatory 3-Factor Multi-Layer Architecture</span>
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-[#374151] leading-relaxed">
                To guarantee zero unauthorized entry, sign-in strictly enforces a sequential 3-layer security verification handshake:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-1">
                <div className="p-4 bg-[#FAFAFA] border border-[#E5E7EB] rounded-sm space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold font-mono text-black">
                    <span className="text-[#EA4335]">G</span>
                    <span>LAYER 1</span>
                  </div>
                  <h4 className="text-xs font-bold text-black">Google OAuth Identity</h4>
                  <p className="text-[11px] text-[#64748B] leading-relaxed">
                    Cryptographic token verified against Firebase Auth superadmin identity.
                  </p>
                </div>

                <div className="p-4 bg-[#FAFAFA] border border-[#E5E7EB] rounded-sm space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold font-mono text-black">
                    <FaLock className="w-3 h-3 text-[#A855F7]" />
                    <span>LAYER 2</span>
                  </div>
                  <h4 className="text-xs font-bold text-black">Email Security OTP</h4>
                  <p className="text-[11px] text-[#64748B] leading-relaxed">
                    Dynamic 6-digit verification code dispatched via TLS 1.3 gateway with 5-min TTL.
                  </p>
                </div>

                <div className="p-4 bg-[#FAFAFA] border border-[#E5E7EB] rounded-sm space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold font-mono text-black">
                    <FaShieldHalved className="w-3 h-3 text-emerald-600" />
                    <span>LAYER 3</span>
                  </div>
                  <h4 className="text-xs font-bold text-black">Google Authenticator (TOTP)</h4>
                  <p className="text-[11px] text-[#64748B] leading-relaxed">
                    RFC 6238 time-based verification registered under &quot;Gaurav Portfolio Admin Panel&quot;.
                  </p>
                </div>
              </div>
            </section>

            {/* Section 3: Attempt Throttling */}
            <section
              id="throttling"
              className="bg-white border border-[#E5E7EB] rounded-sm p-6 sm:p-8 space-y-4 shadow-xs"
            >
              <div className="flex items-center gap-3 border-b border-[#F0F0F0] pb-3.5">
                <span className="w-6 h-6 rounded-sm bg-black text-white flex items-center justify-center font-mono text-xs font-bold">
                  03
                </span>
                <h2 className="text-base sm:text-lg font-bold text-black tracking-tight flex items-center gap-2">
                  <FaClock className="w-4 h-4 text-[#A855F7]" />
                  <span>Attempt Throttling, Lockout & Session Lifetimes</span>
                </h2>
              </div>
              <ul className="space-y-2.5 text-xs sm:text-sm text-[#374151]">
                <li className="flex items-start gap-2.5">
                  <FaCheck className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                  <span><strong>5-Attempt Security Threshold:</strong> Exceeding 5 incorrect OTP or Authenticator attempts triggers an automatic 5-minute cryptographic lockout.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <FaCheck className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                  <span><strong>8-Hour Maximum Session Lifetime:</strong> Active sessions expire automatically after 8 hours, requiring fresh 3-factor authentication.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <FaCheck className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                  <span><strong>2-Hour Inactivity Timeout:</strong> Unattended workspaces automatically lock after 2 hours of inactivity to prevent physical terminal exposure.</span>
                </li>
              </ul>
            </section>

            {/* Section 4: Nuclear Database Purge */}
            <section
              id="purge"
              className="bg-white border border-[#E5E7EB] rounded-sm p-6 sm:p-8 space-y-4 shadow-xs"
            >
              <div className="flex items-center gap-3 border-b border-[#F0F0F0] pb-3.5">
                <span className="w-6 h-6 rounded-sm bg-black text-white flex items-center justify-center font-mono text-xs font-bold">
                  04
                </span>
                <h2 className="text-base sm:text-lg font-bold text-black tracking-tight flex items-center gap-2">
                  <FaDatabase className="w-4 h-4 text-[#A855F7]" />
                  <span>Destructive Database Operations (Nuclear Purge)</span>
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-[#374151] leading-relaxed">
                The Database Services module contains nuclear database wipe utilities executed via Firebase Admin SDK Service Account credentials:
              </p>
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-sm space-y-1.5 text-xs text-rose-900">
                <p className="font-bold">⚠️ Irreversible Operations Disclosure:</p>
                <p className="text-[11px] leading-relaxed">
                  Executing a nuclear database wipe permanently removes Realtime Database document nodes and flushes Upstash Redis cache storage. Wipe operations require dedicated OTP confirmation.
                </p>
              </div>
            </section>

            {/* Section 5: Integrity */}
            <section
              id="integrity"
              className="bg-white border border-[#E5E7EB] rounded-sm p-6 sm:p-8 space-y-4 shadow-xs"
            >
              <div className="flex items-center gap-3 border-b border-[#F0F0F0] pb-3.5">
                <span className="w-6 h-6 rounded-sm bg-black text-white flex items-center justify-center font-mono text-xs font-bold">
                  05
                </span>
                <h2 className="text-base sm:text-lg font-bold text-black tracking-tight">
                  Audit Trail & Event Log Integrity
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-[#374151] leading-relaxed">
                Every administrative action (including credential modification, ban enforcement, database purge, and settings modification) is recorded in cryptographically timestamped audit trails. Audit records remain immutable to ensure traceability.
              </p>
            </section>

            {/* Section 6: Governance */}
            <section
              id="compliance"
              className="bg-white border border-[#E5E7EB] rounded-sm p-6 sm:p-8 space-y-4 shadow-xs"
            >
              <div className="flex items-center gap-3 border-b border-[#F0F0F0] pb-3.5">
                <span className="w-6 h-6 rounded-sm bg-black text-white flex items-center justify-center font-mono text-xs font-bold">
                  06
                </span>
                <h2 className="text-base sm:text-lg font-bold text-black tracking-tight">
                  Compliance & Administrative Governance
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-[#374151] leading-relaxed">
                By entering the admin subsystem, the administrator agrees to uphold the highest standards of data security, safeguard multi-factor credentials, and ensure all portfolio content meets ethical and legal standards.
              </p>
            </section>
          </div>
        </div>
      </main>

      {/* Clean Bottom Footer */}
      <footer className="w-full border-t border-[#E5E7EB] bg-white px-6 sm:px-12 lg:px-16 py-4 flex flex-col sm:flex-row items-center justify-between text-xs text-[#737373] font-mono gap-3">
        <span>&copy; {new Date().getFullYear()} Gaurav Portfolio Admin Subsystem. All rights reserved.</span>
        <div className="flex items-center gap-4">
          <Link href="/admin/privacy" className="hover:text-black transition-colors">
            Privacy & Data Policy
          </Link>
          <span>&bull;</span>
          <Link href="/admin/login" className="hover:text-black transition-colors">
            Sign In
          </Link>
        </div>
      </footer>
    </div>
  );
}
