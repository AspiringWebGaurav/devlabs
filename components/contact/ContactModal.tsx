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
import { SiCloudflare } from "react-icons/si";

const TURNSTILE_SITE_KEY =
  process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY ||
  "0x4AAAAAABe0jAr2HXu1hIs4";

const DRAFT_STORAGE_KEY = "gaurav_portfolio_contact_draft";

export const USER_ROLES = [
  { id: "anonymous", label: "Anonymous / Confidential", icon: "🎭" },
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
  const [selectedRole, setSelectedRole] = useState<string>("Anonymous / Confidential");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  // Network & Lifecycle State
  const [isOnline, setIsOnline] = useState(true);
  const [isInputFocused, setIsInputFocused] = useState(false);

  // Turnstile & Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionStage, setSubmissionStage] = useState<"idle" | "verifying" | "encrypting" | "delivered">("idle");
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // Success Snapshot
  const [submittedData, setSubmittedData] = useState<{
    name: string;
    email: string;
    role: string;
    leadNumber?: number;
  } | null>(null);

  const isMountedRef = useRef(true);
  const isSubmittingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const turnstileContainerRef = useRef<HTMLDivElement | null>(null);
  const turnstileWidgetIdRef = useRef<string | null>(null);
  const roleScrollRef = useRef<HTMLDivElement | null>(null);
  const pendingSubmitPayloadRef = useRef<{
    name: string;
    email: string;
    message: string;
  } | null>(null);

  const scrollRoles = (direction: "left" | "right") => {
    if (roleScrollRef.current) {
      const scrollAmount = direction === "left" ? -140 : 140;
      roleScrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  // =========================================================================
  // 1. Reset Form & Auto-Flush Cached State
  // =========================================================================
  const resetForm = useCallback(() => {
    setName("");
    setEmail("");
    setSelectedRole("Anonymous / Confidential");
    setMessage("");
    setSubmissionError(null);
    setIsSuccess(false);
    setSubmittedData(null);
    setIsSubmitting(false);
    setSubmissionStage("idle");
    setIsInputFocused(false);
    isSubmittingRef.current = false;
    pendingSubmitPayloadRef.current = null;
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch {
      // Ignore
    }
    if (typeof window !== "undefined" && window.turnstile && turnstileWidgetIdRef.current) {
      try {
        window.turnstile.remove(turnstileWidgetIdRef.current);
      } catch {
        // Ignore
      }
      turnstileWidgetIdRef.current = null;
    }
  }, []);

  // Clean Close Handler: Automatically flushes success state & draft when closing
  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  // =========================================================================
  // 2. Network Status & Connectivity Lifecycle
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
  // 3. Local Draft Recovery & Modal Lifecycle Sync
  // =========================================================================
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("contact-modal-state", { detail: { isOpen } })
      );
    }

    if (!isOpen) {
      // Auto-flush success screen and error cache on modal close
      setIsSuccess(false);
      setSubmittedData(null);
      setSubmissionError(null);
      setIsInputFocused(false);
      return;
    }

    return () => {
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("contact-modal-state", { detail: { isOpen: false } })
        );
      }
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    try {
      const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft);
        if (parsed && typeof parsed === "object") {
          setName((prev) => (!prev && parsed.name ? parsed.name : prev));
          setEmail((prev) => (!prev && parsed.email ? parsed.email : prev));
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
        if (name || email || message) {
          localStorage.setItem(
            DRAFT_STORAGE_KEY,
            JSON.stringify({ name, email, message, selectedRole })
          );
        }
      } catch {
        // Storage quota exceeded or disabled
      }
    }, 400);

    return () => clearTimeout(timeoutId);
  }, [name, email, message, selectedRole, isOpen, isSuccess]);

  // =========================================================================
  // 4. Pre-load Cloudflare Turnstile Script in Background
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
      if (e.key === "Escape") handleClose();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, handleClose]);

  // =========================================================================
  // 5. Serverless Dispatch Execution
  // =========================================================================
  const submitWithToken = useCallback(
    async (
      token: string | null,
      trimmedName: string,
      trimmedEmail: string,
      trimmedMessage: string
    ) => {
      // Stage 2: Encrypting & Delivering
      if (isMountedRef.current) {
        setSubmissionStage("encrypting");
      }

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
            subject: selectedRole,
            category: selectedRole,
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

        try {
          localStorage.removeItem(DRAFT_STORAGE_KEY);
        } catch {
          // Ignore
        }

        // Stage 3: Message Delivered milestone (600ms intentional UX pacing)
        if (isMountedRef.current) {
          setSubmissionStage("delivered");
        }

        await new Promise((resolve) => setTimeout(resolve, 600));

        if (isMountedRef.current) {
          setSubmittedData({
            name: trimmedName,
            email: trimmedEmail,
            role: selectedRole,
            leadNumber: data.leadNumber,
          });
          setIsSuccess(true);
        }
      } catch (err: unknown) {
        clearTimeout(timeoutId);
        const error = err as Error;
        const isTimeout = error.name === "AbortError";

        if (isMountedRef.current) {
          setSubmissionStage("idle");
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
  // 6. Dynamic Cloudflare Turnstile Challenge Mounting on Submit
  // =========================================================================
  const renderTurnstileWidget = useCallback(() => {
    if (!turnstileContainerRef.current) return;
    if (typeof window === "undefined" || !window.turnstile) return;

    try {
      if (turnstileWidgetIdRef.current) {
        window.turnstile.remove(turnstileWidgetIdRef.current);
        turnstileWidgetIdRef.current = null;
      }

      const widgetId = window.turnstile.render(turnstileContainerRef.current, {
        sitekey: TURNSTILE_SITE_KEY,
        theme: "dark",
        size: "normal",
        action: "contact_inquiry",
        callback: (token: string) => {
          if (isMountedRef.current) {
            if (pendingSubmitPayloadRef.current) {
              const payload = pendingSubmitPayloadRef.current;
              pendingSubmitPayloadRef.current = null;
              submitWithToken(token, payload.name, payload.email, payload.message);
            }
          }
        },
        "error-callback": () => {
          if (isMountedRef.current) {
            const fallbackToken = "cf_client_token";
            if (pendingSubmitPayloadRef.current) {
              const payload = pendingSubmitPayloadRef.current;
              pendingSubmitPayloadRef.current = null;
              submitWithToken(fallbackToken, payload.name, payload.email, payload.message);
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
          submitWithToken(fallbackToken, payload.name, payload.email, payload.message);
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
  // 7. Submit Trigger
  // =========================================================================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmittingRef.current || isSubmitting) return;

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
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
    setSubmissionStage("verifying");
    isSubmittingRef.current = true;

    pendingSubmitPayloadRef.current = {
      name: trimmedName,
      email: trimmedEmail,
      message: trimmedMessage,
    };
  };

  if (!isOpen) return null;

  const isFormValid =
    name.trim().length >= 2 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) &&
    message.trim().length >= 10;
  const isButtonDisabled = isSubmitting || !isFormValid;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 md:p-8 bg-black/65 backdrop-blur-xl sm:backdrop-blur-2xl transition-all duration-300 overscroll-contain animate-in fade-in"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      style={{
        WebkitBackdropFilter: "blur(24px)",
      }}
    >
      {/* 
        Centered Luxury Modal Frame with Dynamic Keyboard Focus Adjustment:
        - Perfectly centered vertically & horizontally on all screens (mobile, tablet, desktop).
        - Strictly single-view with ZERO internal vertical scrollbars across all screen heights.
        - Smoothly translates upward when virtual keyboard opens so focused field remains visible.
        - Dynamic Cloudflare Turnstile challenge expands smoothly ABOVE submit button without shaking.
      */}
      <div
        className={`w-full max-w-[94vw] sm:max-w-xl md:max-w-2xl bg-[#0B0F19]/95 backdrop-blur-2xl border border-white/[0.15] rounded-2xl sm:rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8),0_0_40px_rgba(124,58,237,0.25)] relative text-white flex flex-col p-3.5 sm:p-6 md:p-7 max-h-[94dvh] sm:max-h-[88vh] overflow-hidden overscroll-contain transition-all duration-300 ease-out animate-in zoom-in-95 ${
          isInputFocused ? "-translate-y-12 sm:translate-y-0" : "translate-y-0"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle Ambient Top Glow Line */}
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#8B5CF6] to-transparent z-20" />

        {/* Ambient Radial Highlights */}
        <div className="absolute -top-12 -right-12 w-64 h-64 bg-[#7C3AED]/12 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-[#6366F1]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header (Only shown when not on success screen) */}
        {!isSuccess && (
          <div className="flex items-start justify-between pb-2 sm:pb-3 border-b border-white/[0.08] relative z-10 shrink-0">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Get in touch
                </h2>
                {!isOnline && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/15 border border-amber-500/30 text-amber-300">
                    <IoCloudOfflineOutline className="w-3.5 h-3.5" />
                    <span>Offline</span>
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-neutral-300 mt-1 leading-snug">
                Have a project, job opportunity, or inquiry? Send a direct message.
              </p>
            </div>

            <button
              type="button"
              onClick={handleClose}
              aria-label="Close modal"
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/[0.08] hover:bg-white/[0.15] border border-white/[0.15] text-white flex items-center justify-center shadow-md active:scale-90 transition-all touch-manipulation cursor-pointer shrink-0 ml-2"
            >
              <IoClose className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className={`relative z-10 flex-1 flex flex-col justify-between overflow-hidden ${!isSuccess ? "pt-2 sm:pt-3" : "pt-0"}`}>
          {isSuccess && submittedData ? (
            /* ============================================================= */
            /* ENHANCED SUCCESS CONFIRMATION SCREEN (CLEAN LUXURY)           */
            /* ============================================================= */
            <div className="flex-1 flex flex-col justify-between py-2 sm:py-3 animate-in fade-in zoom-in-95 duration-300">
              {/* Top Bar with Clean Header & Close Button */}
              <div className="flex items-center justify-between pb-2 border-b border-white/[0.08] shrink-0">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span className="text-xs sm:text-sm font-semibold text-emerald-400 tracking-wide">
                    Message Delivered
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleClose}
                  aria-label="Close modal"
                  className="w-8 h-8 rounded-full bg-white/[0.08] hover:bg-white/[0.15] border border-white/[0.15] text-white flex items-center justify-center shadow-md active:scale-90 transition-all touch-manipulation cursor-pointer shrink-0"
                >
                  <IoClose className="w-4 h-4 text-white" />
                </button>
              </div>

              {/* Central Celebration & Confirmation */}
              <div className="text-center space-y-3 sm:space-y-4 my-auto px-2 py-3">
                {/* Glowing Emerald Checkmark */}
                <div className="relative inline-block">
                  <div className="absolute inset-0 rounded-full bg-emerald-500/25 blur-xl animate-pulse" />
                  <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border-2 border-emerald-500/40 text-emerald-400 mx-auto flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                    <IoCheckmarkCircle className="w-8 h-8 sm:w-9 sm:h-9" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-lg sm:text-2xl font-bold text-white tracking-tight">
                    Thank you, {submittedData.name}!
                  </h3>
                  <p className="text-sm sm:text-base text-neutral-300 leading-relaxed max-w-sm sm:max-w-md mx-auto">
                    Your message has been forwarded directly to Gaurav Patil. You will receive a response shortly.
                  </p>
                </div>

                {/* Clean, Subtle Receipt Confirmation Pill */}
                <div className="bg-[#111625]/90 border border-white/[0.1] rounded-2xl p-3 sm:p-4 text-center text-xs sm:text-sm space-y-1 max-w-md mx-auto shadow-sm">
                  <div className="flex items-center justify-center gap-1.5 font-medium text-[#CBACF9]">
                    <IoShieldCheckmarkOutline className="w-4 h-4 text-[#A78BFA] shrink-0" />
                    <span>Confirmation dispatched to your inbox</span>
                  </div>
                  <p className="text-neutral-400 text-xs sm:text-xs">
                    Receipt sent to <span className="text-white font-mono">{submittedData.email}</span>
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2.5 pt-2 max-w-md mx-auto w-full shrink-0">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 py-2.5 sm:py-3 px-3 rounded-xl text-xs sm:text-sm font-medium bg-white/[0.06] hover:bg-white/[0.12] text-neutral-200 border border-white/[0.1] transition-all touch-manipulation active:scale-[0.98] cursor-pointer"
                >
                  Send another
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 py-2.5 sm:py-3 px-3 rounded-xl text-xs sm:text-sm font-bold bg-[#7C3AED] hover:bg-[#6D28D9] text-white shadow-lg shadow-[#7C3AED]/30 transition-all touch-manipulation active:scale-[0.98] cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            /* ============================================================= */
            /* SINGLE-VIEW RESPONSIVE TOUCH & FOCUS OPTIMIZED FORM           */
            /* ============================================================= */
            <form onSubmit={handleSubmit} className="space-y-2 sm:space-y-3 flex-1 flex flex-col justify-between overflow-hidden">
              {/* Error Message Alert */}
              {submissionError && (
                <div className="flex items-center gap-2 p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs animate-in fade-in shrink-0">
                  <IoAlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span className="truncate leading-tight">{submissionError}</span>
                </div>
              )}

              {/* 1. Who is reaching out? (Mobile Single Horizontal Scrollable Row / Desktop Clean Flex Wrap) */}
              <div className="space-y-1 shrink-0">
                <div className="flex items-center justify-between">
                  <label className="block text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-neutral-400">
                    I am a
                  </label>
                  {/* Subtle Interactive Scroll Buttons (Mobile Only) */}
                  <div className="flex sm:hidden items-center gap-1">
                    <button
                      type="button"
                      onClick={() => scrollRoles("left")}
                      aria-label="Scroll roles left"
                      className="w-5 h-5 rounded-md bg-white/[0.05] hover:bg-white/[0.12] border border-white/[0.08] text-neutral-400 hover:text-white flex items-center justify-center text-xs transition-all active:scale-90 cursor-pointer"
                    >
                      ‹
                    </button>
                    <button
                      type="button"
                      onClick={() => scrollRoles("right")}
                      aria-label="Scroll roles right"
                      className="w-5 h-5 rounded-md bg-white/[0.05] hover:bg-white/[0.12] border border-white/[0.08] text-neutral-400 hover:text-white flex items-center justify-center text-xs transition-all active:scale-90 cursor-pointer"
                    >
                      ›
                    </button>
                  </div>
                </div>
                <div className="relative -mx-1 px-1">
                  <div
                    ref={roleScrollRef}
                    className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none touch-pan-x snap-x scroll-smooth select-none pr-8 sm:pr-0 sm:flex-wrap sm:overflow-visible sm:gap-2"
                  >
                    {USER_ROLES.map((role) => {
                      const isSelected = selectedRole === role.label;
                      return (
                        <button
                          key={role.id}
                          type="button"
                          onClick={() => setSelectedRole(role.label)}
                          className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 sm:py-2 rounded-xl text-xs sm:text-xs whitespace-nowrap transition-all touch-manipulation active:scale-95 cursor-pointer shrink-0 sm:shrink snap-start ${
                            isSelected
                              ? "bg-[#7C3AED]/30 border border-[#7C3AED] text-white font-semibold shadow-sm shadow-[#7C3AED]/35"
                              : "bg-white/[0.04] border border-white/[0.09] text-neutral-300 hover:text-white hover:bg-white/[0.08]"
                          }`}
                        >
                          <span className="text-sm">{role.icon}</span>
                          <span>{role.label}</span>
                        </button>
                      );
                    })}
                  </div>
                  {/* Soft right-edge gradient fade with click-to-scroll affordance (Mobile Only) */}
                  <div
                    onClick={() => scrollRoles("right")}
                    aria-label="Scroll more roles"
                    className="absolute right-0 top-0 bottom-1 w-8 bg-gradient-to-l from-[#0B0F19] via-[#0B0F19]/80 to-transparent flex items-center justify-end pr-0.5 cursor-pointer sm:hidden"
                  >
                    <span className="text-xs text-neutral-400 animate-pulse font-bold">›</span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-1 text-xs text-neutral-400 pt-0.5">
                  <span>You have the right to stay anonymous &amp; confidential.</span>
                  <div className="flex items-center gap-1.5">
                    <a
                      href="/privacy?focus=contact#anonymity"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#CBACF9] hover:underline hover:text-white font-medium transition-colors"
                    >
                      Privacy Policy
                    </a>
                    <span className="text-neutral-600">•</span>
                    <a
                      href="/terms?focus=contact#anonymity"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#CBACF9] hover:underline hover:text-white font-medium transition-colors"
                    >
                      Terms
                    </a>
                  </div>
                </div>
              </div>

              {/* 2. Name & Email (Mobile Stacked / Desktop 2-Col Grid) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-3 shrink-0">
                {/* Full Name */}
                <div className="space-y-0.5 sm:space-y-1">
                  <label
                    htmlFor="touch-name"
                    className="block text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-neutral-400"
                  >
                    Name <span className="text-purple">*</span>
                  </label>
                  <div className="relative">
                    <IoPersonOutline className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <input
                      id="touch-name"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      onFocus={() => setIsInputFocused(true)}
                      onBlur={() => setIsInputFocused(false)}
                      placeholder="Your full name"
                      disabled={isSubmitting}
                      className="w-full pl-9 pr-3 py-1.5 sm:py-2 bg-white/[0.04] border border-white/[0.1] focus:border-purple focus:bg-white/[0.07] rounded-xl text-[15px] sm:text-sm text-white placeholder:text-neutral-500 focus:outline-none transition-all touch-manipulation h-[38px] sm:h-[42px]"
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
                    <IoMailOutline className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <input
                      id="touch-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onFocus={() => setIsInputFocused(true)}
                      onBlur={() => setIsInputFocused(false)}
                      placeholder="your.email@company.com"
                      disabled={isSubmitting}
                      className="w-full pl-9 pr-3 py-1.5 sm:py-2 bg-white/[0.04] border border-white/[0.1] focus:border-purple focus:bg-white/[0.07] rounded-xl text-[15px] sm:text-sm text-white placeholder:text-neutral-500 focus:outline-none transition-all touch-manipulation h-[38px] sm:h-[42px]"
                    />
                  </div>
                </div>
              </div>

              {/* 3. Message Details (Smoothly Flexes to Guarantee Zero Overflow) */}
              <div className="space-y-0.5 sm:space-y-1 flex-1 flex flex-col min-h-0">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="touch-message"
                    className="block text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-neutral-400"
                  >
                    Message <span className="text-purple">*</span>
                  </label>
                  <span className="text-[10px] sm:text-xs text-neutral-400 font-mono">
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
                  onFocus={() => setIsInputFocused(true)}
                  onBlur={() => setIsInputFocused(false)}
                  placeholder="Tell me about your project, goals, or inquiries..."
                  disabled={isSubmitting}
                  className={`w-full p-2.5 sm:p-3 bg-white/[0.04] border border-white/[0.1] focus:border-purple focus:bg-white/[0.07] rounded-xl text-[15px] sm:text-sm text-white placeholder:text-neutral-500 focus:outline-none transition-all resize-none leading-snug touch-manipulation flex-1 ${
                    isSubmitting
                      ? "min-h-[42px] max-h-[50px]"
                      : "min-h-[55px] sm:min-h-[85px] max-h-[75px] sm:max-h-[120px]"
                  }`}
                />
              </div>

              {/* 4. Action Footer: Cloudflare Dynamically Positioned ABOVE Submit Button */}
              <div className="pt-1 sm:pt-2 flex flex-col items-center gap-1.5 sm:gap-2 shrink-0 transition-all duration-300 ease-out">
                {/* Dynamic Cloudflare Widget / Badge Box ABOVE Submit Button */}
                {isSubmitting ? (
                  <div className="w-full flex items-center justify-center min-h-[65px] transition-all duration-300 animate-in fade-in zoom-in-95">
                    <div
                      ref={turnstileContainerRef}
                      className="rounded-xl overflow-hidden shadow-lg border border-white/[0.1] bg-black/40 flex items-center justify-center transition-transform duration-200"
                      style={{ minHeight: "65px" }}
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-1.5 text-xs sm:text-sm text-neutral-400 py-0.5">
                    <SiCloudflare className="w-4 h-4 text-[#F38020]" />
                    <span className="font-medium text-neutral-300">
                      Cloudflare Protected
                    </span>
                  </div>
                )}

                {/* Submit Action Button */}
                <button
                  type="submit"
                  disabled={isButtonDisabled}
                  className={`w-full py-2.5 sm:py-3 px-6 rounded-xl text-sm sm:text-base font-bold transition-all flex items-center justify-center gap-2 touch-manipulation min-h-[42px] sm:min-h-[46px] shrink-0 ${
                    isButtonDisabled
                      ? "bg-white/[0.04] text-neutral-500 border border-white/[0.06] cursor-not-allowed opacity-50"
                      : "bg-[#7C3AED] hover:bg-[#6D28D9] text-white shadow-lg shadow-[#7C3AED]/25 cursor-pointer active:scale-[0.98]"
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>
                        {submissionStage === "verifying"
                          ? "Verifying security..."
                          : submissionStage === "encrypting"
                          ? "Delivering message..."
                          : "Message delivered!"}
                      </span>
                    </>
                  ) : (
                    <>
                      <span>Send message</span>
                      <FaLocationArrow
                        className={`w-3.5 h-3.5 ${
                          isButtonDisabled ? "text-neutral-600" : "text-[#CBACF9]"
                        }`}
                      />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
