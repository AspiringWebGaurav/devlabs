"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  IoClose,
  IoCheckmarkCircle,
  IoAlertCircle,
  IoMailOutline,
  IoPersonOutline,
  IoShieldCheckmarkOutline,
  IoCloudOfflineOutline,
} from "react-icons/io5";
import { FaLocationArrow } from "react-icons/fa6";

const TURNSTILE_SITE_KEY =
  process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY ||
  "0x4AAAAAABe0jAr2HXu1hIs4";

const DRAFT_STORAGE_KEY = "gaurav_portfolio_contact_draft";

export const USER_ROLES = [
  { id: "recruiter", label: "Recruiter / Talent", icon: "💼" },
  { id: "founder", label: "Founder / CEO", icon: "🏢" },
  { id: "lead", label: "Engineering Lead", icon: "🚀" },
  { id: "client", label: "Client / Project", icon: "🤝" },
  { id: "visitor", label: "Visitor", icon: "✨" },
] as const;

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
          size?: "normal" | "compact" | "flexible" | "invisible";
          action?: string;
        }
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
      execute: (widgetId?: string) => void;
    };
  }
}

export const ContactModal: React.FC<ContactModalProps> = ({
  isOpen,
  onClose,
}) => {
  // Form State
  const [selectedRole, setSelectedRole] = useState<string>("Recruiter / Talent");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  // Network & Lifecycle State
  const [isOnline, setIsOnline] = useState(true);

  // Turnstile & Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // Success Snapshot
  const [submittedData, setSubmittedData] = useState<{
    name: string;
    email: string;
    role: string;
    subject: string;
    leadNumber?: number;
  } | null>(null);

  const isMountedRef = useRef(true);
  const isSubmittingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const turnstileContainerRef = useRef<HTMLDivElement | null>(null);
  const turnstileWidgetIdRef = useRef<string | null>(null);
  const pendingSubmitPayloadRef = useRef<{
    name: string;
    email: string;
    subject: string;
    message: string;
  } | null>(null);

  // =========================================================================
  // 1. Network Status & Connectivity Lifecycle
  // =========================================================================
  useEffect(() => {
    isMountedRef.current = true;

    if (typeof window !== "undefined") {
      setIsOnline(navigator.onLine);

      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);

      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);

      return () => {
        isMountedRef.current = false;
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
      };
    }
  }, []);

  // =========================================================================
  // 2. Local Draft Recovery (Crash / Battery Shutdown / Accidental Close Protection)
  // =========================================================================
  useEffect(() => {
    if (!isOpen) return;

    try {
      const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft);
        if (parsed && typeof parsed === "object") {
          setName((prev) => (!prev && parsed.name ? parsed.name : prev));
          setEmail((prev) => (!prev && parsed.email ? parsed.email : prev));
          setSubject((prev) => (!prev && parsed.subject ? parsed.subject : prev));
          setMessage((prev) => (!prev && parsed.message ? parsed.message : prev));
          if (parsed.selectedRole) setSelectedRole(parsed.selectedRole);
        }
      }
    } catch {
      // LocalStorage access restricted or unavailable
    }
  }, [isOpen]);

  // Auto-Save Draft to Storage
  useEffect(() => {
    if (!isOpen || isSuccess) return;

    const timeoutId = setTimeout(() => {
      try {
        if (name || email || subject || message) {
          localStorage.setItem(
            DRAFT_STORAGE_KEY,
            JSON.stringify({ name, email, subject, message, selectedRole })
          );
        }
      } catch {
        // Storage quota exceeded or disabled
      }
    }, 400);

    return () => clearTimeout(timeoutId);
  }, [name, email, subject, message, selectedRole, isOpen, isSuccess]);

  // =========================================================================
  // 3. Pre-load Cloudflare Turnstile Script in Background
  // =========================================================================
  useEffect(() => {
    if (!isOpen) {
      if (typeof window !== "undefined" && window.turnstile && turnstileWidgetIdRef.current) {
        try {
          window.turnstile.remove(turnstileWidgetIdRef.current);
        } catch {
          // Ignore
        }
        turnstileWidgetIdRef.current = null;
      }
      pendingSubmitPayloadRef.current = null;
      return;
    }

    if (typeof window === "undefined") return;

    const existingScript = document.getElementById("cf-turnstile-script");
    if (!existingScript) {
      const script = document.createElement("script");
      script.id = "cf-turnstile-script";
      script.src =
        "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
  }, [isOpen]);

  // Component Unmount Cleanup (Zero Memory Leaks)
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && window.turnstile && turnstileWidgetIdRef.current) {
        try {
          window.turnstile.remove(turnstileWidgetIdRef.current);
        } catch {
          // Ignore
        }
        turnstileWidgetIdRef.current = null;
      }
    };
  }, []);

  // Lock Body Scroll & Handle ESC Key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Reset Form & Purge Draft
  const resetForm = () => {
    setName("");
    setEmail("");
    setSelectedRole("Recruiter / Talent");
    setSubject("");
    setMessage("");
    setSubmissionError(null);
    setIsSuccess(false);
    setSubmittedData(null);
    pendingSubmitPayloadRef.current = null;
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch {
      // Ignore
    }
    if (window.turnstile && turnstileWidgetIdRef.current) {
      try {
        window.turnstile.remove(turnstileWidgetIdRef.current);
      } catch {
        // Ignore
      }
      turnstileWidgetIdRef.current = null;
    }
  };

  // =========================================================================
  // 4. Serverless Dispatch Execution
  // =========================================================================
  const submitWithToken = useCallback(
    async (
      token: string | null,
      trimmedName: string,
      trimmedEmail: string,
      trimmedSubject: string,
      trimmedMessage: string
    ) => {
      // Setup 15s Client Request Timeout with AbortController
      const controller = new AbortController();
      abortControllerRef.current = controller;
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      try {
        const response = await fetch("/api/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: trimmedName,
            email: trimmedEmail,
            role: selectedRole,
            subject: trimmedSubject,
            category: trimmedSubject,
            message: trimmedMessage,
            turnstileToken: token || undefined,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        const data = await response.json().catch(() => ({}));

        if (!response.ok || !data.success) {
          throw new Error(
            data.error ||
              "Unable to dispatch message at this moment. Please try again."
          );
        }

        // Success: Clear saved draft from local storage
        try {
          localStorage.removeItem(DRAFT_STORAGE_KEY);
        } catch {
          // Ignore
        }

        if (isMountedRef.current) {
          setSubmittedData({
            name: trimmedName,
            email: trimmedEmail,
            role: selectedRole,
            subject: trimmedSubject,
            leadNumber: data.leadNumber,
          });
          setIsSuccess(true);
        }
      } catch (err: unknown) {
        clearTimeout(timeoutId);
        const error = err as Error;
        const isTimeout = error.name === "AbortError";

        if (isMountedRef.current) {
          const errorMsg = isTimeout
            ? "Network timeout (15s). Weak connection detected. Your message is safely saved; please tap Send again."
            : error.message || "An unexpected error occurred. Please try again.";
          setSubmissionError(errorMsg);

          if (window.turnstile && turnstileWidgetIdRef.current) {
            try {
              window.turnstile.reset(turnstileWidgetIdRef.current);
            } catch {
              // Ignore
            }
          }
        }
      } finally {
        if (isMountedRef.current) {
          setIsSubmitting(false);
        }
        isSubmittingRef.current = false;
        abortControllerRef.current = null;
        pendingSubmitPayloadRef.current = null;
      }
    },
    [selectedRole]
  );

  // =========================================================================
  // 5. Dynamic Cloudflare Turnstile Challenge Mounting on Submit
  // =========================================================================
  const renderTurnstileWidget = useCallback(() => {
    if (!turnstileContainerRef.current) return;
    if (typeof window === "undefined" || !window.turnstile) return;

    try {
      if (turnstileWidgetIdRef.current) {
        window.turnstile.remove(turnstileWidgetIdRef.current);
        turnstileWidgetIdRef.current = null;
      }

      const isNarrow = window.innerWidth < 400;

      const widgetId = window.turnstile.render(turnstileContainerRef.current, {
        sitekey: TURNSTILE_SITE_KEY,
        theme: "light",
        size: isNarrow ? "compact" : "normal",
        action: "contact_inquiry",
        callback: (token: string) => {
          if (isMountedRef.current) {
            if (pendingSubmitPayloadRef.current) {
              const payload = pendingSubmitPayloadRef.current;
              pendingSubmitPayloadRef.current = null;
              submitWithToken(token, payload.name, payload.email, payload.subject, payload.message);
            }
          }
        },
        "error-callback": () => {
          if (isMountedRef.current) {
            const fallbackToken = "cf_client_token";
            if (pendingSubmitPayloadRef.current) {
              const payload = pendingSubmitPayloadRef.current;
              pendingSubmitPayloadRef.current = null;
              submitWithToken(fallbackToken, payload.name, payload.email, payload.subject, payload.message);
            }
          }
        },
        "expired-callback": () => {
          if (isMountedRef.current) {
            if (window.turnstile && turnstileWidgetIdRef.current) {
              try {
                window.turnstile.reset(turnstileWidgetIdRef.current);
              } catch {
                // Ignore
              }
            }
          }
        },
      });

      turnstileWidgetIdRef.current = widgetId;
    } catch (err) {
      console.warn("Turnstile initialization note:", err);
      if (isMountedRef.current) {
        const fallbackToken = "cf_fallback_token";
        if (pendingSubmitPayloadRef.current) {
          const payload = pendingSubmitPayloadRef.current;
          pendingSubmitPayloadRef.current = null;
          submitWithToken(fallbackToken, payload.name, payload.email, payload.subject, payload.message);
        }
      }
    }
  }, [submitWithToken]);

  // Mount Turnstile whenever isSubmitting transitions to true
  useEffect(() => {
    if (!isSubmitting) return;

    if (typeof window !== "undefined") {
      if (window.turnstile) {
        renderTurnstileWidget();
      } else {
        const interval = setInterval(() => {
          if (window.turnstile) {
            clearInterval(interval);
            renderTurnstileWidget();
          }
        }, 100);
        return () => clearInterval(interval);
      }
    }
  }, [isSubmitting, renderTurnstileWidget]);

  // =========================================================================
  // 6. Submit Trigger
  // =========================================================================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmittingRef.current || isSubmitting) return;

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedSubject = subject.trim() || "General Inquiry";
    const trimmedMessage = message.trim();

    // Anti-Abuse Client-Side Validations
    if (!trimmedName || trimmedName.length < 2) {
      setSubmissionError("Please enter your name (min 2 characters).");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
      setSubmissionError("Please provide a valid email address.");
      return;
    }

    if (!trimmedMessage || trimmedMessage.length < 10) {
      setSubmissionError("Please enter message details (minimum 10 characters).");
      return;
    }

    if (!navigator.onLine) {
      setSubmissionError("No internet connection. Your draft is saved & ready to send once reconnected.");
      return;
    }

    setSubmissionError(null);
    setIsSubmitting(true);
    isSubmittingRef.current = true;

    pendingSubmitPayloadRef.current = {
      name: trimmedName,
      email: trimmedEmail,
      subject: trimmedSubject,
      message: trimmedMessage,
    };
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-6 md:p-8 bg-black/85 backdrop-blur-md transition-all duration-200 select-none overflow-hidden"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      {/* 
        Single-View Zero-Scroll Modal Container
        Specifically tailored for Mobile (<640px), Tablet (640-1024px), and Desktop (>1024px)
        Zero internal scrollbars, proportional scaling, touch-manipulation.
      */}
      <div
        className="w-full max-w-[95vw] sm:max-w-xl md:max-w-2xl bg-[#0B0F19] border border-white/[0.1] rounded-2xl sm:rounded-3xl shadow-2xl shadow-purple/20 relative overflow-hidden text-white flex flex-col p-3.5 sm:p-6 md:p-8 my-auto max-h-[94vh] sm:max-h-[88vh] transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle Ambient Top Glow Line */}
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#8B5CF6] to-transparent z-20" />

        {/* Ambient Radial Highlights */}
        <div className="absolute -top-12 -right-12 w-64 h-64 bg-[#7C3AED]/12 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-[#6366F1]/10 rounded-full blur-3xl pointer-events-none" />

        {/* 1. Header */}
        <div className="flex items-start justify-between pb-2 sm:pb-3.5 border-b border-white/[0.08] relative z-10 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-2xl font-bold text-white tracking-tight">
                Get in touch
              </h2>
              {!isOnline && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/15 border border-amber-500/30 text-amber-300">
                  <IoCloudOfflineOutline className="w-3 h-3" />
                  <span>Offline</span>
                </span>
              )}
            </div>
            <p className="text-[11px] sm:text-sm text-neutral-400 mt-0.5 leading-tight sm:leading-relaxed">
              Have a project, job opportunity, or inquiry? Send a direct message.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="w-7 h-7 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/[0.08] transition-colors -mr-1 -mt-1 active:scale-95 touch-manipulation cursor-pointer"
          >
            <IoClose className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* 2. Modal Body */}
        <div className="pt-2.5 sm:pt-3.5 relative z-10 flex-1 flex flex-col justify-between">
          {isSuccess && submittedData ? (
            /* ============================================================= */
            /* SUCCESS CONFIRMATION SCREEN (Single-View No-Scroll)           */
            /* ============================================================= */
            <div className="py-3 sm:py-6 text-center space-y-3 sm:space-y-5 animate-in fade-in zoom-in-95 duration-200 my-auto">
              <div className="w-10 h-10 sm:w-16 sm:h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <IoCheckmarkCircle className="w-6 h-6 sm:w-9 sm:h-9" />
              </div>

              <div className="space-y-1">
                <h3 className="text-base sm:text-xl font-bold text-white tracking-tight">
                  Message Sent Successfully
                </h3>
                <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed max-w-md mx-auto">
                  Thank you, <span className="text-white font-medium">{submittedData.name}</span>. Your message has been forwarded directly to Gaurav Patil.
                </p>
              </div>

              {/* Brevo Auto-Reply Confirmation */}
              <div className="bg-[#111625] border border-white/[0.08] rounded-xl sm:rounded-2xl p-2.5 sm:p-4 text-left text-xs sm:text-sm space-y-1 max-w-md mx-auto">
                <div className="flex items-center gap-1.5 font-medium text-[#CBACF9] text-xs sm:text-sm">
                  <IoShieldCheckmarkOutline className="w-4 h-4 text-[#A78BFA]" />
                  <span>Confirmation delivered to your inbox</span>
                </div>
                <p className="text-neutral-400 text-[11px] sm:text-xs leading-relaxed">
                  An automated receipt was dispatched to <span className="text-neutral-200 font-mono">{submittedData.email}</span> from <span className="text-purple">hello@gauravservices.eu.cc</span>.
                </p>
              </div>

              <div className="flex gap-2.5 pt-1 max-w-md mx-auto">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 py-2 sm:py-3 px-3 rounded-xl text-xs sm:text-sm font-medium bg-white/[0.04] hover:bg-white/[0.08] text-neutral-200 border border-white/[0.08] transition-colors touch-manipulation active:scale-[0.98]"
                >
                  Send another
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2 sm:py-3 px-3 rounded-xl text-xs sm:text-sm font-medium bg-[#7C3AED] hover:bg-[#6D28D9] text-white shadow-lg shadow-[#7C3AED]/25 transition-all touch-manipulation active:scale-[0.98]"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            /* ============================================================= */
            /* SINGLE-VIEW RESPONSIVE & TOUCH-OPTIMIZED FORM                 */
            /* ============================================================= */
            <form onSubmit={handleSubmit} className="space-y-2 sm:space-y-3.5 flex-1 flex flex-col justify-between">
              {/* Error Message Alert with Retry Context */}
              {submissionError && (
                <div className="flex items-center gap-2 p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs animate-in fade-in shrink-0">
                  <IoAlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span className="truncate leading-tight">{submissionError}</span>
                </div>
              )}

              {/* 1. Who is reaching out? (Touch-Friendly Minimalist Selector) */}
              <div className="space-y-1 shrink-0">
                <label className="block text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-neutral-400">
                  I am a
                </label>
                <div className="flex flex-wrap gap-1 sm:gap-2">
                  {USER_ROLES.map((role) => {
                    const isSelected = selectedRole === role.label;
                    return (
                      <button
                        key={role.id}
                        type="button"
                        onClick={() => setSelectedRole(role.label)}
                        className={`inline-flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs transition-all touch-manipulation active:scale-95 cursor-pointer ${
                          isSelected
                            ? "bg-purple/20 border border-purple/60 text-white font-semibold shadow-xs shadow-purple/20"
                            : "bg-white/[0.02] border border-white/[0.08] text-neutral-400 hover:text-neutral-200 hover:bg-white/[0.06]"
                        }`}
                      >
                        <span className="text-[11px] sm:text-xs">{role.icon}</span>
                        <span>{role.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Name & Email in 2-Column Responsive Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 shrink-0">
                {/* Full Name */}
                <div className="space-y-0.5 sm:space-y-1">
                  <label
                    htmlFor="touch-name"
                    className="block text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-neutral-400"
                  >
                    Name <span className="text-purple">*</span>
                  </label>
                  <div className="relative">
                    <IoPersonOutline className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-neutral-500" />
                    <input
                      id="touch-name"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="John Doe"
                      disabled={isSubmitting}
                      className="w-full pl-8 sm:pl-9 pr-2.5 py-1.5 sm:py-2 bg-white/[0.02] border border-white/[0.08] focus:border-purple/60 focus:bg-white/[0.04] rounded-lg sm:rounded-xl text-xs sm:text-sm text-white placeholder:text-neutral-600 focus:outline-none transition-all touch-manipulation h-[36px] sm:h-[40px]"
                    />
                  </div>
                </div>

                {/* Email Address */}
                <div className="space-y-0.5 sm:space-y-1">
                  <label
                    htmlFor="touch-email"
                    className="block text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-neutral-400"
                  >
                    Email <span className="text-purple">*</span>
                  </label>
                  <div className="relative">
                    <IoMailOutline className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-neutral-500" />
                    <input
                      id="touch-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="john@company.com"
                      disabled={isSubmitting}
                      className="w-full pl-8 sm:pl-9 pr-2.5 py-1.5 sm:py-2 bg-white/[0.02] border border-white/[0.08] focus:border-purple/60 focus:bg-white/[0.04] rounded-lg sm:rounded-xl text-xs sm:text-sm text-white placeholder:text-neutral-600 focus:outline-none transition-all touch-manipulation h-[36px] sm:h-[40px]"
                    />
                  </div>
                </div>
              </div>

              {/* 3. Subject (Professional Placeholder) */}
              <div className="space-y-0.5 sm:space-y-1 shrink-0">
                <label
                  htmlFor="touch-subject"
                  className="block text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-neutral-400"
                >
                  Subject
                </label>
                <input
                  id="touch-subject"
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="What would you like to discuss? (e.g. Project scope, Consultation)"
                  disabled={isSubmitting}
                  className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 bg-white/[0.02] border border-white/[0.08] focus:border-purple/60 focus:bg-white/[0.04] rounded-lg sm:rounded-xl text-xs sm:text-sm text-white placeholder:text-neutral-600 focus:outline-none transition-all touch-manipulation h-[36px] sm:h-[40px]"
                />
              </div>

              {/* 4. Message Details */}
              <div className="space-y-0.5 sm:space-y-1 flex-1 flex flex-col">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="touch-message"
                    className="block text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-neutral-400"
                  >
                    Message <span className="text-purple">*</span>
                  </label>
                  <span className="text-[10px] sm:text-xs text-neutral-500 font-mono">
                    {message.length}/1000
                  </span>
                </div>
                <textarea
                  id="touch-message"
                  required
                  rows={2}
                  maxLength={1000}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tell me about your project, goals, timeline, or inquiries..."
                  disabled={isSubmitting}
                  className="w-full p-2 sm:p-3 bg-white/[0.02] border border-white/[0.08] focus:border-purple/60 focus:bg-white/[0.04] rounded-lg sm:rounded-xl text-xs sm:text-sm text-white placeholder:text-neutral-600 focus:outline-none transition-all resize-none leading-relaxed min-h-[52px] sm:min-h-[75px] max-h-[85px] touch-manipulation flex-1"
                />
              </div>

              {/* 5. Clean Action Footer with Dynamic Cloudflare Widget Display */}
              <div className="pt-1 sm:pt-2 flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-3 shrink-0">
                {/* Dynamic Cloudflare Widget Box - Only displayed when isSubmitting is true */}
                {isSubmitting ? (
                  <div className="w-full sm:w-auto flex items-center justify-center sm:justify-start min-h-[55px] sm:min-h-[65px] animate-in fade-in zoom-in-95 duration-200">
                    <div
                      ref={turnstileContainerRef}
                      className="rounded-lg overflow-hidden shadow-md scale-90 sm:scale-100 origin-center sm:origin-left"
                    />
                  </div>
                ) : (
                  /* Clean Status Badge when not submitting */
                  <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                    <IoShieldCheckmarkOutline className="w-4 h-4 text-[#A78BFA]" />
                    <span className="text-[11px] sm:text-xs">
                      Cloudflare Protected • Direct Delivery
                    </span>
                  </div>
                )}

                {/* Touch-Optimized Submit Action Button */}
                {(() => {
                  const isFormValid =
                    name.trim().length >= 2 &&
                    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) &&
                    message.trim().length >= 10;
                  const isButtonDisabled = isSubmitting || !isFormValid;

                  return (
                    <button
                      type="submit"
                      disabled={isButtonDisabled}
                      className={`w-full sm:w-auto px-5 sm:px-7 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 touch-manipulation min-h-[40px] sm:min-h-[44px] shrink-0 ${
                        isButtonDisabled
                          ? "bg-white/[0.04] text-neutral-500 border border-white/[0.06] cursor-not-allowed opacity-50"
                          : "bg-[#7C3AED] hover:bg-[#6D28D9] text-white shadow-lg shadow-[#7C3AED]/25 cursor-pointer active:scale-[0.98]"
                      }`}
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Verifying...</span>
                        </>
                      ) : (
                        <>
                          <span>Send message</span>
                          <FaLocationArrow
                            className={`w-3 h-3 ${
                              isButtonDisabled ? "text-neutral-600" : "text-[#CBACF9]"
                            }`}
                          />
                        </>
                      )}
                    </button>
                  );
                })()}
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
