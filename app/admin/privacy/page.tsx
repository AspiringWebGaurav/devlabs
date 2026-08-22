"use client";

import React from "react";
import Link from "next/link";
import {
  FaShieldHalved,
  FaScaleBalanced,
  FaLock,
  FaDatabase,
  FaClock,
  FaArrowLeft,
  FaCheck,
  FaFileLines,
  FaKey,
} from "react-icons/fa6";

const SECTIONS = [
  { id: "collection", num: "01", title: "Information We Collect & Process" },
  { id: "totp", num: "02", title: "Google Authenticator (TOTP) Zero-API Standards" },
  { id: "cookies", num: "03", title: "Cookie & Cryptographic Session Governance" },
  { id: "deletion", num: "04", title: "Right to Instant Erasure (Zero-Retention)" },
  { id: "encryption", num: "05", title: "In-Transit & At-Rest Encryption Standards" },
  { id: "disclosure", num: "06", title: "Zero Third-Party Commercial Tracking" },
];

export default function AdminPrivacyPage() {
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
              className="px-3.5 py-1.5 rounded-xs text-[#525252] hover:text-black hover:bg-white/80 transition-all flex items-center gap-2"
            >
              <FaScaleBalanced className="w-3 h-3 text-[#737373]" />
              <span>01. Terms of Service</span>
            </Link>
            <Link
              href="/admin/privacy"
              className="px-3.5 py-1.5 rounded-xs bg-black text-white font-bold shadow-2xs flex items-center gap-2"
            >
              <FaShieldHalved className="w-3 h-3 text-[#CBACF9]" />
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
                DATA GOVERNANCE &bull; PRIVACY PROTOCOL
              </span>
              <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">
                ZERO-API-KEY TOTP
              </span>
              <span className="text-[10px] font-mono text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full font-bold">
                256-BIT CRYPTOGRAPHY
              </span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-black flex items-center gap-3">
              <FaLock className="w-7 h-7 text-[#A855F7]" />
              <span>Admin Privacy & Data Policy</span>
            </h1>
            <p className="text-xs sm:text-sm text-[#64748B] max-w-4xl">
              Transparent data governance standards, cryptographic token lifecycles, Google Authenticator Base32 secret storage, and zero-retention administrative controls for Gaurav Portfolio.
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
                <FaScaleBalanced className="w-3 h-3 text-[#A855F7]" />
                <span>Related Governance</span>
              </h4>
              <p className="text-[#64748B] text-[11px] leading-relaxed">
                Review 3-factor multi-layer architecture, attempt rate-limiting, and legal terms.
              </p>
              <Link
                href="/admin/terms"
                className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-black hover:text-[#A855F7] transition-colors pt-1"
              >
                <span>Read Terms of Service &rarr;</span>
              </Link>
            </div>
          </aside>

          {/* Right Column: Full-Width Content Cards */}
          <div className="lg:col-span-9 space-y-6">
            {/* Section 1: Information Collected */}
            <section
              id="collection"
              className="bg-white border border-[#E5E7EB] rounded-sm p-6 sm:p-8 space-y-4 shadow-xs"
            >
              <div className="flex items-center gap-3 border-b border-[#F0F0F0] pb-3.5">
                <span className="w-6 h-6 rounded-sm bg-black text-white flex items-center justify-center font-mono text-xs font-bold">
                  01
                </span>
                <h2 className="text-base sm:text-lg font-bold text-black tracking-tight flex items-center gap-2">
                  <FaDatabase className="w-4 h-4 text-[#A855F7]" />
                  <span>Information We Collect & Process</span>
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-[#374151] leading-relaxed">
                The admin panel processes minimal administrative data strictly necessary for security verification and portfolio content delivery:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="p-3.5 bg-[#FAFAFA] border border-[#E5E7EB] rounded-sm space-y-1">
                  <h4 className="text-xs font-bold text-black font-mono">Google Profile Metadata</h4>
                  <p className="text-[11px] text-[#64748B]">
                    Email, display name, and avatar image URI from OAuth token.
                  </p>
                </div>
                <div className="p-3.5 bg-[#FAFAFA] border border-[#E5E7EB] rounded-sm space-y-1">
                  <h4 className="text-xs font-bold text-black font-mono">Dynamic OTP Hashes</h4>
                  <p className="text-[11px] text-[#64748B]">
                    6-digit cryptographic verification tokens with 5-minute TTL.
                  </p>
                </div>
                <div className="p-3.5 bg-[#FAFAFA] border border-[#E5E7EB] rounded-sm space-y-1">
                  <h4 className="text-xs font-bold text-black font-mono">Base32 TOTP Secrets</h4>
                  <p className="text-[11px] text-[#64748B]">
                    High-security RFC 6238 keys for Google Authenticator.
                  </p>
                </div>
                <div className="p-3.5 bg-[#FAFAFA] border border-[#E5E7EB] rounded-sm space-y-1">
                  <h4 className="text-xs font-bold text-black font-mono">Portfolio Content</h4>
                  <p className="text-[11px] text-[#64748B]">
                    Showcase articles, messages, visitor metrics, and subscriber lists.
                  </p>
                </div>
              </div>
            </section>

            {/* Section 2: Zero-API TOTP */}
            <section
              id="totp"
              className="bg-white border border-[#E5E7EB] rounded-sm p-6 sm:p-8 space-y-4 shadow-xs"
            >
              <div className="flex items-center gap-3 border-b border-[#F0F0F0] pb-3.5">
                <span className="w-6 h-6 rounded-sm bg-black text-white flex items-center justify-center font-mono text-xs font-bold">
                  02
                </span>
                <h2 className="text-base sm:text-lg font-bold text-black tracking-tight flex items-center gap-2">
                  <FaKey className="w-4 h-4 text-[#A855F7]" />
                  <span>Google Authenticator (TOTP) Zero-API Standards</span>
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-[#374151] leading-relaxed">
                TOTP codes are generated and verified entirely locally using the mathematical RFC 6238 algorithm with <strong>zero third-party API dependencies</strong>:
              </p>
              <ul className="space-y-2 text-xs sm:text-sm text-[#374151]">
                <li className="flex items-start gap-2">
                  <FaCheck className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                  <span>Secret keys are generated on-the-fly and rendered as self-contained data URLs.</span>
                </li>
                <li className="flex items-start gap-2">
                  <FaCheck className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                  <span>No external cloud servers ever see or store your two-factor authenticator secrets.</span>
                </li>
              </ul>
            </section>

            {/* Section 3: Cookie & Session Governance */}
            <section
              id="cookies"
              className="bg-white border border-[#E5E7EB] rounded-sm p-6 sm:p-8 space-y-4 shadow-xs"
            >
              <div className="flex items-center gap-3 border-b border-[#F0F0F0] pb-3.5">
                <span className="w-6 h-6 rounded-sm bg-black text-white flex items-center justify-center font-mono text-xs font-bold">
                  03
                </span>
                <h2 className="text-base sm:text-lg font-bold text-black tracking-tight flex items-center gap-2">
                  <FaClock className="w-4 h-4 text-[#A855F7]" />
                  <span>Cookie & Cryptographic Session Governance</span>
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-[#374151] leading-relaxed">
                We utilize hardened HTTP cookies (<code className="bg-[#F5F5F5] px-1.5 py-0.5 rounded-xs font-mono text-black font-semibold">admin_session</code>) scoped with <code className="bg-[#F5F5F5] px-1.5 py-0.5 rounded-xs font-mono text-black">SameSite=Lax</code> and 8-hour cryptographic timestamp signatures.
              </p>
              <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-sm text-xs font-mono text-[#525252] space-y-1">
                <p><strong>Cookie Flag Specs:</strong> Secure, SameSite=Lax, Path=/admin, Max-Age=28800</p>
                <p><strong>Purge Mechanism:</strong> 256-bit cookie termination on Sign Out.</p>
              </div>
            </section>

            {/* Section 4: Right to Erasure */}
            <section
              id="deletion"
              className="bg-white border border-[#E5E7EB] rounded-sm p-6 sm:p-8 space-y-4 shadow-xs"
            >
              <div className="flex items-center gap-3 border-b border-[#F0F0F0] pb-3.5">
                <span className="w-6 h-6 rounded-sm bg-black text-white flex items-center justify-center font-mono text-xs font-bold">
                  04
                </span>
                <h2 className="text-base sm:text-lg font-bold text-black tracking-tight flex items-center gap-2">
                  <FaShieldHalved className="w-4 h-4 text-[#A855F7]" />
                  <span>Right to Instant Erasure (Zero-Retention)</span>
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-[#374151] leading-relaxed">
                In accordance with zero-retention standards, all messages, subscribers, visitor telemetry, and cache keys can be wiped to exactly 0 instantaneously using the Database Services module.
              </p>
            </section>

            {/* Section 5: Encryption */}
            <section
              id="encryption"
              className="bg-white border border-[#E5E7EB] rounded-sm p-6 sm:p-8 space-y-4 shadow-xs"
            >
              <div className="flex items-center gap-3 border-b border-[#F0F0F0] pb-3.5">
                <span className="w-6 h-6 rounded-sm bg-black text-white flex items-center justify-center font-mono text-xs font-bold">
                  05
                </span>
                <h2 className="text-base sm:text-lg font-bold text-black tracking-tight">
                  In-Transit & At-Rest Encryption Standards
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-[#374151] leading-relaxed">
                All communications between your browser and the administrator subsystem are protected by TLS 1.3 encryption with strict HTTP Strict Transport Security (HSTS) headers. Database records are encrypted at rest using AES-256 standards.
              </p>
            </section>

            {/* Section 6: Zero Tracking */}
            <section
              id="disclosure"
              className="bg-white border border-[#E5E7EB] rounded-sm p-6 sm:p-8 space-y-4 shadow-xs"
            >
              <div className="flex items-center gap-3 border-b border-[#F0F0F0] pb-3.5">
                <span className="w-6 h-6 rounded-sm bg-black text-white flex items-center justify-center font-mono text-xs font-bold">
                  06
                </span>
                <h2 className="text-base sm:text-lg font-bold text-black tracking-tight">
                  Zero Third-Party Commercial Tracking
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-[#374151] leading-relaxed">
                The administrative panel contains zero commercial trackers, advertising pixels, or telemetry beacons. Your administrative actions, login sessions, and private credentials are never shared or monetized.
              </p>
            </section>
          </div>
        </div>
      </main>

      {/* Clean Bottom Footer */}
      <footer className="w-full border-t border-[#E5E7EB] bg-white px-6 sm:px-12 lg:px-16 py-4 flex flex-col sm:flex-row items-center justify-between text-xs text-[#737373] font-mono gap-3">
        <span>&copy; {new Date().getFullYear()} Gaurav Portfolio Admin Subsystem. All rights reserved.</span>
        <div className="flex items-center gap-4">
          <Link href="/admin/terms" className="hover:text-black transition-colors">
            Terms of Service
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
