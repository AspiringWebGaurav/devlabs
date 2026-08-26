import React from "react";
import Link from "next/link";
import { FaArrowLeft, FaShieldHalved, FaLock, FaUserCheck, FaCookieBite, FaInbox, FaRobot, FaFingerprint } from "react-icons/fa6";
import { AdminFooter } from "@/components/admin";
import { ADMIN_SESSION_TTL_HOURS } from "@/lib/admin/constants";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Privacy Policy | Gaurav Portfolio",
  description: "Administrator Privacy Policy and Data Governance.",
  robots: { index: false, follow: false },
};

export default function AdminPrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#FAFAFA] text-black relative">
      {/* 1. Edge-to-Edge Sticky Top Navigation Header */}
      <header className="w-full bg-[#FFFFFF] px-6 sm:px-10 lg:px-12 py-4 flex items-center justify-between sticky top-0 z-30 border-b border-[#E5E7EB] shadow-2xs select-none">
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="font-admin-sans text-xl sm:text-2xl font-extrabold tracking-tight text-black hover:opacity-80 transition-opacity"
          >
            admin panel<span className="text-[#7C3AED]">.</span>
          </Link>
          <span className="text-[#CBD5E1] font-admin-mono text-sm">/</span>
          <span className="font-admin-mono text-xs uppercase tracking-widest text-[#64748B] font-semibold">
            Privacy Policy
          </span>
        </div>

        <Link
          href="/admin/login"
          className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-admin-mono font-semibold text-[#64748B] hover:text-black bg-[#FAFAFA] hover:bg-[#F1F5F9] border border-[#CBD5E1] rounded-sm transition-all shadow-2xs"
        >
          <FaArrowLeft className="w-3 h-3 text-[#7C3AED]" />
          <span>Back to Login</span>
        </Link>
      </header>

      {/* 2. Full-Width Architectural Reading Canvas */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 py-8 sm:py-12 relative z-10 flex flex-col">
        {/* Hero Title Banner */}
        <div className="w-full bg-[#FFFFFF] border border-[#E2E8F0] p-6 sm:p-10 rounded-none sm:rounded-sm shadow-2xs mb-8 space-y-3">
          <div>
            <span className="font-admin-mono text-[11px] tracking-[0.25em] text-[#7C3AED] uppercase font-bold">
              Data Governance & Privacy Framework
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-admin-sans text-black tracking-tight">
            Administrator Privacy Policy
          </h1>
          <p className="text-sm sm:text-base text-[#475569] font-admin-sans max-w-4xl leading-relaxed">
            Transparent disclosure of identity verification claims, session token security, contact form communication governance, and telemetry processing inside the Gaurav Portfolio administration subsystem.
          </p>
          <div className="flex flex-wrap items-center gap-4 pt-3 text-xs font-admin-mono text-[#94A3B8] border-t border-[#F1F5F9]">
            <span>Original Effective: January 1, 2026</span>
            <span>·</span>
            <span>Last Updated: August 26, 2026</span>
            <span>·</span>
            <span>Version: 1.1.0 (Enterprise Multi-Tier Standard)</span>
            <span>·</span>
            <span className="text-[#10B981] font-semibold">Compliance: Strict</span>
          </div>
        </div>

        {/* 2-Column Responsive Layout: Left Sticky Meta & Right Expansive Clauses */}
        <div className="w-full flex flex-col lg:flex-row gap-8 items-start">
          {/* Left Sticky Meta Column */}
          <div className="w-full lg:w-80 shrink-0 space-y-5 lg:sticky lg:top-24">
            {/* Quick Specs Card */}
            <div className="bg-[#FFFFFF] border border-[#E2E8F0] p-5 sm:p-6 rounded-none sm:rounded-sm shadow-2xs space-y-4">
              <h3 className="font-admin-sans font-bold text-sm text-black uppercase tracking-wider flex items-center gap-2">
                <FaFingerprint className="w-3.5 h-3.5 text-[#7C3AED]" />
                <span>Privacy Specs</span>
              </h3>
              <div className="space-y-3 text-xs font-admin-mono border-t border-[#F1F5F9] pt-3">
                <div className="flex items-center justify-between text-[#64748B]">
                  <span>OAuth Scopes</span>
                  <span className="font-semibold text-black">openid, email, profile</span>
                </div>
                <div className="flex items-center justify-between text-[#64748B]">
                  <span>2FA Storage</span>
                  <span className="font-semibold text-black">HMAC Hashed (Salted)</span>
                </div>
                <div className="flex items-center justify-between text-[#64748B]">
                  <span>IP Telemetry</span>
                  <span className="font-semibold text-black">Ephemeral (15m TTL)</span>
                </div>
                <div className="flex items-center justify-between text-[#64748B]">
                  <span>Session Cookie</span>
                  <span className="font-semibold text-black">admin_session (Lax)</span>
                </div>
                <div className="flex items-center justify-between text-[#64748B]">
                  <span>Cookie Lifespan</span>
                  <span className="font-semibold text-black">{ADMIN_SESSION_TTL_HOURS} Hours Strict</span>
                </div>
                <div className="flex items-center justify-between text-[#64748B]">
                  <span>Data Region</span>
                  <span className="font-semibold text-black">asia-southeast1</span>
                </div>
                <div className="flex items-center justify-between text-[#64748B]">
                  <span>Bot Protection</span>
                  <span className="font-semibold text-[#10B981]">Cloudflare Turnstile</span>
                </div>
              </div>
            </div>

            {/* Direct Login Shortcut Card */}
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] p-5 rounded-none sm:rounded-sm space-y-3 shadow-2xs">
              <span className="font-admin-mono text-[10px] uppercase tracking-widest text-[#64748B] font-bold block">
                Session Control
              </span>
              <p className="text-xs text-[#334155] font-admin-sans leading-relaxed">
                Administrative session tokens are isolated strictly to this browser and clear completely upon logout.
              </p>
              <Link
                href="/admin/login"
                className="w-full inline-flex items-center justify-center gap-2 py-2 px-3 text-xs font-admin-mono font-bold uppercase tracking-wider bg-[#000000] hover:bg-[#18181B] text-white rounded-sm transition-all shadow-2xs"
              >
                <FaLock className="w-3 h-3 text-white" />
                <span>Authenticate Session</span>
              </Link>
            </div>
          </div>

          {/* Right Wide Column: Modular Policy Clauses */}
          <div className="flex-1 min-w-0 space-y-6">
            {/* Clause 1 */}
            <div className="bg-[#FFFFFF] border border-[#E2E8F0] p-6 sm:p-8 rounded-none sm:rounded-sm shadow-2xs space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-sm bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-center shrink-0">
                  <FaUserCheck className="w-4 h-4 text-[#7C3AED]" />
                </div>
                <div>
                  <span className="font-admin-mono text-[11px] font-bold text-[#7C3AED] uppercase tracking-wider block">
                    Section 01
                  </span>
                  <h2 className="text-lg font-bold font-admin-sans text-black">
                    Authentication Claims & Identity Processing
                  </h2>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-[#334155] font-admin-sans leading-relaxed">
                When authenticating via Google OAuth 2.0 PKCE, the application requests the minimal standard scopes: <code>openid</code>, <code>email</code>, and <code>profile</code>. We extract and verify the user&apos;s primary email address, full display name, and avatar image URL. This identity data is utilized exclusively for server-side whitelist verification, session context hydration, and displaying profile credentials in the administrative console. We never sell, track, or share administrator credentials with third parties.
              </p>
            </div>

            {/* Clause 2 */}
            <div className="bg-[#FFFFFF] border border-[#E2E8F0] p-6 sm:p-8 rounded-none sm:rounded-sm shadow-2xs space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-sm bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-center shrink-0">
                  <FaCookieBite className="w-4 h-4 text-[#7C3AED]" />
                </div>
                <div>
                  <span className="font-admin-mono text-[11px] font-bold text-[#7C3AED] uppercase tracking-wider block">
                    Section 02
                  </span>
                  <h2 className="text-lg font-bold font-admin-sans text-black">
                    Cookie Storage & Strict {ADMIN_SESSION_TTL_HOURS}-Hour Session Retention
                  </h2>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-[#334155] font-admin-sans leading-relaxed">
                The application relies on a single cookie (<code>admin_session</code>) to maintain authenticated state. This cookie operates under a strict Time-To-Live (TTL) of <strong>{ADMIN_SESSION_TTL_HOURS} Hours</strong> (18,000 seconds) and is secured with <code>SameSite=Lax</code> and HTTPS <code>Secure</code> flags in production. A short-lived cryptographic PKCE cookie (<code>oauth_code_verifier</code>) is maintained ephemerally for 300 seconds during authentication handshakes and is destroyed immediately upon callback verification.
              </p>
            </div>

            {/* Clause 3 */}
            <div className="bg-[#FFFFFF] border border-[#E2E8F0] p-6 sm:p-8 rounded-none sm:rounded-sm shadow-2xs space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-sm bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-center shrink-0">
                  <FaInbox className="w-4 h-4 text-[#7C3AED]" />
                </div>
                <div>
                  <span className="font-admin-mono text-[11px] font-bold text-[#7C3AED] uppercase tracking-wider block">
                    Section 03
                  </span>
                  <h2 className="text-lg font-bold font-admin-sans text-black">
                    Inquiries & Contact Communication Governance
                  </h2>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-[#334155] font-admin-sans leading-relaxed">
                Inbound client inquiries, recruiter messages, and contact form submissions are persisted in Google Cloud Firebase Realtime Database in the <code>asia-southeast1</code> region. Inbound submissions undergo automated profanity sanitization and rate-limiting validation prior to storage. Communication logs are accessed strictly through server-mediated repositories and are preserved for legitimate professional correspondence.
              </p>
            </div>

            {/* Clause 4 */}
            <div className="bg-[#FFFFFF] border border-[#E2E8F0] p-6 sm:p-8 rounded-none sm:rounded-sm shadow-2xs space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-sm bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-center shrink-0">
                  <FaRobot className="w-4 h-4 text-[#7C3AED]" />
                </div>
                <div>
                  <span className="font-admin-mono text-[11px] font-bold text-[#7C3AED] uppercase tracking-wider block">
                    Section 04
                  </span>
                  <h2 className="text-lg font-bold font-admin-sans text-black">
                    Bot Detection & Telemetry Privacy
                  </h2>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-[#334155] font-admin-sans leading-relaxed">
                Cloudflare Turnstile is utilized on public contact surfaces to prevent automated bot submissions and spam attacks. Cloudflare evaluates visitor challenges ephemerally with zero persistent tracking cookies. Vercel Web Analytics and Speed Insights collect aggregate, anonymized performance telemetry without collecting personally identifiable information (PII).
              </p>
            </div>

            {/* Clause 5 */}
            <div className="bg-[#FFFFFF] border border-[#E2E8F0] p-6 sm:p-8 rounded-none sm:rounded-sm shadow-2xs space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-sm bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-center shrink-0">
                  <FaShieldHalved className="w-4 h-4 text-[#7C3AED]" />
                </div>
                <div>
                  <span className="font-admin-mono text-[11px] font-bold text-[#7C3AED] uppercase tracking-wider block">
                    Section 05
                  </span>
                  <h2 className="text-lg font-bold font-admin-sans text-black">
                    Server Cache Policy & Zero Data Leakage
                  </h2>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-[#334155] font-admin-sans leading-relaxed">
                All administrative views and API routes are configured with <code>no-store</code> cache directives (<code>export const dynamic = &quot;force-dynamic&quot;</code>). Authenticated data is never stored in public intermediary caches or Next.js Data Cache layers, guaranteeing that private inquiries and session states are never leaked to unauthorized visitors.
              </p>
            </div>

            {/* Section 6 */}
            <div className="bg-[#FFFFFF] border border-[#E2E8F0] p-6 sm:p-8 rounded-none sm:rounded-sm shadow-2xs space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-sm bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-center shrink-0">
                  <FaLock className="w-4 h-4 text-[#7C3AED]" />
                </div>
                <div>
                  <span className="font-admin-mono text-[11px] font-bold text-[#7C3AED] uppercase tracking-wider block">
                    Section 06
                  </span>
                  <h2 className="text-lg font-bold font-admin-sans text-black">
                    Two-Factor OTP &amp; Security IP Telemetry Governance
                  </h2>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-[#334155] font-admin-sans leading-relaxed">
                One-Time Passcodes (OTP) generated during 2FA are stored exclusively in salted HMAC-SHA256 hashed representations; plaintext codes are never written to database logs. Device IP addresses and client user-agents collected during authentication are utilized strictly for real-time risk evaluation and security link generation via <code>security@gauravservices.eu.cc</code>. Unverified IP challenge documents are governed by an immutable 15-minute TTL and automatically purged upon consumption or expiration.
              </p>
            </div>

            {/* Section 7 */}
            <div className="bg-[#FFFFFF] border border-[#E2E8F0] p-6 sm:p-8 rounded-none sm:rounded-sm shadow-2xs space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-sm bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-center shrink-0">
                  <FaUserCheck className="w-4 h-4 text-[#7C3AED]" />
                </div>
                <div>
                  <span className="font-admin-mono text-[11px] font-bold text-[#7C3AED] uppercase tracking-wider block">
                    Section 07
                  </span>
                  <h2 className="text-lg font-bold font-admin-sans text-black">
                    Complete 5-Step Session Detach &amp; Zero Residual Storage
                  </h2>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-[#334155] font-admin-sans leading-relaxed">
                Initiating sign-out executes an atomic 5-step detachment sequence that invalidates the cryptographic <code>admin_session</code> cookie on the server via <code>DELETE /api/admin/auth/session</code>, clears client cookie stores, terminates Firebase authentication instances, and purges temporary browser session storage. Following detachment, no tokens, identities, or privileged state remain in client memory or browser caches.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* 3. Swiss Neutral Footer */}
      <AdminFooter text={`© ${new Date().getFullYear()} Gaurav Portfolio · Secure Admin Architecture`} />
    </div>
  );
}
