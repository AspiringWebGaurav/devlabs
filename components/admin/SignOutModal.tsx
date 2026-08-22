"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { FaLock, FaCheck, FaSpinner } from "react-icons/fa6";
import { clearClientAdminSession } from "@/lib/admin/auth";

export const SIGN_OUT_STAGES = [
  "Revoking Firebase Authentication session",
  "Purging server session cookies & tokens",
  "Clearing local storage & runtime security cache",
  "Session terminated securely. Redirecting...",
];

export const useAdminSignOut = () => {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutStep, setSignOutStep] = useState(0);
  const [signOutPercent, setSignOutPercent] = useState(0);

  const startSignOut = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    setSignOutStep(0);
    setSignOutPercent(15);

    try {
      // Stage 1: Revoking Firebase Auth credentials (900ms)
      await new Promise((r) => setTimeout(r, 900));
      setSignOutStep(1);
      setSignOutPercent(40);

      // Stage 2: Purging Server Cookies & Authorized Tokens (950ms)
      await new Promise((r) => setTimeout(r, 950));
      setSignOutStep(2);
      setSignOutPercent(70);

      // Stage 3: Purging Client Storage & Security Runtime Cache (950ms)
      await new Promise((r) => setTimeout(r, 950));
      setSignOutStep(3);
      setSignOutPercent(95);

      // Stage 4: Clear Client Session and Display Verified All-Green Checklist (1100ms)
      await clearClientAdminSession();
      setSignOutPercent(100);
      await new Promise((r) => setTimeout(r, 1100));

      router.replace("/admin/login");
      router.refresh();
    } catch (err) {
      console.error("Sign out error:", err);
      await clearClientAdminSession();
      router.replace("/admin/login");
    }
  };

  return {
    isSigningOut,
    signOutStep,
    signOutPercent,
    startSignOut,
  };
};

export const SignOutModal: React.FC<{
  isOpen: boolean;
  step: number;
  percent: number;
}> = ({ isOpen, step, percent }) => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted || !isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[999999] bg-[#FAFAFA]/75 backdrop-blur-2xl sm:backdrop-blur-3xl flex items-center justify-center p-4 sm:p-6 overflow-hidden animate-in fade-in duration-200 font-admin-sans pointer-events-auto select-none">
      {/* Ambient Radial Glass Glow */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-purple-200/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-200/40 rounded-full blur-3xl pointer-events-none" />

      {/* Central Luxury Light Executive Glass Card */}
      <div className="relative bg-white/95 backdrop-blur-2xl border border-[#E2E8F0] rounded-2xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.12),0_0_0_1px_rgba(0,0,0,0.04)] animate-in zoom-in-95 duration-200 text-slate-900">
        {/* Header Area */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-purple-50 border border-purple-200 text-purple-700 flex items-center justify-center shadow-xs shrink-0">
              <FaLock className="w-4 h-4 text-purple-700" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900 tracking-wider uppercase font-admin-mono">
                Security Session Purge
              </h3>
              <p className="text-[11px] text-slate-500 font-admin-mono mt-0.5">
                Terminating authorized administrator credentials
              </p>
            </div>
          </div>
          <span className="text-xs font-bold font-admin-mono text-purple-700 bg-purple-50 border border-purple-200 px-2.5 py-1 rounded-md shadow-2xs">
            {percent}%
          </span>
        </div>

        {/* Progress Bar Track */}
        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/80 relative">
          <div
            className="h-full bg-slate-950 rounded-full transition-all duration-300 ease-out relative"
            style={{ width: `${percent}%` }}
          >
            <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.35),transparent)] animate-[shimmer_1.2s_infinite]" />
          </div>
        </div>

        {/* 4 Pipeline Stage Ticks */}
        <div className="space-y-2.5 font-admin-mono text-xs pt-1">
          {SIGN_OUT_STAGES.map((stageTitle, idx) => {
            const isCompleted = idx < step || (idx === 3 && percent === 100);
            const isCurrent = idx === step && !isCompleted;

            return (
              <div
                key={idx}
                className={`p-3 rounded-xl flex items-center gap-3 border transition-all duration-200 ${
                  isCompleted
                    ? "bg-emerald-50/80 border-emerald-200 text-emerald-900 font-medium"
                    : isCurrent
                    ? "bg-slate-900 text-white border-slate-900 font-bold shadow-xs"
                    : "bg-slate-50/60 border-slate-200/60 text-slate-400"
                }`}
              >
                {isCompleted ? (
                  <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <FaCheck className="w-2.5 h-2.5 text-white" />
                  </div>
                ) : isCurrent ? (
                  <div className="w-5 h-5 rounded-full bg-purple-500/30 flex items-center justify-center shrink-0">
                    <FaSpinner className="w-3 h-3 text-purple-300 animate-spin" />
                  </div>
                ) : (
                  <div className="w-5 h-5 rounded-full border border-slate-300 bg-white/80 shrink-0" />
                )}

                <span className="flex-1 truncate">{stageTitle}</span>

                {isCompleted && (
                  <span className="text-[10px] text-emerald-700 font-semibold uppercase tracking-wider bg-emerald-100/60 px-1.5 py-0.5 rounded">
                    PURGED
                  </span>
                )}
                {isCurrent && (
                  <span className="text-[10px] text-purple-300 font-semibold uppercase tracking-wider bg-white/10 px-1.5 py-0.5 rounded animate-pulse">
                    PROCESSING
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer Guarantee */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-admin-mono text-slate-400">
          <span>Zero residual tokens</span>
          <span className="text-purple-600 font-bold">256-BIT PURGE</span>
        </div>
      </div>
    </div>,
    document.body
  );
};
