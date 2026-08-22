"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  FaShieldHalved,
  FaLock,
  FaEnvelope,
  FaFingerprint,
  FaCircleExclamation,
  FaCircleCheck,
  FaHourglassHalf,
  FaPaperPlane,
  FaCopy,
  FaCheck,
  FaCircleXmark,
  FaPause,
  FaXmark,
} from "react-icons/fa6";
import { VisitorAppeal } from "@/lib/visitors/types";
import { getMachineFingerprint } from "@/lib/visitors/machine-fingerprint";

interface FullscreenBanUIProps {
  reason?: string;
  visitorId?: string;
  timestamp?: number;
}

export const FullscreenBanUI: React.FC<FullscreenBanUIProps> = ({
  reason = "Access permanently revoked by administrator due to policy violation.",
  visitorId,
  timestamp = Date.now(),
}) => {
  const [copiedId, setCopiedId] = useState(false);
  const [isAppealFormOpen, setIsAppealFormOpen] = useState(false);
  const [appealEmail, setAppealEmail] = useState("");
  const [appealName, setAppealName] = useState("");
  const [appealMessage, setAppealMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [appealError, setAppealError] = useState<string | null>(null);
  const [currentAppeal, setCurrentAppeal] = useState<VisitorAppeal | null>(null);
  const [currentTime, setCurrentTime] = useState<string>("");
  const [formattedEnforceDate, setFormattedEnforceDate] = useState<string>("");
  const [resolvedVisitorId, setResolvedVisitorId] = useState<string>(visitorId || "");
  const [machineHash, setMachineHash] = useState<string>("");

  // Lock body scroll completely with zero overflow
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // Compute machine fingerprint and resolve canonical visitor ID if in incognito
  useEffect(() => {
    let isMounted = true;
    getMachineFingerprint()
      .then((mfp) => {
        if (!isMounted) return;
        if (mfp) {
          setMachineHash(mfp);
          if (!resolvedVisitorId) {
            fetch(`/api/visitors/me?mfp=${encodeURIComponent(mfp)}`)
              .then((r) => r.json())
              .then((d) => {
                if (d && d.visitorId && isMounted) {
                  setResolvedVisitorId(d.visitorId);
                }
              })
              .catch(() => {});
          }
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [resolvedVisitorId]);

  // Update date format on client mount to eliminate hydration mismatch
  useEffect(() => {
    if (timestamp) {
      setFormattedEnforceDate(
        new Date(timestamp).toLocaleString("en-US", {
          dateStyle: "medium",
          timeStyle: "medium",
        })
      );
    }
  }, [timestamp]);

  // Update live clock
  useEffect(() => {
    const updateClock = () => {
      setCurrentTime(new Date().toUTCString());
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  const activeVId = resolvedVisitorId || visitorId || "";

  // Check if visitor already has an active appeal
  const checkExistingAppeal = useCallback(async () => {
    if (!activeVId && !machineHash) return;
    try {
      const url = activeVId
        ? `/api/visitors/appeal?visitorId=${encodeURIComponent(activeVId)}`
        : `/api/visitors/appeal?mfp=${encodeURIComponent(machineHash)}`;
      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json();
      if (data.success && data.appeal) {
        setCurrentAppeal(data.appeal);
        if (data.appeal.status === "ACCEPTED") {
          if (typeof document !== "undefined") {
            document.cookie = "vst_ban_state=; Path=/; Max-Age=0; SameSite=Lax";
          }
          if (typeof window !== "undefined") {
            window.location.href = "/";
          }
        }
      }
    } catch {
      // Ignored
    }
  }, [activeVId, machineHash]);

  useEffect(() => {
    checkExistingAppeal();
  }, [checkExistingAppeal]);

  // Live SSE listener: Unlocks screen and redirects to / instantly when admin unbans
  useEffect(() => {
    const streamUrl = machineHash
      ? `/api/visitors/stream?mfp=${encodeURIComponent(machineHash)}`
      : "/api/visitors/stream";
    const es = new EventSource(streamUrl);

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "UNBAN") {
          if (typeof document !== "undefined") {
            document.cookie = "vst_ban_state=; Path=/; Max-Age=0; SameSite=Lax";
          }
          if (typeof window !== "undefined") {
            window.location.replace("/");
          }
        } else if (data.type === "APPEAL_UPDATED" && data.appeal) {
          setCurrentAppeal(data.appeal);
          if (data.appeal.status === "ACCEPTED") {
            if (typeof document !== "undefined") {
              document.cookie = "vst_ban_state=; Path=/; Max-Age=0; SameSite=Lax";
            }
            if (typeof window !== "undefined") {
              window.location.replace("/");
            }
          }
        }
      } catch {
        // Ignored
      }
    };

    return () => {
      es.close();
    };
  }, [machineHash]);

  // Periodic poll if appeal is PENDING or HOLD
  useEffect(() => {
    if (!currentAppeal || (currentAppeal.status !== "PENDING" && currentAppeal.status !== "HOLD")) {
      return;
    }
    const interval = setInterval(() => {
      checkExistingAppeal();
    }, 5000);
    return () => clearInterval(interval);
  }, [currentAppeal, checkExistingAppeal]);

  const handleCopyId = () => {
    if (!activeVId) return;
    navigator.clipboard.writeText(activeVId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleAppealSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appealEmail || !appealMessage || appealMessage.trim().length < 5) {
      setAppealError("Please provide a valid email and an explanation (min 5 characters).");
      return;
    }

    setIsSubmitting(true);
    setAppealError(null);

    try {
      const res = await fetch("/api/visitors/appeal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visitorId: activeVId || undefined,
          machineHash: machineHash || undefined,
          email: appealEmail,
          name: appealName,
          message: appealMessage,
          banReason: reason,
        }),
      });

      const data = await res.json();
      if (data.success && data.appeal) {
        setCurrentAppeal(data.appeal);
        setIsAppealFormOpen(false);
      } else {
        setAppealError(data.error || "Failed to submit appeal. Please try again.");
      }
    } catch {
      setAppealError("Network error while submitting appeal. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999999] w-screen h-screen max-h-screen bg-[#04060C] text-white flex flex-col justify-between overflow-hidden select-none font-sans">
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[450px] bg-red-600/15 blur-[160px] rounded-full" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[350px] bg-rose-800/10 blur-[140px] rounded-full" />
        <div className="absolute inset-0 bg-[radial-gradient(#3f3f46_1px,transparent_1px)] [background-size:24px_24px] opacity-15" />
      </div>

      {/* Top Security Header (Fixed Compact Height ~48px) */}
      <header className="relative z-10 w-full border-b border-red-900/40 bg-[#080B12]/95 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between gap-2 text-xs font-mono shrink-0 h-11 sm:h-12">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-950/80 border border-red-700/60 text-red-300 font-bold tracking-wider text-[10px] sm:text-[11px] uppercase shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
            <span>SECURITY LEVEL 5 LOCKOUT</span>
          </div>
          <span className="text-[#52525B] hidden sm:inline">|</span>
          <span className="text-[#D4D4D8] font-semibold hidden sm:inline text-[11px]">PORTFOLIO FIREWALL ACTIVE</span>
        </div>

        <div className="flex items-center gap-3 text-[#A1A1AA] text-xs">
          <span suppressHydrationWarning className="hidden md:inline text-[11px]">{currentTime || "UTC REALTIME"}</span>
          {activeVId && (
            <button
              onClick={handleCopyId}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/10 border border-white/20 hover:bg-white/20 text-white transition-all cursor-pointer font-bold text-[11px]"
              title="Copy Incident Identification ID"
            >
              <FaFingerprint className="w-3 h-3 text-red-400" />
              <span className="max-w-[120px] sm:max-w-none truncate">ID: {activeVId}</span>
              {copiedId ? (
                <FaCheck className="w-2.5 h-2.5 text-emerald-400 ml-0.5" />
              ) : (
                <FaCopy className="w-2.5 h-2.5 text-[#A1A1AA] ml-0.5" />
              )}
            </button>
          )}
        </div>
      </header>

      {/* Main Single-View Zero-Scroll Center Dossier */}
      <main className="relative z-10 w-full max-w-4xl mx-auto px-4 sm:px-6 flex-1 flex flex-col justify-center items-center py-2 sm:py-3 min-h-0">
        <div className="w-full rounded-2xl bg-[#0B0F19]/95 border border-red-500/30 shadow-2xl shadow-red-950/60 backdrop-blur-xl p-4 sm:p-6 md:p-7 space-y-3 sm:space-y-4">
          
          {/* Header Shield & Headline */}
          <div className="flex items-center gap-3 sm:gap-5 border-b border-white/10 pb-3 sm:pb-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-red-600/20 border border-red-500/50 flex items-center justify-center text-red-500 shadow-lg shadow-red-600/20 shrink-0">
              <FaShieldHalved className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>

            <div className="space-y-0.5 min-w-0">
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 font-mono text-[10px] uppercase tracking-widest font-bold">
                <FaLock className="w-2.5 h-2.5 text-red-400" />
                <span>SERVER-AUTHORITATIVE LOCKOUT</span>
              </div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white tracking-tight leading-tight">
                Access Permanently Revoked
              </h1>
              <p className="text-xs sm:text-sm text-[#D4D4D8] font-normal truncate sm:whitespace-normal">
                Your client device signature has been restricted from accessing all public endpoints by the system administrator.
              </p>
            </div>
          </div>

          {/* Enforced Ban Reason Banner */}
          <div className="p-3 sm:p-4 rounded-xl bg-[#14080A] border border-red-600/60 space-y-1 font-mono">
            <div className="flex items-center gap-1.5 text-red-400 text-[10px] sm:text-xs font-bold uppercase tracking-wider">
              <FaCircleExclamation className="w-3.5 h-3.5" />
              <span>Enforced Policy Violation Reason</span>
            </div>
            <p className="text-sm sm:text-base text-white font-bold break-words leading-snug">
              {reason}
            </p>
          </div>

          {/* Telemetry Dossier Grid (3 Compact Columns) */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 font-mono text-xs">
            <div className="p-2.5 sm:p-3 rounded-xl bg-white/[0.04] border border-white/10 min-w-0">
              <span className="text-[#A1A1AA] block text-[9px] sm:text-[10px] uppercase font-medium truncate">Enforcement Time</span>
              <span suppressHydrationWarning className="text-white text-xs sm:text-sm font-bold truncate block mt-0.5">{formattedEnforceDate || "Live Timestamp"}</span>
            </div>
            <div className="p-2.5 sm:p-3 rounded-xl bg-white/[0.04] border border-white/10 min-w-0">
              <span className="text-[#A1A1AA] block text-[9px] sm:text-[10px] uppercase font-medium truncate">Firewall Node</span>
              <span className="text-white text-xs sm:text-sm font-bold truncate block mt-0.5">asia-south1 Edge</span>
            </div>
            <div className="p-2.5 sm:p-3 rounded-xl bg-white/[0.04] border border-white/10 min-w-0">
              <span className="text-[#A1A1AA] block text-[9px] sm:text-[10px] uppercase font-medium truncate">Enforcement State</span>
              <span className="text-red-400 text-xs sm:text-sm font-black truncate block mt-0.5">ACTIVE LOCKOUT ✗</span>
            </div>
          </div>

          {/* Appeal Section State Flow */}
          <div className="pt-1">
            {/* STATE 1: Lock Mode (Appeal Submitted & Locked until Admin Action) */}
            {currentAppeal ? (
              <div
                className={`p-3.5 sm:p-4 rounded-xl border space-y-2 font-mono ${
                  currentAppeal.status === "ACCEPTED"
                    ? "bg-emerald-950/60 border-emerald-500/80 text-white"
                    : currentAppeal.status === "HOLD"
                    ? "bg-blue-950/60 border-blue-500/80 text-white"
                    : currentAppeal.status === "REJECTED"
                    ? "bg-red-950/60 border-red-500/80 text-white"
                    : "bg-[#161226] border-purple-500/70 text-white"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {currentAppeal.status === "ACCEPTED" ? (
                      <FaCircleCheck className="w-4 h-4 text-emerald-400" />
                    ) : currentAppeal.status === "HOLD" ? (
                      <FaPause className="w-4 h-4 text-blue-400" />
                    ) : currentAppeal.status === "REJECTED" ? (
                      <FaCircleXmark className="w-4 h-4 text-red-400" />
                    ) : (
                      <FaHourglassHalf className="w-4 h-4 text-purple-400 animate-spin" />
                    )}
                    <span className="text-xs sm:text-sm font-black uppercase tracking-wider truncate">
                      {currentAppeal.status === "ACCEPTED"
                        ? "APPEAL APPROVED • ACCESS RESTORED"
                        : currentAppeal.status === "HOLD"
                        ? "APPEAL ON ADMINISTRATIVE HOLD"
                        : currentAppeal.status === "REJECTED"
                        ? "APPEAL REVIEWED & REJECTED"
                        : "APPEAL SUBMITTED • SESSION LOCKED UNDER REVIEW"}
                    </span>
                  </div>
                  <span className="text-[10px] text-[#D4D4D8] shrink-0">
                    {new Date(currentAppeal.submittedAt).toLocaleDateString()}
                  </span>
                </div>

                <p className="text-xs text-[#E4E4E7] leading-tight">
                  {currentAppeal.status === "ACCEPTED"
                    ? "Your appeal was approved by the administrator! Your restriction has been lifted."
                    : currentAppeal.status === "HOLD"
                    ? "Your appeal is currently on hold by the administrator for further evaluation."
                    : currentAppeal.status === "REJECTED"
                    ? "Your appeal was reviewed and rejected. This device signature remains restricted."
                    : "Your appeal is currently locked and awaiting review. The administrator has been notified. This page will automatically update once a decision is made."}
                </p>

                <div className="p-2 rounded bg-black/60 border border-white/10 text-[11px] truncate">
                  <span className="text-[#A1A1AA] uppercase text-[9px] mr-1.5 font-bold">Your Appeal:</span>
                  <span className="text-white italic">&ldquo;{currentAppeal.message}&rdquo;</span>
                </div>

                {currentAppeal.status === "ACCEPTED" && (
                  <button
                    onClick={() => {
                      if (typeof document !== "undefined") {
                        document.cookie = "vst_ban_state=; Path=/; Max-Age=0";
                      }
                      window.location.href = "/";
                    }}
                    className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold uppercase tracking-wider text-xs transition-all shadow-lg cursor-pointer"
                  >
                    Enter Portfolio Now ✓
                  </button>
                )}
              </div>
            ) : (
              /* STATE 2: Default View with Request Ban Appeal Button */
              <div className="flex items-center justify-between gap-3 p-3 sm:p-3.5 rounded-xl bg-white/[0.03] border border-white/10">
                <div className="min-w-0">
                  <h3 className="text-xs sm:text-sm font-bold text-white truncate">Believe this was an error?</h3>
                  <p className="text-[10px] sm:text-xs text-[#A1A1AA] truncate">
                    You can submit a formal appeal directly to the administrator for review.
                  </p>
                </div>

                <button
                  onClick={() => setIsAppealFormOpen(true)}
                  className="px-3.5 sm:px-4 py-2 rounded-lg bg-white hover:bg-neutral-200 text-black font-mono text-[11px] sm:text-xs font-bold uppercase tracking-wider transition-all shadow-md flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <FaEnvelope className="w-3 h-3" />
                  <span>Request Ban Appeal</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Appeal Form Modal Overlay */}
      {isAppealFormOpen && (
        <div className="fixed inset-0 z-[99999999] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="bg-[#0D111A] border-2 border-purple-500/50 w-full max-w-md rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 font-sans text-white">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-purple-400">
                  <FaEnvelope className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-sm">Submit Formal Ban Appeal</h3>
                  <span className="text-[10px] text-[#A1A1AA] font-mono">Direct transmission to administrator</span>
                </div>
              </div>

              <button
                onClick={() => setIsAppealFormOpen(false)}
                className="text-[#71717A] hover:text-white transition-colors cursor-pointer"
              >
                <FaXmark className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAppealSubmit} className="space-y-3 font-mono text-xs">
              <div>
                <label className="text-[10px] uppercase text-[#D4D4D8] font-bold block mb-1">
                  Your Contact Email <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={appealEmail}
                  onChange={(e) => setAppealEmail(e.target.value)}
                  placeholder="e.g. name@domain.com"
                  className="w-full px-3 py-2 bg-black/70 border border-white/20 focus:border-purple-400 rounded-lg text-white text-xs outline-none transition-colors"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase text-[#D4D4D8] font-bold block mb-1">
                  Your Name or Handle (optional)
                </label>
                <input
                  type="text"
                  value={appealName}
                  onChange={(e) => setAppealName(e.target.value)}
                  placeholder="e.g. Alex"
                  className="w-full px-3 py-2 bg-black/70 border border-white/20 focus:border-purple-400 rounded-lg text-white text-xs outline-none transition-colors"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase text-[#D4D4D8] font-bold block mb-1">
                  Appeal Explanation & Intent <span className="text-red-400">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={appealMessage}
                  onChange={(e) => setAppealMessage(e.target.value)}
                  placeholder="Explain why your access should be restored..."
                  className="w-full p-2.5 bg-black/70 border border-white/20 focus:border-purple-400 rounded-lg text-white text-xs outline-none transition-colors"
                />
              </div>

              {appealError && (
                <div className="p-2.5 rounded-lg bg-red-950/60 border border-red-700 text-red-300 text-[11px]">
                  {appealError}
                </div>
              )}

              <div className="p-2.5 bg-purple-950/30 border border-purple-800/40 rounded-lg text-[10px] text-purple-200">
                ▲ Once submitted, your appeal is locked in Cloud Firestore and the administrator is notified immediately.
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAppealFormOpen(false)}
                  className="px-3.5 py-2 rounded-lg border border-white/10 hover:bg-white/5 text-xs text-[#D4D4D8] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold uppercase tracking-wider text-xs transition-all shadow-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <FaPaperPlane className="w-2.5 h-2.5" />
                  <span>{isSubmitting ? "Transmitting..." : "Submit Appeal"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bottom Footer (Fixed Compact Height ~28px) */}
      <footer className="relative z-10 w-full border-t border-white/5 bg-[#04060C]/95 px-4 py-1.5 text-center text-[10px] sm:text-[11px] font-mono text-[#71717A] shrink-0 h-7 sm:h-8 flex items-center justify-center">
        Gaurav Portfolio Security Subsystem • Server-Authoritative Device Fingerprinting
      </footer>
    </div>
  );
};
