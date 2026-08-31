"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  IoShieldCheckmark,
  IoClose,
  IoAlertCircle,
  IoRefresh,
  IoCheckmarkCircle,
  IoMailOutline,
  IoKeyOutline,
  IoArrowBack,
  IoWarningOutline,
} from "react-icons/io5";
import { CgSpinner } from "react-icons/cg";

interface DragCoordinates {
  x: number;
  y: number;
}

export type TurnstileGateStatus = "LOADING" | "READY" | "VERIFYING" | "SUCCESS" | "ERROR" | "TIMEOUT";
export type TurnstileGateSubView = "TURNSTILE" | "FALLBACK_EMAIL" | "FALLBACK_OTP";

interface AssistantTurnstileGateProps {
  isOpen: boolean;
  onClose: () => void;
  onVerified: () => void;
  positionMode?: "fixed" | "draggable";
  customPosition?: DragCoordinates | null;
  forcedStatus?: TurnstileGateStatus;
  forcedErrorMessage?: string;
  forcedSubView?: TurnstileGateSubView;
  forcedFailureCount?: number;
}

const TURNSTILE_SITE_KEY =
  process.env.NEXT_PUBLIC_ASSISTANT_TURNSTILE_SITE_KEY ||
  process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY ||
  "0x4AAAAAAEilFWDvwBZ3NPSK";

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export const AssistantTurnstileGate: React.FC<AssistantTurnstileGateProps> = ({
  isOpen,
  onClose,
  onVerified,
  positionMode = "fixed",
  customPosition,
  forcedStatus,
  forcedErrorMessage,
  forcedSubView,
  forcedFailureCount,
}) => {
  const [status, setStatus] = useState<TurnstileGateStatus>("LOADING");
  const [subView, setSubView] = useState<TurnstileGateSubView>("TURNSTILE");
  const [failureCount, setFailureCount] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fallback OTP State
  const [fallbackEmail, setFallbackEmail] = useState("");
  const [fallbackChallengeId, setFallbackChallengeId] = useState("");
  const [fallbackOtp, setFallbackOtp] = useState(["", "", "", "", "", ""]);
  const [fallbackLoading, setFallbackLoading] = useState(false);
  const [fallbackError, setFallbackError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(60);

  const activeStatus = forcedStatus || status;
  const activeSubView = forcedSubView || subView;
  const activeFailureCount = forcedFailureCount !== undefined ? forcedFailureCount : failureCount;
  const activeErrorMessage = forcedErrorMessage || errorMessage;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const scriptLoadedRef = useRef(false);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // 1. Cleanup Widget instance & kill background loop
  const cleanupWidget = useCallback(() => {
    if (typeof window !== "undefined" && window.turnstile && widgetIdRef.current) {
      try {
        window.turnstile.remove(widgetIdRef.current);
      } catch {}
      widgetIdRef.current = null;
    }
  }, []);

  // 2. Render Turnstile Widget (Dark theme matching portfolio)
  const renderWidget = useCallback(() => {
    if (!containerRef.current || typeof window === "undefined" || !window.turnstile) return;

    cleanupWidget();

    try {
      setStatus("READY");
      setErrorMessage(null);

      const wId = window.turnstile.render(containerRef.current, {
        sitekey: TURNSTILE_SITE_KEY,
        theme: "dark",
        size: "normal",
        callback: async (token: string) => {
          setStatus("VERIFYING");

          try {
            const res = await fetch("/api/assistant/auth/verify-turnstile", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ token }),
            });

            const data = await res.json();
            if (res.ok && data.ok) {
              setStatus("SUCCESS");
              if (typeof window !== "undefined") {
                sessionStorage.setItem("gaurav_assistant_turnstile_verified_at", Date.now().toString());
                sessionStorage.removeItem("gaurav_cf_circuit_broken");
              }
              setTimeout(() => {
                cleanupWidget();
                onVerified();
              }, 350);
            } else {
              setFailureCount((c) => {
                const next = c + 1;
                if (next >= 2 && typeof window !== "undefined") {
                  sessionStorage.setItem("gaurav_cf_circuit_broken", "true");
                  cleanupWidget();
                }
                return next;
              });
              setStatus("ERROR");
              setErrorMessage(data.error || "Security verification failed. Cloudflare conflict detected.");
            }
          } catch {
            setFailureCount((c) => {
              const next = c + 1;
              if (next >= 2 && typeof window !== "undefined") {
                sessionStorage.setItem("gaurav_cf_circuit_broken", "true");
                cleanupWidget();
              }
              return next;
            });
            setStatus("ERROR");
            setErrorMessage("Network error during Cloudflare verification.");
          }
        },
        "error-callback": () => {
          setFailureCount((c) => {
            const next = Math.max(1, c + 1);
            if (next >= 2 && typeof window !== "undefined") {
              sessionStorage.setItem("gaurav_cf_circuit_broken", "true");
              cleanupWidget();
            }
            return next;
          });
          setStatus("ERROR");
          setErrorMessage("Cloudflare challenge encountered a connection conflict.");
        },
        "expired-callback": () => {
          if (widgetIdRef.current && window.turnstile) {
            window.turnstile.reset(widgetIdRef.current);
          }
        },
      });

      widgetIdRef.current = wId;
    } catch {
      setFailureCount((c) => {
        const next = c + 1;
        if (next >= 2 && typeof window !== "undefined") {
          sessionStorage.setItem("gaurav_cf_circuit_broken", "true");
          cleanupWidget();
        }
        return next;
      });
      setStatus("ERROR");
      setErrorMessage("Unable to initialize Cloudflare widget.");
    }
  }, [cleanupWidget, onVerified]);

  // 3. Load Cloudflare Turnstile Script with Circuit Breaker Protection
  useEffect(() => {
    if (!isOpen) {
      cleanupWidget();
      return;
    }

    if (typeof window === "undefined") return;

    // Circuit Breaker: If Cloudflare is already known to be offline/blocked in this session, skip widget mounting!
    const isCircuitBroken = sessionStorage.getItem("gaurav_cf_circuit_broken") === "true";
    if (isCircuitBroken && activeSubView === "TURNSTILE" && !forcedStatus) {
      cleanupWidget();
      setSubView("FALLBACK_EMAIL");
      return;
    }

    if (activeSubView !== "TURNSTILE") {
      cleanupWidget();
      return;
    }

    if (window.turnstile) {
      scriptLoadedRef.current = true;
      const timer = setTimeout(() => renderWidget(), 100);
      return () => clearTimeout(timer);
    }

    const existingScript = document.getElementById("cf-turnstile-script");
    if (!existingScript) {
      const script = document.createElement("script");
      script.id = "cf-turnstile-script";
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.onload = () => {
        scriptLoadedRef.current = true;
        renderWidget();
      };
      script.onerror = () => {
        setFailureCount((c) => {
          const next = c + 1;
          if (next >= 2) {
            sessionStorage.setItem("gaurav_cf_circuit_broken", "true");
            cleanupWidget();
          }
          return next;
        });
        setStatus("ERROR");
        setErrorMessage("Failed to load security script. You can authenticate via Email OTP.");
      };
      document.head.appendChild(script);
    } else {
      const checkInterval = setInterval(() => {
        if (window.turnstile) {
          clearInterval(checkInterval);
          scriptLoadedRef.current = true;
          renderWidget();
        }
      }, 50);
      return () => clearInterval(checkInterval);
    }

    return () => cleanupWidget();
  }, [isOpen, activeSubView, forcedStatus, renderWidget, cleanupWidget]);

  // 4. Click outside to dismiss popover
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDownOutside = (e: MouseEvent | TouchEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        cleanupWidget();
        onClose();
      }
    };

    document.addEventListener("mousedown", handlePointerDownOutside);
    document.addEventListener("touchstart", handlePointerDownOutside, { passive: true });

    return () => {
      document.removeEventListener("mousedown", handlePointerDownOutside);
      document.removeEventListener("touchstart", handlePointerDownOutside);
    };
  }, [isOpen, onClose, cleanupWidget]);

  // 5. Countdown timer for Fallback OTP
  useEffect(() => {
    if (activeSubView !== "FALLBACK_OTP" || countdown <= 0) return;
    const timer = setInterval(() => setCountdown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(timer);
  }, [activeSubView, countdown]);

  const handleRetry = () => {
    setStatus("LOADING");
    setErrorMessage(null);

    if (widgetIdRef.current && window.turnstile) {
      try {
        window.turnstile.reset(widgetIdRef.current);
        setStatus("READY");
      } catch {
        renderWidget();
      }
    } else {
      renderWidget();
    }
  };

  // Fallback: Send OTP
  const handleSendFallbackOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!EMAIL_REGEX.test(fallbackEmail.trim())) {
      setFallbackError("Please enter a valid email address.");
      return;
    }

    setFallbackLoading(true);
    setFallbackError(null);

    try {
      const res = await fetch("/api/assistant/auth/turnstile-fallback/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: fallbackEmail.trim() }),
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        setFallbackChallengeId(data.challengeId);
        setSubView("FALLBACK_OTP");
        setCountdown(60);
      } else {
        setFallbackError(data.message || "Failed to dispatch verification code.");
      }
    } catch {
      setFallbackError("Network error. Please try again.");
    } finally {
      setFallbackLoading(false);
    }
  };

  // Fallback: Verify OTP
  const handleVerifyFallbackOtp = async (codeToVerify?: string) => {
    const fullOtp = codeToVerify || fallbackOtp.join("");
    if (fullOtp.length !== 6) {
      setFallbackError("Please enter the complete 6-digit code.");
      return;
    }

    setFallbackLoading(true);
    setFallbackError(null);

    try {
      const res = await fetch("/api/assistant/auth/turnstile-fallback/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challengeId: fallbackChallengeId || "ch_preview",
          email: fallbackEmail.trim() || "visitor@example.com",
          otp: fullOtp,
        }),
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        setStatus("SUCCESS");
        setSubView("TURNSTILE");
        if (typeof window !== "undefined") {
          sessionStorage.setItem("gaurav_assistant_turnstile_verified_at", Date.now().toString());
          sessionStorage.removeItem("gaurav_cf_circuit_broken"); // Reset circuit breaker on success
        }
        setTimeout(() => {
          cleanupWidget();
          onVerified();
        }, 400);
      } else {
        // Clear all 6 boxes and refocus index 0 on error
        setFallbackOtp(["", "", "", "", "", ""]);
        otpInputRefs.current[0]?.focus();
        setFallbackError(data.message || "Incorrect verification code. Please try again.");
      }
    } catch {
      // Clear all 6 boxes and refocus index 0 on network error
      setFallbackOtp(["", "", "", "", "", ""]);
      otpInputRefs.current[0]?.focus();
      setFallbackError("Network error during verification.");
    } finally {
      setFallbackLoading(false);
    }
  };

  const handleOtpBoxChange = (index: number, val: string) => {
    if (fallbackLoading) return;
    const cleanVal = val.replace(/\D/g, "");

    if (cleanVal.length > 1) {
      const pastedDigits = cleanVal.slice(0, 6).split("");
      const next = [...fallbackOtp];
      pastedDigits.forEach((d, i) => {
        if (index + i < 6) next[index + i] = d;
      });
      setFallbackOtp(next);
      const nextIndex = Math.min(index + pastedDigits.length, 5);
      otpInputRefs.current[nextIndex]?.focus();
      if (next.every((d) => d !== "")) {
        handleVerifyFallbackOtp(next.join(""));
      }
      return;
    }

    const newOtp = [...fallbackOtp];
    newOtp[index] = cleanVal;
    setFallbackOtp(newOtp);

    if (cleanVal && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }

    if (newOtp.every((digit) => digit !== "")) {
      handleVerifyFallbackOtp(newOtp.join(""));
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (fallbackLoading) return;
    const pastedText = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pastedText) return;

    const newOtp = pastedText.split("");
    while (newOtp.length < 6) {
      newOtp.push("");
    }
    setFallbackOtp(newOtp);

    if (pastedText.length === 6) {
      handleVerifyFallbackOtp(pastedText);
    } else {
      const nextIndex = Math.min(pastedText.length, 5);
      otpInputRefs.current[nextIndex]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !fallbackOtp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowLeft" && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  // 6. Dynamic Position Calculation (Anchored above bubble)
  const getPopoverStyle = (): React.CSSProperties => {
    if (positionMode === "draggable" && customPosition && typeof window !== "undefined") {
      const isNearTop = customPosition.y < 160;
      const leftClamped = Math.min(Math.max(16, customPosition.x - 140), window.innerWidth - 340);
      return {
        position: "fixed",
        left: `${leftClamped}px`,
        top: isNearTop ? `${customPosition.y + 64}px` : `${Math.max(16, customPosition.y - 140)}px`,
        bottom: "auto",
        right: "auto",
      };
    }

    return {
      position: "fixed",
      bottom: "calc(5.25rem + env(safe-area-inset-bottom, 0px))",
      right: "calc(1.25rem + env(safe-area-inset-right, 0px))",
    };
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={cardRef}
          initial={{ opacity: 0, scale: 0.92, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 10 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          style={getPopoverStyle()}
          className="z-[5000] w-[calc(100vw-1.5rem)] sm:w-[350px] max-w-[350px] bg-[#000319]/95 backdrop-blur-xl border border-white/[0.15] shadow-[0_16px_50px_rgba(0,0,0,0.7),0_0_24px_rgba(124,58,237,0.2)] rounded-2xl p-3 sm:p-3.5 select-none"
        >
          {/* Top Header */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/[0.08]">
            <div className="flex items-center gap-2 min-w-0">
              {activeSubView !== "TURNSTILE" ? (
                <button
                  type="button"
                  onClick={() => {
                    setSubView("TURNSTILE");
                    setFallbackError(null);
                  }}
                  className="w-7 h-7 sm:w-6 sm:h-6 rounded-md flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/[0.1] transition-colors cursor-pointer"
                  aria-label="Back to Cloudflare check"
                >
                  <IoArrowBack className="w-3.5 h-3.5" />
                </button>
              ) : (
                <div className="w-6 h-6 rounded-lg bg-[#f38020]/15 border border-[#f38020]/30 flex items-center justify-center text-[#f38020] shrink-0">
                  <IoShieldCheckmark className="w-3.5 h-3.5" />
                </div>
              )}

              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-xs font-bold text-white tracking-tight">
                  {activeSubView === "TURNSTILE"
                    ? "Security Check"
                    : activeSubView === "FALLBACK_EMAIL"
                    ? "Email Verification"
                    : "Enter 6-Digit Code"}
                </span>
                <span className="text-[10px] text-neutral-400 font-mono tracking-wider uppercase">
                  • {activeSubView === "TURNSTILE" ? "Cloudflare" : "Fallback"}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                cleanupWidget();
                onClose();
              }}
              className="w-7 h-7 sm:w-6 sm:h-6 rounded-md flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/[0.1] transition-colors cursor-pointer"
              aria-label="Close security check"
            >
              <IoClose className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* VIEW 1: Standard Turnstile Popover View */}
          {activeSubView === "TURNSTILE" && (
            <div className="flex flex-col items-center justify-center min-h-[66px]">
              {activeStatus === "LOADING" && (
                <div className="flex items-center gap-2 text-xs text-neutral-400 font-medium py-3">
                  <CgSpinner className="w-4 h-4 animate-spin text-[#f38020]" />
                  <span>Loading Cloudflare challenge...</span>
                </div>
              )}

              {activeStatus === "VERIFYING" && (
                <div className="flex items-center gap-2 text-xs text-purple font-medium py-3 animate-pulse">
                  <CgSpinner className="w-4 h-4 animate-spin text-[#7C3AED]" />
                  <span>Verifying security token...</span>
                </div>
              )}

              {activeStatus === "SUCCESS" && (
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 py-3 animate-in zoom-in-95 duration-150">
                  <IoCheckmarkCircle className="w-5 h-5 text-emerald-400" />
                  <span>Verified! Opening Assistant...</span>
                </div>
              )}

              {/* Turnstile Dark Widget Mounting Container */}
              <div
                ref={containerRef}
                className={`flex justify-center transition-opacity duration-150 ${
                  activeStatus === "READY" ? "opacity-100" : "hidden opacity-0"
                }`}
              />

              {/* Robust Multi-Tier Error Lifecycle */}
              {(activeStatus === "ERROR" || activeStatus === "TIMEOUT") && (
                <div className="w-full space-y-2 pt-1 animate-in fade-in duration-150">
                  {/* Stage 1: 1st Retry Attempt (failureCount <= 1) */}
                  {activeFailureCount <= 1 ? (
                    <>
                      <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs flex items-start gap-2 text-left">
                        <IoWarningOutline className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                        <div>
                          <div className="font-semibold text-amber-200">Connection hiccup (Attempt 1 of 2)</div>
                          <div className="text-[11px] text-amber-300/80 mt-0.5">
                            {activeErrorMessage || "Cloudflare had trouble loading. Click retry to refresh widget."}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1.5 pt-0.5">
                        <button
                          type="button"
                          onClick={handleRetry}
                          className="w-full py-2.5 sm:py-1.5 px-3 rounded-lg bg-white/[0.1] hover:bg-white/[0.18] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-white/[0.1] min-h-[40px]"
                        >
                          <IoRefresh className="w-3.5 h-3.5 text-[#f38020]" />
                          <span>Retry Cloudflare Check (1 left)</span>
                        </button>

                        <div className="text-center pt-0.5">
                          <button
                            type="button"
                            onClick={() => {
                              cleanupWidget();
                              setSubView("FALLBACK_EMAIL");
                              setFallbackError(null);
                            }}
                            className="text-[11px] text-neutral-400 hover:text-purple transition-colors cursor-pointer py-1"
                          >
                            Or skip directly to Email code &rarr;
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    /* Stage 2: Threshold Exceeded (failureCount >= 2) - Hard Handover / Kill Switch for Cloudflare */
                    <>
                      <div className="p-2.5 rounded-xl bg-purple/15 border border-purple/30 text-white text-xs flex items-start gap-2 text-left">
                        <IoShieldCheckmark className="w-4 h-4 shrink-0 text-purple mt-0.5" />
                        <div>
                          <div className="font-semibold text-[#CBACF9]">Cloudflare blocked or unavailable</div>
                          <div className="text-[11px] text-neutral-300 mt-0.5 leading-relaxed">
                            Looks like your browser or network has Cloudflare conflicts. Don&apos;t worry &mdash; authenticate directly via Email code!
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1.5 pt-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            cleanupWidget();
                            setSubView("FALLBACK_EMAIL");
                            setFallbackError(null);
                          }}
                          className="w-full py-2.5 px-3 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-[0_0_15px_rgba(124,58,237,0.3)] min-h-[42px]"
                        >
                          <IoMailOutline className="w-4 h-4" />
                          <span>Authenticate via Email Code (Recommended)</span>
                        </button>

                        {/* Only allow 1 final retry if failureCount is exactly 2; beyond 2, kill completely to avoid burning system */}
                        {activeFailureCount === 2 && (
                          <button
                            type="button"
                            onClick={handleRetry}
                            className="w-full py-1.5 px-3 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-neutral-400 hover:text-white text-[11px] font-medium flex items-center justify-center gap-1 transition-colors cursor-pointer min-h-[36px]"
                          >
                            <IoRefresh className="w-3 h-3" />
                            <span>Try Cloudflare Once More</span>
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* VIEW 2: Fallback Email Intake View */}
          {activeSubView === "FALLBACK_EMAIL" && (
            <form onSubmit={handleSendFallbackOtp} className="space-y-3 pt-1 animate-in fade-in duration-150">
              <p className="text-xs text-neutral-300 leading-relaxed">
                Cloudflare conflict detected. Enter your email to receive a 6-digit security passcode:
              </p>

              <div className="relative">
                <input
                  type="email"
                  value={fallbackEmail}
                  onChange={(e) => setFallbackEmail(e.target.value)}
                  placeholder="name@example.com"
                  disabled={fallbackLoading}
                  className="w-full py-2.5 px-3 pl-8 rounded-xl bg-white/[0.06] border border-white/[0.15] text-base sm:text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED] min-h-[42px]"
                  autoFocus
                />
                <IoMailOutline className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              </div>

              {fallbackError && (
                <div className="text-[11px] text-rose-400 flex items-center gap-1">
                  <IoAlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{fallbackError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={fallbackLoading || !fallbackEmail.trim()}
                className="w-full py-2.5 px-3 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] disabled:bg-neutral-800 disabled:text-neutral-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer min-h-[42px]"
              >
                {fallbackLoading ? (
                  <>
                    <CgSpinner className="w-4 h-4 animate-spin" />
                    <span>Dispatching Code...</span>
                  </>
                ) : (
                  <>
                    <IoKeyOutline className="w-3.5 h-3.5" />
                    <span>Send Verification Code</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* VIEW 3: Fallback 6-Digit OTP Verification View */}
          {activeSubView === "FALLBACK_OTP" && (
            <div className="space-y-3 pt-1 animate-in fade-in duration-150">
              <p className="text-xs text-neutral-300 leading-relaxed">
                Code sent to <span className="font-mono text-purple font-semibold break-all">{fallbackEmail}</span>:
              </p>

              {/* 6 Digit Input Boxes - Optimized for all screen sizes */}
              <div className="flex items-center justify-between gap-1 sm:gap-1.5">
                {fallbackOtp.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => {
                      otpInputRefs.current[idx] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpBoxChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    onPaste={handleOtpPaste}
                    disabled={fallbackLoading}
                    className="w-9 sm:w-10 h-11 sm:h-11 text-center font-mono font-bold text-base sm:text-sm bg-white/[0.06] border border-white/[0.15] focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED] rounded-xl text-white focus:outline-none"
                    autoFocus={idx === 0}
                  />
                ))}
              </div>

              {fallbackError && (
                <div className="text-[11px] text-rose-400 flex items-center gap-1">
                  <IoAlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{fallbackError}</span>
                </div>
              )}

              <button
                type="button"
                onClick={() => handleVerifyFallbackOtp()}
                disabled={fallbackLoading || fallbackOtp.some((d) => !d)}
                className="w-full py-2.5 px-3 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] disabled:bg-neutral-800 disabled:text-neutral-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer min-h-[42px]"
              >
                {fallbackLoading ? (
                  <>
                    <CgSpinner className="w-4 h-4 animate-spin" />
                    <span>Verifying Code...</span>
                  </>
                ) : (
                  <>
                    <IoShieldCheckmark className="w-3.5 h-3.5" />
                    <span>Verify &amp; Unlock Assistant</span>
                  </>
                )}
              </button>

              <div className="text-center text-[10px] text-neutral-400 font-mono">
                {countdown > 0 ? (
                  <span>Resend available in {countdown}s</span>
                ) : (
                  <button
                    type="button"
                    onClick={handleSendFallbackOtp}
                    className="text-purple hover:underline cursor-pointer py-1"
                  >
                    Resend Code
                  </button>
                )}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
