import React from "react";
import Link from "next/link";
import {
  FaArrowLeft,
  FaShieldHalved,
  FaLock,
  FaKey,
  FaEnvelope,
  FaServer,
  FaUserShield,
} from "react-icons/fa6";
import { IoCheckmarkCircleOutline, IoChevronForward } from "react-icons/io5";

export const SecurityPolicyContent: React.FC = () => {
  return (
    <main className="min-h-screen bg-black-100 text-white relative overflow-hidden py-10 sm:py-16 px-5 sm:px-10 lg:px-16 xl:px-24 w-full">
      {/* Background Grid */}
      <div className="h-full w-full dark:bg-black-100 bg-white dark:bg-grid-white/[0.03] bg-grid-black-100/[0.2] absolute top-0 left-0 flex items-center justify-center pointer-events-none -z-10">
        <div className="absolute pointer-events-none inset-0 flex items-center justify-center dark:bg-black-100 bg-white [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]" />
      </div>

      <div className="w-full mx-auto max-w-4xl lg:max-w-none">
        {/* Top Controls: Back Link */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8 sm:mb-10">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-purple hover:text-white transition-colors duration-200 group"
          >
            <FaArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" />
            <span>Back to Portfolio</span>
          </Link>

          <div className="inline-flex items-center gap-2 text-xs text-neutral-400 bg-white/[0.04] border border-white/[0.1] rounded-xl px-3 py-1.5 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Architecture &amp; Trust</span>
          </div>
        </div>

        {/* Header */}
        <header className="mb-10 sm:mb-12">
          <p className="uppercase tracking-widest text-xs text-purple font-medium mb-3">
            Security Architecture &amp; Trust
          </p>
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-white mb-4">
            Security Architecture Overview
          </h1>
          <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-400 font-mono">
            <span>Portfolio Platform</span>
            <span>•</span>
            <span className="text-purple font-semibold">Gaurav Portfolio</span>
            <span>•</span>
            <span className="text-emerald-400 font-semibold">Defensive Engineering</span>
          </div>
          <p className="text-base sm:text-lg text-neutral-300 max-w-3xl leading-relaxed mt-5">
            An overview of the defensive security architecture, authentication standards, transport protections, and responsible disclosure policies governing the Gaurav Portfolio platform.
          </p>
        </header>

        {/* Content Grid */}
        <div className="grid grid-cols-1 gap-6 sm:gap-8">
          {/* Section 1: Security Philosophy */}
          <section className="p-6 sm:p-8 rounded-2xl bg-white/[0.02] border border-white/[0.08] backdrop-blur-xl shadow-xl transition-all duration-300">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-purple/10 border border-purple/20 flex items-center justify-center text-purple shrink-0 mt-1">
                <FaShieldHalved className="w-5 h-5" />
              </div>
              <div className="space-y-3 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="text-xs font-mono font-semibold uppercase tracking-wider text-purple">
                    Section 01
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                    <IoCheckmarkCircleOutline className="w-3 h-3" />
                    Design Standard
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Security Architecture Philosophy
                </h2>
                <p className="text-sm sm:text-base text-neutral-300 leading-relaxed">
                  The security posture of Gaurav Portfolio is rooted in the principle of defense-in-depth and minimal attack surface. Rather than relying on monolithic perimeter controls, every subsystem—from visitor contact routing to administrative consoles—is compartmentalized with explicit boundary validation.
                </p>
              </div>
            </div>
          </section>

          {/* Section 2: Administrative Authentication & 2FA */}
          <section className="p-6 sm:p-8 rounded-2xl bg-white/[0.02] border border-white/[0.08] backdrop-blur-xl shadow-xl transition-all duration-300">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-purple/10 border border-purple/20 flex items-center justify-center text-purple shrink-0 mt-1">
                <FaKey className="w-5 h-5" />
              </div>
              <div className="space-y-3 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="text-xs font-mono font-semibold uppercase tracking-wider text-purple">
                    Section 02
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                    <IoCheckmarkCircleOutline className="w-3 h-3" />
                    Multi-Factor Protection
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Administrative Access &amp; Authentication
                </h2>
                <p className="text-sm sm:text-base text-neutral-300 leading-relaxed">
                  Access to the portfolio administrative subsystem is restricted to Gaurav Patil through a multi-layered verification pipeline:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
                  <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <h3 className="text-sm font-semibold text-white mb-1">OAuth 2.0 PKCE Whitelist</h3>
                    <p className="text-xs text-neutral-400 leading-relaxed">
                      Identity tokens are exchanged using standard PKCE flows and verified strictly against the pre-configured Superadmin whitelist.
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <h3 className="text-sm font-semibold text-white mb-1">Multi-Factor Passcode Verification</h3>
                    <p className="text-xs text-neutral-400 leading-relaxed">
                      Secondary challenge delivery via secure transactional channels with strict time-to-live and attempt limitations.
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <h3 className="text-sm font-semibold text-white mb-1">Session Lifecycle Scoping</h3>
                    <p className="text-xs text-neutral-400 leading-relaxed">
                      Encrypted, `HttpOnly`, `SameSite=Strict` session cookies with deterministic expiration and automated session detachment.
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <h3 className="text-sm font-semibold text-white mb-1">Device &amp; Telemetry Validation</h3>
                    <p className="text-xs text-neutral-400 leading-relaxed">
                      Automated security alerts dispatched on unrecognized sign-in parameters to prevent unauthorized session hijacking.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Section 3: Edge & Bot Mitigation */}
          <section className="p-6 sm:p-8 rounded-2xl bg-white/[0.02] border border-white/[0.08] backdrop-blur-xl shadow-xl transition-all duration-300">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-purple/10 border border-purple/20 flex items-center justify-center text-purple shrink-0 mt-1">
                <FaLock className="w-5 h-5" />
              </div>
              <div className="space-y-3 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="text-xs font-mono font-semibold uppercase tracking-wider text-purple">
                    Section 03
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                    <IoCheckmarkCircleOutline className="w-3 h-3" />
                    Automated Defense
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Edge Protection &amp; Bot Defense
                </h2>
                <p className="text-sm sm:text-base text-neutral-300 leading-relaxed">
                  Public endpoints—including the contact modal—are protected against automated abuse, denial-of-service, and spam enumeration through <strong>Cloudflare Turnstile</strong>.
                </p>
                <p className="text-sm sm:text-base text-neutral-300 leading-relaxed">
                  Turnstile validates human traffic using non-interactive browser challenges without tracking cookies or cross-site user profiling. Submissions that fail validation are dropped at the API boundary before reaching backend mail dispatchers or persistence layers.
                </p>
              </div>
            </div>
          </section>

          {/* Section 4: Data Layer Isolation */}
          <section className="p-6 sm:p-8 rounded-2xl bg-white/[0.02] border border-white/[0.08] backdrop-blur-xl shadow-xl transition-all duration-300">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-purple/10 border border-purple/20 flex items-center justify-center text-purple shrink-0 mt-1">
                <FaServer className="w-5 h-5" />
              </div>
              <div className="space-y-3 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="text-xs font-mono font-semibold uppercase tracking-wider text-purple">
                    Section 04
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                    <IoCheckmarkCircleOutline className="w-3 h-3" />
                    4-Tier Pipeline
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Data Access Layer Separation
                </h2>
                <p className="text-sm sm:text-base text-neutral-300 leading-relaxed">
                  Database interactions operate under a strict 4-Tier pipeline (`UI → Repository → DataSource → Cloud Database`). Frontend components never import database SDKs or interact with storage layers directly.
                </p>
                <p className="text-sm sm:text-base text-neutral-300 leading-relaxed">
                  Inquiries and subscriber records are isolated in secured cloud collections with atomic mutation boundaries, preventing data contamination and orphaned state.
                </p>
              </div>
            </div>
          </section>

          {/* Section 5: Email Transport Authentication */}
          <section className="p-6 sm:p-8 rounded-2xl bg-white/[0.02] border border-white/[0.08] backdrop-blur-xl shadow-xl transition-all duration-300">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-purple/10 border border-purple/20 flex items-center justify-center text-purple shrink-0 mt-1">
                <FaEnvelope className="w-5 h-5" />
              </div>
              <div className="space-y-3 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="text-xs font-mono font-semibold uppercase tracking-wider text-purple">
                    Section 05
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                    <IoCheckmarkCircleOutline className="w-3 h-3" />
                    Verified Delivery
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Transactional Email Gateway Standards
                </h2>
                <p className="text-sm sm:text-base text-neutral-300 leading-relaxed">
                  All transactional correspondence dispatched from the platform originates from authenticated domains (<code className="text-xs text-purple font-mono">gauravpatil.site</code>) via encrypted Brevo REST APIs.
                </p>
                <p className="text-sm sm:text-base text-neutral-300 leading-relaxed">
                  Domain records enforce strict <strong>SPF</strong> (Sender Policy Framework), <strong>DKIM</strong> (DomainKeys Identified Mail), and <strong>DMARC</strong> alignment to prevent email spoofing, phishing, and impersonation attacks.
                </p>
              </div>
            </div>
          </section>

          {/* Section 6: Responsible Disclosure */}
          <section className="p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-purple/10 via-white/[0.02] to-transparent border border-purple/20 backdrop-blur-xl shadow-xl">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-purple/20 border border-purple/30 flex items-center justify-center text-purple shrink-0 mt-1">
                <FaUserShield className="w-5 h-5" />
              </div>
              <div className="space-y-4 flex-1 min-w-0">
                <div>
                  <span className="text-xs font-mono font-semibold uppercase tracking-wider text-purple">
                    Section 06
                  </span>
                  <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight mt-1">
                    Responsible Vulnerability Disclosure
                  </h2>
                </div>
                <p className="text-sm sm:text-base text-neutral-300 leading-relaxed">
                  If you discover a security vulnerability, configuration flaw, or potential exploit in this portfolio or associated subdomains, you are encouraged to report it responsibly.
                </p>
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] space-y-2">
                  <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
                    Please provide detailed steps to reproduce the issue, along with any relevant proof-of-concept material. Reports are reviewed directly and remediated promptly.
                  </p>
                  <div className="pt-2">
                    <a
                      href="mailto:security@gauravpatil.site"
                      className="inline-flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-semibold text-black bg-purple hover:bg-[#b895f5] rounded-xl transition-all shadow-md active:scale-95"
                    >
                      <FaEnvelope className="w-3.5 h-3.5" />
                      <span>Report to security@gauravpatil.site</span>
                    </a>
                  </div>
                </div>
                <div className="pt-2">
                  <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-xs sm:text-sm text-purple hover:text-white transition-colors"
                  >
                    <span>Return to Portfolio</span>
                    <IoChevronForward className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
};
