"use client";

import React, { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  FaArrowLeft,
  FaShieldHalved,
  FaUserSecret,
  FaLock,
  FaEnvelope,
  FaRobot,
  FaEye,
  FaBullseye,
  FaWhatsapp,
  FaDownload,
} from "react-icons/fa6";
import { IoChatbubbleEllipses } from "react-icons/io5";
import type { LegalDocument } from "@/types/legal";
import { MarkdownLegalRenderer } from "./MarkdownLegalRenderer";

export interface PrivacyPolicyContentProps {
  initialData?: Omit<LegalDocument, "draft">;
}

function getPrivacySectionIcon(id: string) {
  switch (id) {
    case "anonymity":
      return <FaUserSecret className="w-4 h-4 text-purple" />;
    case "turnstile":
      return <FaRobot className="w-4 h-4 text-purple" />;
    case "brevo":
      return <FaEnvelope className="w-4 h-4 text-purple" />;
    case "data-rights":
      return <FaLock className="w-4 h-4 text-purple" />;
    case "assistant-privacy":
      return <IoChatbubbleEllipses className="w-5 h-5 text-purple" />;
    case "whatsapp-data-export":
      return <FaWhatsapp className="w-5 h-5 text-[#25D366]" />;
    case "admin-privacy":
      return <FaShieldHalved className="w-4 h-4 text-purple" />;
    default:
      return <FaShieldHalved className="w-4 h-4 text-purple" />;
  }
}

