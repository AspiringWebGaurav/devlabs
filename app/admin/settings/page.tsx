"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  FaUserGear,
  FaShieldHalved,
  FaEnvelope,
  FaMobileScreenButton,
  FaKey,
  FaArrowRightFromBracket,
  FaClock,
  FaTerminal,
  FaSliders,
  FaChevronLeft,
  FaChevronRight,
  FaFloppyDisk,
  FaRotate,
  FaCircleCheck,
  FaCircleExclamation,
} from "react-icons/fa6";
import { AdminSecurityConfig } from "@/types/admin";
import { useAdminSignOut, SignOutModal } from "@/components/admin/SignOutModal";

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState<"profile" | "security" | "activity" | "system">("profile");

  // Sign out hook
  const { isSigningOut, signOutStep, signOutPercent, startSignOut } = useAdminSignOut();

  // Security Configuration State
  const [securityConfig, setSecurityConfig] = useState<AdminSecurityConfig>({
    requireEmailOtp: true,
    requireTotp: false,
    wipeOtpRequired: true,
  });
  const [initialConfig, setInitialConfig] = useState<AdminSecurityConfig>({
    requireEmailOtp: true,
    requireTotp: false,
    wipeOtpRequired: true,
  });

  const [saveStatus, setSaveStatus] = useState<"IDLE" | "SAVING" | "SAVED" | "ERROR">("SAVED");
  const [lastSavedTime, setLastSavedTime] = useState<string | null>("Just now");
  const [configToast, setConfigToast] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Re-pair / Revoke TOTP Secret State
  const [isRevokingTotp, setIsRevokingTotp] = useState(false);
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);

  // Dynamic Pagination State for Audit Trail
  const [activityPage, setActivityPage] = useState(1);
  const activityPageSize = 5;

  const mockActivityLogs = [
    { id: "act_1", action: "Admin Session Established", detail: "Encrypted HMAC Token Handshake Validated", time: "Just now", status: "SUCCESS" },
    { id: "act_2", action: "Database Sweep Executed", detail: "Full Authority 3-Layer Scan across Firestore", time: "12m ago", status: "SUCCESS" },
    { id: "act_3", action: "Visitor Telemetry Synchronized", detail: "Real-time SSE channel active with machine hash", time: "28m ago", status: "INFO" },
    { id: "act_4", action: "2FA TOTP Verified", detail: "Google Authenticator 6-Digit code confirmed", time: "1h ago", status: "SUCCESS" },
    { id: "act_5", action: "Email OTP Challenge Passed", detail: "Dedicated EmailJS relay token verified", time: "1h ago", status: "SUCCESS" },
    { id: "act_6", action: "Firestore Batch Cascade Cleared", detail: "Orphaned telemetry pruned safely", time: "3h ago", status: "SUCCESS" },
    { id: "act_7", action: "Security Parameters Loaded", detail: "SHA-256 Authorized Hash Matched", time: "4h ago", status: "INFO" },
    { id: "act_8", action: "Session Refresh Handshake", detail: "Extended 8-hour continuous admin lease", time: "6h ago", status: "SUCCESS" },
  ];

  const totalActivityPages = Math.ceil(mockActivityLogs.length / activityPageSize);
  const paginatedLogs = mockActivityLogs.slice(
    (activityPage - 1) * activityPageSize,
    activityPage * activityPageSize
  );

  // Has unsaved pending changes
  const hasUnsavedChanges =
    securityConfig.requireEmailOtp !== initialConfig.requireEmailOtp ||
    securityConfig.requireTotp !== initialConfig.requireTotp ||
    securityConfig.wipeOtpRequired !== initialConfig.wipeOtpRequired;

  // Fetch security configuration on mount
  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/auth/security-config", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json().catch(() => null);
        if (data && data.success && data.config) {
          setSecurityConfig(data.config);
          setInitialConfig(data.config);
          setSaveStatus("SAVED");
          setLastSavedTime(new Date().toLocaleTimeString());
        }
      }
    } catch {
      // Fallback default
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // Robust Save Function (Works for both Auto-Save & Manual Button Click)
  const saveSecurityParameters = async (configToSave: AdminSecurityConfig, isAutoSave = false) => {
    setSaveStatus("SAVING");
    try {
      // 1. Sync to local backup immediately
      if (typeof window !== "undefined") {
        localStorage.setItem("admin_security_config_backup", JSON.stringify(configToSave));
      }

      // 2. Persist to Backend Server & Firestore
      const res = await fetch("/api/admin/auth/security-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requireEmailOtp: configToSave.requireEmailOtp,
          requireTotp: configToSave.requireTotp,
          wipeOtpRequired: configToSave.wipeOtpRequired,
        }),
      });

      const data = await res.json().catch(() => null);

      if (data && data.success && data.config) {
        setSecurityConfig(data.config);
        setInitialConfig(data.config);
        setSaveStatus("SAVED");
        const timeStr = new Date().toLocaleTimeString();
        setLastSavedTime(timeStr);
        setConfigToast({
          text: isAutoSave
            ? `Auto-Saved: Security parameters updated at ${timeStr}`
            : `Successfully saved security parameters to Cloud at ${timeStr}!`,
          type: "success",
        });
      } else {
        setSaveStatus("ERROR");
        setConfigToast({
          text: (data && data.error) || "Failed to save security parameters.",
          type: "error",
        });
      }
    } catch {
      setSaveStatus("ERROR");
      setConfigToast({
        text: "Network error while saving security parameters. Cached locally.",
        type: "error",
      });
    }
  };

  // Toggle Security with Instant Optimistic UI + Robust Auto-Save
  const handleToggleSecurity = (key: keyof AdminSecurityConfig) => {
    const updatedConfig: AdminSecurityConfig = {
      ...securityConfig,
      [key]: !securityConfig[key],
    };

    setSecurityConfig(updatedConfig);
    // Execute robust auto-save
    saveSecurityParameters(updatedConfig, true);
  };

  // Revoke Authenticator Device
  const handleRevokeTotp = async () => {
    if (isRevokingTotp) return;
    setIsRevokingTotp(true);

    try {
      const res = await fetch("/api/admin/auth/totp/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminEmail: "gauravpatil9262@gmail.com" }),
      });
      const data = await res.json().catch(() => null);
      if (data && data.success) {
        setShowRevokeConfirm(false);
        setConfigToast({
          text: "Authenticator reset! Next login will present a fresh QR code.",
          type: "success",
        });
      } else {
        setConfigToast({
          text: (data && data.error) || "Failed to reset Authenticator.",
          type: "error",
        });
      }
      setShowRevokeConfirm(false);
    } catch {
      setConfigToast({
        text: "Network error while resetting Authenticator.",
        type: "error",
      });
    } finally {
      setIsRevokingTotp(false);
    }
  };

  return (
    <>
      <SignOutModal
        isOpen={isSigningOut}
        step={signOutStep}
        percent={signOutPercent}
      />

      <div className="w-full min-h-full p-4 sm:p-6 lg:p-8 space-y-6 font-admin-sans pb-16 animate-in fade-in duration-200">
        {/* Header Section */}
        <div className="border border-[#E5E7EB] bg-white p-5 sm:p-6 rounded-[2px] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-slate-950 text-white flex items-center justify-center text-xl font-bold shadow-xs border-2 border-white ring-1 ring-slate-200 shrink-0">
              <span className="text-[#EA4335] font-black font-sans text-2xl">G</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-black tracking-tight">
                  Gaurav patil
                </h1>
                <span className="text-[10px] font-bold font-admin-mono px-2 py-0.5 rounded-full bg-purple-50 border border-purple-200 text-purple-700">
                  SUPER ADMIN
                </span>
                <span className="text-[10px] font-bold font-admin-mono px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  AUTHENTICATED
                </span>
              </div>
              <p className="text-xs text-[#64748B] font-admin-mono mt-1 select-all">
                gauravpatil9262@gmail.com &bull; Authorized Master Principal
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={startSignOut}
            disabled={isSigningOut}
            className="flex items-center gap-2 px-4 py-2 rounded-sm bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-admin-mono text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95 shrink-0 self-start md:self-auto"
          >
            <FaArrowRightFromBracket className="w-3.5 h-3.5 text-rose-600" />
            <span>Terminate Session</span>
          </button>
        </div>

        {/* Sub-Navigation Tabs in Main Window */}
        <div className="flex items-center gap-1.5 border-b border-[#E5E7EB] pb-2 font-admin-mono text-xs overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("profile")}
            className={`px-3.5 py-1.5 rounded-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "profile"
                ? "bg-black text-white shadow-xs"
                : "bg-white text-[#64748B] hover:bg-[#F3F4F6] border border-[#E5E7EB]"
            }`}
          >
            <FaUserGear className="w-3.5 h-3.5" />
            <span>01. Identity & Credentials</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("security")}
            className={`px-3.5 py-1.5 rounded-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "security"
                ? "bg-black text-white shadow-xs"
                : "bg-white text-[#64748B] hover:bg-[#F3F4F6] border border-[#E5E7EB]"
            }`}
          >
            <FaShieldHalved className="w-3.5 h-3.5 text-purple-500" />
            <span>02. Security & 2FA Controls</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("activity")}
            className={`px-3.5 py-1.5 rounded-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "activity"
                ? "bg-black text-white shadow-xs"
                : "bg-white text-[#64748B] hover:bg-[#F3F4F6] border border-[#E5E7EB]"
            }`}
          >
            <FaTerminal className="w-3.5 h-3.5 text-blue-500" />
            <span>03. Audit Trail ({mockActivityLogs.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("system")}
            className={`px-3.5 py-1.5 rounded-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "system"
                ? "bg-black text-white shadow-xs"
                : "bg-white text-[#64748B] hover:bg-[#F3F4F6] border border-[#E5E7EB]"
            }`}
          >
            <FaSliders className="w-3.5 h-3.5 text-amber-500" />
            <span>04. System Specs</span>
          </button>
        </div>

        {/* Dynamic Feedback Toast Banner */}
        {configToast && (
          <div
            className={`py-2.5 px-4 rounded-sm border text-xs font-admin-mono font-medium flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-1 shadow-xs ${
              configToast.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-rose-50 border-rose-200 text-rose-800"
            }`}
          >
            <div className="flex items-center gap-2.5">
              {configToast.type === "success" ? (
                <FaCircleCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <FaCircleExclamation className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{configToast.text}</span>
            </div>
            <button
              onClick={() => setConfigToast(null)}
              className="text-xs opacity-60 hover:opacity-100 font-bold px-1"
            >
              ✕
            </button>
          </div>
        )}

        {/* TAB 1: Identity & Credentials */}
        {activeTab === "profile" && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-admin-mono text-xs">
              <div className="p-5 bg-white border border-[#E5E7EB] rounded-sm space-y-1.5 shadow-xs">
                <span className="text-[10px] text-[#737373] uppercase font-bold tracking-wider">
                  Admin Principal Name
                </span>
                <p className="text-sm font-bold text-black font-admin-sans">Gaurav patil</p>
                <p className="text-[11px] text-[#64748B]">Primary System Administrator</p>
              </div>

              <div className="p-5 bg-white border border-[#E5E7EB] rounded-sm space-y-1.5 shadow-xs">
                <span className="text-[10px] text-[#737373] uppercase font-bold tracking-wider">
                  Encrypted Email Identifier
                </span>
                <p className="text-sm font-bold text-black select-all">gauravpatil9262@gmail.com</p>
                <p className="text-[11px] text-[#64748B]">Secured via In-Code Hash Validation</p>
              </div>

              <div className="p-5 bg-white border border-[#E5E7EB] rounded-sm space-y-1.5 shadow-xs">
                <span className="text-[10px] text-[#737373] uppercase font-bold tracking-wider">
                  Role & Authority
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-emerald-700">SUPERADMIN</span>
                  <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">
                    FULL ACCESS
                  </span>
                </div>
                <p className="text-[11px] text-[#64748B]">Full access to Database, Telemetry, and Security</p>
              </div>

              <div className="p-5 bg-white border border-[#E5E7EB] rounded-sm space-y-1.5 shadow-xs">
                <span className="text-[10px] text-[#737373] uppercase font-bold tracking-wider">
                  Continuous Lease Time
                </span>
                <div className="flex items-center gap-2 text-black">
                  <FaClock className="w-3.5 h-3.5 text-purple-600" />
                  <span className="text-sm font-bold">8 Hours Continuous Active</span>
                </div>
                <p className="text-[11px] text-[#64748B]">No periodic popup interrupts during active work</p>
              </div>
            </div>

            <div className="p-5 bg-black text-white rounded-sm space-y-2 font-admin-mono text-xs shadow-xs">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                <span className="text-neutral-400 uppercase font-bold text-[11px]">
                  Cryptographic Security Architecture
                </span>
                <span className="text-emerald-400 text-[10px] flex items-center gap-1.5 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  SHA-256 VERIFIED
                </span>
              </div>
              <p className="text-xs text-neutral-300 leading-relaxed font-admin-sans">
                Admin authorization is fully decoupled from database tables. Even if the entire Cloud Firestore database is purged to 0 documents, your master admin credentials remain 100% functional, secure, and impervious to database wipes.
              </p>
            </div>
          </div>
        )}

        {/* TAB 2: Security & 2FA Controls (With Auto-Save & Manual Save Button) */}
        {activeTab === "security" && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* Auto-Save & Manual Action Bar */}
            <div className="p-4 bg-white border border-[#E5E7EB] rounded-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs font-admin-mono text-xs">
              <div className="flex items-center gap-3">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Auto-Save Active</span>
                </div>
                <div className="text-[11px] text-[#64748B]">
                  {saveStatus === "SAVING" ? (
                    <span className="text-amber-600 font-bold flex items-center gap-1">
                      <FaRotate className="w-3 h-3 animate-spin" />
                      Syncing to Cloud Firestore...
                    </span>
                  ) : saveStatus === "SAVED" ? (
                    <span>Last Saved: {lastSavedTime || "Just now"}</span>
                  ) : (
                    <span className="text-rose-600 font-bold">Error saving parameters</span>
                  )}
                </div>
              </div>

              {/* Manual Save Fallback Button */}
              <button
                type="button"
                onClick={() => saveSecurityParameters(securityConfig, false)}
                disabled={saveStatus === "SAVING"}
                className={`flex items-center gap-2 px-4 py-2 rounded-sm font-admin-mono text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95 ${
                  hasUnsavedChanges
                    ? "bg-purple-600 hover:bg-purple-700 text-white animate-pulse"
                    : "bg-black hover:bg-neutral-800 text-white"
                }`}
              >
                <FaFloppyDisk className={`w-3.5 h-3.5 ${saveStatus === "SAVING" ? "animate-spin" : ""}`} />
                <span>{saveStatus === "SAVING" ? "Saving..." : "Save Security Parameters"}</span>
              </button>
            </div>

            {/* Login Email OTP Card */}
            <div className="p-5 bg-white border border-[#E5E7EB] rounded-sm flex items-center justify-between gap-4 shadow-xs">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-11 h-11 rounded-sm bg-purple-50 border border-purple-100 flex items-center justify-center shadow-2xs shrink-0">
                  <FaEnvelope className="w-5 h-5 text-purple-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-black tracking-tight">
                    Login Email OTP (Dedicated Relay)
                  </p>
                  <p className="text-xs text-[#64748B] font-admin-mono mt-1">
                    {securityConfig.requireEmailOtp
                      ? "6-digit authorization code required on sign-in"
                      : "Instant 1-click Google sign-in active"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleToggleSecurity("requireEmailOtp")}
                disabled={saveStatus === "SAVING"}
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
            <div className="p-5 bg-white border border-[#E5E7EB] rounded-sm space-y-4 shadow-xs">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-11 h-11 rounded-sm bg-blue-50 border border-blue-100 flex items-center justify-center shadow-2xs shrink-0">
                    <FaMobileScreenButton className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-black tracking-tight">
                      Google Authenticator (TOTP)
                    </p>
                    <p className="text-xs text-[#64748B] font-admin-mono mt-1">
                      {securityConfig.requireTotp
                        ? "Mobile app 6-digit TOTP required on sign-in"
                        : "Authenticator code optional on sign-in"}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleToggleSecurity("requireTotp")}
                  disabled={saveStatus === "SAVING"}
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
                <div className="pt-3 border-t border-[#E5E7EB]">
                  {!showRevokeConfirm ? (
                    <button
                      type="button"
                      onClick={() => setShowRevokeConfirm(true)}
                      className="py-2.5 px-4 rounded-sm bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-admin-mono font-bold flex items-center justify-between transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <FaKey className="w-3.5 h-3.5 text-purple-600" />
                        <span>Re-pair / Reset Authenticator Device</span>
                      </div>
                      <span className="text-[11px] opacity-80 font-admin-mono">New QR Code &rarr;</span>
                    </button>
                  ) : (
                    <div className="p-4 rounded-sm bg-rose-50 border border-rose-200 text-rose-800 space-y-3 animate-in fade-in duration-100">
                      <p className="text-xs font-admin-mono leading-relaxed">
                        Revoke active Authenticator secret and scan a fresh QR code on next sign-in?
                      </p>
                      <div className="flex items-center gap-2 font-admin-mono">
                        <button
                          type="button"
                          onClick={handleRevokeTotp}
                          disabled={isRevokingTotp}
                          className="py-2 px-4 rounded-sm bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold uppercase tracking-wider cursor-pointer disabled:opacity-50 transition-colors shadow-2xs"
                        >
                          {isRevokingTotp ? "Revoking..." : "Confirm Revoke"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowRevokeConfirm(false)}
                          className="py-2 px-4 rounded-sm bg-white border border-slate-200 text-slate-700 text-xs hover:bg-slate-100 cursor-pointer transition-colors"
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
        )}

        {/* TAB 3: Audit Trail with Dynamic Pagination */}
        {activeTab === "activity" && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="bg-white border border-[#E5E7EB] rounded-sm overflow-hidden shadow-xs">
              <div className="px-5 py-3 border-b border-[#E5E7EB] bg-[#FAFAFA] flex items-center justify-between text-xs font-admin-mono text-[#64748B]">
                <span>Administrative Checkpoints</span>
                <span>Page {activityPage} of {totalActivityPages}</span>
              </div>

              <div className="divide-y divide-[#E5E7EB] font-admin-mono text-xs">
                {paginatedLogs.map((log) => (
                  <div key={log.id} className="p-4 hover:bg-[#FAFAFA] flex items-center justify-between gap-4 transition-colors">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-black truncate">{log.action}</span>
                        <span className="text-[9.5px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-medium shrink-0">
                          {log.status}
                        </span>
                      </div>
                      <p className="text-xs text-[#64748B] truncate font-admin-sans">{log.detail}</p>
                    </div>
                    <span className="text-[11px] text-[#94A3B8] shrink-0">{log.time}</span>
                  </div>
                ))}
              </div>

              {/* Dynamic Pagination Controls */}
              <div className="px-5 py-3.5 bg-[#FAFAFA] border-t border-[#E5E7EB] flex items-center justify-between font-admin-mono text-xs">
                <span className="text-[#64748B]">
                  Showing {(activityPage - 1) * activityPageSize + 1} - {Math.min(activityPage * activityPageSize, mockActivityLogs.length)} of {mockActivityLogs.length} events
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActivityPage((prev) => Math.max(1, prev - 1))}
                    disabled={activityPage <= 1}
                    className="px-3 py-1.5 rounded-sm bg-white border border-[#E5E7EB] hover:bg-[#F3F4F6] disabled:opacity-40 text-black cursor-pointer flex items-center gap-1.5 font-bold"
                  >
                    <FaChevronLeft className="w-2.5 h-2.5" />
                    <span>Prev</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivityPage((prev) => Math.min(totalActivityPages, prev + 1))}
                    disabled={activityPage >= totalActivityPages}
                    className="px-3 py-1.5 rounded-sm bg-white border border-[#E5E7EB] hover:bg-[#F3F4F6] disabled:opacity-40 text-black cursor-pointer flex items-center gap-1.5 font-bold"
                  >
                    <span>Next</span>
                    <FaChevronRight className="w-2.5 h-2.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: System Specs */}
        {activeTab === "system" && (
          <div className="space-y-4 animate-in fade-in duration-150 font-admin-mono text-xs">
            <div className="p-5 bg-white border border-[#E5E7EB] rounded-sm space-y-3 shadow-xs">
              <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-2.5">
                <span className="font-bold text-black">Database Engine</span>
                <span className="text-purple-700 font-bold">Cloud Firestore & RTDB</span>
              </div>
              <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-2.5">
                <span className="font-bold text-black">Authentication Protocol</span>
                <span className="text-black">Encrypted HMAC + 2FA TOTP</span>
              </div>
              <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-2.5">
                <span className="font-bold text-black">Sweeper Engine Authority</span>
                <span className="text-emerald-700 font-bold">3-Layer Full Redundant</span>
              </div>
              <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-2.5">
                <span className="font-bold text-black">Continuous Session Lease</span>
                <span className="text-black">8 Hours</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-black">Framework Runtime</span>
                <span className="text-black">Next.js 15 App Router</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
