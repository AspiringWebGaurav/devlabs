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
} from "react-icons/fa6";

function PrivacyContentInner() {
  const searchParams = useSearchParams();
  const focusParam = searchParams.get("focus");

  const [filterMode, setFilterMode] = useState<"all" | "contact">(
    focusParam === "contact" ? "contact" : "all"
  );
  const [highlightedSection, setHighlightedSection] = useState<string | null>(
    focusParam === "contact" ? "anonymity" : null
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const hash = window.location.hash.replace("#", "");
    const targetId = hash || (focusParam === "contact" ? "anonymity" : null);

    if (targetId) {
      setHighlightedSection(targetId);
      const timer = setTimeout(() => {
        const el = document.getElementById(targetId);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [focusParam]);

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
          <div className="inline-flex items-center bg-white/[0.04] border border-white/[0.1] rounded-xl p-1 text-xs">
            <button
              type="button"
              onClick={() => setFilterMode("all")}
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
              onClick={() => {
                setFilterMode("contact");
                setHighlightedSection("anonymity");
                const el = document.getElementById("anonymity");
                if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
              }}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                filterMode === "contact"
                  ? "bg-[#7C3AED] text-white font-semibold shadow-sm shadow-[#7C3AED]/40"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              <FaBullseye className="w-3 h-3 text-[#CBACF9]" />
              <span>Contact Form &amp; Anonymity Only</span>
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
            <span>Original Effective: January 1, 2026</span>
            <span>•</span>
            <span className="text-purple font-semibold">Last Updated: August 27, 2026</span>
            <span>•</span>
            <span className="text-emerald-400 font-semibold">Standard: Privacy-First</span>
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
        </header>

        {/* Content Box */}
        <div className="w-full rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-xl p-6 sm:p-10 lg:p-12 space-y-8 text-neutral-300 leading-relaxed text-sm sm:text-base">
          {/* Section 1: Overview */}
          {filterMode === "all" && (
            <section id="overview" className="space-y-3">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2.5">
                <FaShieldHalved className="w-4 h-4 text-purple" />
                <span>1. Overview &amp; Privacy-First Philosophy</span>
              </h2>
              <p>
                Your privacy, autonomy, and security are non-negotiable. This Privacy Policy governs
                how data is handled across <span className="text-purple font-semibold">Gaurav Portfolio</span>.
                The architecture operates on strict data minimization principles: we only collect the minimum
                information necessary to facilitate professional communication, with zero third-party data tracking,
                zero cookie profiling, and zero monetization of personal information.
              </p>
            </section>
          )}

          {/* Section 2: Anonymity (Spotlighted for Contact Form) */}
          <section
            id="anonymity"
            className={`space-y-3 p-4 sm:p-6 rounded-xl transition-all duration-300 ${
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
            className={`space-y-3 p-4 sm:p-6 rounded-xl transition-all duration-300 ${
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
              To protect public endpoints against automated spam and DDoS attacks, we utilize
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
            className={`space-y-3 p-4 sm:p-6 rounded-xl transition-all duration-300 ${
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
                <strong className="text-white">Authenticated Domain:</strong> Official communications originate strictly from the verified identity <span className="text-purple font-mono">gauravservices.eu.cc</span>.
              </li>
              <li>
                <strong className="text-white">Official Senders:</strong>
                <ul className="list-disc list-inside pl-5 mt-1 space-y-1 text-neutral-400 font-mono text-xs sm:text-sm">
                  <li>hello@gauravservices.eu.cc (Direct contact &amp; automated receipts)</li>
                  <li>security@gauravservices.eu.cc (Security alerts &amp; authentication verification)</li>
                  <li>help@gauravservices.eu.cc (Support &amp; assistance)</li>
                  <li>no-reply@gauravservices.eu.cc (System notifications)</li>
                </ul>
              </li>
              <li>
                <strong className="text-white">No Marketing Subscriptions:</strong> Submitting an inquiry will never enroll you in promotional campaigns or marketing distributions.
              </li>
            </ul>
          </section>

          {/* Section 5: Data Rights */}
          <section id="data-rights" className="space-y-3">
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

          {/* Section 6: Administrative Subsystem Privacy Governance */}
          {filterMode === "all" && (
            <section id="admin-privacy" className="space-y-3">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2.5">
                <FaShieldHalved className="w-4 h-4 text-purple" />
                <span>6. Administrative Subsystem Privacy Governance</span>
              </h2>
              <p>
                The administrative panel (<code className="text-purple font-mono">/admin/*</code>) maintains a strictly isolated data governance architecture. Administrative authentication is restricted to authorized Superadmins via Google OAuth 2.0 PKCE. 2FA One-Time Passcodes are stored in salted HMAC-SHA256 hashed representations, and security IP verification challenges operate under an immutable 15-minute TTL. Sign-out triggers a complete 5-step detachment that clears all cookies, tokens, and browser session storage. Detailed administrative privacy protocols are documented in the <Link href="/admin/privacy" className="text-purple hover:underline font-semibold">Administrator Privacy Policy</Link>.
              </p>
            </section>
          )}

          {/* Section 7: Contact */}
          <section id="contact-requests" className="space-y-3">
            <h2 className="text-xl font-semibold text-white">
              7. Contact &amp; Data Requests
            </h2>
            <p>
              For any privacy inquiries, data deletion requests, or security disclosures, reach out directly to:
            </p>
            <p className="text-purple font-medium">
              Email:{" "}
              <a
                href="mailto:hello@gauravservices.eu.cc"
                className="hover:underline"
              >
                hello@gauravservices.eu.cc
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

export function PrivacyPolicyContent() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black-100 text-white flex items-center justify-center">Loading Privacy Policy...</div>}>
      <PrivacyContentInner />
    </Suspense>
  );
}
