"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  FaTriangleExclamation,
  FaCheck,
  FaCircleCheck,
  FaCircleInfo,
  FaXmark,
} from "react-icons/fa6";
import { GoogleAuthButton, AuthButtonState } from "./GoogleAuthButton";
import { clearClientAdminSession } from "@/lib/admin/auth";

export const AdminLoginForm: React.FC = () => {
  const searchParams = useSearchParams();
  const [authState, setAuthState] = useState<AuthButtonState>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [unauthorizedAccess, setUnauthorizedAccess] = useState(false);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [signedOutMsg, setSignedOutMsg] = useState(false);

  // Helper to permanently dismiss any notification and clean URL bar
  const clearNotificationParam = useCallback((paramName?: string) => {
    try {
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        if (paramName) {
          url.searchParams.delete(paramName);
        } else {
          url.search = "";
        }
        window.history.replaceState({}, document.title, url.pathname + (url.search ? url.search : ""));
      }
    } catch {
      // Ignore in restricted environments
    }
  }, []);

  // Check URL parameters on mount, set initial notices, and clean the address bar
  useEffect(() => {
    const unauth = searchParams.get("unauthorized") || searchParams.get("unauthorizedEmail");
    if (unauth) {
      setUnauthorizedAccess(true);
    }

    const err = searchParams.get("error");
    if (err) {
      setErrorMsg(decodeURIComponent(err));
    }

    const cancelled = searchParams.get("cancelled");
    if (cancelled === "true") {
      setInfoMsg("Sign-in was cancelled. Click below when ready to continue.");
    }

    const signedOut = searchParams.get("signedOut");
    if (signedOut === "true") {
      setSignedOutMsg(true);
      const timer = setTimeout(() => {
        setSignedOutMsg(false);
        clearNotificationParam("signedOut");
      }, 5000);
      return () => clearTimeout(timer);
    }

    // Clean query parameters from URL bar so refreshes don't re-trigger old notifications
    if (unauth || err || cancelled || signedOut) {
      clearNotificationParam();
    }
  }, [searchParams, clearNotificationParam]);

  // Dismiss handlers
  const handleDismissSignedOut = () => {
    setSignedOutMsg(false);
    clearNotificationParam("signedOut");
  };

  const handleDismissUnauthorized = () => {
    setUnauthorizedAccess(false);
    clearNotificationParam("unauthorized");
  };

  const handleDismissError = () => {
    setErrorMsg(null);
    clearNotificationParam("error");
  };

  const handleDismissInfo = () => {
    setInfoMsg(null);
    clearNotificationParam("cancelled");
  };

  // Handle Direct In-Tab Google OAuth (Zero Popups Forever)
  const handleGoogleSignInClick = () => {
    // Proactively purge any existing client session cookie before initiating OAuth
    clearClientAdminSession();
    setAuthState("connecting");
    setErrorMsg(null);
    setUnauthorizedAccess(false);
    setInfoMsg(null);
    setSignedOutMsg(false);
    clearNotificationParam();

    // Direct in-tab browser navigation to official Google OAuth gateway
    window.location.href = "/api/admin/auth/google";
  };

  return (
    <div className="w-full max-w-md">
      {/* Main Unified Sign-In Card */}
      <div className="w-full bg-[#FFFFFF] border border-[#E2E8F0] rounded-none sm:rounded-[2px] shadow-2xs overflow-hidden">
        {/* Card Top Section: Clean Subtle Heading */}
        <div className="p-6 sm:p-8 space-y-1.5 border-b border-[#F1F5F9]">
          <h1 className="text-2xl font-bold font-admin-sans text-black tracking-[-0.035em]">
            Sign in to Admin.
          </h1>
          <p className="text-xs text-[#475569] font-admin-sans leading-relaxed">
            Access is strictly restricted to authorized Superadmin identities.
          </p>
        </div>

        {/* Card Bottom Section: Action + Integrated Notifications + Agreement */}
        <div className="p-6 sm:p-8 space-y-4">
          {/* 1. Integrated Signed Out Notification */}
          {signedOutMsg && (
            <div className="p-3 bg-[#F0FDF4] border border-[#86EFAC] text-[#166534] text-xs rounded-sm flex items-center justify-between gap-2.5 animate-in fade-in duration-150 shadow-2xs">
              <div className="flex items-center gap-2">
                <FaCircleCheck className="w-3.5 h-3.5 text-[#16A34A] shrink-0" />
                <span className="font-admin-mono text-[11px] font-semibold">
                  Signed out successfully.
                </span>
              </div>
              <button
                onClick={handleDismissSignedOut}
                className="text-[#16A34A] hover:text-[#14532D] font-admin-mono text-[10px] uppercase font-bold tracking-wider cursor-pointer p-0.5"
                aria-label="Dismiss"
              >
                <FaXmark className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* 2. Integrated Unauthorized Access Banner */}
          {unauthorizedAccess && (
            <div className="p-3 bg-[#FEF2F2] border border-[#FCA5A5] rounded-sm flex items-center justify-between gap-3 animate-in fade-in duration-150 shadow-2xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <FaTriangleExclamation className="w-3.5 h-3.5 text-[#EF4444] shrink-0" />
                <p className="font-admin-mono text-[11px] text-[#991B1B] leading-tight truncate">
                  Unauthorized account. Access is restricted.
                </p>
              </div>
              <button
                onClick={handleDismissUnauthorized}
                className="text-[#F87171] hover:text-[#991B1B] cursor-pointer p-0.5 shrink-0"
                aria-label="Dismiss"
              >
                <FaXmark className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* 3. Integrated Info Notice */}
          {infoMsg && !unauthorizedAccess && (
            <div className="p-3 bg-[#F8FAFC] border border-[#CBD5E1] text-[#334155] text-xs rounded-sm flex items-center justify-between gap-2.5 animate-in fade-in duration-150 shadow-2xs">
              <div className="flex items-start gap-2.5">
                <FaCircleInfo className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[#7C3AED]" />
                <p className="font-admin-mono leading-relaxed text-[11px]">{infoMsg}</p>
              </div>
              <button
                onClick={handleDismissInfo}
                className="text-[#94A3B8] hover:text-black cursor-pointer p-0.5"
                aria-label="Dismiss"
              >
                <FaXmark className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* 4. Integrated Generic Error Notification */}
          {errorMsg && !unauthorizedAccess && (
            <div className="p-3 bg-[#FEF2F2] border border-[#FCA5A5] text-[#991B1B] text-xs rounded-sm flex items-center justify-between gap-2.5 animate-in fade-in duration-150 shadow-2xs">
              <div className="flex items-start gap-2.5">
                <FaTriangleExclamation className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[#EF4444]" />
                <p className="font-admin-mono leading-relaxed text-[11px]">{errorMsg}</p>
              </div>
              <button
                onClick={handleDismissError}
                className="text-[#F87171] hover:text-[#991B1B] cursor-pointer p-0.5"
                aria-label="Dismiss"
              >
                <FaXmark className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* 5. Integrated Success Notification */}
          {authState === "success" && (
            <div className="p-3 bg-[#F0FDF4] border border-[#86EFAC] text-[#166534] text-xs rounded-sm flex items-center gap-2.5 animate-in fade-in duration-150 shadow-2xs">
              <FaCheck className="w-3.5 h-3.5 shrink-0 text-[#16A34A]" />
              <p className="font-admin-mono font-semibold text-[11px]">
                Authorized as Superadmin. Loading workspace...
              </p>
            </div>
          )}

          {/* Clean Google Sign-In Button (Zero Popups) */}
          <GoogleAuthButton
            state={authState}
            onClick={handleGoogleSignInClick}
          />

          {/* Terms & Privacy Notice */}
          <p className="text-[11px] font-admin-sans text-[#94A3B8] text-center pt-1 leading-relaxed">
            By signing in you agree to the{" "}
            <Link
              href="/admin/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#64748B] hover:text-black underline decoration-[#CBD5E1] hover:decoration-black underline-offset-3 transition-colors duration-150"
            >
              Admin Terms
            </Link>{" "}
            and{" "}
            <Link
              href="/admin/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#64748B] hover:text-black underline decoration-[#CBD5E1] hover:decoration-black underline-offset-3 transition-colors duration-150"
            >
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
};