function PrivacyContentInner({ initialData }: PrivacyPolicyContentProps) {
  const searchParams = useSearchParams();
  const focusParam = searchParams.get("focus");

  const [filterMode, setFilterMode] = useState<"all" | "contact" | "assistant" | "whatsapp">(
    focusParam === "whatsapp"
      ? "whatsapp"
      : focusParam === "assistant"
      ? "assistant"
      : focusParam === "contact"
      ? "contact"
      : "all"
  );
  const [highlightedSection, setHighlightedSection] = useState<string | null>(
    focusParam === "whatsapp"
      ? "whatsapp-data-export"
      : focusParam === "assistant"
      ? "assistant-privacy"
      : focusParam === "contact"
      ? "anonymity"
      : null
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const hash = window.location.hash.replace("#", "");
    const targetId =
      hash ||
      (focusParam === "whatsapp"
        ? "whatsapp-data-export"
        : focusParam === "assistant"
        ? "assistant-privacy"
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

  const handleTabSelect = (mode: "all" | "contact" | "assistant" | "whatsapp", targetId?: string) => {
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
              <span>Full Policy</span>
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
              onClick={() => handleTabSelect("assistant", "assistant-privacy")}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                filterMode === "assistant"
                  ? "bg-[#7C3AED] text-white font-semibold shadow-sm shadow-[#7C3AED]/40"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              <IoChatbubbleEllipses className="w-3 h-3 text-[#CBACF9]" />
              <span>Personal Assistant (AI)</span>
            </button>
            <button
              type="button"
              onClick={() => handleTabSelect("whatsapp", "whatsapp-data-export")}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                filterMode === "whatsapp"
                  ? "bg-[#25D366] text-black font-semibold shadow-sm shadow-[#25D366]/40"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              <FaWhatsapp className={`w-3.5 h-3.5 ${filterMode === "whatsapp" ? "text-black" : "text-[#25D366]"}`} />
              <span>WhatsApp Data Export</span>
            </button>
          </div>
        </div>

        {/* Header */}
        <header className="mb-10 sm:mb-12">
          <p className="uppercase tracking-widest text-xs text-purple font-medium mb-3">
            Data Governance &amp; Privacy
          </p>
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-white mb-4">
            Privacy Policy
          </h1>
          <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-400 font-mono">
            <span>Version: {initialData?.publishedVersion || "0.0.1"}</span>
            <span>•</span>
            <span>Original Effective: {initialData?.effectiveDate || "January 1, 2026"}</span>
            <span>•</span>
            <span className="text-purple font-semibold">Last Updated: {initialData?.lastUpdatedDate || "August 29, 2026"}</span>
            <span>•</span>
            <span className="text-emerald-400 font-semibold">Standard: {initialData?.jurisdiction || "Privacy-First"}</span>
          </div>

          {filterMode === "contact" && (
            <div className="mt-4 p-3 rounded-xl bg-[#7C3AED]/15 border border-[#7C3AED]/30 text-xs text-neutral-200 flex items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-center gap-2">
                <FaBullseye className="w-4 h-4 text-[#CBACF9] shrink-0" />
                <span>
                  Filtering active: Spotlighting terms specifically governing the Contact Form, Anonymity Rights, and Data Protection.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setFilterMode("all")}
                className="text-purple hover:text-white underline text-xs font-semibold whitespace-nowrap cursor-pointer"
              >
                View full policy
              </button>
            </div>
          )}

          {filterMode === "assistant" && (
            <div className="mt-4 p-3 rounded-xl bg-[#7C3AED]/15 border border-[#7C3AED]/30 text-xs text-neutral-200 flex items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-center gap-2">
                <IoChatbubbleEllipses className="w-4 h-4 text-[#CBACF9] shrink-0" />
                <span>
                  Filtering active: Spotlighting privacy architecture, ephemeral interaction safety, and data governance for Gaurav Portfolio Assistant (Beta).
                </span>
              </div>
              <button
                type="button"
                onClick={() => setFilterMode("all")}
                className="text-purple hover:text-white underline text-xs font-semibold whitespace-nowrap cursor-pointer"
              >
                View full policy
              </button>
            </div>
          )}

          {filterMode === "whatsapp" && (
            <div className="mt-4 p-3 rounded-xl bg-[#25D366]/15 border border-[#25D366]/30 text-xs text-neutral-200 flex items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-center gap-2">
                <FaWhatsapp className="w-4 h-4 text-[#25D366] shrink-0" />
                <span>
                  Filtering active: Spotlighting WhatsApp Recruiter Data Rights, GDPR Article 20 Portability, and Instant ZIP Export (`/exportmydata`).
                </span>
              </div>
              <button
                type="button"
                onClick={() => setFilterMode("all")}
                className="text-purple hover:text-white underline text-xs font-semibold whitespace-nowrap cursor-pointer"
              >
                View full policy
              </button>
            </div>
          )}
        </header>

        {/* Content Box */}
        <div className="w-full rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-xl p-6 sm:p-10 lg:p-12 space-y-8 text-neutral-300 leading-relaxed text-sm sm:text-base">
          {initialData?.sections && initialData.sections.length > 0 ? (
            initialData.sections.map((section) => {
              const isVisible =
                filterMode === "all" ||
                (filterMode === "contact" && (section.filterMode === "contact" || section.id === "anonymity" || section.id === "turnstile" || section.id === "brevo")) ||
                (filterMode === "assistant" && (section.filterMode === "assistant" || section.id === "assistant-privacy")) ||
                (filterMode === "whatsapp" && (section.filterMode === "whatsapp" || section.id === "whatsapp-data-export"));

              if (!isVisible) return null;

              const isHighlighted =
                highlightedSection === section.id ||
                (filterMode === "contact" && (section.filterMode === "contact" || section.id === "anonymity")) ||
                (filterMode === "assistant" && (section.filterMode === "assistant" || section.id === "assistant-privacy")) ||
                (filterMode === "whatsapp" && (section.filterMode === "whatsapp" || section.id === "whatsapp-data-export"));

              const isWhatsappTheme = section.filterMode === "whatsapp" || section.id === "whatsapp-data-export";

              return (
                <section
                  key={section.id}
                  id={section.id}
                  className={`space-y-4 p-4 sm:p-6 rounded-xl transition-all duration-300 scroll-mt-24 sm:scroll-mt-32 ${
                    isHighlighted
                      ? isWhatsappTheme
                        ? "bg-[#25D366]/10 border border-[#25D366]/50 shadow-[0_0_30px_rgba(37,211,102,0.15)] ring-1 ring-[#25D366]/50"
                        : "bg-[#7C3AED]/10 border border-[#7C3AED]/50 shadow-[0_0_30px_rgba(124,58,237,0.15)] ring-1 ring-[#7C3AED]/50"
                      : section.filterMode !== "all"
                      ? "border border-white/[0.06] bg-white/[0.02]"
                      : "border border-transparent"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] pb-3">
                    <h2 className="text-xl font-semibold text-white flex items-center gap-2.5">
                      {getPrivacySectionIcon(section.id)}
                      <span>{section.heading}</span>
                    </h2>
                    {isHighlighted && (
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                          isWhatsappTheme
                            ? "bg-[#25D366]/20 text-[#25D366] border border-[#25D366]/40"
                            : "bg-[#7C3AED]/30 text-[#CBACF9] border border-[#7C3AED]/50"
                        }`}
                      >
                        {isWhatsappTheme ? "WhatsApp Privacy" : section.filterMode === "contact" ? "Contact Term" : "Assistant Deep-Dive"}
                      </span>
                    )}
                  </div>
                  <MarkdownLegalRenderer content={section.contentMarkdown} />
                </section>
              );
            })
          ) : (
            <>
          {/* Section 1: Overview */}
          {filterMode === "all" && (
            <section id="overview" className="space-y-3 scroll-mt-24 sm:scroll-mt-32">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2.5">
                <FaShieldHalved className="w-4 h-4 text-purple" />
                <span>1. Overview &amp; Privacy-First Philosophy</span>
              </h2>
              <p>
                Your privacy, autonomy, and security are non-negotiable. This Privacy Policy governs
                how data is handled across <span className="text-purple font-semibold">Gaurav Portfolio</span>.
                The architecture operates on strict data minimization principles: only the minimum
                information necessary to facilitate professional communication is collected, with zero third-party data tracking,
                zero cookie profiling, and zero monetization of personal information.
              </p>
            </section>
          )}

          {/* Section 2: Anonymity (Spotlighted for Contact Form) */}
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
                <span>2. Absolute Right to Anonymity &amp; Confidential Inquiries</span>
              </h2>
              {(highlightedSection === "anonymity" || filterMode === "contact") && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#7C3AED]/30 text-[#CBACF9] border border-[#7C3AED]/50">
                  Contact Form Term
                </span>
              )}
            </div>
            <p>
              Every visitor and prospective collaborator has the full, unrestricted right to maintain
              complete anonymity:
            </p>
            <ul className="list-disc list-inside space-y-2 pl-2">
              <li>
                <strong className="text-white">Default Anonymous Role:</strong> The contact form defaults to
                the &ldquo;Anonymous / Confidential&rdquo; identity to ensure no visitor is pressured into declaring a specific role.
              </li>
              <li>
                <strong className="text-white">Pseudonyms &amp; Private Relays:</strong> You may submit inquiries using an alias, pseudonym, or privacy-relayed email address (such as Apple Relay or SimpleLogin).
              </li>
              <li>
                <strong className="text-white">Zero Telemetry Correlation:</strong> Inbound contact messages are strictly segregated from user-agent fingerprints and external analytics data.
              </li>
            </ul>
          </section>

          {/* Section 3: Cloudflare Turnstile */}
          <section
            id="turnstile"
            className={`space-y-3 p-4 sm:p-6 rounded-xl transition-all duration-300 scroll-mt-24 sm:scroll-mt-32 ${
              highlightedSection === "turnstile" || filterMode === "contact"
                ? "bg-white/[0.04] border border-white/[0.15]"
                : "border border-transparent"
            }`}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2.5">
                <FaRobot className="w-4 h-4 text-purple" />
                <span>3. Bot Mitigation &amp; Ephemeral Cloudflare Turnstile Evaluation</span>
              </h2>
              {filterMode === "contact" && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-white/[0.08] text-neutral-300 border border-white/[0.15]">
                  Security Gate
                </span>
              )}
            </div>
            <p>
              To protect public endpoints against automated spam and DDoS attacks, the system utilizes
              <strong className="text-white"> Cloudflare Turnstile</strong>:
            </p>
            <ul className="list-disc list-inside space-y-2 pl-2">
              <li>
                <strong className="text-white">Cookie-Free Evaluation:</strong> Turnstile evaluates browser telemetry ephemerally during submission without setting persistent cross-site tracking cookies.
              </li>
              <li>
                <strong className="text-white">Server-Side Token Validation:</strong> Tokens are validated instantaneously via server-to-server TLS calls and discarded immediately following verification.
              </li>
            </ul>
          </section>

          {/* Section 4: Brevo Email Gateway */}
          <section
            id="brevo"
            className={`space-y-3 p-4 sm:p-6 rounded-xl transition-all duration-300 scroll-mt-24 sm:scroll-mt-32 ${
              highlightedSection === "brevo" || filterMode === "contact"
                ? "bg-white/[0.04] border border-white/[0.15]"
                : "border border-transparent"
            }`}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2.5">
                <FaEnvelope className="w-4 h-4 text-purple" />
                <span>4. Transactional Communications &amp; Brevo Delivery Gateway</span>
              </h2>
              {filterMode === "contact" && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-white/[0.08] text-neutral-300 border border-white/[0.15]">
                  Delivery Pipeline
                </span>
              )}
            </div>
            <p>
              All transactional notifications and inquiry receipts are routed through an enterprise Brevo server pipeline:
            </p>
            <ul className="list-disc list-inside space-y-2 pl-2">
              <li>
                <strong className="text-white">Authenticated Domain:</strong> Official communications originate strictly from the verified primary identity <span className="text-purple font-mono">gauravpatil.site</span>.
              </li>
              <li>
                <strong className="text-white">Official Senders:</strong>
                <ul className="list-disc list-inside pl-5 mt-1 space-y-1 text-neutral-400 font-mono text-xs sm:text-sm">
                  <li>hello@gauravpatil.site (Direct contact &amp; automated receipts)</li>
                  <li>security@gauravpatil.site (Security alerts &amp; authentication verification)</li>
                  <li>help@gauravpatil.site (Support &amp; assistance)</li>
                  <li>no-reply@gauravpatil.site (System notifications)</li>
                </ul>
              </li>
              <li>
                <strong className="text-white">No Marketing Subscriptions:</strong> Submitting an inquiry will never enroll you in promotional campaigns or marketing distributions.
              </li>
            </ul>
          </section>

          {/* Section 5: Data Rights */}
          <section id="data-rights" className="space-y-3 scroll-mt-24 sm:scroll-mt-32">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2.5">
              <FaLock className="w-4 h-4 text-purple" />
              <span>5. Data Security, Storage &amp; Deletion Rights</span>
            </h2>
            <p>
              Inquiries are stored in encrypted cloud databases (Firebase Firestore / Realtime Database in region <code className="text-purple">asia-southeast1</code>) with atomic lead tracking. You retain the right under GDPR, CCPA, and international privacy standards to:
            </p>
            <ul className="list-disc list-inside space-y-2 pl-2">
              <li>Request a copy of any communication history associated with your email.</li>
              <li>Request permanent, atomic deletion of all submitted contact records and message drafts.</li>
            </ul>
          </section>

          {/* Section: Personal Assistant & AI Safety (Spotlighted for Assistant / Learn More) */}
          <section
            id="assistant-privacy"
            className={`space-y-6 p-4 sm:p-7 rounded-2xl transition-all duration-300 scroll-mt-24 sm:scroll-mt-32 ${
              highlightedSection === "assistant-privacy" || filterMode === "assistant"
                ? "bg-[#7C3AED]/10 border border-[#7C3AED]/50 shadow-[0_0_35px_rgba(124,58,237,0.18)] ring-1 ring-[#7C3AED]/50"
                : "border border-transparent"
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
              <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2.5">
                <IoChatbubbleEllipses className="w-5 h-5 text-purple" />
                <span>6. Personal Assistant (Beta) &amp; AI Safety Architecture</span>
              </h2>
              {(highlightedSection === "assistant-privacy" || filterMode === "assistant") && (
                <span className="px-3 py-1 rounded-full text-[10.5px] font-mono font-bold bg-[#7C3AED]/30 text-[#CBACF9] border border-[#7C3AED]/50">
                  Assistant Deep-Dive &amp; Learn More
                </span>
              )}
            </div>

            {/* Subsection 1: Why Gaurav Assistant Was Created */}
            <div className="space-y-3 bg-white/[0.02] p-4 sm:p-5 rounded-xl border border-white/[0.06]">
              <h3 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple" />
                Why Gaurav Assistant Was Created
              </h3>
              <p className="text-sm text-neutral-300 leading-relaxed">
                The Personal Assistant was conceived and engineered as an <strong className="text-white">intelligent interactive portfolio navigator</strong> designed to elevate how recruiters, hiring managers, engineering leaders, and potential clients explore Gaurav Patil&apos;s work. Instead of manually parsing static resume bullets, visitors can receive real-time answers concerning:
              </p>
              <ul className="list-disc list-inside space-y-1.5 pl-2 text-sm text-neutral-300">
                <li>
                  <strong className="text-white">Deep Case Study Breakdown:</strong> Architectural design patterns, performance benchmarks, and problem-solving methodologies used across highlighted projects.
                </li>
                <li>
                  <strong className="text-white">Technical Stack &amp; Specializations:</strong> Contextual inquiries regarding Next.js 15 App Router, React 19, TypeScript, Tailwind CSS, Three.js 3D visualization, and cloud database implementations.
                </li>
                <li>
                  <strong className="text-white">Engineering Philosophy &amp; Experience:</strong> Insights into development practices, responsive UI/UX standards, and accessibility paradigms.
                </li>
                <li>
                  <strong className="text-white">Live Architectural Demonstration:</strong> Serves as a live showcase of clean Next.js architecture, featuring an isolated 4-Tier Data Access Layer (`UI → Repository → DataSource → Cloud DB`), strict modal accessibility, and single-window layout stability.
                </li>
              </ul>
            </div>

            {/* Subsection 2: Custom Mail Domain Support */}
            <div className="space-y-3 bg-white/[0.02] p-4 sm:p-5 rounded-xl border border-white/[0.06]">
              <h3 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple" />
                Custom Mail Domain Support &amp; Verified Communication Channels
              </h3>
              <p className="text-sm text-neutral-300 leading-relaxed">
                All visitor interactions, assistant support inquiries, and transactional communications are backed by a dedicated, enterprise-grade Brevo email delivery pipeline configured with strict <strong className="text-white">SPF, DKIM, and DMARC</strong> authentication records. Official communication originating from this portfolio is bound to the primary authenticated domain <span className="text-purple font-mono font-semibold">gauravpatil.site</span>:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="p-3 rounded-lg bg-black/40 border border-white/[0.08] space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <code className="text-xs sm:text-sm text-purple font-mono font-bold">hello@gauravpatil.site</code>
                  </div>
                  <p className="text-xs text-neutral-400 pl-3.5">
                    Direct portfolio contact, visitor inquiries, developer collaboration, and automated inquiry receipts.
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-black/40 border border-white/[0.08] space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple" />
                    <code className="text-xs sm:text-sm text-purple font-mono font-bold">help@gauravpatil.site</code>
                  </div>
                  <p className="text-xs text-neutral-400 pl-3.5">
                    Assistant technical assistance, bug reports, user feedback, and portfolio navigation support.
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-black/40 border border-white/[0.08] space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    <code className="text-xs sm:text-sm text-purple font-mono font-bold">security@gauravpatil.site</code>
                  </div>
                  <p className="text-xs text-neutral-400 pl-3.5">
                    Security disclosures, vulnerability reports, 2FA OTP codes, and authentication alerts.
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-black/40 border border-white/[0.08] space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-neutral-400" />
                    <code className="text-xs sm:text-sm text-purple font-mono font-bold">no-reply@gauravpatil.site</code>
                  </div>
                  <p className="text-xs text-neutral-400 pl-3.5">
                    Non-interactive automated notifications, system passcodes, and mandatory legal announcements only.
                  </p>
                </div>
              </div>

              {/* Mandatory Legal & Policy Update Notices */}
              <div className="mt-3 p-3.5 rounded-lg bg-white/[0.02] border border-white/[0.08] space-y-2 text-xs sm:text-sm">
                <h4 className="font-semibold text-white text-xs sm:text-sm flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple" />
                  Mandatory Legal Update Broadcasts &amp; Strict No-Unsubscribe Standard
                </h4>
                <p className="text-xs text-neutral-300 leading-relaxed">
                  Email addresses submitted through contact forms, assistant support inquiries, or verified via One-Time Passcodes (OTP) for Live Chat are securely stored in encrypted cloud databases. These addresses receive mandatory service announcements whenever the public Terms of Service or Privacy Policy are amended.
                </p>
                <ul className="list-disc list-inside space-y-1 pl-1 text-xs text-neutral-300">
                  <li>
                    <strong className="text-white">Strict Non-Marketing Standard:</strong> These dispatches are 100% transactional legal disclosures and never include commercial promotions, marketing campaigns, or sales sequences.
                  </li>
                  <li>
                    <strong className="text-white">No-Unsubscribe Requirement:</strong> Because these announcements represent vital contractual and operational transparency notices, they do not offer an opt-out or unsubscribe mechanism. Even if automated email client features (such as Google/Gmail automatic 1-click unsubscribe headers) are invoked at the client level, you acknowledge and agree that you will continue to receive mandatory legal and policy updates as per this policy and your acceptance of use.
                  </li>
                </ul>
              </div>
            </div>

            {/* Subsection 3: Live Chat Notification Privacy & Session Security */}
            <div className="space-y-3 bg-white/[0.02] p-4 sm:p-5 rounded-xl border border-white/[0.06]">
              <h3 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                Live Chat Notification Privacy &amp; 4-Hour Session Security
              </h3>
              <ul className="list-disc list-inside space-y-2 pl-2 text-sm text-neutral-300">
                <li>
                  <strong className="text-white">Direct Message Routing:</strong> When you send a message in Live Chat, it is streamed immediately if Gaurav is connected. When away, the automated system triggers an instantaneous notification email to Gaurav&apos;s personal inbox with your message transcript and 1-click reply routing.
                </li>
                <li>
                  <strong className="text-white">Zero Plaintext OTP Storage:</strong> 6-digit verification codes are hashed using salted HMAC-SHA256 before storage and destroyed immediately upon successful authentication or after 5 minutes.
                </li>
                <li>
                  <strong className="text-white">Encrypted 4-Hour Session Token:</strong> Verified sessions are stored in an encrypted `httpOnly`, `SameSite=Lax` cookie valid for 4 hours. You can close and return to the portfolio anytime during this period without re-verifying.
                </li>
                <li>
                  <strong className="text-white">1-Click Sign-Out &amp; Detachment:</strong> You may revoke your session token at any time by clicking <strong className="text-white">Sign out</strong> in the chat header, which atomically clears your session cookie and closes live streams across all browser tabs.
                </li>
              </ul>
            </div>

            {/* Subsection 4: Privacy, Anonymity & Data Minimization */}
            <div className="space-y-3 bg-white/[0.02] p-4 sm:p-5 rounded-xl border border-white/[0.06]">
              <h3 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple" />
                Data Protection, Ephemeral Processing &amp; Anonymity
              </h3>
              <ul className="list-disc list-inside space-y-2 pl-2 text-sm text-neutral-300">
                <li>
                  <strong className="text-white">Ephemeral Session Processing:</strong> Assistant interactions are evaluated in-memory strictly for real-time guidance during your active session.
                </li>
                <li>
                  <strong className="text-white">Zero Third-Party Training or Data Selling:</strong> A 100% data integrity guarantee is maintained: queries and live messages are never sold, rented, monetized, or fed into public generative model training pools.
                </li>
                <li>
                  <strong className="text-white">No Persistent Tracking:</strong> The assistant functions completely without tracking cookies, behavioral tracking scripts, or persistent fingerprinting.
                </li>
                <li>
                  <strong className="text-white">Active Beta Guardrails:</strong> Automated rate-limiting and input sanitization protect against malicious exploitation while maintaining zero layout shift (`CLS = 0`) across desktop and mobile devices.
                </li>
              </ul>
            </div>
          </section>

          {/* Section 7: WhatsApp Recruiter Data Portability & GDPR Export */}
          {(filterMode === "all" || filterMode === "whatsapp") && (
            <section
              id="whatsapp-data-export"
              className={`space-y-6 p-4 sm:p-7 rounded-2xl transition-all duration-300 scroll-mt-24 sm:scroll-mt-32 ${
                highlightedSection === "whatsapp-data-export" || filterMode === "whatsapp"
                  ? "bg-[#25D366]/10 border border-[#25D366]/50 shadow-[0_0_35px_rgba(37,211,102,0.18)] ring-1 ring-[#25D366]/50"
                  : "border border-white/[0.06] bg-white/[0.02]"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
                <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2.5">
                  <FaWhatsapp className="w-6 h-6 text-[#25D366]" />
                  <span>7. WhatsApp Recruiter Data Portability &amp; Self-Service Export (GDPR Art. 20)</span>
                </h2>
                {(highlightedSection === "whatsapp-data-export" || filterMode === "whatsapp") && (
                  <span className="px-3 py-1 rounded-full text-[10.5px] font-mono font-bold bg-[#25D366]/20 text-[#25D366] border border-[#25D366]/40">
                    WhatsApp Privacy &amp; Export
                  </span>
                )}
              </div>

              <p className="text-sm text-neutral-300 leading-relaxed">
                In full compliance with <strong className="text-white">GDPR Article 20 (Right to Data Portability)</strong> and the <strong className="text-white">California Consumer Privacy Act (CCPA)</strong>, visitors and recruiters interacting with Gaurav Patil via the official WhatsApp Business channel maintain absolute ownership of their communication records.
              </p>

              {/* Export Features Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-black/40 border border-white/[0.08] p-4 rounded-xl space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#25D366]" />
                    <h3 className="text-sm font-semibold text-white">Instant ZIP Archive</h3>
                  </div>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    Typing <code className="text-[#25D366] font-mono font-semibold">/exportmydata</code> in WhatsApp immediately triggers the server to compile an encrypted in-memory ZIP package containing your complete records with zero wait time.
                  </p>
                </div>

                <div className="bg-black/40 border border-white/[0.08] p-4 rounded-xl space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#CBACF9]" />
                    <h3 className="text-sm font-semibold text-white">Visual HTML Log</h3>
                  </div>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    Includes a standalone, beautifully styled Dark Luxury HTML transcript featuring verified timestamps, speaker badges, and Gaurav Portfolio branding readable offline on any browser.
                  </p>
                </div>

                <div className="bg-black/40 border border-white/[0.08] p-4 rounded-xl space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <h3 className="text-sm font-semibold text-white">GDPR Certificate</h3>
                  </div>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    Every export includes an official Data Portability Certificate detailing exact UTC generation timestamps, session identifiers, compliance guarantees, and SHA-256 integrity verification.
                  </p>
                </div>
              </div>

              {/* Step-by-Step Guide */}
              <div className="space-y-3 bg-white/[0.02] p-4 sm:p-5 rounded-xl border border-white/[0.06]">
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <FaDownload className="w-4 h-4 text-[#25D366]" />
                  How to Export Your WhatsApp Chat Data (2 Simple Steps)
                </h3>
                <ol className="list-decimal list-inside space-y-2 text-sm text-neutral-300">
                  <li>
                    In your active WhatsApp conversation with Gaurav Patil, send: <code className="text-[#25D366] font-mono font-semibold bg-black/50 px-2 py-0.5 rounded">/exportmydata</code> (or <code className="text-[#25D366] font-mono font-semibold bg-black/50 px-2 py-0.5 rounded">/export</code>).
                  </li>
                  <li>
                    The automated system will immediately confirm with a generation notice, followed by a cryptographically signed HMAC download link (strictly valid for 10 minutes). Tap the link to download your <code className="text-[#CBACF9] font-mono">.zip</code> archive directly to your device.
                  </li>
                </ol>
              </div>

              {/* Right to Erasure */}
              <div className="space-y-3 bg-white/[0.02] p-4 sm:p-5 rounded-xl border border-white/[0.06]">
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-400" />
                  GDPR Article 17: Right to Immediate Erasure (STOP Command)
                </h3>
                <p className="text-sm text-neutral-300 leading-relaxed">
                  You maintain full sovereignty over your information. At any point, simply reply <code className="text-red-400 font-mono font-semibold bg-black/50 px-2 py-0.5 rounded">STOP</code> to WhatsApp. The server immediately unsubscribes your number and permanently erases all message documents and session data from the database in an atomic transaction.
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-white/[0.03] border border-white/[0.08] flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-neutral-400">
                  Reviewing legal operating standards?
                </span>
                <Link
                  href="/terms?focus=whatsapp#whatsapp-terms"
                  className="text-[#25D366] hover:underline font-semibold flex items-center gap-1"
                >
                  <span>View WhatsApp Terms of Service</span> &rarr;
                </Link>
              </div>
            </section>
          )}

          {/* Section 8: Administrative Subsystem Privacy Governance */}
          {filterMode === "all" && (
            <section id="admin-privacy" className="space-y-3 scroll-mt-24 sm:scroll-mt-32">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2.5">
                <FaShieldHalved className="w-4 h-4 text-purple" />
                <span>8. Administrative Subsystem Privacy Governance</span>
              </h2>
              <p>
                The administrative panel (<code className="text-purple font-mono">/admin/*</code>) maintains a strictly isolated data governance architecture. Administrative authentication is restricted to authorized Superadmins via Google OAuth 2.0 PKCE. 2FA One-Time Passcodes are stored in salted HMAC-SHA256 hashed representations, and security IP verification challenges operate under an immutable 15-minute TTL. Sign-out triggers a complete 5-step detachment that clears all cookies, tokens, and browser session storage. Detailed administrative privacy protocols are documented in the <Link href="/admin/privacy" className="text-purple hover:underline font-semibold">Administrator Privacy Policy</Link>.
              </p>
            </section>
          )}

          {/* Section 9: Contact */}
          <section id="contact-requests" className="space-y-3 scroll-mt-24 sm:scroll-mt-32">
            <h2 className="text-xl font-semibold text-white">
              9. Contact &amp; Data Requests
            </h2>
            <p>
              For any privacy inquiries, data deletion requests, or security disclosures, reach out directly to:
            </p>
            <p className="text-purple font-medium">
              Email:{" "}
              <a
                href="mailto:hello@gauravpatil.site"
                className="hover:underline"
              >
                hello@gauravpatil.site
              </a>
            </p>
          </section>
            </>
          )}
        </div>

        {/* Footer Note */}
        <div className="mt-12 text-center text-xs text-white-200">
          <p>© {new Date().getFullYear()} Gaurav Portfolio. All rights reserved.</p>
        </div>
      </div>
    </main>
  );
}

export function PrivacyPolicyContent({ initialData }: PrivacyPolicyContentProps) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black-100 text-white flex items-center justify-center">Loading Privacy Policy...</div>}>
      <PrivacyContentInner initialData={initialData} />
    </Suspense>
  );
}
