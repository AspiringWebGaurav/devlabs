"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FaArrowRightFromBracket,
  FaCheck,
  FaSpinner,
  FaLock,
  FaChevronDown,
  FaEnvelope,
  FaMobileScreenButton,
  FaShieldHalved,
  FaKey,
} from "react-icons/fa6";
import { AdminUser, AdminSecurityConfig } from "@/types/admin";
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

  // Profile Dropdown Menu State
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Security Configuration State
  const [securityConfig, setSecurityConfig] = useState<AdminSecurityConfig>({
    requireEmailOtp: true,
    requireTotp: false,
    wipeOtpRequired: true,
  });
  const [isUpdatingConfig, setIsUpdatingConfig] = useState(false);
  const [configToast, setConfigToast] = useState<string | null>(null);

  // Re-pair / Revoke TOTP Secret State
  const [isRevokingTotp, setIsRevokingTotp] = useState(false);
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
        setShowRevokeConfirm(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMenuOpen]);

  // Fetch security configuration on mount
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch("/api/admin/auth/security-config");
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.config) {
            setSecurityConfig(data.config);
          }
        }
      } catch {
        // Use default fallback
      }
    };
    fetchConfig();
  }, []);

  const handleMouseEnter = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setIsMenuOpen(true);
  };

  const handleMouseLeave = () => {
    closeTimeoutRef.current = setTimeout(() => {
      setIsMenuOpen(false);
      setShowRevokeConfirm(false);
    }, 280);
  };

  // Toggle Security Options in real-time
  const handleToggleSecurity = async (key: keyof AdminSecurityConfig) => {
    if (isUpdatingConfig) return;
    const newVal = !securityConfig[key];
    const previous = { ...securityConfig };
    setSecurityConfig((prev) => ({ ...prev, [key]: newVal }));
    setIsUpdatingConfig(true);

    try {
      const res = await fetch("/api/admin/auth/security-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: newVal }),
      });
      const data = await res.json();
      if (data.success) {
        setSecurityConfig(data.config);
        setConfigToast(
          key === "requireEmailOtp"
            ? newVal
              ? "Login Email OTP: Enabled (6-Digit Required)"
              : "Login Email OTP: Disabled (1-Click Google)"
            : key === "requireTotp"
            ? newVal
              ? "Google Authenticator: Enabled (TOTP Required)"
              : "Google Authenticator: Disabled"
            : newVal
            ? "Wipe Safeguard: Enabled"
            : "Wipe Safeguard: Disabled"
        );
        setTimeout(() => setConfigToast(null), 3200);
      } else {
        setSecurityConfig(previous);
      }
    } catch {
      setSecurityConfig(previous);
    } finally {
      setIsUpdatingConfig(false);
    }
  };

  const handleRevokeTotp = async () => {
    if (isRevokingTotp) return;
    setIsRevokingTotp(true);

    try {
      const res = await fetch("/api/admin/auth/totp/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminEmail: user?.email || "gauravpatil9262@gmail.com" }),
      });
      const data = await res.json();
      if (data.success) {
        setShowRevokeConfirm(false);
        setConfigToast("Authenticator reset! Next login will present a fresh QR code.");
        setTimeout(() => setConfigToast(null), 4000);
      } else {
        setConfigToast(data.error || "Failed to reset Authenticator.");
        setTimeout(() => setConfigToast(null), 4000);
      }
    } catch {
      setConfigToast("Network error while resetting Authenticator.");
      setTimeout(() => setConfigToast(null), 4000);
    } finally {
      setIsRevokingTotp(false);
    }
  };

  const handleSignOut = async () => {
    if (isSigningOut) return;
    setIsMenuOpen(false);
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

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <>
      {/* High-Security Sign-Out Fullscreen Frosted Blank Glass Overlay via Portal */}
      {isMounted &&
        isSigningOut &&
        createPortal(
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
                  {signOutPercent}%
                </span>
              </div>

              {/* Progress Bar Track */}
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/80 relative">
                <div
                  className="h-full bg-slate-950 rounded-full transition-all duration-300 ease-out relative"
                  style={{ width: `${signOutPercent}%` }}
                >
                  <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.35),transparent)] animate-[shimmer_1.2s_infinite]" />
                </div>
              </div>

              {/* 4 Pipeline Stage Ticks */}
              <div className="space-y-2.5 font-admin-mono text-xs pt-1">
                {SIGN_OUT_STAGES.map((stageTitle, idx) => {
                  const isCompleted = idx < signOutStep || (idx === 3 && signOutPercent === 100);
                  const isCurrent = idx === signOutStep && !isCompleted;

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
                        <span className="w-2 h-2 rounded-full bg-slate-300 ml-1.5 mr-1.5 shrink-0" />
                      )}
                      <span className="text-xs truncate">{stageTitle}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Main Sticky Header */}
      <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-[#E5E7EB] px-4 sm:px-6 py-2.5 flex items-center justify-between transition-colors font-admin-sans">
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

        {/* Unified Admin Profile Pill with Popover Menu */}
        <div
          className="relative"
          ref={menuRef}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {/* Main Pill Button */}
          <button
            type="button"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            aria-expanded={isMenuOpen}
            title="Admin Profile & Security Controls"
            className={`group flex items-center gap-2.5 pl-1.5 pr-3 py-1.5 rounded-full border transition-all duration-200 cursor-pointer select-none active:scale-[0.98] ${
              isMenuOpen
                ? "bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-purple-500/20"
                : "bg-white hover:bg-slate-50 text-slate-900 border-[#E2E8F0] shadow-xs hover:border-slate-300"
            }`}
          >
            {/* Circle Avatar with Red G & Gradient Accent */}
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold font-admin-mono shadow-xs transition-transform duration-200 group-hover:scale-105 ${
                isMenuOpen ? "bg-white text-black" : "bg-slate-950 text-white"
              }`}
            >
              <span className="text-[#EA4335] font-black font-sans text-sm">G</span>
            </div>

            {/* Name */}
            <span className="text-xs font-bold tracking-tight font-admin-sans">
              {user?.name || "Gaurav patil"}
            </span>

            {/* Caret Chevron Indicator */}
            <FaChevronDown
              className={`w-2.5 h-2.5 transition-transform duration-200 ${
                isMenuOpen
                  ? "rotate-180 text-purple-400"
                  : "text-slate-400 group-hover:text-slate-700"
              }`}
            />
          </button>

          {/* Luxury Floating Drawer Popover Menu */}
          {isMenuOpen && (
            <div className="absolute right-0 top-full pt-2.5 w-[390px] sm:w-[420px] md:w-[440px] z-50">
              {/* Invisible Hover Tunnel Safe Bridge */}
              <div className="absolute -top-3 left-0 right-0 h-4 bg-transparent pointer-events-auto" />

              <div className="bg-white/98 backdrop-blur-2xl border border-[#E2E8F0] rounded-xl shadow-[0_20px_50px_-10px_rgba(0,0,0,0.18),0_0_0_1px_rgba(0,0,0,0.06)] overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150 font-admin-sans text-slate-900 divide-y divide-slate-100">
                {/* 1. Profile Header Card */}
                <div className="p-4 sm:p-5 bg-[linear-gradient(180deg,#F8FAFC_0%,#FFFFFF_100%)]">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-full bg-slate-950 text-white flex items-center justify-center text-base font-bold shadow-sm border-2 border-white ring-1 ring-slate-200 shrink-0">
                      <span className="text-[#EA4335] font-black font-sans text-xl">G</span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900 tracking-tight truncate">
                          {user?.name || "Gaurav patil"}
                        </h4>
                        <span className="text-[9.5px] font-bold font-admin-mono px-2 py-0.5 rounded-full bg-purple-50 border border-purple-200 text-purple-700 shrink-0">
                          SUPER ADMIN
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 font-admin-mono truncate mt-0.5 select-all">
                        {user?.email || "gauravpatil9262@gmail.com"}
                      </p>
                    </div>
                  </div>

                  {/* Toast Feedback Banner */}
                  {configToast && (
                    <div className="mt-3.5 py-2 px-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-admin-mono font-medium flex items-center gap-2 animate-in fade-in slide-in-from-top-1 shadow-2xs">
                      <FaCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="truncate">{configToast}</span>
                    </div>
                  )}
                </div>

                {/* 2. Security & 2FA Controls Section */}
                <div className="p-4 space-y-3 bg-white">
                  <div className="px-1 flex items-center justify-between">
                    <span className="text-[10.5px] font-bold font-admin-mono tracking-wider text-slate-400 uppercase flex items-center gap-1.5">
                      <FaShieldHalved className="w-3 h-3 text-purple-600" />
                      <span>Security & 2FA Controls</span>
                    </span>
                    <span className="text-[10px] font-admin-mono text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                      Realtime Sync
                    </span>
                  </div>

                  {/* Login Email OTP Card */}
                  <div className="p-3.5 rounded-xl bg-slate-50/90 hover:bg-slate-50 border border-slate-200/80 transition-all flex items-center justify-between gap-4 shadow-2xs">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center shadow-2xs shrink-0">
                        <FaEnvelope className="w-4 h-4 text-purple-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 tracking-tight leading-tight">
                          Login Email OTP
                        </p>
                        <p className="text-[11px] text-slate-500 font-admin-mono mt-1">
                          {securityConfig.requireEmailOtp
                            ? "6-digit code required on login"
                            : "Instant 1-click Google sign-in"}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleSecurity("requireEmailOtp")}
                      disabled={isUpdatingConfig}
                      title="Toggle Email OTP on Login"
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                        securityConfig.requireEmailOtp ? "bg-emerald-500" : "bg-slate-300"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                          securityConfig.requireEmailOtp ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Google Authenticator (TOTP) Card */}
                  <div className="p-3.5 rounded-xl bg-slate-50/90 hover:bg-slate-50 border border-slate-200/80 transition-all space-y-2.5 shadow-2xs">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center shadow-2xs shrink-0">
                          <FaMobileScreenButton className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 tracking-tight leading-tight">
                            Google Authenticator (TOTP)
                          </p>
                          <p className="text-[11px] text-slate-500 font-admin-mono mt-1">
                            {securityConfig.requireTotp
                              ? "App-based code required on login"
                              : "Authenticator code optional"}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleSecurity("requireTotp")}
                        disabled={isUpdatingConfig}
                        title="Toggle Google Authenticator (TOTP) on Login"
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                          securityConfig.requireTotp ? "bg-emerald-500" : "bg-slate-300"
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                            securityConfig.requireTotp ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>

                    {/* Google Authenticator Re-Pair Action */}
                    {securityConfig.requireTotp && (
                      <div className="pt-2 border-t border-slate-200/60">
                        {!showRevokeConfirm ? (
                          <button
                            type="button"
                            onClick={() => setShowRevokeConfirm(true)}
                            className="w-full py-2 px-3 rounded-lg bg-white hover:bg-purple-50 text-purple-700 border border-purple-200 text-[11px] font-admin-mono font-semibold flex items-center justify-between transition-colors cursor-pointer shadow-2xs"
                          >
                            <div className="flex items-center gap-2">
                              <FaKey className="w-3 h-3 text-purple-600" />
                              <span>Re-pair / Reset Authenticator Device</span>
                            </div>
                            <span className="text-[10px] opacity-80 font-admin-mono">New QR ➔</span>
                          </button>
                        ) : (
                          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 space-y-2.5 animate-in fade-in duration-100">
                            <p className="text-[11px] font-admin-mono leading-relaxed">
                              Revoke active Authenticator secret and scan a new QR code on next sign-in?
                            </p>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={handleRevokeTotp}
                                disabled={isRevokingTotp}
                                className="flex-1 py-1.5 px-3 rounded-md bg-rose-600 hover:bg-rose-700 text-white text-[10.5px] font-admin-mono font-bold uppercase tracking-wider cursor-pointer disabled:opacity-50 transition-colors shadow-2xs"
                              >
                                {isRevokingTotp ? "Revoking..." : "Confirm Revoke"}
                              </button>
                              <button
                                type="button"
                                onClick={() => setShowRevokeConfirm(false)}
                                className="py-1.5 px-3 rounded-md bg-white border border-slate-200 text-slate-700 text-[10.5px] font-admin-mono hover:bg-slate-100 cursor-pointer transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. Sign Out Action Card */}
                <div className="p-3.5 bg-slate-50/80">
                  <button
                    type="button"
                    onClick={handleSignOut}
                    disabled={isSigningOut}
                    className="w-full group flex items-center justify-between p-3 rounded-xl bg-white hover:bg-slate-900 text-slate-900 hover:text-white border border-slate-200 hover:border-slate-900 text-xs font-admin-mono font-semibold transition-all duration-200 cursor-pointer shadow-2xs hover:shadow-md active:scale-[0.99]"
                  >
                    <div className="flex items-center gap-2.5">
                      <FaArrowRightFromBracket className="w-3.5 h-3.5 text-slate-500 group-hover:text-white transition-colors" />
                      <span>Sign Out</span>
                    </div>
                    <span className="text-[10.5px] font-normal text-slate-400 group-hover:text-slate-300 font-admin-mono">
                      Terminate Session ➔
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>
    </>
  );
};
