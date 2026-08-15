"use client";

import React from "react";
import Link from "next/link";
import { FaArrowLeft, FaShieldHalved, FaScaleBalanced, FaMobileScreenButton, FaClock } from "react-icons/fa6";

export default function AdminTermsPage() {
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
              SECURITY COMPLIANCE &bull; LEGAL TERMS
            </span>
            <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">
              v4.1 ACTIVE • 3-FACTOR 2FA
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-black flex items-center gap-3">
            <FaScaleBalanced className="w-6 h-6 text-[#A855F7]" />
            <span>Admin Terms of Service</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#64748B]">
            Governance, 3-factor multi-layer security, attempt rate-limiting, and access authorization standards for Devlabs.
          </p>
        </div>

        {/* Legal Sections */}
        <div className="bg-white border border-[#E5E7EB] rounded-sm p-6 sm:p-10 space-y-8 text-xs sm:text-sm text-[#374151] leading-relaxed shadow-xs">
          <section className="space-y-3">
            <h2 className="text-base font-bold text-black flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#A855F7]" />
              1. Authorized Administrative Identity
            </h2>
            <p>
              Access to this administrative portal is strictly restricted to authorized Devlabs administrators. Authentication requires verified Google OAuth credentials matching <code className="bg-[#F5F5F5] px-1.5 py-0.5 rounded-xs font-mono text-black font-semibold">gauravpatil9262@gmail.com</code> combined with second-factor dynamic email OTP and third-factor Google Authenticator (TOTP) verification.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-black flex items-center gap-2">
              <FaMobileScreenButton className="w-4 h-4 text-[#A855F7]" />
              2. Mandatory 3-Factor Multi-Layer Architecture
            </h2>
            <p>
              Sign-in requires a sequential 3-layer security handshake:
            </p>
            <ol className="list-decimal pl-5 space-y-1.5 text-[#525252]">
              <li><strong>Layer 1: Google OAuth Identity</strong> verified against authorized administrator account.</li>
              <li><strong>Layer 2: Email Security OTP</strong> dispatched via TLS 1.3 gateway with a 5-minute TTL.</li>
              <li><strong>Layer 3: Google Authenticator (RFC 6238 TOTP)</strong> registered under app title <em>&quot;Gaurav Portfolio Admin Panel&quot;</em>.</li>
            </ol>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-black flex items-center gap-2">
              <FaClock className="w-4 h-4 text-[#A855F7]" />
              3. Attempt Throttling, Lockout & Session Lifetimes
            </h2>
            <p>
              A strict 5-attempt security threshold applies to both Email OTP and Google Authenticator verification. Exceeding 5 failed attempts triggers an automatic 5-minute cryptographic lockout. Authorized sessions maintain an 8-hour maximum lifetime and a 2-hour background inactivity timeout.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-black flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#A855F7]" />
              4. Destructive Database Operations (Nuclear Purge)
            </h2>
            <p>
              The Database Services console contains nuclear data purge utilities executed via Firebase Admin SDK Service Account credentials. The administrator acknowledges that executing a nuclear database wipe permanently removes Realtime Database document nodes and flushes Upstash Redis cache storage.
            </p>
          </section>
        </div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between text-xs font-mono text-[#737373] pt-4">
          <Link href="/admin/privacy" className="text-black hover:underline flex items-center gap-1.5">
            <FaShieldHalved className="w-3 h-3 text-[#A855F7]" />
            <span>Read Privacy & Data Policy &rarr;</span>
          </Link>
          <Link href="/admin/login" className="hover:text-black transition-colors">
            Return to Sign In &bull;
          </Link>
        </div>
      </main>
    </div>
  );
}
