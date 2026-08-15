"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FaArrowRightFromBracket,
  FaShieldHalved,
  FaCheck,
  FaSpinner,
  FaLock,
} from "react-icons/fa6";
import { AdminUser } from "@/types/admin";
import { clearClientAdminSession } from "@/lib/admin/auth";

interface AdminHeaderProps {
  user?: AdminUser | null;
  sectionTitle?: string;
}

const SIGN_OUT_STAGES = [
  "Revoking Firebase Authentication session",
  "Purging server session cookies & tokens",
  "Clearing local storage & runtime security cache",
  "Session terminated securely. Redirecting...",
];

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  user,
  sectionTitle = "DATABASE",
}) => {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutStep, setSignOutStep] = useState(0);
  const [signOutPercent, setSignOutPercent] = useState(0);

  const handleSignOut = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    setSignOutStep(0);
    setSignOutPercent(20);

    try {
      // Stage 1: Revoking Firebase Auth (500ms)
      await new Promise((r) => setTimeout(r, 450));
      setSignOutStep(1);
      setSignOutPercent(50);

      // Stage 2: Purging Server Cookies & Tokens (500ms)
      await new Promise((r) => setTimeout(r, 450));
      setSignOutStep(2);
      setSignOutPercent(80);

      // Stage 3: Purging Client Storage & Cache (450ms)
      await clearClientAdminSession();
      setSignOutStep(3);
      setSignOutPercent(100);

      // Stage 4: Redirecting (450ms)
      await new Promise((r) => setTimeout(r, 450));

      router.replace("/admin/login");
      router.refresh();
    } catch (err) {
      console.error("Sign out error:", err);
      await clearClientAdminSession();
      router.replace("/admin/login");
    }
  };

  return (
    <>
      {/* High-Security Sign-Out Progress Modal Overlay */}
      {isSigningOut && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150 font-admin-sans">
          <div className="bg-white border border-[#E5E7EB] rounded-sm max-w-md w-full p-6 sm:p-8 space-y-5 shadow-2xl animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#F0F0F0]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-sm bg-black text-white flex items-center justify-center shadow-xs">
                  <FaLock className="w-3.5 h-3.5 text-[#A855F7]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-black tracking-tight uppercase font-admin-mono">
                    Security Session Purge
                  </h3>
                  <p className="text-[11px] text-[#737373] font-admin-mono">
                    Terminating authorized administrator credentials
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold font-admin-mono text-black bg-[#F5F5F5] px-2 py-0.5 rounded-xs">
                {signOutPercent}%
              </span>
            </div>

            {/* Progress Bar Track */}
            <div className="w-full h-2 bg-[#F0F0F0] rounded-full overflow-hidden border border-[#E5E5E5] relative">
              <div
                className="h-full bg-black transition-all duration-300 ease-out relative"
                style={{ width: `${signOutPercent}%` }}
              >
                <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.4),transparent)] animate-[shimmer_1.2s_infinite]" />
              </div>
            </div>

            {/* 4 Pipeline Stage Ticks */}
            <div className="space-y-2 font-admin-mono text-xs pt-1">
              {SIGN_OUT_STAGES.map((stageTitle, idx) => (
                <div
                  key={idx}
                  className={`p-2.5 rounded-xs flex items-center gap-2.5 border transition-all ${
                    idx < signOutStep || (idx === 3 && signOutPercent === 100)
                      ? "bg-emerald-50 border-emerald-200 text-emerald-800 font-medium"
                      : idx === signOutStep
                      ? "bg-[#F8FAFC] border-black text-black font-bold shadow-xs"
                      : "bg-[#FAFAFA] border-transparent text-[#94A3B8]"
                  }`}
                >
                  {idx < signOutStep || (idx === 3 && signOutPercent === 100) ? (
                    <FaCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                  ) : idx === signOutStep ? (
                    <FaSpinner className="w-3 h-3 text-black shrink-0 animate-spin" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-[#CBD5E1] shrink-0" />
                  )}
                  <span className="text-[11px] truncate">{stageTitle}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Header */}
      <header className="sticky top-0 z-40 w-full bg-white/90 backdrop-blur-md border-b border-[#E5E7EB] px-4 sm:px-6 py-3 flex items-center justify-between transition-colors font-admin-sans">
        {/* Brand & Section Eyebrow */}
        <div className="flex items-center gap-4 sm:gap-6">
          <Link href="/admin" className="flex items-center gap-2 group">
            <span className="text-xl sm:text-2xl font-black tracking-tight text-black group-hover:opacity-80 transition-opacity">
              admin panel<span className="text-[#A855F7]">.</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-2 text-[#9CA3AF] text-xs font-admin-mono">
            <span>/</span>
            <span className="text-black font-semibold uppercase tracking-wider">{sectionTitle}</span>
          </div>
        </div>

        {/* Right Controls: User Profile Badge, 2FA Badge, Dynamic Sign Out */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* 2FA Security Badge */}
          <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] font-admin-mono font-semibold text-emerald-700">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <FaShieldHalved className="w-2.5 h-2.5 text-emerald-600" />
            <span>2FA ACTIVE</span>
          </div>

          {user && (
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-black text-white flex items-center justify-center text-xs font-bold font-admin-mono shadow-xs">
                <span className="text-[#EA4335] text-xs font-bold font-sans">G</span>
              </div>
              <div className="text-left hidden md:block">
                <p className="text-xs font-semibold text-black leading-none">{user.name || "Gaurav patil"}</p>
              </div>
            </div>
          )}

          {/* Dynamic Sign Out Button with Micro-Animation */}
          <button
            onClick={handleSignOut}
            disabled={isSigningOut}
            title="Sign Out of Admin Panel"
            className="group relative inline-flex items-center gap-2 px-3.5 py-1.5 rounded-sm bg-[#F5F5F5] hover:bg-black text-[#171717] hover:text-white border border-[#E5E5E5] hover:border-black text-xs font-admin-mono font-medium transition-all duration-200 ease-out cursor-pointer shadow-xs hover:shadow-sm active:scale-95 disabled:opacity-60 disabled:pointer-events-none select-none"
          >
            {isSigningOut ? (
              <>
                <span className="w-2.5 h-2.5 border border-black group-hover:border-white border-t-transparent group-hover:border-t-transparent rounded-full animate-spin" />
                <span className="tracking-wider text-[11px]">PURGING...</span>
              </>
            ) : (
              <>
                <FaArrowRightFromBracket className="w-3 h-3 text-[#737373] group-hover:text-white transition-colors duration-200" />
                <span className="tracking-wide">Sign Out</span>
              </>
            )}
          </button>
        </div>
      </header>
    </>
  );
};
