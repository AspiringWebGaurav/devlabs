"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  FaShieldHalved,
  FaArrowRight,
  FaHouse,
  FaTriangleExclamation,
  FaLock,
  FaScaleBalanced,
  FaTerminal,
  FaCheck,
  FaServer,
  FaKey,
} from "react-icons/fa6";

function BlockedContent() {
  const searchParams = useSearchParams();
  const attemptedPath = searchParams.get("attempted") || "Direct Route Probe";
  const [incidentId, setIncidentId] = React.useState("SEC_34NT6X");
  const [timestamp, setTimestamp] = React.useState("2026-08-19T10:00:00.000Z");

  React.useEffect(() => {
    setIncidentId(`SEC_${Math.random().toString(36).substring(2, 8).toUpperCase()}`);
    setTimestamp(new Date().toISOString());
  }, []);

  return (
    <div className="h-screen max-h-screen w-full bg-[#FAFAFA] text-black selection:bg-black selection:text-white font-sans antialiased flex flex-col justify-between overflow-hidden">
      {/* Hairline Grid Background */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#F0F0F0_1px,transparent_1px),linear-gradient(to_bottom,#F0F0F0_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none -z-10 opacity-60" />

      {/* Top Header */}
      <header className="shrink-0 h-14 bg-white/95 backdrop-blur-md border-b border-[#E5E7EB] px-6 sm:px-12 flex items-center justify-between z-30">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="text-xl font-bold tracking-[-0.04em] text-black hover:opacity-80 transition-opacity"
          >
            admin panel<span className="text-[#A855F7]">.</span>
          </Link>

          <div className="hidden md:flex items-center gap-2 font-mono text-[11px] text-[#737373]">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
            <span>SECURITY INTERCEPT GATEWAY</span>
            <span>&bull;</span>
            <span suppressHydrationWarning className="text-black font-bold">{incidentId}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xs bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-mono font-bold">
            <span>ACCESS RESTRICTED</span>
          </span>
        </div>
      </header>

      {/* Main Full-Viewport 2-Panel Console Grid (Zero Scroll) */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 w-full overflow-hidden">
        {/* Left Panel: Executive Threat Brief & Recovery Actions */}
        <section className="lg:col-span-5 bg-white border-r border-[#E5E7EB] p-6 sm:p-10 xl:p-12 flex flex-col justify-between h-full overflow-y-auto">
          <div className="space-y-6">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-mono tracking-widest text-[#737373] uppercase font-bold">
                ACCESS POLICY VIOLATION
              </span>
              <span className="text-[10px] font-mono text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full font-bold">
                NO MANUAL REDIRECT ALLOWED
              </span>
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl xl:text-4xl font-extrabold tracking-tight text-black leading-tight flex items-center gap-3">
                <FaTriangleExclamation className="w-7 h-7 text-rose-600 shrink-0" />
                <span>Manual Navigation Prohibited</span>
              </h1>
              <p className="text-xs sm:text-sm text-[#64748B] leading-relaxed">
                For security compliance and authentication protection, the admin subsystem cannot be accessed via direct route typing or URL probe aliases.
              </p>
            </div>

            {/* Quick Action Buttons */}
            <div className="space-y-3 pt-2">
              <Link
                href="/admin"
                className="w-full bg-black text-white hover:bg-[#262626] active:bg-[#171717] py-3.5 px-5 rounded-sm font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-between transition-colors border border-black cursor-pointer shadow-xs"
              >
                <span>Enter via Official Gateway (/admin)</span>
                <FaArrowRight className="w-3.5 h-3.5 text-[#CBACF9]" />
              </Link>

              <Link
                href="/"
                className="w-full bg-[#F5F5F5] hover:bg-white text-black py-3 px-5 rounded-sm font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors border border-[#E5E7EB] hover:border-black cursor-pointer shadow-2xs"
              >
                <FaHouse className="w-3 h-3 text-[#737373]" />
                <span>Return to Portfolio Home</span>
              </Link>
            </div>
          </div>

          {/* Left Panel Footer Guarantee */}
          <div className="pt-6 border-t border-[#F0F0F0] space-y-1 text-xs text-[#737373] font-mono">
            <div className="flex items-center gap-2 text-black font-bold">
              <FaShieldHalved className="w-3.5 h-3.5 text-emerald-600" />
              <span>Gaurav Portfolio Security Subsystem</span>
            </div>
            <p className="text-[11px] text-[#94A3B8]">
              Automated edge-level probe protection active across all endpoints.
            </p>
          </div>
        </section>

        {/* Right Panel: Technical Telemetry & Protocol Inspection Console */}
        <section className="lg:col-span-7 bg-[#F8FAFC] p-6 sm:p-10 xl:p-12 flex flex-col justify-between h-full space-y-6 overflow-y-auto">
          <div className="space-y-5">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <div className="flex items-center gap-2">
                <FaTerminal className="w-3.5 h-3.5 text-[#A855F7]" />
                <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-black">
                  Security Telemetry & Diagnostics
                </h3>
              </div>
              <span suppressHydrationWarning className="text-[11px] font-mono text-[#64748B]">{timestamp}</span>
            </div>

            {/* Diagnostic Terminal View */}
            <div className="bg-black text-white rounded-sm p-4 sm:p-5 font-mono text-xs space-y-2.5 shadow-xs border border-black/80">
              <div className="flex items-center justify-between text-[11px] text-neutral-400 border-b border-neutral-800 pb-2">
                <span>INCIDENT LOG ENTRY</span>
                <span className="text-[#CBACF9] font-bold">STATUS: INTERCEPTED</span>
              </div>
              <div className="space-y-1 text-xs">
                <p className="text-neutral-300">
                  <span className="text-neutral-500">[PATH_PROBED]:</span>{" "}
                  <span className="text-rose-400 font-bold">{attemptedPath}</span>
                </p>
                <p className="text-neutral-300">
                  <span className="text-neutral-500">[INTERCEPT_REASON]:</span>{" "}
                  <span className="text-amber-300">UNAUTHORIZED_DIRECT_ROUTE_INVOCATION</span>
                </p>
                <p className="text-neutral-300">
                  <span className="text-neutral-500">[SECURITY_PROTOCOL]:</span>{" "}
                  <span className="text-white">RFC-SEC-04 (OFFICIAL_GATEWAY_REQUIRED)</span>
                </p>
                <p className="text-neutral-300">
                  <span className="text-neutral-500">[AUTHORIZED_ACCESS]:</span>{" "}
                  <span className="text-emerald-400 font-bold">https://portfolio/admin</span>
                </p>
              </div>
            </div>

            {/* 4 Protocol Safeguards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-3.5 bg-white border border-[#E2E8F0] rounded-sm space-y-1 shadow-2xs">
                <div className="flex items-center gap-2 text-xs font-bold font-mono text-black">
                  <FaServer className="w-3 h-3 text-[#A855F7]" />
                  <span>01. Gateway Control</span>
                </div>
                <p className="text-[11px] text-[#64748B] leading-relaxed">
                  Single verified entry point strictly through the official <code className="text-black font-mono">/admin</code> route.
                </p>
              </div>

              <div className="p-3.5 bg-white border border-[#E2E8F0] rounded-sm space-y-1 shadow-2xs">
                <div className="flex items-center gap-2 text-xs font-bold font-mono text-black">
                  <FaLock className="w-3 h-3 text-emerald-600" />
                  <span>02. 3-Layer MFA</span>
                </div>
                <p className="text-[11px] text-[#64748B] leading-relaxed">
                  Google OAuth + TLS 1.3 Email Security OTP + Google Authenticator.
                </p>
              </div>

              <div className="p-3.5 bg-white border border-[#E2E8F0] rounded-sm space-y-1 shadow-2xs">
                <div className="flex items-center gap-2 text-xs font-bold font-mono text-black">
                  <FaKey className="w-3 h-3 text-amber-600" />
                  <span>03. Zero-API TOTP</span>
                </div>
                <p className="text-[11px] text-[#64748B] leading-relaxed">
                  Mathematical RFC 6238 time-based tokens with zero external cloud dependencies.
                </p>
              </div>

              <div className="p-3.5 bg-white border border-[#E2E8F0] rounded-sm space-y-1 shadow-2xs">
                <div className="flex items-center gap-2 text-xs font-bold font-mono text-black">
                  <FaCheck className="w-3 h-3 text-blue-600" />
                  <span>04. Rate Limiting</span>
                </div>
                <p className="text-[11px] text-[#64748B] leading-relaxed">
                  Strict 5-attempt security ceiling with automatic 5-minute cryptographic lockout.
                </p>
              </div>
            </div>
          </div>

          {/* Right Panel Governance Links */}
          <div className="border-t border-[#E2E8F0] pt-3.5 flex items-center justify-between text-xs font-mono text-[#737373]">
            <div className="flex items-center gap-3">
              <Link href="/admin/terms" className="text-black hover:underline flex items-center gap-1">
                <FaScaleBalanced className="w-3 h-3 text-[#A855F7]" />
                <span>Security Terms</span>
              </Link>
              <span>&bull;</span>
              <Link href="/admin/privacy" className="text-black hover:underline flex items-center gap-1">
                <FaShieldHalved className="w-3 h-3 text-[#A855F7]" />
                <span>Privacy Protocol</span>
              </Link>
            </div>
            <span className="text-[10px] text-[#94A3B8]">AES-256 ENCRYPTED</span>
          </div>
        </section>
      </main>

      {/* Pinned Bottom Single-Line Footer */}
      <footer className="shrink-0 h-10 border-t border-[#E5E7EB] bg-white px-6 sm:px-12 flex items-center justify-between text-xs text-[#737373] font-mono">
        <span>&copy; {new Date().getFullYear()} Gaurav Portfolio Security Subsystem. All rights reserved.</span>
        <div className="flex items-center gap-3 text-[11px]">
          <Link href="/admin/terms" className="hover:text-black transition-colors">
            Terms of Service
          </Link>
          <span>&bull;</span>
          <Link href="/admin/privacy" className="hover:text-black transition-colors">
            Privacy Policy
          </Link>
        </div>
      </footer>
    </div>
  );
}

export default function AdminBlockedPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen bg-[#FAFAFA] flex items-center justify-center p-4 font-mono text-xs text-[#737373] animate-pulse">
          Loading Security Console...
        </div>
      }
    >
      <BlockedContent />
    </Suspense>
  );
}
