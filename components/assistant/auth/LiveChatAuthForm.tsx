"use client";

import React, { useState } from "react";
import {
  IoMailOutline,
  IoPersonOutline,
  IoArrowForward,
  IoShieldCheckmarkOutline,
} from "react-icons/io5";
import { CgSpinner } from "react-icons/cg";
import Link from "next/link";
import { LiveChatLearnMoreModal } from "./LiveChatLearnMoreModal";

interface LiveChatAuthFormProps {
  initialName?: string;
  initialEmail?: string;
  onOtpDispatched: (challengeId: string, name: string, email: string) => void;
  onBack: () => void;
}

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export const LiveChatAuthForm: React.FC<LiveChatAuthFormProps> = ({
  initialName = "",
  initialEmail = "",
  onOtpDispatched,
  onBack,
}) => {
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [nameTouched, setNameTouched] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showLearnMore, setShowLearnMore] = useState(false);

  // Rate-limit countdown timer
  React.useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const cleanName = name.trim();
  const cleanEmail = email.trim().toLowerCase();

  const isNameValid = cleanName.length > 0 && cleanName.length <= 100;
  const isEmailValid = cleanEmail.length > 0 && cleanEmail.length <= 150 && EMAIL_REGEX.test(cleanEmail);
  const isFormValid = isNameValid && isEmailValid;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || cooldown > 0) return;

    setNameTouched(true);
    setEmailTouched(true);

    if (!cleanName || cleanName.length > 100) {
      setError("Please enter your full name.");
      return;
    }

    if (!cleanEmail || !EMAIL_REGEX.test(cleanEmail) || cleanEmail.length > 150) {
      setError("Please enter a valid email address.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/assistant/auth/otp/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: cleanName,
          email: cleanEmail,
        }),
      });

      const data = await res.json();

      if (res.ok && data.ok) {
        onOtpDispatched(data.challengeId, cleanName, cleanEmail);
      } else {
        if (res.status === 429) {
          const retryAfter = data.retryAfter || (res.headers.get("Retry-After") ? parseInt(res.headers.get("Retry-After")!, 10) : 60);
          if (retryAfter && !isNaN(retryAfter)) {
            setCooldown(retryAfter);
          }
          setError(data.message || "You've requested too many codes. Please wait before trying again.");
        } else {
          setError(data.message || "Failed to send verification code. Please try again.");
        }
      }
    } catch {
      setError("We couldn't connect. Please check your network and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 w-full h-full overflow-y-auto flex flex-col items-center justify-center p-3.5 sm:p-6 bg-white select-none">
      <div className="w-full max-w-[390px] sm:max-w-[410px] my-auto flex flex-col space-y-3 sm:space-y-4">
        {/* 1. Header Icon & Intro */}
        <div className="flex items-center space-x-2.5 sm:space-x-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#F5F3FF] border border-[#DDD6FE] flex items-center justify-center text-[#7C3AED] shadow-2xs shrink-0">
            <IoShieldCheckmarkOutline className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base sm:text-[19px] text-neutral-950 tracking-tight leading-tight">Authenticate to Chat</h3>
            <p className="text-[11px] sm:text-xs text-neutral-500 font-normal">Direct personal connection with Gaurav</p>
          </div>
        </div>

        {/* 2. Description Box */}
        <p className="text-[11px] sm:text-[12px] leading-relaxed text-neutral-600 bg-neutral-50/70 border border-neutral-200/60 rounded-xl p-2.5 sm:p-3">
          To prevent spam and verify your identity, a single-use 6-digit code will be sent to your email from{" "}
          <span className="font-mono font-semibold text-[#7C3AED]">no-reply@gauravpatil.online</span>.
        </p>

        {/* 3. Error Alert Region */}
        {error && (
          <div
            role="alert"
            aria-live="polite"
            className="p-2.5 sm:p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 4. Identification Form */}
        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-3.5">
          <div>
            <label htmlFor="visitor-name" className="block text-xs font-semibold text-neutral-700 mb-1">
              Full Name
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
                <IoPersonOutline className="w-4 h-4" />
              </div>
              <input
                id="visitor-name"
                name="name"
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!nameTouched) setNameTouched(true);
                  if (error) setError(null);
                }}
                onBlur={() => setNameTouched(true)}
                placeholder="e.g. Alex Morgan"
                disabled={loading}
                maxLength={100}
                required
                aria-invalid={nameTouched && !isNameValid}
                style={{ colorScheme: "light", backgroundColor: "#ffffff", color: "#0f172a" }}
                className={`assistant-input w-full h-10 sm:h-11 pl-9 pr-3.5 !bg-white !text-neutral-900 placeholder-neutral-400 border rounded-xl text-xs sm:text-sm font-medium focus:outline-none transition-all ${
                  nameTouched && !isNameValid
                    ? "border-rose-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                    : "border-neutral-300 focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20"
                }`}
              />
            </div>
          </div>

          <div>
            <label htmlFor="visitor-email" className="block text-xs font-semibold text-neutral-700 mb-1">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
                <IoMailOutline className="w-4 h-4" />
              </div>
              <input
                id="visitor-email"
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (!emailTouched) setEmailTouched(true);
                  if (error) setError(null);
                }}
                onBlur={() => setEmailTouched(true)}
                placeholder="alex@company.com"
                disabled={loading}
                maxLength={150}
                required
                aria-invalid={emailTouched && !isEmailValid}
                style={{ colorScheme: "light", backgroundColor: "#ffffff", color: "#0f172a" }}
                className={`assistant-input w-full h-10 sm:h-11 pl-9 pr-3.5 !bg-white !text-neutral-900 placeholder-neutral-400 border rounded-xl text-xs sm:text-sm font-medium focus:outline-none transition-all ${
                  emailTouched && !isEmailValid
                    ? "border-rose-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                    : "border-neutral-300 focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20"
                }`}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={!isFormValid || loading || cooldown > 0}
            className={`w-full h-10 sm:h-11 mt-0.5 rounded-xl font-semibold text-xs sm:text-sm flex items-center justify-center space-x-2 transition-all shadow-xs ${
              !isFormValid || loading || cooldown > 0
                ? "bg-neutral-100 border border-neutral-200 text-neutral-400 cursor-not-allowed"
                : "bg-[#7C3AED] hover:bg-[#6D28D9] text-white cursor-pointer active:scale-[0.99]"
            }`}
          >
            {loading ? (
              <>
                <CgSpinner className="w-4 h-4 animate-spin" />
                <span>Sending Code...</span>
              </>
            ) : cooldown > 0 ? (
              <span>Retry in {cooldown}s</span>
            ) : (
              <>
                <span>Continue</span>
                <IoArrowForward className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* 5. Integrated Secondary Action Block */}
        <div className="pt-1 sm:pt-2 text-center text-[10.5px] sm:text-[11px] text-neutral-500 space-y-1 sm:space-y-1.5">
          <p>
            By continuing, you agree to our{" "}
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
          <button
            type="button"
            onClick={onBack}
            className="text-neutral-500 hover:text-neutral-900 transition-colors underline cursor-pointer inline-block text-xs"
          >
            &larr; Back to menu
          </button>
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


