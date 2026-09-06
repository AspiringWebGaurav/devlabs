"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  IoClose,
  IoAlertCircle,
  IoMailOutline,
  IoPersonOutline,
  IoCloudOfflineOutline,
} from "react-icons/io5";
import { FaLocationArrow } from "react-icons/fa6";
import { SiCloudflare } from "react-icons/si";
import {
  validateName,
  validateEmail,
  validateMessage,
  countWords,
  MESSAGE_MAX_WORDS,
  MESSAGE_MAX_CHARS,
} from "@/lib/contact/validation";

const TURNSTILE_SITE_KEY =
  process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY ||
  "0x4AAAAAABe0jAr2HXu1hIs4";

const DRAFT_STORAGE_KEY = "gaurav_portfolio_contact_draft";

// Safe mobile haptic vibration helper
const triggerHaptic = (pattern: number | number[] = 15) => {
  if (typeof window !== "undefined" && typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // Ignored if vibration is disabled/blocked by user device policy
    }
  }
};

export const USER_ROLES = [
  { id: "anonymous", label: "Anonymous / Confidential", icon: "🎭" },
  { id: "recruiter", label: "Recruiter / Talent", icon: "💼" },
  { id: "founder", label: "Founder / CEO", icon: "🏢" },
  { id: "lead", label: "Engineering Lead", icon: "🚀" },
  { id: "client", label: "Client / Project", icon: "🤝" },
  { id: "visitor", label: "Visitor", icon: "✨" },
] as const;

export type ContactSuccessVariant =
  | "FULL_SUCCESS"
  | "PARTIAL_AUTOREPLY_FAILED"
  | "PARTIAL_INTERNAL_NOTIFICATION_UNCONFIRMED";

