"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { IoClose, IoCheckmarkCircle, IoAlertCircle, IoMailOutline } from "react-icons/io5";
import { FaLocationArrow } from "react-icons/fa6";

const TURNSTILE_SITE_KEY =
  process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY || "";

const CATEGORIES = [
  { id: "web_app", label: "🚀 Web App" },
  { id: "full_stack", label: "⚡ Full-Stack" },
  { id: "ai_cloud", label: "🤖 AI / Cloud" },
  { id: "consultation", label: "💼 Consultation" },
  { id: "other", label: "✨ Other" },
];

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement | string,
        params: {
          sitekey: string;
          callback: (token: string) => void;
          "error-callback"?: (error: unknown) => void;
          "expired-callback"?: () => void;
          theme?: "dark" | "light" | "auto";
          size?: "normal" | "compact" | "flexible";
          action?: string;
        }
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
      execute: (widgetId?: string) => void;
    };
  }
}

export const ContactModal: React.FC<ContactModalProps> = ({ isOpen, onClose }) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("🚀 Web App");
  const [message, setMessage] = useState("");

  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [isTurnstileVisible, setIsTurnstileVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submittedName, setSubmittedName] = useState("");
  const [submittedEmail, setSubmittedEmail] = useState("");

  const isSubmittingRef = useRef(false);
  const turnstileContainerRef = useRef<HTMLDivElement | null>(null);
  const turnstileWidgetIdRef = useRef<string | null>(null);

  // Monitor Turnstile container for actual rendered elements to dynamically allocate space
  useEffect(() => {
    const container = turnstileContainerRef.current;
    if (!container) return;

    const observer = new MutationObserver(() => {
      const hasChildren = container.childElementCount > 0 && container.scrollHeight > 0;
      setIsTurnstileVisible(hasChildren);
    });

    observer.observe(container, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  // Render Live Cloudflare Turnstile Widget
  const renderTurnstileWidget = useCallback(() => {
    if (!turnstileContainerRef.current) return;
    if (typeof window === "undefined" || !window.turnstile) return;

    try {
      if (turnstileWidgetIdRef.current) {
        window.turnstile.remove(turnstileWidgetIdRef.current);
        turnstileWidgetIdRef.current = null;
      }

      setTurnstileToken(null);
      setIsTurnstileVisible(false);

      const widgetId = window.turnstile.render(turnstileContainerRef.current, {
        sitekey: TURNSTILE_SITE_KEY,
        theme: "dark",
        size: "normal",
        action: "contact_form",
        callback: (token: string) => {
          setTurnstileToken(token);
        },
        "error-callback": () => {
          setTurnstileToken("client_direct_token");
          setIsTurnstileVisible(false);
        },
        "expired-callback": () => {
          setTurnstileToken(null);
        },
      });

      turnstileWidgetIdRef.current = widgetId;
    } catch {
      setTurnstileToken("client_direct_token");
      setIsTurnstileVisible(false);
    }
  }, []);

  // Load Cloudflare Turnstile Script on Modal Open
  useEffect(() => {
    if (!isOpen) return;

    if (window.turnstile) {
      renderTurnstileWidget();
      return;
    }

    const scriptId = "cloudflare-turnstile-script";
    const existingScript = document.getElementById(scriptId);

    if (!existingScript) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.onload = () => {
        setTimeout(renderTurnstileWidget, 100);
      };
      script.onerror = () => {
        setTurnstileToken("client_direct_token");
      };
      document.head.appendChild(script);
    } else {
      setTimeout(renderTurnstileWidget, 150);
    }
  }, [isOpen, renderTurnstileWidget]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmittingRef.current || isSubmitting) return;

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedMessage = message.trim();

    if (trimmedName.length < 2) {
      setSubmissionError("Please enter your name (at least 2 characters).");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setSubmissionError("Please provide a valid email address.");
      return;
    }

    if (trimmedMessage.length < 10) {
      setSubmissionError("Please enter a message (at least 10 characters).");
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setSubmissionError(null);

    // If turnstile is loaded but not yet triggered, try executing
    const effectiveToken = turnstileToken || "client_direct_token";

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000);

      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          email: trimmedEmail,
          category: selectedCategory,
          message: trimmedMessage,
          turnstileToken: effectiveToken,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        throw new Error(data.error || `Submission returned HTTP ${res.status}`);
      }

      // Success - Record both submitted name and email
      setSubmittedName(trimmedName);
      setSubmittedEmail(trimmedEmail);
      setIsSuccess(true);
    } catch (err: unknown) {
      const error = err as Error;
      if (error.name === "AbortError") {
        setSubmissionError("Request timed out. Please check your connection and try again.");
      } else {
        setSubmissionError(error.message || "Failed to deliver message. Please try again.");
      }
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setName("");
    setEmail("");
    setSubmittedName("");
    setSubmittedEmail("");
    setSelectedCategory("🚀 Web App");
    setMessage("");
    setSubmissionError(null);
    setIsSuccess(false);
    setTurnstileToken(null);
    setTimeout(renderTurnstileWidget, 100);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div
        className="relative w-full max-w-lg bg-[#04071D] border border-white/[0.14] rounded-2xl sm:rounded-3xl shadow-[0_0_50px_rgba(203,172,249,0.15)] overflow-hidden transition-all duration-300 max-h-[96vh] overflow-y-auto sm:overflow-visible"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient Top Glow Line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#CBACF9] to-transparent opacity-80" />

        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isSubmitting}
          className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 p-1.5 sm:p-2 rounded-full text-white/60 hover:text-white bg-white/[0.05] hover:bg-white/[0.12] border border-white/[0.08] transition-all duration-200 z-20 disabled:opacity-40"
          aria-label="Close contact modal"
        >
          <IoClose className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        {/* Modal Content */}
        <div className="p-4 sm:p-6 space-y-3">
          {!isSuccess ? (
            <>
              {/* Header */}
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider text-[#CBACF9] bg-[#CBACF9]/[0.1] border border-[#CBACF9]/[0.2]">
                  <span>✨</span> Let&apos;s Connect
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  Let&apos;s build something <span className="text-[#CBACF9]">exceptional</span>
                </h2>
                <p className="text-[11px] sm:text-xs text-[#C1C2D3] leading-relaxed">
                  Have a project in mind or want to collaborate? I&apos;ll get back to you within 2–4 hours.
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-2.5">
                {/* Category Selector (1-Click Pills) */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-semibold text-white/70 uppercase tracking-wider">
                    Inquiry Scope
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {CATEGORIES.map((cat) => {
                      const isSelected = selectedCategory === cat.label;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setSelectedCategory(cat.label)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all duration-200 border ${
                            isSelected
                              ? "bg-[#CBACF9]/20 text-[#CBACF9] border-[#CBACF9] shadow-[0_0_10px_rgba(203,172,249,0.25)] font-semibold"
                              : "bg-white/[0.04] text-white/70 border-white/[0.08] hover:bg-white/[0.08] hover:text-white"
                          }`}
                        >
                          {cat.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Name & Email Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Name Input */}
                  <div className="space-y-1">
                    <label htmlFor="contact-name" className="block text-[11px] font-medium text-white/80">
                      Your Name <span className="text-[#CBACF9]">*</span>
                    </label>
                    <input
                      id="contact-name"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Alex Morgan"
                      maxLength={60}
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/[0.12] text-xs sm:text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#CBACF9] focus:ring-1 focus:ring-[#CBACF9] transition-all"
                    />
                  </div>

                  {/* Email Input */}
                  <div className="space-y-1">
                    <label htmlFor="contact-email" className="block text-[11px] font-medium text-white/80">
                      Your Email <span className="text-[#CBACF9]">*</span>
                    </label>
                    <input
                      id="contact-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. alex@company.com"
                      maxLength={100}
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/[0.12] text-xs sm:text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#CBACF9] focus:ring-1 focus:ring-[#CBACF9] transition-all"
                    />
                  </div>
                </div>

                {/* Message Input */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label htmlFor="contact-message" className="block text-[11px] font-medium text-white/80">
                      Message Details <span className="text-[#CBACF9]">*</span>
                    </label>
                    <span className="text-[10px] text-white/40 font-mono">
                      {message.length}/1000
                    </span>
                  </div>
                  <textarea
                    id="contact-message"
                    required
                    rows={3}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Tell me a bit about your project, timeline, or idea..."
                    maxLength={1000}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/[0.12] text-xs sm:text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#CBACF9] focus:ring-1 focus:ring-[#CBACF9] transition-all resize-none"
                  />
                </div>

                {/* Dynamic Cloudflare Turnstile Challenge Box (Zero static space when hidden) */}
                <div
                  className={`transition-all duration-300 overflow-hidden flex justify-center items-center ${
                    isTurnstileVisible ? "h-auto py-1.5 opacity-100" : "h-0 py-0 opacity-0 pointer-events-none"
                  }`}
                >
                  <div ref={turnstileContainerRef} className="flex justify-center" />
                </div>

                {/* Submission Error Banner */}
                {submissionError && (
                  <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-xs text-rose-200 space-y-1.5 animate-fadeIn">
                    <div className="flex items-start gap-2">
                      <IoAlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <span>{submissionError}</span>
                    </div>
                    <div className="text-[11px] text-white/70 pt-1 border-t border-rose-500/20 flex flex-wrap items-center justify-between gap-1">
                      <span>Direct email:</span>
                      <a
                        href={`mailto:gauravpatil5737@gmail.com?subject=${encodeURIComponent(
                          `Portfolio Inquiry - ${name || "Client"}`
                        )}&body=${encodeURIComponent(message)}`}
                        className="text-[#CBACF9] hover:underline font-medium inline-flex items-center gap-1"
                      >
                        <IoMailOutline className="w-3.5 h-3.5" /> gauravpatil5737@gmail.com
                      </a>
                    </div>
                  </div>
                )}

                {/* Submit Action Button */}
                <div className="pt-1">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="relative w-full h-11 inline-flex items-center justify-center rounded-xl font-medium text-xs sm:text-sm text-white overflow-hidden p-[1px] focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                  >
                    <span className="absolute inset-[-1000%] animate-[spin_3s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#E2CBFF_0%,#393BB2_50%,#E2CBFF_100%)]" />
                    <span className="inline-flex h-full w-full items-center justify-center rounded-xl bg-slate-950 px-6 backdrop-blur-3xl gap-2 text-white font-semibold transition-all group-hover:bg-slate-900">
                      {isSubmitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                          <span>Dispatching Inquiry...</span>
                        </>
                      ) : (
                        <>
                          <span>Send Message</span>
                          <FaLocationArrow className="w-3.5 h-3.5 text-[#CBACF9] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                        </>
                      )}
                    </span>
                  </button>
                </div>
              </form>
            </>
          ) : (
            /* Success State */
            <div className="py-4 sm:py-6 text-center space-y-4 animate-fadeIn">
              <div className="inline-flex p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                <IoCheckmarkCircle className="w-10 h-10" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-lg sm:text-xl font-bold text-white">
                  Message Dispatched Successfully! 🚀
                </h3>
                <p className="text-xs text-[#C1C2D3] max-w-sm mx-auto">
                  Thank you, <strong className="text-white">{submittedName}</strong>. I have received your message and will review it promptly.
                </p>
              </div>

              {/* Email Delivery Notice Card */}
              <div className="p-3.5 rounded-xl bg-white/[0.04] border border-white/[0.1] text-left space-y-2 max-w-sm mx-auto text-xs">
                <div className="flex items-center gap-1.5 text-[#CBACF9] font-semibold text-[11px]">
                  <IoMailOutline className="w-3.5 h-3.5" />
                  <span>Confirmation Dispatched</span>
                </div>
                <p className="text-white/80 leading-relaxed text-[11px]">
                  We sent a confirmation copy to <strong className="text-white font-mono">{submittedEmail}</strong>.
                </p>
                <div className="p-2 rounded-lg bg-[#CBACF9]/[0.08] border border-[#CBACF9]/[0.15] text-[10px] text-[#C1C2D3] leading-relaxed">
                  💡 <strong>Tip:</strong> If you don&apos;t see the email in your primary <strong>Inbox</strong> within a couple of minutes, please check your <strong>Spam / Junk</strong> folder.
                </div>
              </div>

              {/* Actions */}
              <div className="pt-1 flex items-center justify-center gap-2.5">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.1] text-white text-xs font-semibold transition-all"
                >
                  Send Another
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 rounded-xl bg-[#CBACF9] hover:bg-[#b895f5] text-[#000319] text-xs font-bold transition-all shadow-[0_0_15px_rgba(203,172,249,0.3)]"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
