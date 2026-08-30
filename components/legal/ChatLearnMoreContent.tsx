import React from "react";
import Link from "next/link";
import {
  FaArrowLeft,
  FaRobot,
  FaCircleQuestion,
  FaComments,
  FaUserShield,
  FaShieldHalved,
  FaTriangleExclamation,
  FaEnvelope,
} from "react-icons/fa6";
import { IoInformationCircleOutline, IoCheckmarkCircleOutline, IoTimeOutline, IoChevronForward } from "react-icons/io5";

export const ChatLearnMoreContent: React.FC = () => {
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
            <span className="w-2 h-2 rounded-full bg-purple animate-pulse" />
            <span>Feature Guide &amp; Disclosure</span>
          </div>
        </div>

        {/* Header */}
        <header className="mb-10 sm:mb-12">
          <p className="uppercase tracking-widest text-xs text-purple font-medium mb-3">
            Transparency &amp; Exploration Guide
          </p>
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-white mb-4">
            Personal Assistant &amp; Chat Guide
          </h1>
          <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-400 font-mono">
            <span>Portfolio Component</span>
            <span>•</span>
            <span className="text-purple font-semibold">Gaurav Portfolio</span>
            <span>•</span>
            <span className="text-emerald-400 font-semibold">Privacy-First Ephemeral State</span>
          </div>
          <p className="text-base sm:text-lg text-neutral-300 max-w-3xl leading-relaxed mt-5">
            This guide provides transparent details on why the chat bubble exists, how the navigation options work, what is currently available versus planned, how data is handled, and how to reach Gaurav directly.
          </p>
        </header>

        {/* Content Grid */}
        <div className="grid grid-cols-1 gap-6 sm:gap-8">
          {/* Section 1: Hero & Architectural Purpose */}
          <section className="p-6 sm:p-8 rounded-2xl bg-white/[0.02] border border-white/[0.08] backdrop-blur-xl shadow-xl transition-all duration-300">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-purple/10 border border-purple/20 flex items-center justify-center text-purple shrink-0 mt-1">
                <FaRobot className="w-5 h-5" />
              </div>
              <div className="space-y-3 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="text-xs font-mono font-semibold uppercase tracking-wider text-purple">
                    Section 01
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                    <IoCheckmarkCircleOutline className="w-3 h-3" />
                    Available Now
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Why Does the Chat Bubble Exist?
                </h2>
                <p className="text-sm sm:text-base text-neutral-300 leading-relaxed">
                  The Gaurav Portfolio Assistant bubble was designed as an interactive navigation companion. Modern technical portfolios contain complex project architectures, performance benchmarks, and tech stacks that can be time-consuming to parse through static text alone.
                </p>
                <p className="text-sm sm:text-base text-neutral-300 leading-relaxed">
                  The assistant interface provides a streamlined, floating entry point where visitors, recruiters, and engineering colleagues can quickly locate specific architectural highlights, explore common questions, and access direct communication channels without navigating away from their current view.
                </p>
              </div>
            </div>
          </section>

          {/* Section 2: What Visitors Can Use It For */}
          <section className="p-6 sm:p-8 rounded-2xl bg-white/[0.02] border border-white/[0.08] backdrop-blur-xl shadow-xl transition-all duration-300">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-purple/10 border border-purple/20 flex items-center justify-center text-purple shrink-0 mt-1">
                <IoInformationCircleOutline className="w-5 h-5" />
              </div>
              <div className="space-y-4 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="text-xs font-mono font-semibold uppercase tracking-wider text-purple">
                    Section 02
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                    <IoCheckmarkCircleOutline className="w-3 h-3" />
                    Supported Workflows
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  What Can Visitors Use It For?
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
                  <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <h3 className="text-sm font-semibold text-white mb-1">Project Deep Dives</h3>
                    <p className="text-xs text-neutral-400 leading-relaxed">
                      Discover the technical architecture, design patterns, and engineering choices behind key portfolio showcase projects.
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <h3 className="text-sm font-semibold text-white mb-1">Tech Stack &amp; Skills</h3>
                    <p className="text-xs text-neutral-400 leading-relaxed">
                      Explore proficiency across Next.js 15, React 19, TypeScript, Tailwind CSS, Three.js WebGL, and Cloud Firestore.
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <h3 className="text-sm font-semibold text-white mb-1">Engineering Standards</h3>
                    <p className="text-xs text-neutral-400 leading-relaxed">
                      Learn about core architectural invariants, zero layout shift (CLS = 0), and Swiss light administrative design.
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <h3 className="text-sm font-semibold text-white mb-1">Direct Contact Initiation</h3>
                    <p className="text-xs text-neutral-400 leading-relaxed">
                      Easily launch the structured contact form or reach Gaurav directly for project proposals and hiring conversations.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Section 3: Option 1 — Predefined Questions */}
          <section className="p-6 sm:p-8 rounded-2xl bg-white/[0.02] border border-white/[0.08] backdrop-blur-xl shadow-xl transition-all duration-300">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-[#7C3AED]/10 border border-[#7C3AED]/20 flex items-center justify-center text-[#CBACF9] shrink-0 mt-1">
                <FaCircleQuestion className="w-5 h-5" />
              </div>
              <div className="space-y-3 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="text-xs font-mono font-semibold uppercase tracking-wider text-[#CBACF9]">
                    Section 03
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400">
                    <IoTimeOutline className="w-3 h-3" />
                    Preview / In Development
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  What is &ldquo;Predefined Questions&rdquo;?
                </h2>
                <p className="text-sm sm:text-base text-neutral-300 leading-relaxed">
                  <strong>Current Status:</strong> The Predefined Questions view inside the chat bubble is currently a preview interface. It is planned as a curated, guided-question experience where visitors can select from structured topics (such as case studies, development workflow, and tech stack details) to view instant answers.
                </p>
                <p className="text-sm sm:text-base text-neutral-300 leading-relaxed">
                  When fully connected, this option will allow visitors to rapidly browse frequent inquiries without typing custom prompts.
                </p>
              </div>
            </div>
          </section>

          {/* Section 4: Option 2 — Live Chat */}
          <section className="p-6 sm:p-8 rounded-2xl bg-white/[0.02] border border-white/[0.08] backdrop-blur-xl shadow-xl transition-all duration-300">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-[#7C3AED]/10 border border-[#7C3AED]/20 flex items-center justify-center text-[#CBACF9] shrink-0 mt-1">
                <FaComments className="w-5 h-5" />
              </div>
              <div className="space-y-3 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="text-xs font-mono font-semibold uppercase tracking-wider text-[#CBACF9]">
                    Section 04
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400">
                    <IoTimeOutline className="w-3 h-3" />
                    Preview / In Development
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  What is &ldquo;Live Chat with Gaurav&rdquo;?
                </h2>
                <p className="text-sm sm:text-base text-neutral-300 leading-relaxed">
                  <strong>Current Status:</strong> The Live Chat with Gaurav view inside the bubble is configured as a direct communication channel. When connected, the system will notify Gaurav live so he can respond directly.
                </p>
                <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-2">
                  <h3 className="text-xs font-mono uppercase tracking-wider font-semibold text-amber-400">
                    Important Clarification on Live Chat
                  </h3>
                  <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
                    Live Chat with Gaurav is designed to dispatch real-time alerts to Gaurav. <strong>It does not establish an outsourced chat operator team.</strong> All human correspondence and collaboration are conducted directly by Gaurav Patil.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 5: Human Communication Boundaries */}
          <section className="p-6 sm:p-8 rounded-2xl bg-white/[0.02] border border-white/[0.08] backdrop-blur-xl shadow-xl transition-all duration-300">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-purple/10 border border-purple/20 flex items-center justify-center text-purple shrink-0 mt-1">
                <FaUserShield className="w-5 h-5" />
              </div>
              <div className="space-y-3 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="text-xs font-mono font-semibold uppercase tracking-wider text-purple">
                    Section 05
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                    <IoCheckmarkCircleOutline className="w-3 h-3" />
                    Individual Owner Model
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Human Involvement &amp; Direct Communication
                </h2>
                <p className="text-sm sm:text-base text-neutral-300 leading-relaxed">
                  Gaurav Portfolio is owned, developed, and operated exclusively by <strong>Gaurav Patil</strong> as an individual creator and developer.
                </p>
                <p className="text-sm sm:text-base text-neutral-300 leading-relaxed">
                  When you submit a project inquiry or send a message through the contact system, your submission routes directly to Gaurav&apos;s personal inbox. There are no intermediary call centers, support tiers, or automated surrogate responders handling your correspondence.
                </p>
              </div>
            </div>
          </section>

          {/* Section 6: Data Handling & Ephemeral State */}
          <section className="p-6 sm:p-8 rounded-2xl bg-white/[0.02] border border-white/[0.08] backdrop-blur-xl shadow-xl transition-all duration-300">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-purple/10 border border-purple/20 flex items-center justify-center text-purple shrink-0 mt-1">
                <FaShieldHalved className="w-5 h-5" />
              </div>
              <div className="space-y-3 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="text-xs font-mono font-semibold uppercase tracking-wider text-purple">
                    Section 06
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                    <IoCheckmarkCircleOutline className="w-3 h-3" />
                    Code-Verified Privacy
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  How Is Chat Data Handled?
                </h2>
                <p className="text-sm sm:text-base text-neutral-300 leading-relaxed">
                  Based on current code implementation:
                </p>
                <ul className="space-y-2 text-xs sm:text-sm text-neutral-300">
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple mt-1.5 shrink-0" />
                    <span><strong>In-Memory Navigation State:</strong> In the current implementation, chat interaction state is held in React browser memory and is not persisted by the chat components.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple mt-1.5 shrink-0" />
                    <span><strong>No Chat Database Persistence:</strong> Chat navigation views do not execute database writes or local storage logging.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple mt-1.5 shrink-0" />
                    <span><strong>No Third-Party AI Models:</strong> The current Chat Bubble implementation does not send chat messages to a third-party AI model provider.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple mt-1.5 shrink-0" />
                    <span><strong>No Chat-Specific Cookies:</strong> The assistant components do not create or use chat-specific cookies.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple mt-1.5 shrink-0" />
                    <span><strong>Separate Contact Workflow:</strong> Contact-form submissions are a separate workflow governed by the existing <Link href="/privacy" className="text-purple hover:underline">Privacy Policy</Link> and contact/data-request process.</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 7: Limitations & Appropriate Use */}
          <section className="p-6 sm:p-8 rounded-2xl bg-white/[0.02] border border-white/[0.08] backdrop-blur-xl shadow-xl transition-all duration-300">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-purple/10 border border-purple/20 flex items-center justify-center text-purple shrink-0 mt-1">
                <FaTriangleExclamation className="w-5 h-5" />
              </div>
              <div className="space-y-3 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="text-xs font-mono font-semibold uppercase tracking-wider text-purple">
                    Section 07
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Limitations &amp; Appropriate Use
                </h2>
                <p className="text-sm sm:text-base text-neutral-300 leading-relaxed">
                  The assistant interface is provided strictly for informational and navigational purposes. While designed to represent portfolio details accurately, automated previews should not be taken as formal contractual guarantees.
                </p>
                <p className="text-sm sm:text-base text-neutral-300 leading-relaxed">
                  For formal inquiries, technical audits, or engineering consultations, please refer directly to the verified source code in public repositories and communicate directly with Gaurav Patil.
                </p>
              </div>
            </div>
          </section>

          {/* Section 8: Direct Contact & Actions */}
          <section className="p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-purple/10 via-white/[0.02] to-transparent border border-purple/20 backdrop-blur-xl shadow-xl">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-purple/20 border border-purple/30 flex items-center justify-center text-purple shrink-0 mt-1">
                <FaEnvelope className="w-5 h-5" />
              </div>
              <div className="space-y-4 flex-1 min-w-0">
                <div>
                  <span className="text-xs font-mono font-semibold uppercase tracking-wider text-purple">
                    Section 08
                  </span>
                  <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight mt-1">
                    Ready to Connect Directly?
                  </h2>
                </div>
                <p className="text-sm sm:text-base text-neutral-300 leading-relaxed">
                  Have a specific project in mind, need architectural consulting, or want to discuss full-stack engineering opportunities? Reach out directly.
                </p>
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <a
                    href="mailto:hello@gauravpatil.online"
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-semibold text-black bg-purple hover:bg-[#b895f5] rounded-xl transition-all shadow-md active:scale-95"
                  >
                    <FaEnvelope className="w-3.5 h-3.5" />
                    <span>Email hello@gauravpatil.online</span>
                  </a>
                  <Link
                    href="/#contact"
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] rounded-xl transition-all active:scale-95"
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