export interface SubmittedContactData {
  name: string;
  email: string;
  role: string;
  variant: ContactSuccessVariant;
}

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
  const [isClosing, setIsClosing] = useState(false);

  // Turnstile & Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionStage, setSubmissionStage] = useState<"idle" | "verifying" | "encrypting">("idle");
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // Success Snapshot
  const [submittedData, setSubmittedData] = useState<SubmittedContactData | null>(null);

  // Lifecycle Refs
  const isMountedRef = useRef<boolean>(false);
  const isSubmittingRef = useRef<boolean>(false);
  const currentRequestIdRef = useRef<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const turnstileContainerRef = useRef<HTMLDivElement | null>(null);
  const turnstileWidgetIdRef = useRef<string | null>(null);
  const roleScrollRef = useRef<HTMLDivElement | null>(null);
  const pendingSubmitPayloadRef = useRef<{
    name: string;
    email: string;
    message: string;
  } | null>(null);

  const scrollRoles = (direction: "left" | "right") => {
    triggerHaptic(10);
    if (roleScrollRef.current) {
      const scrollAmount = direction === "left" ? -140 : 140;
      roleScrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  // =========================================================================
  // 1. Component Mount & Global Unmount Cleanup
  // =========================================================================
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  // =========================================================================
  // 2. Network Status & Connectivity Lifecycle
  // =========================================================================
  useEffect(() => {
    if (typeof window === "undefined") return;

    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // =========================================================================
  // 3. Lifecycle-Safe Idempotent Close Handler with Cancellable Timer
  // =========================================================================
  const handleClose = useCallback(() => {
    triggerHaptic(15);
    if (isClosing) return; // Strictly idempotent: prevents duplicate timers or race conditions
    setIsClosing(true);

    // 1. If a submission request is currently in-flight, abort it immediately
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // 2. Invalidate active request generation ID so resolving promises are discarded
    currentRequestIdRef.current += 1;

    // 3. Clear any existing close timer
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const exitDuration = prefersReducedMotion ? 0 : 200;

    closeTimerRef.current = setTimeout(() => {
      if (!isMountedRef.current) return;
      setIsSuccess(false);
      setSubmittedData(null);
      setSubmissionError(null);
      setIsSubmitting(false);
      setSubmissionStage("idle");
      setIsInputFocused(false);
      isSubmittingRef.current = false;
      pendingSubmitPayloadRef.current = null;
      setIsClosing(false);
      closeTimerRef.current = null;
      onClose();
    }, exitDuration);
  }, [isClosing, onClose]);

  // =========================================================================
  // 4. Reset Form & Clear Draft ("Send another" & Explicit User Clear)
  // =========================================================================
  const handleClearDraft = useCallback(() => {
    triggerHaptic(20);
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

    // Safely focus the first form input after the form DOM mounts
    requestAnimationFrame(() => {
      if (nameInputRef.current && document.body.contains(nameInputRef.current)) {
        nameInputRef.current.focus();
      }
    });
  }, []);

  const resetForm = handleClearDraft;

  // =========================================================================
  // 5. Modal Open Event, Opener Capture & Connected Focus Restoration
  // =========================================================================
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("contact-modal-state", { detail: { isOpen } })
      );
    }

    if (isOpen) {
      openerRef.current = (document.activeElement as HTMLElement) || null;
    } else {
      // Auto-flush success screen and error cache on modal close
      setIsSuccess(false);
      setSubmittedData(null);
      setSubmissionError(null);
      setIsInputFocused(false);
      setIsClosing(false);

      if (openerRef.current && document.body.contains(openerRef.current)) {
        openerRef.current.focus();
      } else {
        const mainLandmark = document.getElementById("main-content");
        if (mainLandmark && document.body.contains(mainLandmark)) {
          mainLandmark.focus();
        }
      }
      openerRef.current = null;
    }

    return () => {
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("contact-modal-state", { detail: { isOpen: false } })
        );
      }
    };
  }, [isOpen]);

  // =========================================================================
  // 6. Per-Open-Cycle Body Scroll Lock & ESC Key Listener
  // =========================================================================
  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, handleClose]);

  // =========================================================================
  // 7. Exhaustive Focus Trap inside Modal
  // =========================================================================
  useEffect(() => {
    if (!isOpen || isClosing) return;

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !modalRef.current) return;

      const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]):not([aria-hidden="true"]), input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
      );

      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    window.addEventListener("keydown", handleTabKey);
    return () => window.removeEventListener("keydown", handleTabKey);
  }, [isOpen, isClosing]);

  // =========================================================================
  // 8. Local Draft Recovery
  // =========================================================================
  useEffect(() => {
    if (!isOpen) return;

    try {
      const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft);
        if (parsed && typeof parsed === "object") {
          // If draft is older than 7 days, flush it cleanly
          if (parsed.savedAt && Date.now() - parsed.savedAt > 7 * 24 * 60 * 60 * 1000) {
            localStorage.removeItem(DRAFT_STORAGE_KEY);
            return;
          }
          if (parsed.name && typeof parsed.name === "string") setName(parsed.name);
          if (parsed.email && typeof parsed.email === "string") setEmail(parsed.email);
          if (parsed.message && typeof parsed.message === "string") setMessage(parsed.message);
          if (parsed.selectedRole && typeof parsed.selectedRole === "string") {
            setSelectedRole(parsed.selectedRole);
          }
        }
      }
    } catch {
      // LocalStorage access restricted or unavailable
    }
  }, [isOpen]);

  // Auto-Save Draft to Storage & Auto-Clean when Empty
  useEffect(() => {
    if (!isOpen || isSuccess) return;

    const timeoutId = setTimeout(() => {
      try {
        const trimmedName = name.trim();
        const trimmedEmail = email.trim();
        const trimmedMessage = message.trim();

        if (trimmedName || trimmedEmail || trimmedMessage) {
          localStorage.setItem(
            DRAFT_STORAGE_KEY,
            JSON.stringify({
              name,
              email,
              message,
              selectedRole,
              savedAt: Date.now(),
            })
          );
        } else {
          localStorage.removeItem(DRAFT_STORAGE_KEY);
        }
      } catch {
        // Storage quota exceeded or disabled
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [name, email, message, selectedRole, isOpen, isSuccess]);

  // =========================================================================
  // 9. Pre-load Cloudflare Turnstile Script in Background
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

  // =========================================================================
  // 10. Serverless Dispatch Execution with Stale Request Generation Guard
  // =========================================================================
  const submitWithToken = useCallback(
    async (
      token: string | null,
      trimmedName: string,
      trimmedEmail: string,
      trimmedMessage: string
    ) => {
      const requestId = ++currentRequestIdRef.current;

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

        // Guard against stale response if modal was closed or re-submitted in between
        if (!isMountedRef.current || requestId !== currentRequestIdRef.current) {
          return;
        }

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

        setName("");
        setEmail("");
        setMessage("");
        setSelectedRole("Anonymous / Confidential");

        let variant: ContactSuccessVariant = "FULL_SUCCESS";
        if (data.emailDelivered && !data.autoReplyDelivered) {
          variant = "PARTIAL_AUTOREPLY_FAILED";
        } else if (!data.emailDelivered && data.autoReplyDelivered) {
          variant = "PARTIAL_INTERNAL_NOTIFICATION_UNCONFIRMED";
        }

        setSubmittedData({
          name: trimmedName,
          email: trimmedEmail,
          role: selectedRole,
          variant,
        });
        setIsSuccess(true);
        triggerHaptic([30, 60, 40]); // Celebratory haptic buzz on mobile
      } catch (err: unknown) {
        clearTimeout(timeoutId);
        if (!isMountedRef.current || requestId !== currentRequestIdRef.current) {
          return;
        }

        const error = err as Error;
        const isTimeout = error.name === "AbortError";

        setSubmissionStage("idle");
        const errorMsg = isTimeout
          ? "Network timeout (15s). Weak connection detected. Your message is safely saved; please tap Send again."
          : error.message || "An unexpected error occurred. Please try again.";
        setSubmissionError(errorMsg);
        triggerHaptic([40, 40, 40]); // Error haptic warning

        if (window.turnstile && turnstileWidgetIdRef.current) {
          try {
            window.turnstile.reset(turnstileWidgetIdRef.current);
          } catch {
            // Ignore
          }
        }
      } finally {
        if (isMountedRef.current && requestId === currentRequestIdRef.current) {
          setIsSubmitting(false);
          abortControllerRef.current = null;
          isSubmittingRef.current = false;
          pendingSubmitPayloadRef.current = null;
        }
      }
    },
    [selectedRole]
  );

  // =========================================================================
  // 11. Dynamic Cloudflare Turnstile Challenge Mounting on Submit
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
        let attempts = 0;
        const interval = setInterval(() => {
          attempts += 1;
          if (window.turnstile) {
            clearInterval(interval);
            renderTurnstileWidget();
          } else if (attempts >= 40) {
            clearInterval(interval);
            if (isMountedRef.current && pendingSubmitPayloadRef.current) {
              const payload = pendingSubmitPayloadRef.current;
              pendingSubmitPayloadRef.current = null;
              submitWithToken("cf_fallback_token", payload.name, payload.email, payload.message);
            }
          }
        }, 100);
        return () => clearInterval(interval);
      }
    }
  }, [isSubmitting, renderTurnstileWidget, submitWithToken]);

  // =========================================================================
  // 12. Submit Trigger
  // =========================================================================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    triggerHaptic(20);

    if (isSubmittingRef.current || isSubmitting) return;

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedMessage = message.trim();

    const validName = validateName(trimmedName);
    if (!validName.isValid) {
      setSubmissionError(validName.error || "Please enter your name.");
      triggerHaptic([30, 30]);
      return;
    }

    const validEmail = validateEmail(trimmedEmail);
    if (!validEmail.isValid) {
      setSubmissionError(validEmail.error || "Please provide a valid email address.");
      triggerHaptic([30, 30]);
      return;
    }

    const validMsg = validateMessage(trimmedMessage);
    if (!validMsg.isValid) {
      setSubmissionError(validMsg.error || "Please enter message details.");
      triggerHaptic([30, 30]);
      return;
    }

    if (!navigator.onLine) {
      setSubmissionError("No internet connection. Your draft is saved & ready to send once reconnected.");
      triggerHaptic([30, 30]);
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

  // High-Performance Memoized Validation Checks
  const emailValidation = useMemo(
    () => (email.trim() ? validateEmail(email) : { isValid: false }),
    [email]
  );
  const nameValidation = useMemo(
    () => (name.trim() ? validateName(name) : { isValid: false }),
    [name]
  );
  const messageValidation = useMemo(
    () => (message.trim() ? validateMessage(message) : { isValid: false }),
    [message]
  );

  const isFormValid =
    nameValidation.isValid &&
    emailValidation.isValid &&
    messageValidation.isValid;

  const isButtonDisabled = isSubmitting || !isFormValid;
  const hasDraft = Boolean(name.trim() || email.trim() || message.trim());

  const firstName = submittedData
    ? submittedData.name.trim().split(" ")[0] || submittedData.name
    : "";

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-[6000] flex items-center justify-center p-3 sm:p-6 md:p-8 bg-black/65 backdrop-blur-xl sm:backdrop-blur-2xl transition-opacity duration-200 overscroll-contain ${
        isClosing ? "opacity-0 pointer-events-none" : "opacity-100 animate-in fade-in"
      }`}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="contact-modal-title"
      style={{
        WebkitBackdropFilter: "blur(24px)",
      }}
    >
      <div
        ref={modalRef}
        className={`w-full max-w-[92vw] sm:max-w-md md:max-w-lg bg-[#0B0F19]/95 backdrop-blur-2xl border border-white/[0.15] rounded-2xl sm:rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8),0_0_40px_rgba(124,58,237,0.25)] relative text-white flex flex-col p-4 sm:p-6 overflow-hidden overscroll-contain transition-all duration-200 ease-out min-w-0 ${
          isClosing
            ? "scale-95 opacity-0"
            : "scale-100 opacity-100 animate-in zoom-in-95"
        } ${
          isInputFocused ? "-translate-y-12 sm:translate-y-0" : "translate-y-0"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle Ambient Top Glow Line */}
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#8B5CF6] to-transparent z-20 pointer-events-none" />

        {/* Ambient Radial Highlights */}
        <div className="absolute -top-12 -right-12 w-64 h-64 bg-[#7C3AED]/12 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-[#6366F1]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header (Only shown when on form screen) */}
        {!isSuccess && (
          <div className="flex items-start justify-between pb-2 sm:pb-3 border-b border-white/[0.08] relative z-10 shrink-0">
            <div>
              <div className="flex items-center gap-2">
                <h2
                  id="contact-modal-title"
                  className="text-xl sm:text-2xl font-bold text-white tracking-tight"
                >
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
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/[0.08] hover:bg-white/[0.15] border border-white/[0.15] text-white flex items-center justify-center shadow-md active:scale-90 transition-all touch-manipulation cursor-pointer shrink-0 ml-2 focus-visible:ring-2 focus-visible:ring-[#8B5CF6] focus-visible:outline-none"
              style={{ WebkitTapHighlightColor: "transparent" }}
            >
              <IoClose className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className={`relative z-10 ${!isSuccess ? "flex-1 flex flex-col justify-between pt-2 sm:pt-3" : "pt-0"}`}>
          {isSuccess && submittedData ? (
            /* ============================================================= */
            /* UNIFIED, TOUCH-OPTIMIZED & HAPTIC-ENABLED SUCCESS VIEW        */
            /* ============================================================= */
            <div className="space-y-4 sm:space-y-5 animate-in fade-in zoom-in-95 duration-200">
              {/* Single Authoritative Screen Reader Live Region */}
              <div aria-live="polite" aria-atomic="true" className="sr-only">
                {submittedData.variant === "PARTIAL_AUTOREPLY_FAILED"
                  ? `Thanks for reaching out, ${firstName}! Your message was received, and Gaurav will reply soon.`
                  : `Thanks for reaching out, ${firstName}! Your message is in Gaurav's inbox, and a confirmation copy was sent to your email from hello@gauravpatil.site.`}
              </div>

              {/* Top Status Row with Badge & Close Button */}
              <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                      submittedData.variant === "PARTIAL_INTERNAL_NOTIFICATION_UNCONFIRMED"
                        ? "bg-[#CBACF9]"
                        : "bg-emerald-400"
                    }`}
                    aria-hidden="true"
                  />
                  <span
                    className={`text-sm sm:text-base font-semibold tracking-wide ${
                      submittedData.variant === "PARTIAL_INTERNAL_NOTIFICATION_UNCONFIRMED"
                        ? "text-[#CBACF9]"
                        : "text-emerald-400"
                    }`}
                  >
                    {submittedData.variant === "PARTIAL_INTERNAL_NOTIFICATION_UNCONFIRMED"
                      ? "Message Submitted"
                      : "Message Sent"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleClose}
                  aria-label="Close modal"
                  className="w-8 h-8 rounded-full bg-white/[0.08] hover:bg-white/[0.15] border border-white/[0.15] text-white flex items-center justify-center shadow-md active:scale-90 transition-all touch-manipulation cursor-pointer shrink-0 focus-visible:ring-2 focus-visible:ring-[#8B5CF6] focus-visible:outline-none"
                  style={{ WebkitTapHighlightColor: "transparent" }}
                >
                  <IoClose className="w-4 h-4 text-white" />
                </button>
              </div>

              {/* Center Content with High-Legibility Balanced Typography */}
              <div className="text-center space-y-3 px-1 sm:px-2">
                {/* Animated Pop Checkmark with Glow Burst */}
                <div className="relative inline-flex items-center justify-center my-1">
                  <div
                    className="absolute w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-emerald-500/30 animate-ping pointer-events-none"
                    style={{ animationIterationCount: 1, animationDuration: "0.7s" }}
                    aria-hidden="true"
                  />
                  <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-emerald-500/15 border-2 border-emerald-400/50 text-emerald-400 flex items-center justify-center shadow-[0_0_25px_rgba(16,185,129,0.3)] animate-in zoom-in-50 duration-300">
                    <svg
                      className="w-6 h-6 sm:w-7 sm:h-7"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path
                        d="M5 13l4 4L19 7"
                        style={{
                          strokeDasharray: 24,
                          strokeDashoffset: 0,
                          animation: "checkmarkStroke 0.35s ease-out forwards",
                        }}
                      />
                    </svg>
                  </div>
                </div>

                {/* Primary Heading with Clean Line 2 Name */}
                <div className="space-y-1.5">
                  <h3
                    id="contact-modal-title"
                    className="text-xl sm:text-2xl md:text-3xl font-bold text-white tracking-tight leading-snug"
                  >
                    <span className="block">Thanks for reaching out,</span>
                    <span className="block text-transparent bg-clip-text bg-gradient-to-r from-white via-neutral-100 to-[#CBACF9] mt-0.5">
                      {firstName}!
                    </span>
                  </h3>
                  <p className="text-sm sm:text-base text-neutral-200 leading-relaxed max-w-lg mx-auto font-normal text-balance">
                    {submittedData.variant === "PARTIAL_INTERNAL_NOTIFICATION_UNCONFIRMED"
                      ? "Your inquiry has been logged safely. I'll review your details and follow up soon."
                      : "Your message landed safely in my inbox — I'll reply soon!"}
                  </p>
                </div>

                {/* High-Legibility Confirmation Notice with Graceful Email Wrapping */}
                <div className="pt-1 text-xs sm:text-sm text-neutral-300 leading-relaxed max-w-lg mx-auto">
                  {submittedData.variant === "FULL_SUCCESS" && (
                    <>
                      <p className="leading-relaxed">
                        An automated confirmation was sent to{" "}
                        <span className="font-semibold text-white break-words select-all">
                          {submittedData.email}
                        </span>{" "}
                        from{" "}
                        <span className="font-mono text-[#CBACF9] font-medium whitespace-nowrap">
                          hello@gauravpatil.site
                        </span>
                        .
                      </p>
                      <p className="text-[11px] sm:text-xs text-neutral-400 mt-1">
                        Check your spam folder if it doesn&apos;t arrive shortly!
                      </p>
                    </>
                  )}

                  {submittedData.variant === "PARTIAL_AUTOREPLY_FAILED" && (
                    <p className="text-amber-200/90 font-medium">
                      Your message reached me safely! The automated confirmation from{" "}
                      <span className="font-mono text-[#CBACF9] font-semibold whitespace-nowrap">
                        hello@gauravpatil.site
                      </span>{" "}
                      had a slight hiccup, but no worries &mdash; no need to resubmit.
                    </p>
                  )}

                  {submittedData.variant === "PARTIAL_INTERNAL_NOTIFICATION_UNCONFIRMED" && (
                    <>
                      <p className="leading-relaxed">
                        A confirmation copy was dispatched to{" "}
                        <span className="font-semibold text-white break-words select-all">
                          {submittedData.email}
                        </span>{" "}
                        from{" "}
                        <span className="font-mono text-[#CBACF9] font-medium whitespace-nowrap">
                          hello@gauravpatil.site
                        </span>
                        .
                      </p>
                      <p className="text-[11px] sm:text-xs text-neutral-400 mt-1">
                        I&apos;ll review your note shortly!
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* Action Buttons (Touch-Optimized with Haptic Feedback & Tactile Animations) */}
              <div className="flex gap-3 pt-2 max-w-md mx-auto w-full">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 py-3 px-4 rounded-xl text-sm sm:text-base font-semibold bg-white/[0.07] hover:bg-white/[0.14] active:bg-white/[0.18] text-neutral-100 border border-white/[0.12] transition-all touch-manipulation active:scale-[0.96] cursor-pointer focus-visible:ring-2 focus-visible:ring-[#8B5CF6] focus-visible:outline-none min-h-[46px] select-none"
                  style={{ WebkitTapHighlightColor: "transparent" }}
                >
                  Send another
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 py-3 px-4 rounded-xl text-sm sm:text-base font-bold bg-[#7C3AED] hover:bg-[#6D28D9] active:bg-[#5B21B6] text-white shadow-lg shadow-[#7C3AED]/35 active:shadow-none transition-all touch-manipulation active:scale-[0.96] cursor-pointer focus-visible:ring-2 focus-visible:ring-[#8B5CF6] focus-visible:outline-none min-h-[46px] select-none"
                  style={{ WebkitTapHighlightColor: "transparent" }}
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            /* ============================================================= */
            /* TOUCH & FOCUS OPTIMIZED INTERACTIVE FORM                      */
            /* ============================================================= */
            <form onSubmit={handleSubmit} className="space-y-2 sm:space-y-3 flex-1 flex flex-col justify-between overflow-hidden">
              {/* Error Message Alert Banner */}
              {submissionError && (
                <div className="flex items-start justify-between gap-2 p-2 sm:p-2.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs animate-in fade-in zoom-in-95 shrink-0">
                  <div className="flex items-start gap-2 min-w-0">
                    <IoAlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
                    <span className="leading-snug break-words">{submissionError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic(10);
                      setSubmissionError(null);
                    }}
                    aria-label="Dismiss error"
                    className="text-red-400 hover:text-white p-0.5 rounded transition-colors shrink-0 focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:outline-none"
                    style={{ WebkitTapHighlightColor: "transparent" }}
                  >
                    <IoClose className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* 1. Who is reaching out? (Mobile Horizontal Snap Row / Desktop Flex Wrap) */}
              <div className="space-y-1 shrink-0">
                <div className="flex items-center justify-between">
                  <label className="block text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-neutral-400">
                    I am a
                  </label>
                  <div className="flex sm:hidden items-center gap-1">
                    <button
                      type="button"
                      onClick={() => scrollRoles("left")}
                      aria-label="Scroll roles left"
                      className="w-5 h-5 rounded-md bg-white/[0.05] hover:bg-white/[0.12] border border-white/[0.08] text-neutral-400 hover:text-white flex items-center justify-center text-xs transition-all active:scale-90 cursor-pointer focus-visible:ring-2 focus-visible:ring-[#8B5CF6] focus-visible:outline-none"
                      style={{ WebkitTapHighlightColor: "transparent" }}
                    >
                      ‹
                    </button>
                    <button
                      type="button"
                      onClick={() => scrollRoles("right")}
                      aria-label="Scroll roles right"
                      className="w-5 h-5 rounded-md bg-white/[0.05] hover:bg-white/[0.12] border border-white/[0.08] text-neutral-400 hover:text-white flex items-center justify-center text-xs transition-all active:scale-90 cursor-pointer focus-visible:ring-2 focus-visible:ring-[#8B5CF6] focus-visible:outline-none"
                      style={{ WebkitTapHighlightColor: "transparent" }}
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
                          onClick={() => {
                            triggerHaptic(12);
                            setSelectedRole(role.label);
                          }}
                          className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 sm:py-2 rounded-xl text-xs sm:text-xs whitespace-nowrap transition-all touch-manipulation active:scale-95 cursor-pointer shrink-0 sm:shrink snap-start focus-visible:ring-2 focus-visible:ring-[#8B5CF6] focus-visible:outline-none ${
                            isSelected
                              ? "bg-[#7C3AED]/30 border border-[#7C3AED] text-white font-semibold shadow-sm shadow-[#7C3AED]/35"
                              : "bg-white/[0.04] border border-white/[0.09] text-neutral-300 hover:text-white hover:bg-white/[0.08]"
                          }`}
                          style={{ WebkitTapHighlightColor: "transparent" }}
                        >
                          <span className="text-sm">{role.icon}</span>
                          <span>{role.label}</span>
                        </button>
                      );
                    })}
                  </div>
                  <div
                    onClick={() => scrollRoles("right")}
                    aria-label="Scroll more roles"
                    className="absolute right-0 top-0 bottom-1 w-8 bg-gradient-to-l from-[#0B0F19] via-[#0B0F19]/80 to-transparent flex items-center justify-end pr-0.5 cursor-pointer sm:hidden"
                  >
                    <span className="text-xs text-neutral-400 font-bold">›</span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-1 text-xs text-neutral-400 pt-0.5">
                  <span>You have the right to stay anonymous &amp; confidential.</span>
                  <div className="flex items-center gap-1.5">
                    <a
                      href="/privacy?focus=contact#anonymity"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#CBACF9] hover:underline hover:text-white font-medium transition-colors focus-visible:ring-2 focus-visible:ring-[#8B5CF6] focus-visible:outline-none rounded"
                    >
                      Privacy Policy
                    </a>
                    <span className="text-neutral-600">•</span>
                    <a
                      href="/terms?focus=contact#anonymity"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#CBACF9] hover:underline hover:text-white font-medium transition-colors focus-visible:ring-2 focus-visible:ring-[#8B5CF6] focus-visible:outline-none rounded"
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
                      ref={nameInputRef}
                      id="touch-name"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        if (submissionError) setSubmissionError(null);
                      }}
                      onFocus={() => setIsInputFocused(true)}
                      onBlur={() => setIsInputFocused(false)}
                      placeholder="Your full name"
                      disabled={isSubmitting}
                      className="w-full pl-9 pr-3 py-1.5 sm:py-2 bg-white/[0.04] border border-white/[0.1] focus:border-purple focus:bg-white/[0.07] rounded-xl text-base sm:text-sm text-white placeholder:text-neutral-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8B5CF6] transition-all touch-manipulation h-[42px]"
                    />
                  </div>
                </div>

                {/* Email Address */}
                <div className="space-y-0.5 sm:space-y-1">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="touch-email"
                      className="block text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-neutral-400"
                    >
                      Email <span className="text-purple">*</span>
                    </label>
                    {email.trim().length > 4 && !emailValidation.isValid && emailValidation.suggestion && (
                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic(15);
                          setEmail(emailValidation.suggestion!);
                          if (submissionError) setSubmissionError(null);
                        }}
                        className="text-[10px] sm:text-xs text-[#CBACF9] hover:underline cursor-pointer focus-visible:ring-2 focus-visible:ring-[#8B5CF6] focus-visible:outline-none rounded"
                      >
                        Use {emailValidation.suggestion}?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <IoMailOutline className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <input
                      id="touch-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (submissionError) setSubmissionError(null);
                      }}
                      onFocus={() => setIsInputFocused(true)}
                      onBlur={() => setIsInputFocused(false)}
                      placeholder="your.email@company.com"
                      disabled={isSubmitting}
                      className={`w-full pl-9 pr-3 py-1.5 sm:py-2 bg-white/[0.04] border ${
                        email.trim().length > 4 && !emailValidation.isValid
                          ? "border-amber-400/50 focus:border-amber-400"
                          : "border-white/[0.1] focus:border-purple"
                      } focus:bg-white/[0.07] rounded-xl text-base sm:text-sm text-white placeholder:text-neutral-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8B5CF6] transition-all touch-manipulation h-[42px]`}
                    />
                  </div>
                </div>
              </div>

              {/* 3. Message Details (100-Word Professional Constraint) */}
              <div className="space-y-0.5 sm:space-y-1 flex-1 flex flex-col min-h-0">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="touch-message"
                    className="block text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-neutral-400"
                  >
                    Message <span className="text-purple">*</span>
                  </label>
                  <span
                    className={`text-[10px] sm:text-xs font-mono transition-colors ${
                      countWords(message) > MESSAGE_MAX_WORDS
                        ? "text-red-400 font-bold"
                        : countWords(message) >= MESSAGE_MAX_WORDS - 10 && countWords(message) > 0
                        ? "text-amber-400 font-medium"
                        : "text-neutral-400"
                    }`}
                  >
                    {countWords(message)} / {MESSAGE_MAX_WORDS} words
                  </span>
                </div>
                <textarea
                  id="touch-message"
                  required
                  rows={2}
                  maxLength={MESSAGE_MAX_CHARS}
                  value={message}
                  onChange={(e) => {
                    setMessage(e.target.value);
                    if (submissionError) setSubmissionError(null);
                  }}
                  onFocus={() => setIsInputFocused(true)}
                  onBlur={() => setIsInputFocused(false)}
                  placeholder="Tell me about your project, goals, or inquiries..."
                  disabled={isSubmitting}
                  className={`w-full p-2.5 sm:p-3 bg-white/[0.04] border ${
                    message.trim().length >= 8 && !messageValidation.isValid
                      ? "border-amber-400/50 focus:border-amber-400"
                      : "border-white/[0.1] focus:border-purple"
                  } focus:bg-white/[0.07] rounded-xl text-base sm:text-sm text-white placeholder:text-neutral-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8B5CF6] transition-all resize-none leading-snug touch-manipulation flex-1 ${
                    isSubmitting
                      ? "min-h-[42px] max-h-[50px]"
                      : "min-h-[55px] sm:min-h-[85px] max-h-[75px] sm:max-h-[120px]"
                  }`}
                />
                {message.trim().length >= 8 && !messageValidation.isValid && messageValidation.error && (
                  <p className="text-[10px] sm:text-xs text-amber-300/90 leading-tight">
                    {messageValidation.error}
                  </p>
                )}
              </div>

              {/* 4. Action Footer */}
              <div className="pt-1 sm:pt-2 flex flex-col items-center gap-1.5 sm:gap-2 shrink-0 transition-all duration-200 ease-out">
                {/* Dynamic Cloudflare Widget / Badge Box ABOVE Submit Button */}
                {isSubmitting ? (
                  <div className="w-full flex items-center justify-center min-h-[65px] transition-all duration-200 animate-in fade-in zoom-in-95">
                    <div
                      ref={turnstileContainerRef}
                      className="w-full max-w-[300px] flex items-center justify-center min-h-[65px] transition-transform duration-200"
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

                {/* Submit & Cancel Actions */}
                <div className="flex items-center gap-2 w-full">
                  {hasDraft && !isSubmitting && (
                    <button
                      type="button"
                      onClick={handleClearDraft}
                      className="py-2.5 sm:py-3 px-3.5 rounded-xl text-xs sm:text-sm font-medium text-neutral-400 hover:text-red-300 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition-all touch-manipulation active:scale-95 shrink-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-[#8B5CF6] focus-visible:outline-none"
                      style={{ WebkitTapHighlightColor: "transparent" }}
                    >
                      Clear
                    </button>
                  )}

                  <button
                    type="submit"
                    disabled={isButtonDisabled}
                    className={`flex-1 py-2.5 sm:py-3 px-6 rounded-xl text-sm sm:text-base font-bold transition-all flex items-center justify-center gap-2 touch-manipulation min-h-[42px] sm:min-h-[46px] shrink-0 focus-visible:ring-2 focus-visible:ring-[#8B5CF6] focus-visible:outline-none ${
                      isButtonDisabled
                        ? "bg-white/[0.04] text-neutral-500 border border-white/[0.06] opacity-50 pointer-events-none select-none cursor-not-allowed"
                        : "bg-[#7C3AED] hover:bg-[#6D28D9] text-white shadow-lg shadow-[#7C3AED]/25 cursor-pointer active:scale-[0.98]"
                    }`}
                    style={{ WebkitTapHighlightColor: "transparent" }}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>
                          {submissionStage === "verifying"
                            ? "Verifying security..."
                            : "Sending message..."}
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
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
