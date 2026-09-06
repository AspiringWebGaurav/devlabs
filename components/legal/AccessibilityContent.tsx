import React from "react";
import Link from "next/link";
import {
  FaArrowLeft,
  FaUniversalAccess,
  FaKeyboard,
  FaEye,
  FaMobileScreenButton,
  FaHand,
  FaEnvelope,
} from "react-icons/fa6";
import { IoCheckmarkCircleOutline, IoChevronForward } from "react-icons/io5";

export const AccessibilityContent: React.FC = () => {
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
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            <span>Accessibility Standards</span>
          </div>
        </div>

        {/* Header */}
        <header className="mb-10 sm:mb-12">
          <p className="uppercase tracking-widest text-xs text-purple font-medium mb-3">
            Inclusion &amp; Standards
          </p>
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-white mb-4">
            Accessibility Statement
          </h1>
          <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-400 font-mono">
            <span>Design Benchmark</span>
            <span>•</span>
            <span className="text-purple font-semibold">WCAG 2.1 AA Principles</span>
            <span>•</span>
            <span className="text-emerald-400 font-semibold">Mobile-First Touch Ergonomics</span>
          </div>
          <p className="text-base sm:text-lg text-neutral-300 max-w-3xl leading-relaxed mt-5">
            Gaurav Portfolio is committed to digital accessibility and creating a barrier-free experience for all visitors, regardless of physical ability, device type, or assistive technology.
          </p>
        </header>

        {/* Content Grid */}
        <div className="grid grid-cols-1 gap-6 sm:gap-8">
          {/* Section 1: Accessibility Commitment */}
          <section className="p-6 sm:p-8 rounded-2xl bg-white/[0.02] border border-white/[0.08] backdrop-blur-xl shadow-xl transition-all duration-300">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-purple/10 border border-purple/20 flex items-center justify-center text-purple shrink-0 mt-1">
                <FaUniversalAccess className="w-5 h-5" />
              </div>
              <div className="space-y-3 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="text-xs font-mono font-semibold uppercase tracking-wider text-purple">
                    Section 01
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                    <IoCheckmarkCircleOutline className="w-3 h-3" />
                    Commitment
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Our Accessibility Commitment
                </h2>
                <p className="text-sm sm:text-base text-neutral-300 leading-relaxed">
                  Web experiences should be intuitive and universally navigable. This portfolio is engineered from the ground up to support modern assistive devices, keyboard-only navigation, screen readers, and variable viewport environments without functional degradation.
                </p>
              </div>
            </div>
          </section>

          {/* Section 2: Design Targets & Principles */}
          <section className="p-6 sm:p-8 rounded-2xl bg-white/[0.02] border border-white/[0.08] backdrop-blur-xl shadow-xl transition-all duration-300">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-purple/10 border border-purple/20 flex items-center justify-center text-purple shrink-0 mt-1">
                <FaEye className="w-5 h-5" />
              </div>
              <div className="space-y-4 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="text-xs font-mono font-semibold uppercase tracking-wider text-purple">
                    Section 02
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                    <IoCheckmarkCircleOutline className="w-3 h-3" />
                    Design Targets
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Design Targets &amp; Standards
                </h2>
                <p className="text-sm sm:text-base text-neutral-300 leading-relaxed">
                  The interface strives to adhere to the <strong>Web Content Accessibility Guidelines (WCAG) 2.1 Level AA</strong> principles:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
                  <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <h3 className="text-sm font-semibold text-white mb-1">Perceivable</h3>
                    <p className="text-xs text-neutral-400 leading-relaxed">
                      High-contrast typography (`#FFFFFF` and `#CBD5E1` against `#000319`) exceeding standard 4.5:1 contrast ratios.
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <h3 className="text-sm font-semibold text-white mb-1">Operable</h3>
                    <p className="text-xs text-neutral-400 leading-relaxed">
                      All interactive controls, modals, and navigation triggers are fully functional via standard keyboard controls.
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <h3 className="text-sm font-semibold text-white mb-1">Understandable</h3>
                    <p className="text-xs text-neutral-400 leading-relaxed">
                      Clear visual hierarchy, explicit error messaging on forms, and predictable layout states across all views.
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <h3 className="text-sm font-semibold text-white mb-1">Robust</h3>
                    <p className="text-xs text-neutral-400 leading-relaxed">
                      Semantic HTML5 tags (&lt;main&gt;, &lt;header&gt;, &lt;nav&gt;, &lt;footer&gt;) ensuring broad compatibility across browsers.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Section 3: Keyboard Navigation & Focus */}
          <section className="p-6 sm:p-8 rounded-2xl bg-white/[0.02] border border-white/[0.08] backdrop-blur-xl shadow-xl transition-all duration-300">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-purple/10 border border-purple/20 flex items-center justify-center text-purple shrink-0 mt-1">
                <FaKeyboard className="w-5 h-5" />
              </div>
              <div className="space-y-3 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="text-xs font-mono font-semibold uppercase tracking-wider text-purple">
                    Section 03
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Keyboard Navigation &amp; Focus Management
                </h2>
                <ul className="space-y-2 text-xs sm:text-sm text-neutral-300">
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple mt-1.5 shrink-0" />
                    <span><strong>Logical Tab Order:</strong> Tab index follows natural reading order across all sections, projects, and forms.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple mt-1.5 shrink-0" />
                    <span><strong>Focus Rings:</strong> Visible, high-visibility focus indicators (<code className="text-xs text-purple font-mono">:focus-visible</code>) are rendered around all active elements.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple mt-1.5 shrink-0" />
                    <span><strong>Modal Focus Trapping:</strong> Interactive overlays (Contact Modal, Assistant Window) trap focus within the active dialog and dismiss cleanly on the <kbd className="px-1.5 py-0.5 rounded bg-white/[0.1] text-xs font-mono">Escape</kbd> key.</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 4: Motion & Visual Stability */}
          <section className="p-6 sm:p-8 rounded-2xl bg-white/[0.02] border border-white/[0.08] backdrop-blur-xl shadow-xl transition-all duration-300">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-purple/10 border border-purple/20 flex items-center justify-center text-purple shrink-0 mt-1">
                <FaHand className="w-5 h-5" />
              </div>
              <div className="space-y-3 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="text-xs font-mono font-semibold uppercase tracking-wider text-purple">
                    Section 04
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Reduced Motion &amp; Layout Stability
                </h2>
                <p className="text-sm sm:text-base text-neutral-300 leading-relaxed">
                  For visitors with vestibular sensitivities or motion discomfort, the website respects the system-level <code className="text-xs text-purple font-mono">prefers-reduced-motion</code> media query.
                </p>
                <p className="text-sm sm:text-base text-neutral-300 leading-relaxed">
                  When enabled, non-essential 3D canvas rotations, floating parallax transitions, and kinetic slide animations are automatically replaced with subtle, instantaneous cross-fades. Additionally, all dynamic loaders maintain fixed skeleton bounds to enforce <strong>zero Cumulative Layout Shift (CLS = 0)</strong>.
                </p>
              </div>
            </div>
          </section>

          {/* Section 5: Mobile & Touch Ergonomics */}
          <section className="p-6 sm:p-8 rounded-2xl bg-white/[0.02] border border-white/[0.08] backdrop-blur-xl shadow-xl transition-all duration-300">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-purple/10 border border-purple/20 flex items-center justify-center text-purple shrink-0 mt-1">
                <FaMobileScreenButton className="w-5 h-5" />
              </div>
              <div className="space-y-3 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="text-xs font-mono font-semibold uppercase tracking-wider text-purple">
                    Section 05
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Touch Target Ergonomics &amp; Mobile Standards
                </h2>
                <p className="text-sm sm:text-base text-neutral-300 leading-relaxed">
                  All interactive touch targets—including social icon buttons, navigation pills, and form inputs—meet the recommended minimum bounding box of <strong>44x44 CSS pixels</strong>.
                </p>
                <p className="text-sm sm:text-base text-neutral-300 leading-relaxed">
                  Layouts are engineered with fluid scaling and responsive padding to prevent horizontal scroll clipping or unintended touch overlap on small screens.
                </p>
              </div>
            </div>
          </section>

          {/* Section 6: Feedback & Support */}
          <section className="p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-purple/10 via-white/[0.02] to-transparent border border-purple/20 backdrop-blur-xl shadow-xl">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-purple/20 border border-purple/30 flex items-center justify-center text-purple shrink-0 mt-1">
                <FaEnvelope className="w-5 h-5" />
              </div>
              <div className="space-y-4 flex-1 min-w-0">
                <div>
                  <span className="text-xs font-mono font-semibold uppercase tracking-wider text-purple">
                    Section 06
                  </span>
                  <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight mt-1">
                    Accessibility Feedback &amp; Assistance
                  </h2>
                </div>
                <p className="text-sm sm:text-base text-neutral-300 leading-relaxed">
                  If you encounter an accessibility barrier, experience difficulty accessing any content, or require information in an alternate format, please reach out directly:
                </p>
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <a
                    href="mailto:help@gauravpatil.site"
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-semibold text-black bg-purple hover:bg-[#b895f5] rounded-xl transition-all shadow-md active:scale-95"
                  >
                    <FaEnvelope className="w-3.5 h-3.5" />
                    <span>Email help@gauravpatil.site</span>
                  </a>
                  <Link
                    href="/"
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
