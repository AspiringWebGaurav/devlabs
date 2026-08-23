import React from "react";
import Link from "next/link";
import { FaShieldHalved, FaArrowLeft } from "react-icons/fa6";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Privacy Policy | Gaurav Portfolio",
  description: "Administrator Privacy Policy and Data Governance.",
  robots: { index: false, follow: false },
};

export default function AdminPrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#FFFFFF] text-black relative overflow-hidden">
      {/* 1. Edge-to-Edge Top Navigation Bar with Exact Shiro Proportions */}
      <header className="w-full bg-[#FFFFFF] px-6 sm:px-12 py-5 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="font-admin-sans text-[22px] sm:text-[26px] font-extrabold tracking-tight text-black hover:opacity-80 transition-opacity"
          >
            admin panel<span className="text-[#7C3AED]">.</span>
          </Link>
          <span className="text-[#94A3B8] font-admin-mono text-sm">/</span>
          <span className="font-admin-mono text-xs uppercase tracking-widest text-[#64748B] font-semibold">
            Privacy Policy
          </span>
        </div>

        <Link
          href="/admin/login"
          className="inline-flex items-center gap-1.5 text-xs font-admin-mono text-[#64748B] hover:text-black transition-colors"
        >
          <FaArrowLeft className="w-3 h-3 text-[#7C3AED]" />
          <span>Back to Login</span>
        </Link>

        {/* Exact Shiro Horizontal Dashed Divider (4px dash, 4px gap) */}
        <div className="absolute bottom-0 inset-x-0 h-px pointer-events-none">
          <svg className="w-full h-px text-[#CBD5E1] overflow-visible">
            <line x1="0" y1="0" x2="100%" y2="0" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" />
          </svg>
        </div>
      </header>

      {/* 2. Architectural Dashed Grid Canvas & Reading Container */}
      <main className="flex-1 w-full bg-[#FFFFFF] flex flex-col relative z-10">
        {/* Background Dashed Grid Columns (Exact Shiro Vector Dimensions: 4px dash, 4px gap) */}
        <div className="absolute inset-0 pointer-events-none flex justify-center">
          <div className="w-full max-w-5xl h-full relative">
            <div className="absolute left-0 inset-y-0 w-px">
              <svg className="w-px h-full text-[#CBD5E1] overflow-visible">
                <line x1="0" y1="0" x2="0" y2="100%" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" />
              </svg>
            </div>
            <div className="absolute right-0 inset-y-0 w-px">
              <svg className="w-px h-full text-[#CBD5E1] overflow-visible">
                <line x1="0" y1="0" x2="0" y2="100%" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" />
              </svg>
            </div>
          </div>
        </div>

        <div className="w-full max-w-5xl mx-auto px-6 sm:px-12 py-10 sm:py-14 space-y-10 relative z-10">
          {/* Header Title Section */}
          <div className="space-y-3 border-b border-[#E2E8F0] pb-8">
            <div className="flex items-center gap-2">
              <span className="font-admin-mono text-[10px] tracking-[0.25em] text-[#7C3AED] uppercase font-bold">
                Security & Compliance
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold font-admin-sans text-black tracking-tight">
              Administrator Privacy Policy
            </h1>
            <p className="text-sm text-[#475569] font-admin-sans max-w-2xl leading-relaxed">
              Data governance, session encryption, and authentication handling practices within the Gaurav Portfolio administration console.
            </p>
            <div className="flex flex-wrap items-center gap-4 pt-2 text-xs font-admin-mono text-[#94A3B8]">
              <span>Last Updated: August 2026</span>
              <span>·</span>
              <span>Version: 0.0.1</span>
              <span>·</span>
              <span className="text-[#10B981] font-semibold">Status: Active</span>
            </div>
          </div>

          {/* Section Blocks */}
          <div className="space-y-6">
            {/* Section 1 */}
            <div className="bg-[#FFFFFF] border border-[#E2E8F0] p-6 sm:p-8 rounded-none sm:rounded-[2px] shadow-xs space-y-3">
              <div className="flex items-center gap-2">
                <span className="font-admin-mono text-xs font-bold text-[#7C3AED]">01.</span>
                <h2 className="text-base font-bold font-admin-sans text-black">
                  Authentication & Profile Information
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-[#475569] font-admin-sans leading-relaxed">
                When authenticating via Google OAuth 2.0, the console receives identity claims including the verified primary email address, profile display name, and avatar image URL. This information is strictly used for access control validation and session state rendering.
              </p>
            </div>

            {/* Section 2 */}
            <div className="bg-[#FFFFFF] border border-[#E2E8F0] p-6 sm:p-8 rounded-none sm:rounded-[2px] shadow-xs space-y-3">
              <div className="flex items-center gap-2">
                <span className="font-admin-mono text-xs font-bold text-[#7C3AED]">02.</span>
                <h2 className="text-base font-bold font-admin-sans text-black">
                  Cookie Storage & Local Session Retention
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-[#475569] font-admin-sans leading-relaxed">
                The application utilizes a single session cookie (<code>admin_session</code>) to maintain administrative state across dashboard routes. The cookie is configured with SameSite protection and automatically expires after 7 days.
              </p>
            </div>

            {/* Section 3 */}
            <div className="bg-[#FFFFFF] border border-[#E2E8F0] p-6 sm:p-8 rounded-none sm:rounded-[2px] shadow-xs space-y-3">
              <div className="flex items-center gap-2">
                <span className="font-admin-mono text-xs font-bold text-[#7C3AED]">03.</span>
                <h2 className="text-base font-bold font-admin-sans text-black">
                  Inquiries & Client Communication Data
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-[#475569] font-admin-sans leading-relaxed">
                Inbound contact requests are persisted in Firebase Realtime Database in the <code>asia-southeast1</code> region. Inbound messages undergo automated profanity sanitization prior to storage and relay.
              </p>
            </div>

            {/* Section 4 */}
            <div className="bg-[#FFFFFF] border border-[#E2E8F0] p-6 sm:p-8 rounded-none sm:rounded-[2px] shadow-xs space-y-3">
              <div className="flex items-center gap-2">
                <span className="font-admin-mono text-xs font-bold text-[#7C3AED]">04.</span>
                <h2 className="text-base font-bold font-admin-sans text-black">
                  Bot Detection & Security Telemetry
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-[#475569] font-admin-sans leading-relaxed">
                Cloudflare Turnstile is employed on visitor interaction surfaces to prevent spam and automated bot submissions. Verification tokens are validated ephemerally with zero persistent cross-site tracking.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* 3. Centered Footer with Exact Shiro Dashed Divider */}
      <footer className="w-full bg-[#FFFFFF] py-5 px-6 sm:px-12 text-center font-admin-sans flex items-center justify-center gap-2 z-20 relative">
        <div className="absolute top-0 inset-x-0 h-px pointer-events-none">
          <svg className="w-full h-px text-[#CBD5E1] overflow-visible">
            <line x1="0" y1="0" x2="100%" y2="0" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" />
          </svg>
        </div>
        <FaShieldHalved className="w-3.5 h-3.5 text-[#7C3AED]" />
        <span className="font-medium text-[#64748B] tracking-tight text-[11px]">
          © {new Date().getFullYear()} Gaurav Portfolio · Secure Admin Architecture
        </span>
      </footer>
    </div>
  );
}
