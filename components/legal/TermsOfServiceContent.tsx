"use client";

import React, { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  FaArrowLeft,
  FaScaleBalanced,
  FaUserSecret,
  FaCode,
  FaRobot,
  FaEnvelope,
  FaShieldHalved,
  FaEye,
  FaBullseye,
} from "react-icons/fa6";
import { IoChatbubbleEllipses } from "react-icons/io5";

function TermsContentInner() {
  const searchParams = useSearchParams();
  const focusParam = searchParams.get("focus");

  const [filterMode, setFilterMode] = useState<"all" | "contact" | "assistant">(
    focusParam === "assistant" ? "assistant" : focusParam === "contact" ? "contact" : "all"
  );
  const [highlightedSection, setHighlightedSection] = useState<string | null>(
    focusParam === "assistant"
      ? "assistant-terms"
      : focusParam === "contact"
      ? "anonymity"
      : null
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const hash = window.location.hash.replace("#", "");
    const targetId =
      hash ||
      (focusParam === "assistant"
        ? "assistant-terms"
        : focusParam === "contact"
        ? "anonymity"
        : null);

    if (targetId) {
      setHighlightedSection(targetId);

      const scrollToTarget = () => {
        const el = document.getElementById(targetId);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      };

      // Multi-stage timers ensure exact positioning across mobile and desktop layout hydrations
      const t1 = setTimeout(scrollToTarget, 80);
      const t2 = setTimeout(scrollToTarget, 300);
      const t3 = setTimeout(scrollToTarget, 650);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }
  }, [focusParam]);

  const handleTabSelect = (mode: "all" | "contact" | "assistant", targetId?: string) => {
    setFilterMode(mode);
    if (targetId) {
      setHighlightedSection(targetId);
      setTimeout(() => {
        const el = document.getElementById(targetId);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    }
  };

  return (
    <main className="min-h-screen bg-black-100 text-white relative overflow-hidden py-10 sm:py-16 px-5 sm:px-10 lg:px-16 xl:px-24 w-full">
      {/* Background Grid */}
      <div className="h-full w-full dark:bg-black-100 bg-white dark:bg-grid-white/[0.03] bg-grid-black-100/[0.2] absolute top-0 left-0 flex items-center justify-center pointer-events-none -z-10">
        <div className="absolute pointer-events-none inset-0 flex items-center justify-center dark:bg-black-100 bg-white [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]" />
      </div>

      <div className="w-full mx-auto max-w-4xl lg:max-w-none">
        {/* Top Controls: Back Link & Filter Mode Selector */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8 sm:mb-10">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-purple hover:text-white transition-colors duration-200 group"
          >
            <FaArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" />
            Back to Portfolio
          </Link>

          {/* Dynamic View Mode Tabs */}
          <div className="inline-flex items-center bg-white/[0.04] border border-white/[0.1] rounded-xl p-1 text-xs gap-1">
            <button
              type="button"
              onClick={() => handleTabSelect("all")}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                filterMode === "all"
                  ? "bg-purple text-black font-semibold shadow-sm"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              <FaEye className="w-3 h-3" />
              <span>Full Terms</span>
            </button>
            <button
              type="button"
              onClick={() => handleTabSelect("contact", "anonymity")}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                filterMode === "contact"
                  ? "bg-[#7C3AED] text-white font-semibold shadow-sm shadow-[#7C3AED]/40"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              <FaBullseye className="w-3 h-3 text-[#CBACF9]" />
              <span>Contact Form Only</span>
            </button>
            <button
              type="button"
              onClick={() => handleTabSelect("assistant", "assistant-terms")}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                filterMode === "assistant"
                  ? "bg-[#7C3AED] text-white font-semibold shadow-sm shadow-[#7C3AED]/40"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              <IoChatbubbleEllipses className="w-3 h-3 text-[#CBACF9]" />
              <span>Personal Assistant &amp; AI Safety (Learn More)</span>
            </button>
          </div>
        </div>

        {/* Header */}
        <header className="mb-10 sm:mb-12">
          <p className="uppercase tracking-widest text-xs text-purple font-medium mb-3">
            Legal &amp; Operating Standards
          </p>
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-white mb-4">
            Terms of Service
          </h1>
          <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-400 font-mono">
            <span>Original Effective: January 1, 2026</span>
            <span>•</span>
            <span className="text-purple font-semibold">Last Updated: August 29, 2026</span>
            <span>•</span>
            <span className="text-emerald-400 font-semibold">Jurisdiction: Standard Global</span>
          </div>

          {filterMode === "contact" && (
            <div className="mt-4 p-3 rounded-xl bg-[#7C3AED]/15 border border-[#7C3AED]/30 text-xs text-neutral-200 flex items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-center gap-2">
                <FaBullseye className="w-4 h-4 text-[#CBACF9] shrink-0" />
                <span>
                  Filtering active: Spotlighting terms governing Contact Form submissions, Confidentiality Rights, and Communication Standards.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setFilterMode("all")}
                className="text-purple hover:text-white underline text-xs font-semibold whitespace-nowrap cursor-pointer"
              >
                View full terms
              </button>
            </div>
          )}

          {filterMode === "assistant" && (
            <div className="mt-4 p-3 rounded-xl bg-[#7C3AED]/15 border border-[#7C3AED]/30 text-xs text-neutral-200 flex items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-center gap-2">
                <IoChatbubbleEllipses className="w-4 h-4 text-[#CBACF9] shrink-0" />
                <span>
                  Filtering active: Spotlighting terms of service, AI accuracy disclaimer, and acceptable use standards for Gaurav Personal Assistant (Beta).
                </span>
              </div>
              <button
                type="button"
                onClick={() => setFilterMode("all")}
                className="text-purple hover:text-white underline text-xs font-semibold whitespace-nowrap cursor-pointer"
              >
                View full terms
              </button>
            </div>
          )}
        </header>

        {/* Content Box */}
        <div className="w-full rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-xl p-6 sm:p-10 lg:p-12 space-y-8 text-neutral-300 leading-relaxed text-sm sm:text-base">
          {/* Section 1: Acceptance */}
          {filterMode === "all" && (
            <section id="acceptance" className="space-y-3 scroll-mt-24 sm:scroll-mt-32">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2.5">
                <FaScaleBalanced className="w-4 h-4 text-purple" />
                <span>1. Acceptance of Terms &amp; Accessibility Commitment</span>
              </h2>
              <p>
                By accessing and interacting with <span className="text-purple font-semibold">Gaurav Portfolio</span>,
                you acknowledge and agree to be bound by these Terms of Service. This platform commits to a strict 
                <strong className="text-white"> Mobile-First 10/10 Production Standard</strong>, ensuring zero horizontal overflow, 
                fluid typography, touch-ergonomic 44px hit targets, accessible reduced-motion fallbacks, and single-view contact workflows 
                across all modern smartphones, tablets, and desktop workstations. If you do not agree with any provision, you may discontinue viewing or utilizing this platform.
              </p>
            </section>
          )}

          {/* Section 2: Anonymity & Confidentiality (Spotlighted) */}
          <section
            id="anonymity"
            className={`space-y-3 p-4 sm:p-6 rounded-xl transition-all duration-300 scroll-mt-24 sm:scroll-mt-32 ${
              highlightedSection === "anonymity" || filterMode === "contact"
                ? "bg-[#7C3AED]/10 border border-[#7C3AED]/50 shadow-[0_0_30px_rgba(124,58,237,0.15)] ring-1 ring-[#7C3AED]/50"
                : "border border-transparent"
            }`}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2.5">
                <FaUserSecret className="w-4 h-4 text-purple" />
                <span>2. Right to Confidential &amp; Anonymous Communication</span>
              </h2>
              {(highlightedSection === "anonymity" || filterMode === "contact") && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#7C3AED]/30 text-[#CBACF9] border border-[#7C3AED]/50">
                  Contact Form Term
                </span>
              )}
            </div>
            <p>
              Users and prospective partners are welcome to initiate contact anonymously:
            </p>
            <ul className="list-disc list-inside space-y-2 pl-2">
              <li>
                <strong className="text-white">Confidential Inquiries:</strong> Submitting an inquiry with the default &ldquo;Anonymous / Confidential&rdquo; role is fully permitted and legally respected as preliminary communication.
              </li>
              <li>
                <strong className="text-white">Non-Disclosure Friendly:</strong> Mutual non-disclosure agreements (NDAs) can be executed upon request prior to exchanging proprietary project details.
              </li>
            </ul>
          </section>

          {/* Section 3: Intellectual Property */}
          {filterMode === "all" && (
            <section id="ip" className="space-y-3 scroll-mt-24 sm:scroll-mt-32">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2.5">
                <FaCode className="w-4 h-4 text-purple" />
                <span>3. Intellectual Property &amp; Engineering Architecture</span>
              </h2>
              <p>
                All original visual design systems, dark luxury glassmorphic layouts, Three.js 3D Globe implementations, and full-stack software architectures showcased on this platform are the intellectual property of <strong className="text-white">Gaurav Patil</strong>. Client deliverables and bespoke software engineering codebases are transferred strictly per individual written engagement agreements upon milestone completion.
              </p>
            </section>
          )}

          {/* Section 4: Automated Abuse Mitigation */}
          <section
            id="abuse-mitigation"
            className={`space-y-3 p-4 sm:p-6 rounded-xl transition-all duration-300 scroll-mt-24 sm:scroll-mt-32 ${
              highlightedSection === "abuse-mitigation" || filterMode === "contact"
                ? "bg-white/[0.04] border border-white/[0.15]"
                : "border border-transparent"
            }`}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2.5">
                <FaRobot className="w-4 h-4 text-purple" />
                <span>4. Automated Abuse Mitigation &amp; Cloudflare Verification</span>
              </h2>
              {filterMode === "contact" && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-white/[0.08] text-neutral-300 border border-white/[0.15]">
                  Security Protocol
                </span>
              )}
            </div>
            <p>
              To maintain high uptime and system integrity, public mutation endpoints (such as the contact form) are protected by <strong className="text-white">Cloudflare Turnstile</strong>. Automated scraping, malicious payload injection, bot spam, and denial-of-service attempts are strictly prohibited and actively mitigated.
            </p>
          </section>

          {/* Section 5: Transactional Emails */}
          <section
            id="email-standards"
            className={`space-y-3 p-4 sm:p-6 rounded-xl transition-all duration-300 scroll-mt-24 sm:scroll-mt-32 ${
              highlightedSection === "email-standards" || filterMode === "contact"
                ? "bg-white/[0.04] border border-white/[0.15]"
                : "border border-transparent"
            }`}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2.5">
                <FaEnvelope className="w-4 h-4 text-purple" />
                <span>5. Transactional Communication Standards</span>
              </h2>
              {filterMode === "contact" && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-white/[0.08] text-neutral-300 border border-white/[0.15]">
                  Communication Policy
                </span>
              )}
            </div>
            <p>
              All transactional emails, contact receipts, and security alerts are dispatched from the authenticated server domain <span className="text-purple font-mono">gauravpatil.online</span> (with legacy domain <span className="text-purple font-mono">gauravservices.eu.cc</span> preserved) via Brevo API. Official sender identities include <code className="text-purple font-mono">hello@gauravpatil.online</code> (inquiries and auto-replies), <code className="text-purple font-mono">security@gauravpatil.online</code> (authentication alerts), and <code className="text-purple font-mono">no-reply@gauravpatil.online</code> (system OTPs). We maintain a strict zero-spam guarantee: submitted contact emails are never enrolled in marketing sequences.
            </p>
          </section>

          {/* Section: Personal Assistant Terms (Spotlighted for Assistant / Learn More) */}
          <section
            id="assistant-terms"
            className={`space-y-6 p-4 sm:p-7 rounded-2xl transition-all duration-300 scroll-mt-24 sm:scroll-mt-32 ${
              highlightedSection === "assistant-terms" || filterMode === "assistant"
                ? "bg-[#7C3AED]/10 border border-[#7C3AED]/50 shadow-[0_0_35px_rgba(124,58,237,0.18)] ring-1 ring-[#7C3AED]/50"
                : "border border-transparent"
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
              <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2.5">
                <IoChatbubbleEllipses className="w-5 h-5 text-purple" />
                <span>6. Personal Assistant (Beta) Operational Terms &amp; AI Disclaimer</span>
              </h2>
              {(highlightedSection === "assistant-terms" || filterMode === "assistant") && (
                <span className="px-3 py-1 rounded-full text-[10.5px] font-mono font-bold bg-[#7C3AED]/30 text-[#CBACF9] border border-[#7C3AED]/50">
                  Assistant Deep-Dive &amp; Learn More
                </span>
              )}
            </div>

            {/* Subsection 1: Purpose & Interactive Capabilities */}
            <div className="space-y-3 bg-white/[0.02] p-4 sm:p-5 rounded-xl border border-white/[0.06]">
              <h3 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple" />
                Purpose &amp; Scope of Gaurav Assistant &amp; Live Chat
              </h3>
              <p className="text-sm text-neutral-300 leading-relaxed">
                The Personal Assistant and Live Chat system are engineered to provide an interactive, personal communication channel with Gaurav Patil. It provides direct, automated insights into engineering benchmarks, architecture patterns, and project deliverables, while facilitating immediate 1-to-1 live communication.
              </p>
            </div>

            {/* Subsection 2: Live Chat Real-Time & Fallback Delivery Architecture */}
            <div className="space-y-3 bg-white/[0.02] p-4 sm:p-5 rounded-xl border border-white/[0.06]">
              <h3 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                Live Chat Real-Time Dispatch &amp; Notification Architecture
              </h3>
              <p className="text-sm text-neutral-300 leading-relaxed">
                When you initiate a conversation through <strong className="text-white">Live Chat with Gaurav</strong>, our backend operates a hybrid real-time communication pipeline:
              </p>
              <ul className="list-disc list-inside space-y-2 pl-2 text-sm text-neutral-300">
                <li>
                  <strong className="text-white">Active Online Streaming:</strong> If Gaurav is actively online and connected to the session, incoming messages arrive instantly in real-time.
                </li>
                <li>
                  <strong className="text-white">Automated Inbox Dispatch:</strong> If Gaurav is away or offline, our server instantaneously generates and dispatches an automated lead notification directly to Gaurav&apos;s private inbox containing your verified sender details and full message transcript with 1-click direct response routing.
                </li>
                <li>
                  <strong className="text-white">Single-Use 6-Digit Email Verification:</strong> To eliminate spam and protect system resources, access to Live Chat requires a single-use 6-digit OTP code dispatched exclusively from <code className="text-purple font-mono">no-reply@gauravpatil.online</code>. Verification codes expire in 5 minutes.
                </li>
                <li>
                  <strong className="text-white">4-Hour Active Session Token:</strong> Once verified, an encrypted session remains active for 4 hours. You may close and reopen the chat window anytime within this window without re-authenticating. Visitors may explicitly terminate their session at any time using the <strong className="text-white">Sign out</strong> button in the top-right header.
                </li>
              </ul>
            </div>

            {/* Subsection 3: Custom Mail Domain Support */}
            <div className="space-y-3 bg-white/[0.02] p-4 sm:p-5 rounded-xl border border-white/[0.06]">
              <h3 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple" />
                Official Verified Senders &amp; Support Pipeline
              </h3>
              <p className="text-sm text-neutral-300 leading-relaxed">
                All communications, support tickets, and contact verification flows originate exclusively from the authenticated domain <span className="text-purple font-mono font-semibold">gauravpatil.online</span> (with legacy domain <span className="text-purple font-mono font-semibold">gauravservices.eu.cc</span> supported for backward compatibility):
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="p-3 rounded-lg bg-black/40 border border-white/[0.08] space-y-1">
                  <span className="text-xs sm:text-sm text-purple font-mono font-bold">hello@gauravpatil.online</span>
                  <p className="text-xs text-neutral-400">General portfolio inquiries, recruiter outreach, and direct developer contact.</p>
                </div>
                <div className="p-3 rounded-lg bg-black/40 border border-white/[0.08] space-y-1">
                  <span className="text-xs sm:text-sm text-purple font-mono font-bold">help@gauravpatil.online</span>
                  <p className="text-xs text-neutral-400">Assistant technical support, bug reports, and portfolio navigation guidance.</p>
                </div>
                <div className="p-3 rounded-lg bg-black/40 border border-white/[0.08] space-y-1">
                  <span className="text-xs sm:text-sm text-purple font-mono font-bold">security@gauravpatil.online</span>
                  <p className="text-xs text-neutral-400">Security notifications, 2FA OTP codes, and vulnerability disclosure reports.</p>
                </div>
                <div className="p-3 rounded-lg bg-black/40 border border-white/[0.08] space-y-1">
                  <span className="text-xs sm:text-sm text-purple font-mono font-bold">no-reply@gauravpatil.online</span>
                  <p className="text-xs text-neutral-400">Automated Live Chat OTP passcodes, system receipts, and non-interactive alerts.</p>
                </div>
              </div>
            </div>

            {/* Subsection 4: AI Disclaimer & Acceptable Use */}
            <div className="space-y-3 bg-white/[0.02] p-4 sm:p-5 rounded-xl border border-white/[0.06]">
              <h3 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple" />
                AI Accuracy Disclaimer &amp; Acceptable Use
              </h3>
              <ul className="list-disc list-inside space-y-2 pl-2 text-sm text-neutral-300">
                <li>
                  <strong className="text-white">Generative Limitations:</strong> While tuned for accuracy, automated assistant responses may occasionally produce incomplete or summarized statements. Official portfolio source code and direct communication with Gaurav remain authoritative benchmarks.
                </li>
                <li>
                  <strong className="text-white">Acceptable Use:</strong> Visitors agree not to attempt prompt-injections, reverse-engineer underlying system prompts, extract internal configuration, or send abusive payloads.
                </li>
                <li>
                  <strong className="text-white">Continuous Beta Evolution:</strong> The assistant is under active development and may undergo live feature updates or brief maintenance windows without notice.
                </li>
              </ul>
            </div>
          </section>

          {/* Section 7: Administrative Subsystem Governance */}
          {filterMode === "all" && (
            <section id="admin-governance" className="space-y-3 scroll-mt-24 sm:scroll-mt-32">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2.5">
                <FaShieldHalved className="w-4 h-4 text-purple" />
                <span>7. Administrative Subsystem Isolation &amp; 2FA Governance</span>
              </h2>
              <p>
                The administrative panel (<code className="text-purple font-mono">/admin/*</code>) is an isolated workspace strictly restricted to authorized Superadmins. Administrative access requires Google OAuth 2.0 PKCE, salted HMAC-SHA256 Two-Factor Authentication (OTP), and zero-lockout IP security verification. Administrative access and data operations are governed separately under the <Link href="/admin/terms" className="text-purple hover:underline font-semibold">Administrator Terms of Service</Link>.
              </p>
            </section>
          )}

          {/* Section 8: Limitation of Liability */}
          <section id="liability" className="space-y-3 scroll-mt-24 sm:scroll-mt-32">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2.5">
              <FaScaleBalanced className="w-4 h-4 text-purple" />
              <span>8. Limitation of Liability &amp; Disclaimers</span>
            </h2>
            <p>
              This website and its demonstrative artifacts are provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis. In no event shall Gaurav Patil be liable for indirect, incidental, or consequential damages resulting from the use of this website.
            </p>
          </section>

          {/* Section 8: Legal Contact */}
          <section id="legal-contact" className="space-y-3 scroll-mt-24 sm:scroll-mt-32">
            <h2 className="text-xl font-semibold text-white">
              8. Inquiries &amp; Legal Notices
            </h2>
            <p>
              For legal inquiries, contract proposals, or engagement agreements:
            </p>
            <p className="text-purple font-medium">
              Email:{" "}
              <a
                href="mailto:hello@gauravpatil.online"
                className="hover:underline"
              >
                hello@gauravpatil.online
              </a>
            </p>
          </section>
        </div>

        {/* Footer Note */}
        <div className="mt-12 text-center text-xs text-white-200">
          <p>© {new Date().getFullYear()} Gaurav Portfolio. All rights reserved.</p>
        </div>
      </div>
    </main>
  );
}

export function TermsOfServiceContent() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black-100 text-white flex items-center justify-center">Loading Terms of Service...</div>}>
      <TermsContentInner />
    </Suspense>
  );
}
