"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { authenticateWithGooglePreOTP, setClientAdminSession } from "@/lib/admin/auth";
import { AdminUser } from "@/types/admin";
import { AdminLoader } from "@/components/admin/AdminLoader";
import {
  FaShieldHalved,
  FaEnvelope,
  FaArrowRotateRight,
  FaPenToSquare,
  FaCheck,
  FaTriangleExclamation,
  FaCopy,
  FaMobileScreenButton,
  FaXmark,
} from "react-icons/fa6";

type AuthStep =
  | "GOOGLE"
  | "DESTINATION"
  | "SENDING"
  | "OTP_INPUT"
  | "TOTP_SETUP"
  | "TOTP_INPUT"
  | "SUCCESS";

interface GoogleAdminProfile {
  email: string;
  name: string;
  avatar: string;
  uid: string;
}

interface TotpSetupData {
  secret: string;
  qrCodeDataUrl: string;
  appName: string;
  account: string;
}

export default function AdminLoginPage() {
  const router = useRouter();

  // State Machine
  const [authStep, setAuthStep] = useState<AuthStep>("GOOGLE");
  const [googleProfile, setGoogleProfile] = useState<GoogleAdminProfile | null>(null);

  // Delivery options (Email OTP)
  const [useCustomEmail, setUseCustomEmail] = useState(false);
  const [customEmailInput, setCustomEmailInput] = useState("");
  const [activeTargetEmail, setActiveTargetEmail] = useState("");
  const [maskedEmailDisplay, setMaskedEmailDisplay] = useState("");

  // Email OTP Input State (6 individual digits)
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const emailInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Google Authenticator TOTP State
  const [totpDigits, setTotpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const totpInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [totpSetupData, setTotpSetupData] = useState<TotpSetupData | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);

  // Timers & Feedback
  const [expiresInSeconds, setExpiresInSeconds] = useState(300); // 5 min TTL
  const [totpExpiresInSeconds, setTotpExpiresInSeconds] = useState(300); // 5 min TTL for Authenticator
  const [resendCooldown, setResendCooldown] = useState(0); // 45s resend cooldown
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [shakeError, setShakeError] = useState(false);
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);
  const [totpAttemptsLeft, setTotpAttemptsLeft] = useState<number | null>(null);
  const [successPhase, setSuccessPhase] = useState(1);

  // Reset State Machine back to Start
  const handleCancelAndResetToStart = useCallback(() => {
    setAuthStep("GOOGLE");
    setGoogleProfile(null);
    setOtpDigits(["", "", "", "", "", ""]);
    setTotpDigits(["", "", "", "", "", ""]);
    setErrorMsg("");
    setUseCustomEmail(false);
    setCustomEmailInput("");
    setActiveTargetEmail("");
    setMaskedEmailDisplay("");
    setAttemptsLeft(null);
    setTotpAttemptsLeft(null);
    setTotpSetupData(null);
    setIsLoading(false);
    setIsVerifying(false);
  }, []);

  // Keep focus firmly locked on Email OTP first box on error/shake
  const focusEmailOtpFirst = useCallback(() => {
    requestAnimationFrame(() => {
      emailInputRefs.current[0]?.focus();
      emailInputRefs.current[0]?.select();
    });
    setTimeout(() => {
      emailInputRefs.current[0]?.focus();
      emailInputRefs.current[0]?.select();
    }, 50);
    setTimeout(() => {
      emailInputRefs.current[0]?.focus();
      emailInputRefs.current[0]?.select();
    }, 150);
    setTimeout(() => {
      emailInputRefs.current[0]?.focus();
      emailInputRefs.current[0]?.select();
    }, 400);
  }, []);

  // Keep focus firmly locked on TOTP first box on error/shake
  const focusTotpFirst = useCallback(() => {
    requestAnimationFrame(() => {
      totpInputRefs.current[0]?.focus();
      totpInputRefs.current[0]?.select();
    });
    setTimeout(() => {
      totpInputRefs.current[0]?.focus();
      totpInputRefs.current[0]?.select();
    }, 50);
    setTimeout(() => {
      totpInputRefs.current[0]?.focus();
      totpInputRefs.current[0]?.select();
    }, 150);
    setTimeout(() => {
      totpInputRefs.current[0]?.focus();
      totpInputRefs.current[0]?.select();
    }, 400);
  }, []);

  // Trigger error shake animation while locking cursor in OTP box
  const triggerShake = useCallback((msg: string, focusTarget?: "EMAIL" | "TOTP") => {
    setErrorMsg(msg);
    setShakeError(true);
    if (focusTarget === "EMAIL") {
      focusEmailOtpFirst();
    } else if (focusTarget === "TOTP") {
      focusTotpFirst();
    }
    setTimeout(() => {
      setShakeError(false);
      if (focusTarget === "EMAIL") {
        focusEmailOtpFirst();
      } else if (focusTarget === "TOTP") {
        focusTotpFirst();
      }
    }, 380);
  }, [focusEmailOtpFirst, focusTotpFirst]);

  // Countdown Timers for Email OTP & Google Authenticator
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (authStep === "OTP_INPUT") {
      interval = setInterval(() => {
        setExpiresInSeconds((prev) => (prev > 0 ? prev - 1 : 0));
        setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    } else if (authStep === "TOTP_SETUP" || authStep === "TOTP_INPUT") {
      interval = setInterval(() => {
        setTotpExpiresInSeconds((prev) => {
          if (prev <= 1) {
            triggerShake("Authenticator verification session expired. Please sign in again.");
            handleCancelAndResetToStart();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [authStep, triggerShake, handleCancelAndResetToStart]);

  // Format seconds to mm:ss
  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Complete Login and smoothly transition to Dashboard
  const completeLoginSession = (user: AdminUser | GoogleAdminProfile) => {
    const adminUser: AdminUser = {
      id: "uid" in user ? `usr_google_${user.uid}` : user.id,
      email: user.email,
      name: user.name,
      role: "superadmin",
      avatar: user.avatar,
    };

    setClientAdminSession(adminUser);
    setAuthStep("SUCCESS");
    setSuccessPhase(1);
    setTimeout(() => setSuccessPhase(2), 350);
    setTimeout(() => setSuccessPhase(3), 700);
    setTimeout(() => setSuccessPhase(4), 1050);
    setTimeout(() => {
      let targetRoute = "/admin";
      if (typeof window !== "undefined") {
        const targetFromSession = sessionStorage.getItem("admin_target_route");
        const fromParam = new URLSearchParams(window.location.search).get("from");
        const lastRoute = localStorage.getItem("admin_last_route");

        if (targetFromSession && targetFromSession.startsWith("/admin") && targetFromSession !== "/admin/login") {
          targetRoute = targetFromSession;
          sessionStorage.removeItem("admin_target_route");
        } else if (fromParam && fromParam.startsWith("/admin") && fromParam !== "/admin/login") {
          targetRoute = fromParam;
        } else if (lastRoute && lastRoute.startsWith("/admin") && lastRoute !== "/admin/login") {
          targetRoute = lastRoute;
        }
      }
      router.replace(targetRoute);
      router.refresh();
    }, 1400);
  };

  // 1. Step 1: Google Popup Authentication
  const handleGoogleAuth = async () => {
    setIsLoading(true);
    setErrorMsg("");

    try {
      const res = await authenticateWithGooglePreOTP();
      if (res.success && res.googleUser) {
        const user = res.googleUser;
        setGoogleProfile(user);
        setActiveTargetEmail(user.email);
        setCustomEmailInput("");
        setUseCustomEmail(false);

        // Fetch security configuration
        let config = { requireEmailOtp: true, requireTotp: false };
        try {
          const configRes = await fetch("/api/admin/auth/security-config");
          const configData = await configRes.json();
          if (configData.config) {
            config = configData.config;
          }
        } catch {
          // Use default fallback
        }

        // Scenario A: Both OFF -> Instant 1-Click Login
        if (!config.requireEmailOtp && !config.requireTotp) {
          completeLoginSession(user);
          return;
        }

        // Scenario C: Only Authenticator ON -> Skip Email OTP and jump straight to TOTP
        if (!config.requireEmailOtp && config.requireTotp) {
          await checkTotpStatusAndAdvance(user);
          return;
        }

        // Scenarios B & D: Email OTP is Required
        setAuthStep("DESTINATION");
      } else {
        triggerShake(res.error || "Access Denied: This email account is not authorized as an administrator.");
      }
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string };
      const errCode =
        e?.code || (typeof e?.message === "string" ? e.message.match(/auth\/[a-zA-Z0-9_-]+/)?.[0] : "");

      if (errCode === "auth/popup-closed-by-user" || errCode === "auth/cancelled-popup-request") {
        triggerShake("Google sign-in popup was closed before completing authentication. Please select your authorized admin account.");
      } else {
        triggerShake(e?.message || "Access Denied: This email is not authorized. You are not an administrator.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Step 2: Dispatch OTP to Destination Email via EmailJS
  const handleDispatchOTP = async (targetOverride?: string, targetUser?: GoogleAdminProfile | null) => {
    const finalTarget = (targetOverride || (useCustomEmail ? customEmailInput : activeTargetEmail)).trim().toLowerCase();
    const activeUser = targetUser || googleProfile;

    if (!finalTarget) {
      triggerShake("Please provide a valid destination email address.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(finalTarget)) {
      triggerShake("Invalid email address format.");
      return;
    }

    if (!activeUser) {
      handleCancelAndResetToStart();
      return;
    }

    setIsLoading(true);
    setErrorMsg("");
    setAuthStep("SENDING");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    try {
      const res = await fetch("/api/admin/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetEmail: finalTarget,
          adminEmail: activeUser.email,
          adminName: activeUser.name,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      let data: {
        success?: boolean;
        error?: string;
        maskedEmail?: string;
        expiresInSeconds?: number;
      } = {};
      try {
        data = await res.json();
      } catch {
        data = { success: false, error: `Server returned HTTP ${res.status}` };
      }

      if (data.success) {
        setActiveTargetEmail(finalTarget);
        setMaskedEmailDisplay(data.maskedEmail || finalTarget);
        setExpiresInSeconds(data.expiresInSeconds || 300);
        setResendCooldown(45);
        setOtpDigits(["", "", "", "", "", ""]);
        setAttemptsLeft(5);
        setAuthStep("OTP_INPUT");

        setTimeout(() => {
          emailInputRefs.current[0]?.focus();
        }, 100);
      } else {
        setAuthStep("DESTINATION");
        triggerShake(data.error || "Failed to dispatch verification code.");
      }
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      const error = err as Error;
      setAuthStep("DESTINATION");
      triggerShake(
        error?.name === "AbortError"
          ? "Dispatch timed out. Please check your connection."
          : "Network error occurred while sending verification code."
      );
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Step 3: Handle Email OTP Digit Changes
  const handleEmailDigitChange = (index: number, value: string) => {
    const cleanValue = value.replace(/\D/g, "");
    const newDigits = [...otpDigits];
    newDigits[index] = cleanValue.slice(-1);
    setOtpDigits(newDigits);
    setErrorMsg("");

    if (cleanValue && index < 5) {
      emailInputRefs.current[index + 1]?.focus();
    }

    const fullCode = newDigits.join("");
    if (fullCode.length === 6 && !newDigits.includes("")) {
      handleVerifyEmailOTP(fullCode);
    }
  };

  const handleEmailKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      emailInputRefs.current[index - 1]?.focus();
    }
  };

  const handleEmailPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").trim().replace(/\D/g, "");
    if (!pastedData) return;

    const digits = pastedData.slice(0, 6).split("");
    const newDigits = ["", "", "", "", "", ""];
    digits.forEach((d, i) => {
      newDigits[i] = d;
    });
    setOtpDigits(newDigits);

    const nextIdx = Math.min(digits.length, 5);
    emailInputRefs.current[nextIdx]?.focus();

    if (digits.length === 6) {
      handleVerifyEmailOTP(digits.join(""));
    }
  };

  // 4. Step 4: Verify Email OTP and Check Google Authenticator Status
  const handleVerifyEmailOTP = async (codeToVerify?: string, targetUser?: GoogleAdminProfile | null) => {
    const activeUser = targetUser || googleProfile;
    const code = codeToVerify || otpDigits.join("");
    if (code.length !== 6) {
      triggerShake("Please enter the complete 6-digit verification code.");
      return;
    }

    if (expiresInSeconds <= 0) {
      triggerShake("Verification code expired. Please request a new code.");
      return;
    }

    if (!activeUser) {
      handleCancelAndResetToStart();
      return;
    }

    setIsVerifying(true);
    setErrorMsg("");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    try {
      const res = await fetch("/api/admin/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetEmail: activeTargetEmail,
          code,
          adminEmail: activeUser.email,
          adminName: activeUser.name,
          adminAvatar: activeUser.avatar,
          adminUid: activeUser.uid,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      let data: {
        success?: boolean;
        error?: string;
        user?: GoogleAdminProfile;
        attemptsLeft?: number;
      } = {};
      try {
        data = await res.json();
      } catch {
        data = { success: false, error: `Server returned HTTP ${res.status}` };
      }

      if (res.ok && data.success) {
        // Fetch security configuration
        let config = { requireEmailOtp: true, requireTotp: false };
        try {
          const configRes = await fetch("/api/admin/auth/security-config");
          const configData = await configRes.json();
          if (configData.config) {
            config = configData.config;
          }
        } catch {
          // Use default
        }

        // Scenario D: Authenticator TOTP is also required -> advance to TOTP
        if (config.requireTotp) {
          await checkTotpStatusAndAdvance(activeUser);
        } else {
          // Scenario B: Authenticator is OFF -> Complete Login directly!
          completeLoginSession(data.user || activeUser);
        }
      } else {
        if (typeof data.attemptsLeft === "number") {
          setAttemptsLeft(data.attemptsLeft);
        }
        setOtpDigits(["", "", "", "", "", ""]);
        setIsVerifying(false);
        focusEmailOtpFirst();
        triggerShake(data.error || "Invalid verification code.", "EMAIL");
      }
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      const error = err as Error;
      setIsVerifying(false);
      focusEmailOtpFirst();
      triggerShake(
        error?.name === "AbortError"
          ? "Verification timed out. Please check network."
          : "Network error during verification. Please try again.",
        "EMAIL"
      );
    } finally {
      setIsVerifying(false);
    }
  };

  // Check if TOTP is configured or needs First-Time Setup
  const checkTotpStatusAndAdvance = async (targetUser?: GoogleAdminProfile | null) => {
    const activeUser = targetUser || googleProfile;
    if (!activeUser) return;

    try {
      const statusRes = await fetch("/api/admin/auth/totp/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminEmail: activeUser.email }),
      });
      const statusData = await statusRes.json();

      setTotpExpiresInSeconds(300);
      setTotpAttemptsLeft(5);

      if (statusData.success && statusData.isConfigured) {
        setTotpDigits(["", "", "", "", "", ""]);
        setAuthStep("TOTP_INPUT");
        setTimeout(() => {
          totpInputRefs.current[0]?.focus();
        }, 100);
      } else {
        await loadTotpSetup(activeUser);
      }
    } catch {
      await loadTotpSetup(activeUser);
    }
  };

  // Load TOTP Setup QR Code
  const loadTotpSetup = async (targetUser?: GoogleAdminProfile | null) => {
    const activeUser = targetUser || googleProfile;
    if (!activeUser) return;
    setIsLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/admin/auth/totp/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminEmail: activeUser.email }),
      });
      const data = await res.json();

      if (data.success) {
        setTotpSetupData({
          secret: data.secret,
          qrCodeDataUrl: data.qrCodeDataUrl,
          appName: data.appName,
          account: data.account,
        });
        setTotpDigits(["", "", "", "", "", ""]);
        setTotpExpiresInSeconds(300);
        setTotpAttemptsLeft(5);
        setAuthStep("TOTP_SETUP");
        setTimeout(() => {
          totpInputRefs.current[0]?.focus();
        }, 100);
      } else {
        triggerShake(data.error || "Failed to load Authenticator QR Code.");
      }
    } catch {
      triggerShake("Network error loading Authenticator setup.");
    } finally {
      setIsLoading(false);
    }
  };

  // 5. Step 5: Handle TOTP Digit Changes & Auto-Submit
  const handleTotpDigitChange = (index: number, value: string, isSetup = false) => {
    const cleanValue = value.replace(/\D/g, "");
    const newDigits = [...totpDigits];
    newDigits[index] = cleanValue.slice(-1);
    setTotpDigits(newDigits);
    setErrorMsg("");

    if (cleanValue && index < 5) {
      totpInputRefs.current[index + 1]?.focus();
    }

    const fullCode = newDigits.join("");
    if (fullCode.length === 6 && !newDigits.includes("")) {
      handleVerifyTOTP(fullCode, isSetup);
    }
  };

  const handleTotpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !totpDigits[index] && index > 0) {
      totpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleTotpPaste = (e: React.ClipboardEvent, isSetup = false) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").trim().replace(/\D/g, "");
    if (!pastedData) return;

    const digits = pastedData.slice(0, 6).split("");
    const newDigits = ["", "", "", "", "", ""];
    digits.forEach((d, i) => {
      newDigits[i] = d;
    });
    setTotpDigits(newDigits);

    const nextIdx = Math.min(digits.length, 5);
    totpInputRefs.current[nextIdx]?.focus();

    if (digits.length === 6) {
      handleVerifyTOTP(digits.join(""), isSetup);
    }
  };

  // 6. Step 6: Verify 6-Digit Google Authenticator Code
  const handleVerifyTOTP = async (
    codeToVerify?: string,
    isSetup = false,
    targetUser?: GoogleAdminProfile | null
  ) => {
    const activeUser = targetUser || googleProfile;
    const token = codeToVerify || totpDigits.join("");
    if (token.length !== 6) {
      triggerShake("Please enter the 6-digit Google Authenticator code.");
      return;
    }

    if (totpExpiresInSeconds <= 0) {
      triggerShake("Session expired. Please sign in again.");
      handleCancelAndResetToStart();
      return;
    }

    if (!activeUser) {
      handleCancelAndResetToStart();
      return;
    }

    setIsVerifying(true);
    setErrorMsg("");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    try {
      const res = await fetch("/api/admin/auth/totp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          secret: isSetup ? totpSetupData?.secret : undefined,
          isInitialSetup: isSetup,
          adminEmail: activeUser.email,
          adminName: activeUser.name,
          adminAvatar: activeUser.avatar,
          adminUid: activeUser.uid,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      let data: {
        success?: boolean;
        error?: string;
        user?: GoogleAdminProfile;
        attemptsLeft?: number;
        isLockedOut?: boolean;
      } = {};
      try {
        data = await res.json();
      } catch {
        data = { success: false, error: `Server returned HTTP ${res.status}` };
      }

      if (res.ok && data.success && data.user) {
        completeLoginSession(data.user);
      } else {
        if (typeof data.attemptsLeft === "number") {
          setTotpAttemptsLeft(data.attemptsLeft);
        }
        if (data.isLockedOut) {
          triggerShake(data.error || "Authenticator locked. Too many failed attempts.");
          setTimeout(() => {
            handleCancelAndResetToStart();
          }, 2000);
          return;
        }

        setTotpDigits(["", "", "", "", "", ""]);
        setIsVerifying(false);
        focusTotpFirst();
        triggerShake(data.error || "Invalid Google Authenticator code.", "TOTP");
      }
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      const error = err as Error;
      setIsVerifying(false);
      focusTotpFirst();
      triggerShake(
        error?.name === "AbortError"
          ? "Verification timed out. Please check network."
          : "Network error during verification. Please try again.",
        "TOTP"
      );
    } finally {
      setIsVerifying(false);
    }
  };

  const copySecretKey = () => {
    if (totpSetupData?.secret) {
      navigator.clipboard.writeText(totpSetupData.secret);
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    }
  };

  // Step 7: High-Security 3-Layer Success Transition View
  if (authStep === "SUCCESS") {
    return (
      <AdminLoader
        label={
          successPhase === 1
            ? "3-LAYER SECURITY VERIFIED"
            : successPhase === 2
              ? "ESTABLISHING ENCRYPTED SESSION"
              : "INITIALIZING WORKSPACE"
        }
        sublabel={
          successPhase === 1
            ? "Google OAuth + Email OTP + Authenticator confirmed."
            : successPhase === 2
              ? "Generating 8-hour cryptographic session token..."
              : `Welcome back, ${googleProfile?.name || "Gaurav"}. Entering dashboard...`
        }
        fullscreen={true}
      />
    );
  }

  return (
    <div className="min-h-screen bg-white text-black relative flex flex-col justify-between selection:bg-black selection:text-white font-sans antialiased animate-in fade-in duration-200">
      {/* Background Subtle Hairline Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#F0F0F0_1px,transparent_1px),linear-gradient(to_bottom,#F0F0F0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_40%,#000_70%,transparent_100%)] pointer-events-none -z-10" />

      {/* Clean Top Wordmark Header (Compact Zero-Scroll) */}
      <header className="w-full px-6 sm:px-12 pt-3 sm:pt-4 flex items-center justify-between">
        <Link href="/admin" className="text-xl sm:text-2xl font-bold tracking-[-0.04em] text-black hover:opacity-80 transition-opacity">
          admin panel<span className="text-[#A855F7]">.</span>
        </Link>

        {googleProfile && authStep !== "GOOGLE" && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-[#737373] hidden sm:inline">Authenticated as</span>
            <span className="text-xs font-mono font-bold text-black px-2 py-0.5 bg-[#F5F5F5] rounded-xs">
              {googleProfile.email}
            </span>
          </div>
        )}
      </header>

      {/* Main Authentication Card (Compact Single Viewport on Desktop) */}
      <main className="flex-1 flex items-center justify-center p-3 sm:p-5 my-auto">
        <div
          className={`w-full ${authStep === "TOTP_SETUP" ? "max-w-[560px]" : "max-w-[460px] sm:max-w-[490px]"
            } bg-white border border-[#E5E7EB] rounded-none sm:rounded-[2px] shadow-none transition-all ${shakeError ? "animate-shake border-rose-400" : ""
            }`}
        >
          {/* Card Top Section */}
          <div className="p-5 sm:p-6 pb-3 sm:pb-4 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono tracking-[0.2em] text-[#64748B] uppercase block font-normal leading-none">
                {authStep === "GOOGLE"
                  ? "ADMIN SIGN-IN"
                  : authStep === "DESTINATION"
                    ? "STEP 2 • DELIVERY PREFERENCE"
                    : authStep === "OTP_INPUT"
                      ? "STEP 2 • EMAIL OTP SECURITY"
                      : authStep === "TOTP_SETUP"
                        ? "STEP 3 • AUTHENTICATOR SETUP"
                        : "STEP 3 • AUTHENTICATOR CODE"}
              </span>

              {authStep !== "GOOGLE" && (
                <button
                  type="button"
                  onClick={handleCancelAndResetToStart}
                  className="inline-flex items-center gap-1 text-[11px] font-mono text-[#737373] hover:text-rose-600 transition-colors cursor-pointer px-1.5 py-0.5 rounded-xs hover:bg-rose-50"
                  title="Cancel and return to sign in screen"
                >
                  <FaXmark className="w-2.5 h-2.5" />
                  <span>Cancel</span>
                </button>
              )}
            </div>

            <h1 className="text-[21px] sm:text-[24px] font-semibold text-black tracking-[-0.035em] leading-tight pt-0.5">
              {authStep === "GOOGLE"
                ? "Sign in to Admin Panel."
                : authStep === "DESTINATION"
                  ? "Choose OTP Destination."
                  : authStep === "OTP_INPUT"
                    ? "Enter Email Security Code."
                    : authStep === "TOTP_SETUP"
                      ? "Set Up Google Authenticator."
                      : "Enter Authenticator Code."}
            </h1>

            <p className="text-xs text-[#64748B] leading-relaxed">
              {authStep === "GOOGLE"
                ? "Use the Google account associated with your organization."
                : authStep === "DESTINATION"
                  ? "Select where you want to receive your live 6-digit email code."
                  : authStep === "OTP_INPUT"
                    ? `We dispatched a 6-digit verification code to ${maskedEmailDisplay || activeTargetEmail}.`
                    : authStep === "TOTP_SETUP"
                      ? "Scan QR code in Google Authenticator or any 2FA app on your device."
                      : "Enter 6-digit code for 'Gaurav Portfolio Admin Panel' on your device."}
            </p>
          </div>

          {/* Hairline Divider */}
          <div className="border-t border-[#E5E7EB] w-full" />

          {/* Card Bottom Section */}
          <div className="p-5 sm:p-6 pt-3 sm:pt-4 space-y-3.5">
            {/* Error Message Box */}
            {errorMsg && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-mono rounded-sm leading-relaxed flex items-center gap-2">
                <FaTriangleExclamation className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* STAGE 1: GOOGLE AUTH */}
            {authStep === "GOOGLE" && (
              <div className="space-y-3.5">
                <button
                  onClick={handleGoogleAuth}
                  disabled={isLoading}
                  className="w-full bg-black text-white hover:bg-[#262626] active:bg-[#171717] py-3.5 px-4 rounded-sm font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-3 cursor-pointer transition-colors duration-150 border border-black disabled:opacity-50 disabled:pointer-events-none select-none"
                >
                  <span className="text-[#EA4335] font-bold text-sm font-sans">G</span>
                  <span className="tracking-widest">
                    {isLoading ? "AUTHENTICATING..." : "CONTINUE WITH GOOGLE"}
                  </span>
                </button>

                <p className="text-[11.5px] font-normal text-[#64748B] text-center pt-0.5 leading-relaxed">
                  By signing in you agree to our{" "}
                  <Link
                    href="/admin/terms"
                    target="_blank"
                    className="underline text-[#64748B] hover:text-black transition-colors font-medium cursor-pointer"
                  >
                    terms
                  </Link>{" "}
                  and{" "}
                  <Link
                    href="/admin/privacy"
                    target="_blank"
                    className="underline text-[#64748B] hover:text-black transition-colors font-medium cursor-pointer"
                  >
                    privacy policy
                  </Link>
                  .
                </p>
              </div>
            )}

            {/* STAGE 2: DELIVERY FREEDOM (Default vs Custom Email) */}
            {authStep === "DESTINATION" && (
              <div className="space-y-3 font-mono">
                {!useCustomEmail ? (
                  <div className="space-y-2.5">
                    <button
                      onClick={() => handleDispatchOTP(googleProfile?.email)}
                      disabled={isLoading}
                      className="w-full bg-black text-white hover:bg-[#262626] py-3 px-4 rounded-sm text-xs font-bold uppercase tracking-wider flex items-center justify-between cursor-pointer transition-all border border-black shadow-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <FaEnvelope className="w-3.5 h-3.5 text-[#A855F7]" />
                        <span className="tracking-wide">Send to Primary Mail</span>
                      </div>
                      <span className="text-[11px] text-[#A3A3A3] lowercase truncate max-w-[170px]">
                        {googleProfile?.email}
                      </span>
                    </button>

                    <button
                      onClick={() => setUseCustomEmail(true)}
                      className="w-full py-2.5 px-3 rounded-sm border border-dashed border-[#CBD5E1] hover:border-black text-xs text-[#525252] hover:text-black flex items-center justify-center gap-2 cursor-pointer transition-all bg-[#FAFAFA]"
                    >
                      <FaPenToSquare className="w-3 h-3 text-[#737373]" />
                      <span>Send to alternate / custom email</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <div className="space-y-1 text-left">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-[#525252] flex items-center justify-between">
                        <span>Alternate Destination Email:</span>
                        <button
                          onClick={() => setUseCustomEmail(false)}
                          className="text-[10px] text-[#A855F7] hover:underline cursor-pointer"
                        >
                          Use primary email instead
                        </button>
                      </label>
                      <input
                        type="email"
                        value={customEmailInput}
                        onChange={(e) => setCustomEmailInput(e.target.value)}
                        placeholder="e.g. recovery@personal.com"
                        className="w-full px-3.5 py-2.5 bg-[#FAFAFA] border border-[#CBD5E1] focus:border-black focus:bg-white text-xs rounded-sm outline-none transition-all"
                        autoFocus
                      />
                    </div>

                    <button
                      onClick={() => handleDispatchOTP(customEmailInput)}
                      disabled={isLoading || !customEmailInput.trim()}
                      className="w-full bg-black text-white hover:bg-[#262626] py-3 px-4 rounded-sm text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50 disabled:pointer-events-none"
                    >
                      <FaShieldHalved className="w-3 h-3 text-[#A855F7]" />
                      <span>Dispatch Security Code</span>
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleCancelAndResetToStart}
                  className="w-full py-2 px-3 rounded-sm border border-[#E2E8F0] bg-[#FAFAFA] hover:bg-rose-50 hover:border-rose-300 hover:text-rose-700 text-[11px] font-mono text-[#64748B] flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                >
                  <FaXmark className="w-2.5 h-2.5" />
                  <span>Cancel Authorization</span>
                </button>
              </div>
            )}

            {/* STAGE 3: SENDING IN PROGRESS */}
            {authStep === "SENDING" && (
              <div className="py-4 flex flex-col items-center justify-center gap-2.5 text-center font-mono">
                <div className="w-7 h-7 border-2 border-black border-t-[#A855F7] rounded-full animate-spin" />
                <p className="text-xs font-bold text-black uppercase tracking-wider">
                  DISPATCHING SECURITY OTP...
                </p>
                <p className="text-[11px] text-[#737373]">
                  Connecting to EmailJS security gateway &bull; {activeTargetEmail}
                </p>
              </div>
            )}

            {/* STAGE 4: 6-BOX EMAIL OTP INPUT */}
            {authStep === "OTP_INPUT" && (
              <div className="space-y-4 font-mono">
                {/* Dynamic Delivery Banner */}
                <div className="p-3 bg-[#F0FDF4] border border-[#BBF7D0] text-[#166534] rounded-sm text-xs flex items-center justify-between shadow-xs">
                  <div className="flex items-center gap-2 truncate">
                    <FaEnvelope className="w-3.5 h-3.5 text-[#16A34A] shrink-0" />
                    <span className="truncate">
                      Code sent to <strong className="text-black font-mono">{activeTargetEmail || googleProfile?.email}</strong>
                    </span>
                  </div>
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 bg-[#DCFCE7] text-[#15803D] rounded-xs font-bold shrink-0 ml-2 border border-[#86EFAC]">
                    {useCustomEmail ? "Custom Email" : "Primary Email"}
                  </span>
                </div>

                <div
                  className={`flex items-center justify-between gap-1.5 sm:gap-2 transition-transform ${shakeError ? "animate-shake" : ""
                    }`}
                >
                  {otpDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => {
                        emailInputRefs.current[idx] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleEmailDigitChange(idx, e.target.value)}
                      onKeyDown={(e) => handleEmailKeyDown(idx, e)}
                      onPaste={handleEmailPaste}
                      onFocus={(e) => e.target.select()}
                      disabled={isVerifying}
                      className={`w-10 h-12 sm:w-12 sm:h-13 text-center text-xl font-bold rounded-sm border outline-none transition-all ${shakeError
                        ? "border-rose-500 bg-rose-50/60 text-rose-700 shadow-xs ring-1 ring-rose-300"
                        : digit
                          ? "border-black bg-white text-black shadow-xs"
                          : "border-[#CBD5E1] bg-[#F8FAFC] text-black focus:border-black focus:bg-white"
                        }`}
                    />
                  ))}
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-1.5 text-xs pt-0.5 border-t border-[#F0F0F0]">
                  <div className="flex items-center gap-1.5 text-[#64748B]">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${expiresInSeconds > 60 ? "bg-emerald-500" : "bg-rose-500 animate-pulse"
                        }`}
                    />
                    <span className="text-[11px]">
                      Expires in: <strong className="text-black">{formatTime(expiresInSeconds)}</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    {resendCooldown > 0 ? (
                      <span className="text-[10.5px] text-[#94A3B8]">
                        Resend in {resendCooldown}s
                      </span>
                    ) : (
                      <button
                        onClick={() => handleDispatchOTP(activeTargetEmail)}
                        disabled={isLoading || isVerifying}
                        className="inline-flex items-center gap-1 text-[11px] text-black hover:text-[#A855F7] font-bold cursor-pointer transition-colors"
                      >
                        <FaArrowRotateRight className="w-2.5 h-2.5" />
                        <span>Resend Code</span>
                      </button>
                    )}

                    <button
                      onClick={() => setAuthStep("DESTINATION")}
                      className="text-[10.5px] text-[#64748B] hover:text-black underline cursor-pointer"
                    >
                      Change email
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={() => handleVerifyEmailOTP()}
                    disabled={isVerifying || otpDigits.join("").length !== 6}
                    className="w-full bg-black text-white hover:bg-[#262626] py-3 px-4 rounded-sm text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all border border-black disabled:opacity-50 disabled:pointer-events-none select-none shadow-xs"
                  >
                    {isVerifying ? (
                      <>
                        <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>VERIFYING EMAIL OTP...</span>
                      </>
                    ) : (
                      <>
                        <FaCheck className="w-3 h-3 text-emerald-400" />
                        <span>CONFIRM & PROCEED TO AUTHENTICATOR &rarr;</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleCancelAndResetToStart}
                    className="w-full py-2 px-3 rounded-sm border border-[#E2E8F0] bg-[#FAFAFA] hover:bg-rose-50 hover:border-rose-300 hover:text-rose-700 text-[11px] font-mono text-[#64748B] flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                  >
                    <FaXmark className="w-2.5 h-2.5" />
                    <span>Cancel Authorization</span>
                  </button>
                </div>

                <div className="p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-sm text-[11px] text-[#64748B] font-sans leading-relaxed flex items-start gap-2">
                  <FaEnvelope className="w-3 h-3 text-[#A855F7] shrink-0 mt-0.5" />
                  <p>
                    Check your <strong className="text-black font-semibold">Spam / Junk</strong> folder if email not received from <span className="font-mono text-black font-medium">Admin Security</span>.
                  </p>
                </div>

                {attemptsLeft !== null && attemptsLeft < 5 && (
                  <p className="text-[11px] text-amber-700 text-center font-mono">
                    Security notice: {attemptsLeft} verification attempt{attemptsLeft === 1 ? "" : "s"} remaining.
                  </p>
                )}
              </div>
            )}

            {/* STAGE 5: COMPACT ZERO-SCROLL GOOGLE AUTHENTICATOR SETUP */}
            {authStep === "TOTP_SETUP" && totpSetupData && (
              <div className="space-y-3 font-mono">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-center">
                  {/* Left: Compact QR Box */}
                  <div className="sm:col-span-5 flex flex-col items-center justify-center p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-sm text-center">
                    <div className="p-1 bg-white border border-[#CBD5E1] rounded-xs shadow-xs">
                      <Image
                        src={totpSetupData.qrCodeDataUrl}
                        alt="Google Authenticator QR Code"
                        width={128}
                        height={128}
                        className="w-28 h-28 object-contain rounded-xs"
                        unoptimized
                      />
                    </div>
                    <p className="text-[9.5px] font-bold text-black uppercase tracking-wider mt-1.5 flex items-center gap-1">
                      <FaMobileScreenButton className="w-2.5 h-2.5 text-[#A855F7]" />
                      <span>{totpSetupData.appName}</span>
                    </p>
                  </div>

                  {/* Right: Manual Key & 6-Digit Activation Input */}
                  <div className="sm:col-span-7 space-y-2.5 text-left">
                    <div className="p-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-sm flex items-center justify-between text-[10.5px]">
                      <span className="text-[#64748B] uppercase">Key:</span>
                      <code className="text-black font-bold tracking-wider select-all text-[11px]">
                        {totpSetupData.secret}
                      </code>
                      <button
                        onClick={copySecretKey}
                        className="text-[10px] font-bold text-[#A855F7] hover:underline cursor-pointer flex items-center gap-0.5"
                      >
                        <FaCopy className="w-2.5 h-2.5" />
                        <span>{copiedSecret ? "Copied" : "Copy"}</span>
                      </button>
                    </div>

                    <label className="text-[10.5px] font-bold uppercase tracking-wider text-black block">
                      Enter 6-digit code from App to activate:
                    </label>

                    <div
                      className={`flex items-center justify-between gap-1 transition-transform ${shakeError ? "animate-shake" : ""
                        }`}
                    >
                      {totpDigits.map((digit, idx) => (
                        <input
                          key={idx}
                          ref={(el) => {
                            totpInputRefs.current[idx] = el;
                          }}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleTotpDigitChange(idx, e.target.value, true)}
                          onKeyDown={(e) => handleTotpKeyDown(idx, e)}
                          onPaste={(e) => handleTotpPaste(e, true)}
                          onFocus={(e) => e.target.select()}
                          disabled={isVerifying}
                          className={`w-9 h-11 sm:w-10 sm:h-12 text-center text-lg font-bold rounded-sm border outline-none transition-all ${shakeError
                            ? "border-rose-500 bg-rose-50/60 text-rose-700 shadow-xs ring-1 ring-rose-300"
                            : digit
                              ? "border-black bg-white text-black shadow-xs"
                              : "border-[#CBD5E1] bg-[#F8FAFC] text-black focus:border-black focus:bg-white"
                            }`}
                        />
                      ))}
                    </div>

                    <div className="space-y-1.5">
                      <button
                        onClick={() => handleVerifyTOTP(undefined, true)}
                        disabled={isVerifying || totpDigits.join("").length !== 6}
                        className="w-full bg-black text-white hover:bg-[#262626] py-3 px-3 rounded-sm text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all border border-black disabled:opacity-50 disabled:pointer-events-none select-none shadow-xs"
                      >
                        {isVerifying ? (
                          <>
                            <span className="w-2.5 h-2.5 border border-white border-t-transparent rounded-full animate-spin" />
                            <span>ACTIVATING...</span>
                          </>
                        ) : (
                          <>
                            <FaCheck className="w-2.5 h-2.5 text-emerald-400" />
                            <span>ACTIVATE & ENTER DASHBOARD</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={handleCancelAndResetToStart}
                        className="w-full py-1.5 px-3 rounded-sm border border-[#E2E8F0] bg-[#FAFAFA] hover:bg-rose-50 hover:border-rose-300 hover:text-rose-700 text-[10.5px] font-mono text-[#64748B] flex items-center justify-center gap-1 cursor-pointer transition-all"
                      >
                        <FaXmark className="w-2.5 h-2.5" />
                        <span>Cancel Authorization</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Status Bar: Time Remaining & Attempts Notice */}
                <div className="flex items-center justify-between text-xs pt-1 border-t border-[#F0F0F0]">
                  <div className="flex items-center gap-1.5 text-[#64748B]">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${totpExpiresInSeconds > 60 ? "bg-emerald-500" : "bg-rose-500 animate-pulse"
                        }`}
                    />
                    <span className="text-[11px]">
                      Session expires in: <strong className="text-black">{formatTime(totpExpiresInSeconds)}</strong>
                    </span>
                  </div>
                  <span className="text-[10.5px] text-[#737373]">Rotates every 30s</span>
                </div>

                {totpAttemptsLeft !== null && totpAttemptsLeft < 5 && (
                  <p className="text-[11px] text-amber-700 text-center font-mono">
                    Security notice: {totpAttemptsLeft} verification attempt{totpAttemptsLeft === 1 ? "" : "s"} remaining.
                  </p>
                )}
              </div>
            )}

            {/* STAGE 6: RETURNING USER GOOGLE AUTHENTICATOR INPUT */}
            {authStep === "TOTP_INPUT" && (
              <div className="space-y-4 font-mono">
                <div className="flex items-center justify-center gap-2 p-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-sm text-xs text-black font-semibold">
                  <FaShieldHalved className="w-3 h-3 text-[#A855F7]" />
                  <span>App: Gaurav Portfolio Admin Panel</span>
                </div>

                <div
                  className={`flex items-center justify-between gap-1.5 sm:gap-2 transition-transform ${shakeError ? "animate-shake" : ""
                    }`}
                >
                  {totpDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => {
                        totpInputRefs.current[idx] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleTotpDigitChange(idx, e.target.value, false)}
                      onKeyDown={(e) => handleTotpKeyDown(idx, e)}
                      onPaste={(e) => handleTotpPaste(e, false)}
                      onFocus={(e) => e.target.select()}
                      disabled={isVerifying}
                      className={`w-10 h-12 sm:w-12 sm:h-13 text-center text-xl font-bold rounded-sm border outline-none transition-all ${shakeError
                        ? "border-rose-500 bg-rose-50/60 text-rose-700 shadow-xs ring-1 ring-rose-300"
                        : digit
                          ? "border-black bg-white text-black shadow-xs"
                          : "border-[#CBD5E1] bg-[#F8FAFC] text-black focus:border-black focus:bg-white"
                        }`}
                    />
                  ))}
                </div>

                {/* Status Bar: Time Remaining & Security Rotation Notice */}
                <div className="flex items-center justify-between text-xs pt-1 border-t border-[#F0F0F0]">
                  <div className="flex items-center gap-1.5 text-[#64748B]">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${totpExpiresInSeconds > 60 ? "bg-emerald-500" : "bg-rose-500 animate-pulse"
                        }`}
                    />
                    <span className="text-[11px]">
                      Expires in: <strong className="text-black">{formatTime(totpExpiresInSeconds)}</strong>
                    </span>
                  </div>

                  <span className="text-[10.5px] text-[#737373]">Rotates every 30s</span>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={() => handleVerifyTOTP(undefined, false)}
                    disabled={isVerifying || totpDigits.join("").length !== 6}
                    className="w-full bg-black text-white hover:bg-[#262626] py-3 px-4 rounded-sm text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all border border-black disabled:opacity-50 disabled:pointer-events-none select-none shadow-xs"
                  >
                    {isVerifying ? (
                      <>
                        <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>VERIFYING AUTHENTICATOR...</span>
                      </>
                    ) : (
                      <>
                        <FaCheck className="w-3 h-3 text-emerald-400" />
                        <span>CONFIRM & ENTER DASHBOARD</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleCancelAndResetToStart}
                    className="w-full py-2 px-3 rounded-sm border border-[#E2E8F0] bg-[#FAFAFA] hover:bg-rose-50 hover:border-rose-300 hover:text-rose-700 text-[11px] font-mono text-[#64748B] flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                  >
                    <FaXmark className="w-2.5 h-2.5" />
                    <span>Cancel Authorization</span>
                  </button>
                </div>

                {totpAttemptsLeft !== null && totpAttemptsLeft < 5 && (
                  <p className="text-[11px] text-amber-700 text-center font-mono">
                    Security notice: {totpAttemptsLeft} verification attempt{totpAttemptsLeft === 1 ? "" : "s"} remaining.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Clean Centered Bottom Footer (Compact) */}
      <footer className="w-full px-6 sm:px-12 pb-3 sm:pb-4 flex items-center justify-center text-xs text-[#737373] font-mono text-center">
        <span>&copy; {new Date().getFullYear()} admin panel. All rights reserved.</span>
      </footer>
    </div>
  );
}
