"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { FaGoogle, FaShieldHalved, FaTriangleExclamation } from "react-icons/fa6";
import { getFirebaseAuth, getGoogleProvider, signInWithPopup } from "@/lib/admin/firebase";
import { setClientAdminSession } from "@/lib/admin/auth";

export default function AdminLoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Authenticate with Google Popup
  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMsg(null);

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
      router.replace("/admin");
      router.refresh();
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string };
      if (error?.code === "auth/popup-closed-by-user" || error?.code === "auth/cancelled-popup-request") {
        setErrorMsg("Sign-in popup was closed. Please click below to continue with your authorized Google account.");
      } else {
        setErrorMsg(error.message || "Access Denied: You are not authorized to access this administrator console.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#FAFAFA] flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md bg-[#FFFFFF] border border-[#E5E7EB] rounded-none sm:rounded-[2px] shadow-xs p-6 sm:p-8 space-y-6">
        {/* Header */}
        <div className="space-y-1.5 text-left border-b border-[#F1F5F9] pb-4">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] tracking-[0.2em] text-[#64748B] uppercase font-bold">
              Admin Console
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#A855F7]" />
          </div>
          <h1 className="text-xl font-bold font-sans text-black tracking-tight">
            Administrator Sign-In
          </h1>
          <p className="text-xs text-[#64748B] font-sans leading-relaxed">
            Sign in with your authorized administrator Google account to access the control console.
          </p>
        </div>

        {/* Error Notification */}
        {errorMsg && (
          <div className="p-3.5 bg-[#FEF2F2] border border-[#FCA5A5] text-[#991B1B] text-xs rounded-sm flex items-start gap-2.5 animate-in fade-in duration-150">
            <FaTriangleExclamation className="w-4 h-4 shrink-0 mt-0.5 text-[#EF4444]" />
            <p className="font-mono leading-relaxed">{errorMsg}</p>
          </div>
        )}

        {/* Action: Single Google OAuth Button */}
        <button
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="w-full bg-[#000000] text-[#FFFFFF] py-3.5 px-4 rounded-sm font-mono text-xs font-bold uppercase tracking-wider hover:bg-[#18181B] active:scale-[0.99] transition-all duration-150 flex items-center justify-center gap-2.5 shadow-xs disabled:opacity-60 cursor-pointer"
        >
          <FaGoogle className="w-3.5 h-3.5 text-[#EA4335]" />
          <span>{isLoading ? "Authenticating..." : "Continue with Google"}</span>
        </button>

        {/* Footer info */}
        <div className="pt-2 text-center text-[10px] font-mono text-[#94A3B8] flex items-center justify-center gap-1.5 border-t border-[#F8FAFC]">
          <FaShieldHalved className="w-3 h-3 text-[#10B981]" />
          <span>Protected by Gaurav Portfolio Security Architecture</span>
        </div>
      </div>
    </main>
  );
}
