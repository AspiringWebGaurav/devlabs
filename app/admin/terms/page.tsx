import React from "react";
import Link from "next/link";
import { FaArrowLeft, FaShieldHalved, FaLock, FaKey, FaDatabase, FaServer, FaUserShield, FaClock } from "react-icons/fa6";
import { AdminFooter } from "@/components/admin";
import { ADMIN_SESSION_TTL_HOURS } from "@/lib/admin/constants";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Terms of Service | Gaurav Portfolio",
  description: "Administrator Terms of Service and Access Governance.",
  robots: { index: false, follow: false },
};

export default function AdminTermsPage() {
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
            Terms of Service
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
              System Governance & Access Standards
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-admin-sans text-black tracking-tight">
            Administrator Terms of Service
          </h1>
          <p className="text-sm sm:text-base text-[#475569] font-admin-sans max-w-4xl leading-relaxed">
            These terms establish the mandatory security protocols, session lifetimes, operational invariants, and data integrity standards required for all administrative access across the Gaurav Portfolio platform.
          </p>
          <div className="flex flex-wrap items-center gap-4 pt-3 text-xs font-admin-mono text-[#94A3B8] border-t border-[#F1F5F9]">
            <span>Last Updated: August 2026</span>
            <span>·</span>
            <span>Version: 1.0.0 (Phase 0 Standard)</span>
            <span>·</span>
            <span className="text-[#10B981] font-semibold">Security State: Enforced</span>
          </div>
        </div>

        {/* 2-Column Responsive Layout: Left Sticky Meta & Right Expansive Clauses */}
        <div className="w-full flex flex-col lg:flex-row gap-8 items-start">
          {/* Left Sticky Meta Column */}
          <div className="w-full lg:w-80 shrink-0 space-y-5 lg:sticky lg:top-24">
            {/* Quick Specs Card */}
            <div className="bg-[#FFFFFF] border border-[#E2E8F0] p-5 sm:p-6 rounded-none sm:rounded-sm shadow-2xs space-y-4">
              <h3 className="font-admin-sans font-bold text-sm text-black uppercase tracking-wider flex items-center gap-2">
                <FaShieldHalved className="w-3.5 h-3.5 text-[#7C3AED]" />
                <span>Security Metadata</span>
              </h3>
              <div className="space-y-3 text-xs font-admin-mono border-t border-[#F1F5F9] pt-3">
                <div className="flex items-center justify-between text-[#64748B]">
                  <span>Auth Protocol</span>
                  <span className="font-semibold text-black">OAuth 2.0 PKCE</span>
                </div>
                <div className="flex items-center justify-between text-[#64748B]">
                  <span>Session TTL</span>
                  <span className="font-semibold text-black">{ADMIN_SESSION_TTL_HOURS} Hours Strict</span>
                </div>
                <div className="flex items-center justify-between text-[#64748B]">
                  <span>Data Pipeline</span>
                  <span className="font-semibold text-black">4-Tier DAL</span>
                </div>
                <div className="flex items-center justify-between text-[#64748B]">
                  <span>Storage Policy</span>
                  <span className="font-semibold text-black">Zero Orphan</span>
                </div>
                <div className="flex items-center justify-between text-[#64748B]">
                  <span>Layout Stability</span>
                  <span className="font-semibold text-[#10B981]">CLS = 0 (Fixed)</span>
                </div>
              </div>
            </div>

            {/* Direct Login Shortcut Card */}
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] p-5 rounded-none sm:rounded-sm space-y-3 shadow-2xs">
              <span className="font-admin-mono text-[10px] uppercase tracking-widest text-[#64748B] font-bold block">
                Authorized Identity
              </span>
              <p className="text-xs text-[#334155] font-admin-sans leading-relaxed">
                Access is restricted strictly to designated superadmin accounts. Unrecognized credentials will trigger an immediate access denial.
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
                  <FaUserShield className="w-4 h-4 text-[#7C3AED]" />
                </div>
                <div>
                  <span className="font-admin-mono text-[11px] font-bold text-[#7C3AED] uppercase tracking-wider block">
                    Article 01
                  </span>
                  <h2 className="text-lg font-bold font-admin-sans text-black">
                    Authorized Superadmin Identity & In-Tab Authentication
                  </h2>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-[#334155] font-admin-sans leading-relaxed">
                Access to the administration console is exclusively restricted to designated superadmin accounts verified through Google OAuth 2.0 PKCE (RFC 7636). Popups, secondary windows, and unsanctioned authentication proxies are prohibited. Unrecognized accounts are intercepted at the callback endpoint, rejected with an Access Denied exception, and logged for telemetry analysis.
              </p>
            </div>

            {/* Clause 2 */}
            <div className="bg-[#FFFFFF] border border-[#E2E8F0] p-6 sm:p-8 rounded-none sm:rounded-sm shadow-2xs space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-sm bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-center shrink-0">
                  <FaClock className="w-4 h-4 text-[#7C3AED]" />
                </div>
                <div>
                  <span className="font-admin-mono text-[11px] font-bold text-[#7C3AED] uppercase tracking-wider block">
                    Article 02
                  </span>
                  <h2 className="text-lg font-bold font-admin-sans text-black">
                    Strict {ADMIN_SESSION_TTL_HOURS}-Hour Session Expiration & Cryptographic Detach
                  </h2>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-[#334155] font-admin-sans leading-relaxed">
                Every administrative session operates under a strict, non-negotiable Time-To-Live (TTL) of exactly <strong>{ADMIN_SESSION_TTL_HOURS} Hours</strong> (18,000 seconds). Upon reaching expiration, Edge Middleware immediately terminates access, invalidates session cookies, and redirects the browser to the login gateway. Signing out triggers a full 5-step clean detach (server cookie invalidation, client token clear, Firebase SDK detachment, and session storage purge).
              </p>
            </div>

            {/* Clause 3 */}
            <div className="bg-[#FFFFFF] border border-[#E2E8F0] p-6 sm:p-8 rounded-none sm:rounded-sm shadow-2xs space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-sm bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-center shrink-0">
                  <FaDatabase className="w-4 h-4 text-[#7C3AED]" />
                </div>
                <div>
                  <span className="font-admin-mono text-[11px] font-bold text-[#7C3AED] uppercase tracking-wider block">
                    Article 03
                  </span>
                  <h2 className="text-lg font-bold font-admin-sans text-black">
                    Database Constitution & Zero Stale Data Invariant
                  </h2>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-[#334155] font-admin-sans leading-relaxed">
                The database is treated as a financial ledger. Every mutation (Create, Update, Delete) must adhere to the 4-Tier Data Pipeline (<code>UI → Repository → DataSource → Firebase</code>). Direct database calls inside UI components are forbidden. All database operations enforce zero stale documents, zero duplicate records, and zero broken references across all microservices.
              </p>
            </div>

            {/* Clause 4 */}
            <div className="bg-[#FFFFFF] border border-[#E2E8F0] p-6 sm:p-8 rounded-none sm:rounded-sm shadow-2xs space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-sm bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-center shrink-0">
                  <FaKey className="w-4 h-4 text-[#7C3AED]" />
                </div>
                <div>
                  <span className="font-admin-mono text-[11px] font-bold text-[#7C3AED] uppercase tracking-wider block">
                    Article 04
                  </span>
                  <h2 className="text-lg font-bold font-admin-sans text-black">
                    Storage Integrity & Zero Orphan Policy
                  </h2>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-[#334155] font-admin-sans leading-relaxed">
                All media assets, project thumbnails, and attachments stored in Firebase Storage must have a verified, unambiguous document owner. Anonymous uploads, unused files, and blind deletions are permanently forbidden. The mandatory delete pipeline (<code>Dependency Audit → Ownership Verification → Atomic Removal → Integrity Verification</code>) must precede all file removals.
              </p>
            </div>

            {/* Clause 5 */}
            <div className="bg-[#FFFFFF] border border-[#E2E8F0] p-6 sm:p-8 rounded-none sm:rounded-sm shadow-2xs space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-sm bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-center shrink-0">
                  <FaServer className="w-4 h-4 text-[#7C3AED]" />
                </div>
                <div>
                  <span className="font-admin-mono text-[11px] font-bold text-[#7C3AED] uppercase tracking-wider block">
                    Article 05
                  </span>
                  <h2 className="text-lg font-bold font-admin-sans text-black">
                    Cost Protection & Query Optimization
                  </h2>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-[#334155] font-admin-sans leading-relaxed">
                To ensure high performance and cost efficiency, all queries are executed server-first using cursor-based pagination (<code>.startAfter()</code> / <code>.limit()</code>) with explicit field selection (<code>.select()</code>). Snapshot subscriptions must maintain single instances and cleanly unbind upon unmount (<code>unsubscribe()</code>). Unnecessary reads and repeated listeners are strictly prevented.
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
