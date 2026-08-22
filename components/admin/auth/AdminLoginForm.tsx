"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  FaGoogle,
  FaTriangleExclamation,
  FaCheck,
  FaCircleCheck,
} from "react-icons/fa6";
import { getFirebaseAuth, getGoogleProvider, signInWithPopup } from "@/lib/admin/firebase";
import { setClientAdminSession } from "@/lib/admin/auth";

export const AdminLoginForm: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [signedOutMsg, setSignedOutMsg] = useState(false);

  useEffect(() => {
    if (searchParams.get("signedOut") === "true") {
      setSignedOutMsg(true);
      const timer = setTimeout(() => setSignedOutMsg(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  // Authenticate with Google Popup
  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setIsSuccess(false);
    setErrorMsg(null);
    setSignedOutMsg(false);

    try {
      const auth = getFirebaseAuth();
      const provider = getGoogleProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const email = user.email || "";

      // Post to backend login verification
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          avatar: user.photoURL || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Access Denied: You are not authorized to access this administrator console.");
      }

      setClientAdminSession(data.user);
      setIsSuccess(true);

      setTimeout(() => {
        router.replace("/admin");
        router.refresh();
      }, 600);
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string };
      if (error?.code === "auth/popup-closed-by-user" || error?.code === "auth/cancelled-popup-request") {
        setErrorMsg("Sign-in popup was closed. Please click below to continue with your authorized Google account.");
      } else {
        setErrorMsg(error.message || "Access Denied: You are not authorized to access this administrator console.");
      }
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-4">
      {/* Signed Out Notification Toast */}
      {signedOutMsg && (
        <div className="p-3 bg-[#F8FAFC] border border-[#CBD5E1] text-[#334155] text-xs rounded-sm flex items-center justify-between animate-in fade-in duration-200 shadow-2xs">
          <div className="flex items-center gap-2">
            <FaCircleCheck className="w-3.5 h-3.5 text-[#10B981] shrink-0" />
            <span className="font-mono">Signed out successfully.</span>
          </div>
          <button
            onClick={() => setSignedOutMsg(false)}
            className="text-[#94A3B8] hover:text-black font-mono text-[10px] uppercase cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Sign-In Card */}
      <div className="w-full bg-[#FFFFFF] border border-[#E5E7EB] rounded-none sm:rounded-[2px] shadow-xs overflow-hidden">
        {/* Card Top Section: Eyebrow + Heading */}
        <div className="p-6 sm:p-8 space-y-1.5 border-b border-[#F1F5F9]">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] tracking-[0.25em] text-[#64748B] uppercase font-bold block">
              ADMIN SIGN-IN
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#7C3AED]" />
          </div>
          <h1 className="text-2xl font-bold font-sans text-black tracking-tight">
            Sign in to Admin.
          </h1>
          <p className="text-xs text-[#64748B] font-sans leading-relaxed">
            Use the Google account associated with your administrator access.
          </p>
        </div>

        {/* Card Bottom Section: Action + Feedback + Agreement */}
        <div className="p-6 sm:p-8 space-y-4">
          {/* Error Notification */}
          {errorMsg && (
            <div className="p-3 bg-[#FEF2F2] border border-[#FCA5A5] text-[#991B1B] text-xs rounded-sm flex items-start gap-2.5 animate-in fade-in duration-150">
              <FaTriangleExclamation className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[#EF4444]" />
              <p className="font-mono leading-relaxed text-[11px]">{errorMsg}</p>
            </div>
          )}

          {/* Success Notification */}
          {isSuccess && (
            <div className="p-3 bg-[#F0FDF4] border border-[#86EFAC] text-[#166534] text-xs rounded-sm flex items-center gap-2.5 animate-in fade-in duration-150">
              <FaCheck className="w-3.5 h-3.5 shrink-0 text-[#16A34A]" />
              <p className="font-mono font-semibold text-[11px]">Authorized. Redirecting to workspace...</p>
            </div>
          )}

          {/* Single Prominent Google Button */}
          <button
            onClick={handleGoogleSignIn}
            disabled={isLoading || isSuccess}
            className={`w-full py-3.5 px-4 rounded-sm font-mono text-xs font-bold uppercase tracking-wider transition-all duration-150 flex items-center justify-center gap-2.5 shadow-xs cursor-pointer ${
              isSuccess
                ? "bg-[#10B981] text-white"
                : "bg-[#000000] text-[#FFFFFF] hover:bg-[#18181B] active:scale-[0.99] disabled:opacity-60"
            }`}
          >
            {isSuccess ? (
              <>
                <FaCheck className="w-3.5 h-3.5 text-white" />
                <span>Access Granted</span>
              </>
            ) : (
              <>
                <FaGoogle className="w-3.5 h-3.5 text-[#EA4335]" />
                <span>{isLoading ? "Authenticating..." : "Continue with Google"}</span>
              </>
            )}
          </button>

          {/* Terms & Privacy Notice */}
          <p className="text-[11px] font-sans text-[#94A3B8] text-center pt-1 leading-normal">
            By signing in you agree to our{" "}
            <Link
              href="/terms"
              target="_blank"
              className="text-[#64748B] hover:text-black underline underline-offset-2 transition-colors"
            >
              terms
            </Link>{" "}
              and{" "}
            <Link
              href="/privacy"
              target="_blank"
              className="text-[#64748B] hover:text-black underline underline-offset-2 transition-colors"
            >
              privacy policy
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
};
