"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FaTriangleExclamation,
  FaCheck,
  FaEnvelope,
  FaShieldHalved,
  FaArrowRotateRight,
  FaCircleNotch,
  FaKey,
} from "react-icons/fa6";
import { AdminPanelLoader } from "../overview/AdminPanelLoader";

export type AuthUiStage = "PRIMARY_OTP" | "AWAITING_IP" | "FALLBACK_PASSCODE";

export const AdminOtpForm: React.FC = () => {
  const router = useRouter();

  // Active Flow Stage
  const [stage, setStage] = useState<AuthUiStage>("PRIMARY_OTP");

  // 6-digit individual inputs state
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Verification & feedback state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const isSuccessRef = useRef(false);
  const [isResending, setIsResending] = useState(false);
  const [isRequestingFallback, setIsRequestingFallback] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(3);
  const [isInvalidated, setIsInvalidated] = useState(false);
  const [isShaking, setIsShaking] = useState(false);

  // Cooldown countdown timers (60s)
  const [primaryCooldown, setPrimaryCooldown] = useState<number>(60);
  const [fallbackCooldown, setFallbackCooldown] = useState<number>(0);

  // New IP Verification flow
  const [detectedIp, setDetectedIp] = useState<string | null>(null);
  const pollingDeadlineRef = useRef<number | null>(null);
  const stopPollingFnRef = useRef<((reason: string) => void) | null>(null);

  const shakeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const navigationTimeoutsRef = useRef<NodeJS.Timeout[]>([]);

  const scheduleTimeout = useCallback((fn: () => void, delayMs: number) => {
    const t = setTimeout(fn, delayMs);
    navigationTimeoutsRef.current.push(t);
    return t;
  }, []);

  // Cleanup all timers and polling on unmount
  useEffect(() => {
    return () => {
      if (shakeTimeoutRef.current) clearTimeout(shakeTimeoutRef.current);
      navigationTimeoutsRef.current.forEach((t) => clearTimeout(t));
      navigationTimeoutsRef.current = [];
      if (stopPollingFnRef.current) stopPollingFnRef.current("UNMOUNT");
    };
  }, []);

  // 1. Initial & Switch Focus on First Box
  useEffect(() => {
    if (stage !== "AWAITING_IP" && !isInvalidated && !isSuccess) {
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 50);
    }
  }, [stage, isInvalidated, isSuccess]);

  // 2. 60-Second Cooldown Timer Countdown
  useEffect(() => {
    if (primaryCooldown <= 0) return;
    const timer = setInterval(() => {
      setPrimaryCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [primaryCooldown]);

  useEffect(() => {
    if (fallbackCooldown <= 0) return;
    const timer = setInterval(() => {
      setFallbackCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [fallbackCooldown]);

  // 3. Trigger Shake Animation on Invalid Attempt
  const triggerShake = useCallback(() => {
    if (shakeTimeoutRef.current) clearTimeout(shakeTimeoutRef.current);
    setIsShaking(true);
    shakeTimeoutRef.current = setTimeout(() => {
      setIsShaking(false);
      shakeTimeoutRef.current = null;
    }, 500);
  }, []);

  // 4. Handle Single Digit Input
  const handleDigitChange = (index: number, value: string) => {
    if (isInvalidated || isSubmitting || isSubmittingRef.current || isSuccess || isSuccessRef.current) return;

    const cleanValue = value.replace(/\D/g, "");
    if (!cleanValue) {
      const updated = [...digits];
      updated[index] = "";
      setDigits(updated);
      return;
    }

    const lastChar = cleanValue.slice(-1);
    const updated = [...digits];
    updated[index] = lastChar;
    setDigits(updated);

    if (index < 5 && lastChar) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // 5. Handle Backspace & Arrow Navigation
  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (isSuccess || isSuccessRef.current) return;
    if (e.key === "Backspace") {
      if (!digits[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  };

  // 6. Handle 6-digit Paste
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (isInvalidated || isSubmitting || isSubmittingRef.current || isSuccess || isSuccessRef.current) return;

    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pastedData) return;

    const updated = [...digits];
    for (let i = 0; i < 6; i++) {
      updated[i] = pastedData[i] || "";
    }
    setDigits(updated);

    const nextIndex = Math.min(pastedData.length, 5);
    inputRefs.current[nextIndex]?.focus();
  };

  // 7. Single-Flight Primary OTP Verification
  const handleVerifyPrimaryOtp = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSubmittingRef.current || isInvalidated || isSuccessRef.current) return;

    const otpCode = digits.join("").trim();
    if (otpCode.length !== 6) {
      setErrorMsg("Please enter all 6 digits of your verification code.");
      triggerShake();
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/admin/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp: otpCode }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        const isServerInvalidated =
          data.invalidated === true ||
          (typeof data.remainingAttempts === "number" && data.remainingAttempts <= 0);

        if (typeof data.remainingAttempts === "number") {
          setRemainingAttempts(data.remainingAttempts);
        }

        if (isServerInvalidated) {
          setIsInvalidated(true);
          setRemainingAttempts(0);
          setErrorMsg(data.error || "Maximum verification attempts exceeded. Redirecting to sign in...");
          triggerShake();
          scheduleTimeout(() => {
            router.push("/admin/login?error=Challenge+invalidated");
          }, 2500);
          return;
        }

        setErrorMsg(data.error || "Incorrect verification code. Please try again.");
        triggerShake();
        setDigits(["", "", "", "", "", ""]);
        setTimeout(() => {
          inputRefs.current[0]?.focus();
        }, 50);
        return;
      }

      // Case: New IP Authorization Required -> Switch to AWAITING_IP holding state
      if (data.requiresIpVerification) {
        setIsShaking(false);
        setStage("AWAITING_IP");
        setDetectedIp(data.clientIp || "Unrecognized IP");
        if (typeof data.remainingAttempts === "number") {
          setRemainingAttempts(data.remainingAttempts);
        }
        setSuccessMsg(null);
        setErrorMsg(null);
        setDigits(["", "", "", "", "", ""]);
        return;
      }

      // Case: Primary OTP Verified and IP is immediately trusted
      isSuccessRef.current = true;
      setIsSuccess(true);
      setErrorMsg(null);
    } catch {
      setErrorMsg("Network error connecting to verification service. Please try again.");
      triggerShake();
    } finally {
      if (!isSuccessRef.current) {
        isSubmittingRef.current = false;
        setIsSubmitting(false);
      }
    }
  }, [digits, router, triggerShake, scheduleTimeout, isInvalidated]);

  // 8. Single-Flight Fallback Passcode Verification
  const handleVerifyFallbackPasscode = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSubmittingRef.current || isInvalidated || isSuccessRef.current) return;

    const passcode = digits.join("").trim();
    if (passcode.length !== 6) {
      setErrorMsg("Please enter all 6 digits of your authorization passcode.");
      triggerShake();
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/admin/auth/otp/fallback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", passcode }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        const isServerInvalidated =
          data.invalidated === true ||
          (typeof data.remainingAttempts === "number" && data.remainingAttempts <= 0);

        if (typeof data.remainingAttempts === "number") {
          setRemainingAttempts(data.remainingAttempts);
        }

        if (isServerInvalidated) {
          setIsInvalidated(true);
          setRemainingAttempts(0);
          setErrorMsg(data.error || "Maximum verification attempts exceeded. Redirecting to sign in...");
          triggerShake();
          scheduleTimeout(() => {
            router.push("/admin/login?error=Challenge+invalidated");
          }, 2500);
          return;
        }

        setErrorMsg(data.error || "Incorrect authorization passcode. Please try again.");
        triggerShake();
        setDigits(["", "", "", "", "", ""]);
        setTimeout(() => {
          inputRefs.current[0]?.focus();
        }, 50);
        return;
      }

      // Success via Fallback Passcode
      isSuccessRef.current = true;
      setIsSuccess(true);
      setErrorMsg(null);
    } catch {
      setErrorMsg("Network error connecting to authorization service. Please try again.");
      triggerShake();
    } finally {
      if (!isSuccessRef.current) {
        isSubmittingRef.current = false;
        setIsSubmitting(false);
      }
    }
  }, [digits, router, triggerShake, scheduleTimeout, isInvalidated]);

  // 9. Auto-submit when all 6 digits are filled
  useEffect(() => {
    const isFilled = digits.every((d) => d.length === 1);
    if (!isFilled || isSubmitting || isSubmittingRef.current || isSuccess || isSuccessRef.current || isInvalidated) {
      return;
    }

    if (stage === "PRIMARY_OTP") {
      handleVerifyPrimaryOtp();
    } else if (stage === "FALLBACK_PASSCODE") {
      handleVerifyFallbackPasscode();
    }
  }, [digits, isSubmitting, isSuccess, stage, isInvalidated, handleVerifyPrimaryOtp, handleVerifyFallbackPasscode]);

  // 10. Resend Primary OTP Handler
  const handleResendPrimaryOtp = async () => {
    if (primaryCooldown > 0 || isResending || isInvalidated || isSubmittingRef.current || isSuccess || isSuccessRef.current) return;

    setIsResending(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/admin/auth/otp/resend", { method: "POST" });
      const data = await res.json();

      if (!res.ok || !data.success) {
        if (data.cooldownSeconds) setPrimaryCooldown(data.cooldownSeconds);
        setErrorMsg(data.error || "Failed to resend verification code.");
        return;
      }

      setSuccessMsg("A fresh 6-digit verification code has been dispatched to your email.");
      setPrimaryCooldown(60);
      setDigits(["", "", "", "", "", ""]);
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 50);
    } catch {
      setErrorMsg("Failed to connect to resend service. Please try again.");
    } finally {
      setIsResending(false);
    }
  };

  // 11. Request Fallback Passcode Handler
  const handleRequestFallbackPasscode = async () => {
    if (isRequestingFallback || isInvalidated || isSuccessRef.current) return;

    // Immediately stop active polling when fallback is requested
    if (stopPollingFnRef.current) {
      stopPollingFnRef.current("FALLBACK_TRIGGERED");
    }

    setIsRequestingFallback(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/admin/auth/otp/fallback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "request" }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMsg(data.error || "Failed to request authorization passcode.");
        return;
      }

      // Switch to Fallback Passcode Input View
      setStage("FALLBACK_PASSCODE");
      setFallbackCooldown(60);
      setDigits(["", "", "", "", "", ""]);
      if (typeof data.remainingAttempts === "number") {
        setRemainingAttempts(data.remainingAttempts);
      }
      setSuccessMsg(data.message || "A 6-digit passcode was sent to your registered Superadmin email.");
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 50);
    } catch {
      setErrorMsg("Network error requesting authorization passcode. Please try again.");
    } finally {
      setIsRequestingFallback(false);
    }
  };

  // 12. Bounded Status Polling for New IP Authorization
  // Monotonic wall-clock deadline: Date.now() + 120_000 (120 seconds max total)
  useEffect(() => {
    if (stage !== "AWAITING_IP") return;

    if (!pollingDeadlineRef.current) {
      pollingDeadlineRef.current = Date.now() + 120_000;
    }

    let isPollingActive = true;
    const abortController = new AbortController();

    const stopPolling = (reason?: string) => {
      void reason;
      if (!isPollingActive) return;
      isPollingActive = false;
      clearInterval(interval);
      abortController.abort();
      stopPollingFnRef.current = null;
    };

    stopPollingFnRef.current = stopPolling;

    const interval = setInterval(async () => {
      // Check absolute wall-clock deadline
      if (Date.now() >= (pollingDeadlineRef.current || 0)) {
        stopPolling("TIMEOUT");
        setErrorMsg("IP authorization timed out. You can verify via passcode or sign in again.");
        return;
      }

      try {
        const res = await fetch("/api/admin/auth/otp/status", {
          signal: abortController.signal,
          cache: "no-store",
        });

        const data = await res.json();

        if (data.status === "VERIFIED") {
          stopPolling("VERIFIED");
          isSuccessRef.current = true;
          setIsSuccess(true);
          setErrorMsg(null);
        } else if (data.status === "EXPIRED") {
          stopPolling("EXPIRED");
          setErrorMsg("Verification challenge expired. Redirecting to sign in...");
          scheduleTimeout(() => {
            router.push("/admin/login?error=Session+expired");
          }, 2000);
        } else if (data.status === "UNAUTHORIZED") {
          stopPolling("UNAUTHORIZED");
          setErrorMsg("Unauthorized request. Redirecting to sign in...");
          scheduleTimeout(() => {
            router.push("/admin/login");
          }, 2000);
        }
      } catch (err: unknown) {
        if ((err as Error)?.name === "AbortError") {
          return;
        }
      }
    }, 3000);

    return () => {
      stopPolling("UNMOUNT");
    };
  }, [stage, router, scheduleTimeout]);

  const hasNavigatedRef = useRef(false);
  const handleAuthComplete = useCallback(() => {
    if (!hasNavigatedRef.current) {
      hasNavigatedRef.current = true;
      window.location.replace("/admin");
    }
  }, []);

  useEffect(() => {
    if (isSuccess) {
      const fallbackTimer = setTimeout(() => {
        handleAuthComplete();
      }, 4200);
      return () => clearTimeout(fallbackTimer);
    }
  }, [isSuccess, handleAuthComplete]);

  if (isSuccess) {
    return (
      <AdminPanelLoader
        fullScreen={true}
        onComplete={handleAuthComplete}
      />
    );
  }

  return (
    <div className="w-full max-w-[420px]">
      {/* Swiss Light Main Verification Card */}
      <div className="w-full bg-[#FFFFFF] border border-[#E2E8F0] rounded-none sm:rounded-[2px] shadow-2xs overflow-hidden">
        {/* Card Header */}
        <div className="p-4 sm:p-5 space-y-1 border-b border-[#F1F5F9]">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-[#7C3AED]" />
            <span className="font-admin-mono text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
              {stage === "PRIMARY_OTP" ? "Two-Factor Authentication" : "Security Authorization"}
            </span>
          </div>
          <h1 className="text-xl sm:text-[22px] font-bold font-admin-sans text-black tracking-[-0.03em] leading-tight">
            {stage === "PRIMARY_OTP"
              ? "Enter Verification Code."
              : stage === "AWAITING_IP"
              ? "Authorize New IP Address."
              : "Enter Device Passcode."}
          </h1>
          <p className="text-xs sm:text-[13px] text-[#475569] font-admin-sans leading-relaxed pt-0.5">
            {stage === "PRIMARY_OTP"
              ? "A 6-digit one-time passcode was dispatched to your Superadmin email."
              : stage === "AWAITING_IP"
              ? `We detected a sign-in attempt from an unrecognized IP address (${detectedIp || "Unknown"}).`
              : "A 6-digit passcode was sent to your registered Superadmin email to approve this device."}
          </p>
        </div>

        {/* Card Body */}
        <div className="p-4 sm:p-5 space-y-3.5 sm:space-y-4">
          {/* ========================================================================= */}
          {/* STAGE 1: AWAITING IP HOLDING VIEW                                         */}
          {/* ========================================================================= */}
          {stage === "AWAITING_IP" ? (
            <div className="space-y-3 sm:space-y-3.5">
              <div className="p-3.5 sm:p-4 bg-[#F8FAFC] border border-[#CBD5E1] rounded-sm space-y-3 shadow-2xs">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-sm bg-[#F5F3FF] border border-[#DDD6FE] flex items-center justify-center shrink-0 mt-0.5">
                    <FaShieldHalved className="w-4 h-4 text-[#7C3AED]" />
                  </div>
                  <div className="space-y-1 min-w-0">
                    <h4 className="font-admin-sans text-xs sm:text-[13px] font-bold text-[#0F172A] tracking-tight">
                      Action Required: Check your inbox
                    </h4>
                    <p className="font-admin-sans text-[11px] sm:text-xs text-[#334155] leading-relaxed">
                      We sent a one-click authorization link to your Superadmin email. Click the link to approve this device.
                    </p>
                  </div>
                </div>

                <div className="pt-2.5 border-t border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 font-admin-mono text-[11px] text-[#475569]">
                    <span>Detected IP:</span>
                    <span className="font-bold text-[#0F172A] px-1.5 py-0.5 bg-[#FFFFFF] border border-[#E2E8F0] rounded-xs">
                      {detectedIp}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 font-admin-mono text-[11px] font-semibold text-[#7C3AED]">
                    <FaCircleNotch className="w-3 h-3 animate-spin" />
                    <span>Awaiting approval...</span>
                  </div>
                </div>
              </div>

              {/* Status feedback */}
              {successMsg && (
                <div className="p-2.5 sm:p-3 bg-[#F0FDF4] border border-[#86EFAC] text-[#166534] text-xs rounded-sm flex items-center gap-2 shadow-2xs">
                  <FaCheck className="w-3.5 h-3.5 text-[#16A34A] shrink-0" />
                  <span className="font-admin-mono text-[11px] font-semibold">{successMsg}</span>
                </div>
              )}

              {errorMsg && (
                <div className="p-2.5 sm:p-3 bg-[#FEF2F2] border border-[#FCA5A5] text-[#991B1B] text-xs rounded-sm flex items-center gap-2 shadow-2xs">
                  <FaTriangleExclamation className="w-3.5 h-3.5 text-[#EF4444] shrink-0" />
                  <span className="font-admin-mono text-[11px]">{errorMsg}</span>
                </div>
              )}

              {/* Fallback Passcode Trigger Action */}
              <div className="p-3 sm:p-3.5 bg-[#FFFFFF] border border-[#E2E8F0] rounded-sm space-y-1.5 text-center">
                <p className="font-admin-sans text-[11px] sm:text-xs text-[#64748B]">
                  Can&apos;t access your email link right now?
                </p>
                <button
                  type="button"
                  onClick={handleRequestFallbackPasscode}
                  disabled={isRequestingFallback || isInvalidated || isSuccess}
                  className="w-full py-1.5 sm:py-2 px-3 bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#CBD5E1] text-[#7C3AED] hover:text-[#6D28D9] font-admin-mono text-xs font-bold rounded-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isRequestingFallback ? (
                    <>
                      <FaCircleNotch className="w-3 h-3 animate-spin" />
                      <span>Sending passcode to inbox...</span>
                    </>
                  ) : (
                    <>
                      <FaKey className="w-3 h-3 text-[#7C3AED]" />
                      <span>Verify with Passcode instead &rarr;</span>
                    </>
                  )}
                </button>
              </div>

              {/* Return to Login */}
              <div className="pt-0.5 text-center">
                <Link
                  href="/admin/login"
                  className="inline-flex items-center gap-1.5 font-admin-mono text-[11px] text-[#64748B] hover:text-black transition-colors font-medium cursor-pointer"
                >
                  &larr; Cancel and return to sign in
                </Link>
              </div>
            </div>
          ) : (
            /* ========================================================================= */
            /* STAGE 2 & 3: 6-DIGIT SEGMENTED INPUT FORM (PRIMARY OTP & FALLBACK)        */
            /* ========================================================================= */
            <form
              onSubmit={stage === "PRIMARY_OTP" ? handleVerifyPrimaryOtp : handleVerifyFallbackPasscode}
              className="space-y-3 sm:space-y-3.5"
            >
              {/* Feedback Banners */}
              {errorMsg && (
                <div className="p-2.5 sm:p-3 bg-[#FEF2F2] border border-[#FCA5A5] text-[#991B1B] text-xs rounded-sm flex items-start gap-2 animate-in fade-in duration-150 shadow-2xs">
                  <FaTriangleExclamation className="w-3.5 h-3.5 text-[#EF4444] shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="font-admin-mono leading-relaxed text-[11px] font-semibold">{errorMsg}</p>
                    {remainingAttempts !== null && remainingAttempts > 0 && !errorMsg.includes("remaining") && (
                      <p className="font-admin-mono text-[10px] text-[#B91C1C] mt-0.5">
                        {remainingAttempts} of 3 attempts remaining.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {successMsg && (
                <div className="p-2.5 sm:p-3 bg-[#F0FDF4] border border-[#86EFAC] text-[#166534] text-xs rounded-sm flex items-center gap-2 animate-in fade-in duration-150 shadow-2xs">
                  <FaCheck className="w-3.5 h-3.5 text-[#16A34A] shrink-0" />
                  <p className="font-admin-mono font-semibold text-[11px]">{successMsg}</p>
                </div>
              )}

              {/* 6-Digit Segmented Boxes */}
              <div
                className={`flex justify-between items-center gap-1.5 sm:gap-2 transition-transform ${
                  isShaking ? "animate-shake" : ""
                }`}
              >
                {digits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => {
                      inputRefs.current[idx] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={1}
                    value={digit}
                    disabled={isInvalidated || isSubmitting || isSuccess}
                    onChange={(e) => handleDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    onPaste={handlePaste}
                    className={`w-10 h-12 sm:w-11 sm:h-13 text-center font-admin-mono text-lg sm:text-xl font-bold rounded-xs border transition-all outline-none ${
                      digit
                        ? "border-[#7C3AED] bg-[#FDF4FF]/40 text-black shadow-2xs"
                        : "border-[#CBD5E1] bg-white text-black hover:border-[#94A3B8]"
                    } focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED] disabled:opacity-50 disabled:bg-[#F8FAFC]`}
                  />
                ))}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || isInvalidated || isSuccess || digits.join("").length !== 6}
                className="w-full h-10 sm:h-10.5 bg-[#0F172A] hover:bg-[#1E293B] text-white font-admin-sans font-semibold text-xs rounded-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs cursor-pointer"
              >
                {isSuccess ? (
                  <>
                    <FaCircleNotch className="w-3.5 h-3.5 animate-spin text-[#A78BFA]" />
                    <span>Verification successful. Loading...</span>
                  </>
                ) : isSubmitting ? (
                  <>
                    <FaCircleNotch className="w-3.5 h-3.5 animate-spin" />
                    <span>Verifying code...</span>
                  </>
                ) : (
                  <span>Verify &amp; Continue &rarr;</span>
                )}
              </button>

              {/* Resend Passcode & Cooldown */}
              <div className="pt-1.5 flex items-center justify-between border-t border-[#F1F5F9]">
                <div className="flex items-center gap-1.5 font-admin-mono text-[11px] text-[#64748B]">
                  <FaEnvelope className="w-3 h-3 text-[#94A3B8]" />
                  <span>Didn&apos;t receive code?</span>
                </div>

                <button
                  type="button"
                  onClick={stage === "PRIMARY_OTP" ? handleResendPrimaryOtp : handleRequestFallbackPasscode}
                  disabled={
                    (stage === "PRIMARY_OTP" ? primaryCooldown > 0 : fallbackCooldown > 0) ||
                    isResending ||
                    isRequestingFallback ||
                    isInvalidated ||
                    isSuccess
                  }
                  className={`font-admin-mono text-[11px] font-bold flex items-center gap-1.5 transition-colors ${
                    (stage === "PRIMARY_OTP" ? primaryCooldown > 0 : fallbackCooldown > 0) ||
                    isResending ||
                    isRequestingFallback ||
                    isInvalidated ||
                    isSuccess
                      ? "text-[#94A3B8] cursor-not-allowed"
                      : "text-[#7C3AED] hover:text-[#6D28D9] cursor-pointer"
                  }`}
                >
                  {isResending || isRequestingFallback ? (
                    <>
                      <FaCircleNotch className="w-3 h-3 animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (stage === "PRIMARY_OTP" ? primaryCooldown > 0 : fallbackCooldown > 0) ? (
                    <span>Resend in {stage === "PRIMARY_OTP" ? primaryCooldown : fallbackCooldown}s</span>
                  ) : (
                    <>
                      <FaArrowRotateRight className="w-2.5 h-2.5" />
                      <span>Resend code</span>
                    </>
                  )}
                </button>
              </div>

              {/* Stage-Specific Back / Cancel Navigation */}
              <div className="text-center pt-1.5 flex flex-col gap-1">
                {stage === "FALLBACK_PASSCODE" && (
                  <button
                    type="button"
                    onClick={() => {
                      setStage("AWAITING_IP");
                      setErrorMsg(null);
                      setSuccessMsg(null);
                    }}
                    className="font-admin-mono text-[11px] text-[#7C3AED] hover:underline cursor-pointer"
                  >
                    &larr; Back to email approval waiting view
                  </button>
                )}
                <Link
                  href="/admin/login"
                  className="font-admin-mono text-[11px] text-[#64748B] hover:text-black transition-colors"
                >
                  &larr; Cancel and return to sign in
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

