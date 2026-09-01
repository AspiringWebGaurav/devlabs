"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  IoKeyOutline,
  IoReload,
  IoWarningOutline,
} from "react-icons/io5";
import { CgSpinner } from "react-icons/cg";
import Link from "next/link";
import { LiveChatLearnMoreModal } from "./LiveChatLearnMoreModal";
import type { LiveChatSessionData } from "../types";

interface LiveChatOtpVerifyProps {
  challengeId: string;
  email: string;
  name: string;
  onVerified: (session: LiveChatSessionData) => void;
  onRestart: () => void;
}

export const LiveChatOtpVerify: React.FC<LiveChatOtpVerifyProps> = ({
  challengeId: initialChallengeId,
  email,
  name,
  onVerified,
  onRestart,
}) => {
  const [challengeId, setChallengeId] = useState(initialChallengeId);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [cooldown, setCooldown] = useState(60);
  const [showLearnMore, setShowLearnMore] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // 60-second cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const isVerifyingRef = useRef(false);

  const executeVerify = useCallback(
    async (otpCode: string) => {
      if (otpCode.length !== 6 || isVerifyingRef.current || isLocked) return;

      isVerifyingRef.current = true;
      setLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/assistant/auth/otp/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            challengeId,
            otp: otpCode,
          }),
        });

        const data = await res.json();

        if (res.ok && data.ok) {
          onVerified(data.session);
        } else {
          // Clear all 6 OTP digit boxes and refocus first input on error
          setOtp(["", "", "", "", "", ""]);
          inputRefs.current[0]?.focus();

          if (data.code === "OTP_LOCKED") {
            setIsLocked(true);
            setError("Verification challenge locked due to too many failed attempts. Please request a new code.");
          } else if (data.code === "OTP_EXPIRED") {
            setIsLocked(true);
            setError("Verification code expired. Please request a new code.");
          } else {
            setError(data.message || "Invalid verification code. Please try again.");
            if (data.remainingAttempts !== undefined) {
              setRemainingAttempts(data.remainingAttempts);
            }
          }
        }
      } catch {
        setOtp(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
        setError("Network error verifying code. Please try again.");
      } finally {
        isVerifyingRef.current = false;
        setLoading(false);
      }
    },
    [challengeId, isLocked, onVerified]
  );

  const handleOtpChange = (index: number, value: string) => {
    if (isLocked || loading || isVerifyingRef.current) return;

    // Filter only numeric input
    const cleanVal = value.replace(/\D/g, "");

    if (cleanVal.length > 1) {
      // Handle paste of multiple characters
      const pastedDigits = cleanVal.slice(0, 6).split("");
      const newOtp = [...otp];
      pastedDigits.forEach((d, i) => {
        if (index + i < 6) {
          newOtp[index + i] = d;
        }
      });
      setOtp(newOtp);
      const nextIndex = Math.min(index + pastedDigits.length, 5);
      inputRefs.current[nextIndex]?.focus();

      const fullPasted = newOtp.join("");
      if (fullPasted.length === 6) {
        executeVerify(fullPasted);
      }
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = cleanVal;
    setOtp(newOtp);

    // Auto-advance
    if (cleanVal && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Direct auto-verify on 6th digit entered
    const fullOtp = newOtp.join("");
    if (fullOtp.length === 6) {
      executeVerify(fullOtp);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (isLocked || loading || isVerifyingRef.current) return;

    const pastedText = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pastedText) return;

    const newOtp = pastedText.split("");
    while (newOtp.length < 6) {
      newOtp.push("");
    }
    setOtp(newOtp);

    if (pastedText.length === 6) {
      executeVerify(pastedText);
    } else {
      const nextIndex = Math.min(pastedText.length, 5);
      inputRefs.current[nextIndex]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || resending) return;

    setError(null);
    setResending(true);

    try {
      const res = await fetch("/api/assistant/auth/otp/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (res.ok && data.ok) {
        setChallengeId(data.challengeId);
        setOtp(["", "", "", "", "", ""]);
        setCooldown(60);
        setIsLocked(false);
        setRemainingAttempts(3);
        inputRefs.current[0]?.focus();
      } else {
        setError(data.message || "Failed to resend verification code.");
        if (data.cooldownSeconds) {
          setCooldown(data.cooldownSeconds);
        }
      }
    } catch {
      setError("Network error requesting new code.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="flex-1 w-full h-full overflow-y-auto flex flex-col items-center justify-center p-3.5 sm:p-6 bg-white select-none">
      <div className="w-full max-w-[390px] sm:max-w-[410px] my-auto flex flex-col space-y-3 sm:space-y-4">
        {/* 1. Header */}
        <div className="flex items-center space-x-2.5 sm:space-x-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#F5F3FF] border border-[#DDD6FE] flex items-center justify-center text-[#7C3AED] shadow-2xs shrink-0">
            <IoKeyOutline className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base sm:text-[19px] text-neutral-950 tracking-tight leading-tight">
              {name ? `Hi ${name.split(" ")[0]}, enter code` : "Enter verification code"}
            </h3>
            <p className="text-[11px] sm:text-xs text-neutral-600 truncate max-w-[280px] font-normal">
              Sent to <strong className="text-neutral-900 font-semibold">{email}</strong>
            </p>
          </div>
        </div>

        {/* 2. Error Alert Region */}
        {error && (
          <div
            role="alert"
            aria-live="polite"
            className="p-2.5 sm:p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2"
          >
            <IoWarningOutline className="w-4 h-4 flex-shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Remaining attempts indicator */}
        {remainingAttempts !== null && remainingAttempts > 0 && !isLocked && (
          <p className="text-[10.5px] sm:text-[11px] text-amber-700 font-medium text-center">
            {remainingAttempts} attempt{remainingAttempts === 1 ? "" : "s"} remaining before lockout.
          </p>
        )}

        {/* 3. 6-Digit Inputs (Direct Automatic Entry) */}
        <div className="space-y-3">
          <div className="flex justify-between items-center gap-1 sm:gap-2">
            {otp.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => {
                  inputRefs.current[idx] = el;
                }}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={digit}
                disabled={loading || isLocked}
                aria-label={`Digit ${idx + 1} of 6`}
                onChange={(e) => handleOtpChange(idx, e.target.value)}
                onPaste={handlePaste}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                style={{ colorScheme: "light", backgroundColor: "#ffffff", color: "#0f172a" }}
                className="assistant-input w-9 h-11 sm:w-11 sm:h-13 text-center text-lg sm:text-2xl font-bold font-mono !bg-white border border-neutral-300 rounded-xl !text-neutral-950 focus:outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/25 transition-all disabled:opacity-50 disabled:bg-neutral-50"
              />
            ))}
          </div>

          {/* Inline Live Verifying State Indicator */}
          {loading && (
            <div className="flex items-center justify-center space-x-2 text-[#7C3AED] text-xs font-semibold py-1.5 animate-pulse">
              <CgSpinner className="w-4 h-4 animate-spin text-[#7C3AED]" />
              <span>Verifying code &amp; connecting to chat...</span>
            </div>
          )}
        </div>

        {/* 4. Resend Action & Escape Hatch (Change email disabled while cooldown > 0) */}
        <div className="flex items-center justify-between text-xs pt-0.5">
          <button
            type="button"
            onClick={handleResend}
            disabled={cooldown > 0 || resending || isLocked || loading}
            className={`flex items-center space-x-1.5 transition-colors cursor-pointer ${
              cooldown > 0 || isLocked || loading
                ? "text-neutral-400 cursor-not-allowed"
                : "text-[#7C3AED] hover:text-[#6D28D9] font-medium"
            }`}
          >
            <IoReload className={`w-3.5 h-3.5 ${resending ? "animate-spin" : ""}`} />
            <span>
              {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
            </span>
          </button>

          <button
            type="button"
            onClick={onRestart}
            disabled={cooldown > 0 || resending || loading || isLocked}
            className={`text-xs transition-colors ${
              cooldown > 0 || resending || loading || isLocked
                ? "text-neutral-400 cursor-not-allowed no-underline"
                : "text-neutral-500 hover:text-neutral-900 underline cursor-pointer"
            }`}
          >
            Change email
          </button>
        </div>

        {/* 5. Integrated Secondary Action & Terms/Privacy/Learn more */}
        <div className="pt-1 sm:pt-1.5 text-center text-[10.5px] sm:text-[11px] text-neutral-500 space-y-1 sm:space-y-1.5">
          <p>
            By entering, you agree to our{" "}
            <Link
              href="/terms?focus=assistant#assistant-terms"
              target="_blank"
              className="text-neutral-700 hover:text-[#7C3AED] font-medium underline-offset-2 hover:underline"
            >
              Terms
            </Link>{" "}
            &amp;{" "}
            <Link
              href="/privacy?focus=assistant#assistant-privacy"
              target="_blank"
              className="text-neutral-700 hover:text-[#7C3AED] font-medium underline-offset-2 hover:underline"
            >
              Privacy
            </Link>
            .{" "}
            <button
              type="button"
              onClick={() => setShowLearnMore(true)}
              className="text-[#7C3AED] hover:text-[#6D28D9] font-medium underline-offset-2 hover:underline cursor-pointer inline"
            >
              Learn more
            </button>
            .
          </p>
          <p className="text-[10px] text-neutral-400">
            Code expires in 5 minutes. Check spam folder if not received.
          </p>
        </div>
      </div>

      {/* Non-Technical Learn More Modal */}
      <LiveChatLearnMoreModal
        isOpen={showLearnMore}
        onClose={() => setShowLearnMore(false)}
      />
    </div>
  );
};



