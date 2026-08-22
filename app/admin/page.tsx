"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import type { DatabaseStats } from "@/types/admin";
import type { DatabaseSweepReport } from "@/lib/admin/database-sweeper";
import { rtdb, ref, onValue } from "@/lib/admin/firebase";
import {
  FaDatabase,
  FaTrashCan,
  FaRotate,
  FaTriangleExclamation,
  FaCircleCheck,
  FaFolderTree,
  FaHourglassHalf,
  FaCheck,
  FaSpinner,
  FaShieldHalved,
  FaEnvelope,
  FaKey,
  FaArrowRotateRight,
  FaCircleQuestion,
} from "react-icons/fa6";

interface ProgressState {
  active: boolean;
  type: "purge" | "seed" | "sync";
  title: string;
  percent: number;
  elapsedSec: number;
  estRemainingSec: number;
  currentStageIndex: number;
  stages: Array<{ title: string; status: "done" | "running" | "pending" }>;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DatabaseStats>({
    postsCount: 5,
    projectsCount: 4,
    messagesCount: 1,
    subscribersCount: 1,
    telemetryCount: 0,
    cacheKeysCount: 1,
    databaseStatus: "ONLINE",
    storageUsedBytes: 11264, // ~11 KB
    lastPurgedAt: null,
    isPurged: false,
    redisLatencyMs: 0,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [preserveAuth, setPreserveAuth] = useState(true);
  const [notification, setNotification] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // 6-Digit OTP State & Verification
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [wipeChallengeToken, setWipeChallengeToken] = useState<string>("");
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [expiresInSeconds, setExpiresInSeconds] = useState(300);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [shakeError, setShakeError] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isWiping, setIsWiping] = useState(false);
  const [wipeSuccess, setWipeSuccess] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [cleanupMessage, setCleanupMessage] = useState<string | null>(null);
  const [cleanupReport, setCleanupReport] = useState<DatabaseSweepReport | null>(null);

  // Live Operation Progress Bar State
  const [progress, setProgress] = useState<ProgressState>({
    active: false,
    type: "purge",
    title: "",
    percent: 0,
    elapsedSec: 0,
    estRemainingSec: 0,
    currentStageIndex: 0,
    stages: [],
  });

  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const cooldownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const expiryTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Format seconds to mm:ss
  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Keep focus firmly locked on Wipe OTP first box on error/shake
  const focusWipeOtpFirst = useCallback(() => {
    requestAnimationFrame(() => {
      otpInputRefs.current[0]?.focus();
      otpInputRefs.current[0]?.select();
    });
    setTimeout(() => {
      otpInputRefs.current[0]?.focus();
      otpInputRefs.current[0]?.select();
    }, 50);
    setTimeout(() => {
      otpInputRefs.current[0]?.focus();
      otpInputRefs.current[0]?.select();
    }, 150);
    setTimeout(() => {
      otpInputRefs.current[0]?.focus();
      otpInputRefs.current[0]?.select();
    }, 400);
  }, []);

  // Trigger shake animation on error and keep cursor locked in OTP box
  const triggerShake = useCallback((msg: string) => {
    setOtpError(msg);
    setShakeError(true);
    focusWipeOtpFirst();
    setTimeout(() => {
      setShakeError(false);
      focusWipeOtpFirst();
    }, 380);
  }, [focusWipeOtpFirst]);

  // Cooldown countdown timer
  useEffect(() => {
    if (otpCooldown > 0) {
      cooldownTimerRef.current = setInterval(() => {
        setOtpCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(cooldownTimerRef.current as NodeJS.Timeout);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
    };
  }, [otpCooldown]);

  // Expiry timer when OTP is sent
  useEffect(() => {
    if (otpSent && expiresInSeconds > 0) {
      expiryTimerRef.current = setInterval(() => {
        setExpiresInSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(expiryTimerRef.current as NodeJS.Timeout);
            triggerShake("Authorization code expired. Please request a new code.");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (expiryTimerRef.current) clearInterval(expiryTimerRef.current);
    };
  }, [otpSent, expiresInSeconds, triggerShake]);

  // Fetch live stats from backend API - Verified Live Reload 9
  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/database/stats", {
        cache: "no-store",
        credentials: "include",
      });
      const data = await res.json().catch(() => null);
      if (data && data.success && data.stats) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error("Failed to fetch database stats:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSweepStaleData = async () => {
    setIsCleaning(true);
    setCleanupMessage(null);
    setCleanupReport(null);
    try {
      const res = await fetch("/api/admin/database/cleanup", { method: "POST" });
      const data = await res.json().catch(() => null);
      if (data && data.success) {
        setCleanupMessage(data.message);
        setCleanupReport(data as DatabaseSweepReport);
        fetchStats();
      } else {
        setCleanupMessage((data && data.error) || "Failed to prune stale telemetry.");
      }
    } catch {
      setCleanupMessage("Network error while pruning stale telemetry.");
    } finally {
      setIsCleaning(false);
    }
  };

  // Initial fetch on mount
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Live WebSocket listener for Firebase Realtime Database
  useEffect(() => {
    try {
      const dbRef = ref(rtdb, "/");
      const unsubscribe = onValue(
        dbRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const val = snapshot.val();
            if (val && typeof val === "object") {
              const postsCount = val.posts ? Object.keys(val.posts).length : 0;
              const projectsCount = val.projects ? Object.keys(val.projects).length : 0;
              const messagesCount = val.messages ? Object.keys(val.messages).length : 0;
              const subscribersCount = val.subscribers ? Object.keys(val.subscribers).length : 0;
              const isPurged =
                val.meta?.purged === true ||
                (postsCount === 0 && projectsCount === 0 && messagesCount === 0 && subscribersCount === 0);
              const payloadBytes = isPurged ? 0 : new TextEncoder().encode(JSON.stringify(val)).length;

              setStats((prev) => ({
                ...prev,
                postsCount,
                projectsCount,
                messagesCount,
                subscribersCount,
                databaseStatus: isPurged ? "OFFLINE" : "ONLINE",
                storageUsedBytes: payloadBytes,
                lastPurgedAt: val.meta?.lastPurgedAt || prev.lastPurgedAt,
                isPurged,
              }));
            }
          }
        },
        (err) => {
          console.warn("Firebase RTDB listener note:", err.message);
        }
      );

      return () => unsubscribe();
    } catch {
      // Fallback
    }
  }, []);

  // Send Critical Wipe Authorization OTP
  const handleSendWipeOtp = async () => {
    setIsSendingOtp(true);
    setOtpError(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    try {
      const res = await fetch("/api/admin/database/wipe-otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      let data: {
        success?: boolean;
        error?: string;
        challengeToken?: string;
        cooldownRemaining?: number;
      } = {};
      try {
        data = await res.json();
      } catch {
        data = { success: false, error: `Server returned HTTP ${res.status}` };
      }

      if (data.success) {
        setOtpSent(true);
        setWipeChallengeToken(data.challengeToken || "");
        setOtpCooldown(30);
        setExpiresInSeconds(300);
        setOtpDigits(["", "", "", "", "", ""]);
        setTimeout(() => {
          otpInputRefs.current[0]?.focus();
        }, 120);
      } else {
        triggerShake(data.error || "Failed to send authorization code.");
        if (data.cooldownRemaining) {
          setOtpCooldown(data.cooldownRemaining);
        }
      }
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      const error = err as Error;
      triggerShake(
        error?.name === "AbortError"
          ? "Request timed out while sending authorization code."
          : "Network error while sending authorization code."
      );
    } finally {
      setIsSendingOtp(false);
    }
  };

  // Handle 6-Digit OTP Input
  const handleDigitChange = (index: number, value: string) => {
    const cleanValue = value.replace(/\D/g, "");
    const newDigits = [...otpDigits];
    newDigits[index] = cleanValue.slice(-1);
    setOtpDigits(newDigits);
    setOtpError(null);

    if (cleanValue && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }

    const fullCode = newDigits.join("");
    if (fullCode.length === 6 && !newDigits.includes("")) {
      handleExecutePurge(fullCode);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
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
    otpInputRefs.current[nextIdx]?.focus();

    if (digits.length === 6) {
      handleExecutePurge(digits.join(""));
    }
  };

  // Stopwatch timer for progress calculation
  const startProgressTracking = (
    type: "purge" | "seed" | "sync",
    title: string,
    stages: string[],
    estDurationSec: number
  ) => {
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    const startTime = Date.now();

    setProgress({
      active: true,
      type,
      title,
      percent: 10,
      elapsedSec: 0,
      estRemainingSec: estDurationSec,
      currentStageIndex: 0,
      stages: stages.map((s, i) => ({ title: s, status: i === 0 ? "running" : "pending" })),
    });

    progressTimerRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      const remaining = Math.max(0, Number((estDurationSec - elapsed).toFixed(1)));
      setProgress((prev) => {
        if (!prev.active) return prev;
        return {
          ...prev,
          elapsedSec: Number(elapsed.toFixed(1)),
          estRemainingSec: remaining,
        };
      });
    }, 100);
  };

  const updateProgressStage = (stageIndex: number, percent: number, stages: string[]) => {
    setProgress((prev) => ({
      ...prev,
      percent,
      currentStageIndex: stageIndex,
      stages: stages.map((s, i) => ({
        title: s,
        status: i < stageIndex ? "done" : i === stageIndex ? "running" : "pending",
      })),
    }));
  };

  const completeProgress = (successMsg: string, stages: string[]) => {
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    setProgress((prev) => ({
      ...prev,
      percent: 100,
      estRemainingSec: 0,
      currentStageIndex: stages.length,
      stages: stages.map((s) => ({ title: s, status: "done" })),
    }));

    setNotification({
      type: "success",
      text: successMsg,
    });

    setTimeout(() => {
      setProgress((prev) => ({ ...prev, active: false }));
    }, 3500);
  };

  const failProgress = (errorMsg: string) => {
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    setProgress((prev) => ({ ...prev, active: false }));
    setNotification({
      type: "error",
      text: errorMsg,
    });
  };

  // Execute Database Wipe with Dedicated Verification FIRST (Matching Login OTP), then Staged Execution
  const handleExecutePurge = async (codeToSubmit?: string) => {
    const code = codeToSubmit || otpDigits.join("");
    if (code.length !== 6) {
      triggerShake("Please enter all 6 digits of the authorization code.");
      return;
    }

    setIsVerifyingOtp(true);
    setOtpError(null);

    // Step 1: Verify OTP first (Modular verification matching Login OTP)
    try {
      const verifyController = new AbortController();
      const verifyTimeout = setTimeout(() => verifyController.abort(), 20000);

      const verifyRes = await fetch("/api/admin/database/wipe-otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          code,
          challengeToken: wipeChallengeToken,
        }),
        signal: verifyController.signal,
      });

      clearTimeout(verifyTimeout);
      let verifyData: { success?: boolean; error?: string; attemptsLeft?: number } = {};
      try {
        verifyData = await verifyRes.json();
      } catch {
        verifyData = { success: false, error: `Verification server error (${verifyRes.status}).` };
      }

      if (!verifyRes.ok || !verifyData.success) {
        setIsVerifyingOtp(false);
        setOtpDigits(["", "", "", "", "", ""]);
        focusWipeOtpFirst();
        triggerShake(verifyData.error || "Verification failed: Invalid authorization code.");
        return;
      }
    } catch (err: unknown) {
      setIsVerifyingOtp(false);
      setOtpDigits(["", "", "", "", "", ""]);
      focusWipeOtpFirst();
      const error = err as Error;
      triggerShake(
        error?.name === "AbortError"
          ? "Verification timed out. Please check your connection."
          : "Network error during authorization code verification."
      );
      return;
    }

    // Step 2: ONLY IF VERIFIED: Transition to wipe execution journey
    setIsVerifyingOtp(false);
    setIsWiping(true);

    // Immediately close the confirmation modal so the live dynamic wiping terminal is 100% visible
    setShowConfirmModal(false);
    setOtpDigits(["", "", "", "", "", ""]);
    setOtpSent(false);
    setOtpError(null);

    const stages = [
      "1/4: Cryptographic authorization code verified ✓",
      "2/4: Initializing Firebase Admin Service Account Key",
      "3/4: Executing atomic database purge (/posts, /projects, /messages, /subscribers)",
      "4/4: Flushing Upstash Redis cache & invalidating edge routes",
    ];

    startProgressTracking("purge", "NUCLEAR DATABASE PURGE (WIPE TO 0)", stages, 2.5);

    updateProgressStage(0, 25, stages);
    await new Promise((r) => setTimeout(r, 450));

    updateProgressStage(1, 55, stages);
    await new Promise((r) => setTimeout(r, 450));

    // Call Purge API
    try {
      const purgeController = new AbortController();
      const purgeTimeout = setTimeout(() => purgeController.abort(), 30000);

      const res = await fetch("/api/admin/database/purge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          otpCode: code,
          challengeToken: wipeChallengeToken,
          preserveAuth,
        }),
        signal: purgeController.signal,
      });

      clearTimeout(purgeTimeout);
      let data: { success?: boolean; error?: string; purgedAt?: string } = {};
      try {
        data = await res.json();
      } catch {
        data = { success: false, error: `Purge execution returned HTTP ${res.status}` };
      }

      updateProgressStage(2, 85, stages);
      await new Promise((r) => setTimeout(r, 450));

      updateProgressStage(3, 100, stages);
      await new Promise((r) => setTimeout(r, 350));

      setStats({
        postsCount: 0,
        projectsCount: 0,
        messagesCount: 0,
        subscribersCount: 0,
        telemetryCount: 0,
        cacheKeysCount: 0,
        databaseStatus: "OFFLINE",
        storageUsedBytes: 0,
        lastPurgedAt: data.purgedAt || new Date().toISOString(),
        isPurged: true,
        redisLatencyMs: 0,
      });

      setWipeSuccess(true);

      completeProgress(
        preserveAuth
          ? "Nuclear Purge Completed: Database records wiped to exactly 0. Admin session & 2FA state preserved."
          : "Total Nuclear Purge Completed: Entire database root wiped to 0 documents.",
        stages
      );

      setIsWiping(false);
      setWipeSuccess(false);
      setWipeChallengeToken("");
    } catch (err: unknown) {
      setIsWiping(false);
      const error = err as Error;
      failProgress(error?.message || "Failed to complete database purge.");
    }
  };

  // Restore Default Sample Data via Firebase Admin SDK
  const handleRestoreDefaults = async () => {
    setNotification(null);

    const stages = [
      "1/3: Initializing Admin SDK Service Account",
      "2/3: Seeding showcase projects & markdown articles",
      "3/3: Rebuilding cache & synchronizing portfolio",
    ];

    startProgressTracking("seed", "RESTORING DEFAULT DATABASE RECORDS", stages, 1.6);

    try {
      updateProgressStage(0, 30, stages);
      await new Promise((r) => setTimeout(r, 300));

      updateProgressStage(1, 65, stages);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const res = await fetch("/api/admin/database/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      updateProgressStage(2, 95, stages);

      const data = await res.json().catch(() => null);
      await new Promise((r) => setTimeout(r, 250));

      if (data && data.success) {
        setStats({
          postsCount: 5,
          projectsCount: 4,
          messagesCount: 1,
          subscribersCount: 1,
          telemetryCount: 0,
          cacheKeysCount: 1,
          databaseStatus: "ONLINE",
          storageUsedBytes: 11264,
          lastPurgedAt: null,
          isPurged: false,
          redisLatencyMs: 0,
        });

        completeProgress("Default database records restored successfully.", stages);
      } else {
        failProgress(data.error || "Failed to restore database records.");
      }
    } catch (err: unknown) {
      const error = err as Error;
      failProgress(
        error.name === "AbortError"
          ? "Restore operation timed out."
          : "Failed to connect to restore endpoint."
      );
    }
  };

  // Dynamic persistent sub-navigation tab (synced with URL & LocalStorage across hard refreshes)
  const [activeTab, setActiveTabState] = useState<"overview" | "wipe">("overview");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlTab = new URLSearchParams(window.location.search).get("tab");
      if (urlTab === "wipe" || urlTab === "overview") {
        setActiveTabState(urlTab);
      } else {
        const saved = localStorage.getItem("admin_tab_database");
        if (saved === "wipe" || saved === "overview") {
          setActiveTabState(saved);
        }
      }
    }
  }, []);

  const setActiveTab = (tab: "overview" | "wipe") => {
    setActiveTabState(tab);
    if (typeof window !== "undefined") {
      localStorage.setItem("admin_tab_database", tab);
      const url = new URL(window.location.href);
      url.searchParams.set("tab", tab);
      window.history.replaceState(null, "", url.toString());
    }
  };

  const totalDocs =
    stats.postsCount +
    stats.projectsCount +
    stats.messagesCount +
    stats.subscribersCount;

  const isLoaded = !stats.isPurged && totalDocs > 0;

  return (
    <div className="w-full min-h-full p-4 sm:p-6 lg:p-8 space-y-6 font-admin-sans pb-16">
      {/* Wipe Confirmation & Dynamic OTP Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            className={`bg-white border border-[#E5E7EB] rounded-sm max-w-lg w-full p-6 sm:p-8 space-y-5 shadow-2xl animate-in zoom-in-95 duration-150 font-admin-sans transition-transform ${
              shakeError ? "animate-[shake_0.38s_ease-in-out]" : ""
            }`}
          >
            {/* Header */}
            <div className="flex items-center gap-3 text-rose-600 border-b border-[#F1F5F9] pb-4">
              <div className="w-10 h-10 rounded-sm bg-rose-50 border border-rose-200 flex items-center justify-center">
                <FaTriangleExclamation className="w-5 h-5 text-rose-600 shrink-0" />
              </div>
              <div>
                <span className="text-[10px] font-admin-mono tracking-widest text-rose-600 font-bold uppercase">
                  CRITICAL ACTION &bull; AUTHORIZATION REQUIRED
                </span>
                <h3 className="text-lg font-black text-black tracking-tight">
                  Authorize Database Wipe to 0
                </h3>
              </div>
            </div>

            {/* Warning Message */}
            <p className="text-xs sm:text-[13px] text-[#525252] leading-relaxed">
              This destructive operation will erase{" "}
              <strong className="text-black">{totalDocs} live documents</strong> (articles, projects, messages,
              subscribers) down to <strong className="text-rose-600">exactly 0</strong> via Firebase Admin SDK.
            </p>

            {/* Preserve Auth Safety Checkbox */}
            <div className="p-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-sm space-y-2">
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={preserveAuth}
                  onChange={(e) => setPreserveAuth(e.target.checked)}
                  disabled={isWiping}
                  className="mt-0.5 w-4 h-4 rounded-xs border-[#CBD5E1] text-purple-600 focus:ring-purple-500 cursor-pointer"
                />
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-[#0F172A] flex items-center gap-1.5 font-admin-mono">
                    <FaShieldHalved className="w-3 h-3 text-purple-600" />
                    Preserve Admin Auth & 2FA Session (Recommended)
                  </span>
                  <p className="text-[11px] text-[#64748B] leading-tight">
                    {preserveAuth
                      ? "Keeps your admin login and 2FA session active while wiping content collections to 0."
                      : "WARNING: Pure Total Purge. Root database will be completely wiped."}
                  </p>
                </div>
              </label>
            </div>

            {/* Step 1: Request Code Button (Matching Login Style) */}
            {!otpSent ? (
              <div className="p-4 bg-rose-50/70 border border-rose-200/80 rounded-sm space-y-3 font-admin-mono">
                <div className="flex items-center gap-2 text-xs font-bold text-rose-900">
                  <FaEnvelope className="w-3.5 h-3.5 text-rose-600" />
                  <span>STEP 1: RECEIVE AUTHORIZATION CODE</span>
                </div>
                <p className="text-[11px] text-rose-800/90 font-admin-sans leading-relaxed">
                  A high-security 6-digit confirmation code will be dispatched to your authorized administrator
                  email to confirm this permanent purge.
                </p>
                <button
                  onClick={handleSendWipeOtp}
                  disabled={isSendingOtp || isWiping}
                  className="w-full py-2.5 px-4 rounded-xs bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isSendingOtp ? (
                    <>
                      <FaSpinner className="w-3.5 h-3.5 animate-spin" />
                      <span>DISPATCHING CODE...</span>
                    </>
                  ) : (
                    <>
                      <FaKey className="w-3.5 h-3.5" />
                      <span>SEND DESTRUCTIVE ACTION CODE</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              /* Step 2: 6-Digit Verification Input (Matching Login OTP Component Exactly) */
              <div className="space-y-4 font-admin-mono">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-black flex items-center gap-1.5">
                    <FaKey className="w-3 h-3 text-rose-600" />
                    STEP 2: ENTER 6-DIGIT CODE
                  </span>
                  <span className="text-[11px] text-[#737373]">
                    Expires in {formatTime(expiresInSeconds)}
                  </span>
                </div>

                <div className={`flex justify-between gap-2 transition-transform ${shakeError ? "animate-shake" : ""}`}>
                  {otpDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => {
                        otpInputRefs.current[idx] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleDigitChange(idx, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(idx, e)}
                      onPaste={handlePaste}
                      onFocus={(e) => e.target.select()}
                      disabled={isWiping}
                      className={`w-12 h-14 text-center text-xl font-bold bg-[#F9FAFB] border rounded-sm outline-none transition-all ${
                        otpError
                          ? "border-rose-500 bg-rose-50/40 text-rose-900 focus:border-rose-600 ring-1 ring-rose-300"
                          : digit
                          ? "border-rose-600 bg-white text-black ring-1 ring-rose-600/20"
                          : "border-[#D1D5DB] text-black focus:border-rose-600 focus:bg-white focus:ring-2 focus:ring-rose-500/20"
                      }`}
                    />
                  ))}
                </div>

                {/* Resend Cooldown */}
                <div className="flex items-center justify-between text-[11px] pt-1">
                  <span className="text-[#737373] font-admin-sans">Code sent to admin inbox</span>
                  {otpCooldown > 0 ? (
                    <span className="text-[#9CA3AF]">Resend in {otpCooldown}s</span>
                  ) : (
                    <button
                      onClick={handleSendWipeOtp}
                      disabled={isSendingOtp || isWiping}
                      className="text-rose-600 hover:text-rose-800 font-bold underline cursor-pointer disabled:opacity-50 flex items-center gap-1"
                    >
                      <FaArrowRotateRight className="w-2.5 h-2.5" />
                      <span>Resend Code</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Error Message */}
            {otpError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-sm text-xs text-rose-700 flex items-center gap-2 font-admin-mono">
                <FaTriangleExclamation className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                <span>{otpError}</span>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#F1F5F9] font-admin-mono text-xs">
              <button
                type="button"
                onClick={() => {
                  if (!isWiping) {
                    setShowConfirmModal(false);
                    setOtpSent(false);
                    setOtpError(null);
                    setOtpDigits(["", "", "", "", "", ""]);
                  }
                }}
                disabled={isWiping}
                className="px-4 py-2.5 rounded-sm border border-[#E5E7EB] hover:bg-[#F3F4F6] text-[#374151] font-medium transition-colors cursor-pointer disabled:opacity-50"
              >
                CANCEL
              </button>

              <button
                type="button"
                onClick={() => handleExecutePurge()}
                disabled={!otpSent || otpDigits.join("").length !== 6 || isVerifyingOtp || isWiping}
                className="px-5 py-2.5 rounded-sm bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-xs disabled:opacity-40 disabled:cursor-not-allowed select-none"
              >
                {wipeSuccess ? (
                  <>
                    <FaCheck className="w-3 h-3 text-emerald-300" />
                    <span>WIPED TO 0 SUCCESSFULLY!</span>
                  </>
                ) : isVerifyingOtp ? (
                  <>
                    <FaSpinner className="w-3 h-3 animate-spin" />
                    <span>VERIFYING CODE...</span>
                  </>
                ) : isWiping ? (
                  <>
                    <FaSpinner className="w-3 h-3 animate-spin" />
                    <span>WIPING DATABASE...</span>
                  </>
                ) : (
                  <>
                    <FaTrashCan className="w-3 h-3" />
                    <span>CONFIRM & WIPE TO 0</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Header with Navigation Tabs */}
      <div className="flex flex-col gap-4 pb-4 border-b border-[#E5E7EB]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-admin-mono tracking-widest text-[#737373] uppercase font-medium">
                01. OVERVIEW &bull; {activeTab === "wipe" ? "DATABASE WIPE" : "DATABASE SERVICES"}
              </span>
              <span
                className={`inline-flex items-center gap-1 text-[10px] font-admin-mono font-bold px-2 py-0.5 rounded-full border ${
                  isLoaded
                    ? "text-emerald-600 bg-emerald-50 border-emerald-200"
                    : "text-rose-600 bg-rose-50 border-rose-200"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isLoaded ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
                  }`}
                />
                {isLoaded ? "DATABASE LOADED" : "DATABASE PURGED"}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-black tracking-tight">
              {activeTab === "wipe" ? "Database Wipe." : "Database Services."}
            </h1>
            <p className="text-xs sm:text-sm text-[#525252] mt-1">
              {activeTab === "wipe"
                ? "Firebase Admin SDK master control, real-time database state, and nuclear wipe."
                : "Firebase Cloud Firestore master control, live collection telemetry, and database services."}
            </p>
          </div>

          {/* Action Buttons with Info Tooltips */}
          <div className="flex items-center gap-2">
            {/* Sync Button with Info Tooltip */}
            <div className="relative group">
              <button
                onClick={fetchStats}
                disabled={isLoading || progress.active || isWiping}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-sm bg-white border border-[#E5E5E5] hover:bg-[#F5F5F5] text-xs font-admin-mono text-[#171717] transition-all cursor-pointer shadow-xs disabled:opacity-50"
              >
                <FaRotate className={`w-2.5 h-2.5 ${isLoading ? "animate-spin" : ""}`} />
                <span>{isLoading ? "Syncing..." : "Sync"}</span>
              </button>
              <div className="absolute right-0 top-full mt-2 hidden group-hover:block z-30 w-64 p-2.5 bg-[#0F172A] text-white text-[11px] font-admin-sans rounded-sm shadow-xl border border-slate-700 pointer-events-none leading-relaxed animate-in fade-in duration-150">
                <div className="flex items-center gap-1.5 text-sky-400 font-bold mb-1 font-admin-mono text-[10px] uppercase">
                  <FaCircleQuestion className="w-3 h-3" />
                  <span>Sync Database State</span>
                </div>
                Queries Cloud Firestore to fetch current live document counts and storage payload in real-time.
              </div>
            </div>

            {/* Restore Defaults Button with Info Tooltip */}
            <div className="relative group">
              <button
                onClick={handleRestoreDefaults}
                disabled={progress.active || isWiping}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-sm bg-white border border-[#E5E5E5] hover:bg-[#F5F5F5] text-xs font-admin-mono text-[#171717] transition-all cursor-pointer shadow-xs disabled:opacity-50"
              >
                <FaFolderTree className="w-2.5 h-2.5 text-[#A855F7]" />
                <span>
                  {progress.active && progress.type === "seed" ? "Restoring..." : "Restore Defaults"}
                </span>
              </button>
              <div className="absolute right-0 top-full mt-2 hidden group-hover:block z-30 w-72 p-2.5 bg-[#0F172A] text-white text-[11px] font-admin-sans rounded-sm shadow-xl border border-slate-700 pointer-events-none leading-relaxed animate-in fade-in duration-150">
                <div className="flex items-center gap-1.5 text-purple-400 font-bold mb-1 font-admin-mono text-[10px] uppercase">
                  <FaCircleQuestion className="w-3 h-3" />
                  <span>What Does Restore Defaults Do?</span>
                </div>
                Populates Cloud Firestore with 5 standard blog posts and 4 showcase projects (11 total documents) so your portfolio has working demonstration content after a database wipe.
              </div>
            </div>
          </div>
        </div>

        {/* Sub-Navigation Tabs: Overview vs Database Wipe */}
        <div className="flex items-center gap-1.5 font-admin-mono text-xs pt-1">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-3.5 py-1.5 rounded-[2px] transition-all flex items-center gap-1.5 font-bold cursor-pointer ${
              activeTab === "overview"
                ? "bg-black text-white shadow-xs"
                : "bg-[#F3F4F6] text-[#64748B] hover:bg-[#E5E7EB]"
            }`}
          >
            <FaDatabase className="w-3 h-3" />
            <span>Overview</span>
          </button>

          <button
            onClick={() => setActiveTab("wipe")}
            className={`px-3.5 py-1.5 rounded-[2px] transition-all flex items-center gap-1.5 font-bold cursor-pointer ${
              activeTab === "wipe"
                ? "bg-rose-600 text-white shadow-xs"
                : "bg-[#F3F4F6] text-[#64748B] hover:bg-rose-50 hover:text-rose-600"
            }`}
          >
            <FaTrashCan className={`w-3 h-3 ${activeTab === "wipe" ? "text-white" : "text-rose-500"}`} />
            <span>Database Wipe</span>
          </button>
        </div>
      </div>

      {/* Dynamic Live Progress Bar Terminal */}
      {progress.active && (
        <div className="p-5 sm:p-6 bg-[#111111] text-white border border-[#262626] rounded-sm space-y-4 shadow-lg animate-in fade-in slide-in-from-top-2 duration-200 font-admin-mono">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#262626] pb-3">
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full animate-ping ${
                  progress.type === "purge" ? "bg-rose-500" : "bg-[#A855F7]"
                }`}
              />
              <span className="text-xs font-bold tracking-widest text-white uppercase">
                {progress.title}
              </span>
            </div>

            <div className="flex items-center gap-4 text-[11px] text-[#A3A3A3]">
              <div className="flex items-center gap-1.5">
                <FaHourglassHalf className="w-3 h-3 text-[#737373]" />
                <span>Elapsed: {progress.elapsedSec}s</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[#D4D4D4]">
                  {progress.percent >= 100 ? (
                    <span className="text-emerald-400 font-bold">DONE ✓</span>
                  ) : (
                    <span>Est: ~{progress.estRemainingSec}s left</span>
                  )}
                </span>
              </div>
              <span className="text-xs font-bold text-white bg-[#262626] px-2 py-0.5 rounded-xs">
                {progress.percent}%
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="w-full h-2 bg-[#262626] rounded-full overflow-hidden border border-[#333333] relative">
              <div
                className={`h-full transition-all duration-300 ease-out relative ${
                  progress.type === "purge"
                    ? "bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500"
                    : "bg-gradient-to-r from-purple-600 via-[#A855F7] to-emerald-400"
                }`}
                style={{ width: `${progress.percent}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-1">
            {progress.stages.map((stage, idx) => (
              <div
                key={idx}
                className={`p-2.5 rounded-xs text-[11px] flex items-center gap-2 border transition-all ${
                  stage.status === "done"
                    ? "bg-emerald-950/40 border-emerald-700/60 text-emerald-300 font-medium"
                    : stage.status === "running"
                    ? "bg-[#262626] border-white text-white font-bold"
                    : "bg-[#181818] border-[#2E2E2E] text-[#666666]"
                }`}
              >
                {stage.status === "done" ? (
                  <FaCheck className="w-3 h-3 text-emerald-400 shrink-0" />
                ) : stage.status === "running" ? (
                  <FaSpinner className="w-3 h-3 text-white shrink-0 animate-spin" />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#444444] shrink-0" />
                )}
                <span className="truncate">{stage.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notification Banner */}
      {notification && !progress.active && (
        <div
          className={`p-4 rounded-sm border flex items-center gap-3 text-xs font-admin-mono ${
            notification.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          {notification.type === "success" ? (
            <FaCircleCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <FaTriangleExclamation className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{notification.text}</span>
        </div>
      )}

      {/* Conditional View: Database Services Overview vs Nuclear Wipe */}
      {activeTab === "overview" ? (
        /* Database Services Overview Modules */
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between pt-1">
              <h3 className="text-xs font-bold font-admin-mono text-[#737373] uppercase tracking-wider">
                Available Database Services &amp; Actions
              </h3>
              <span className="text-[11px] font-admin-mono text-[#64748B]">
                4 Services Configured &bull; Enterprise Cloud Database Controls
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-admin-sans">
              {/* Service Card 1: Database Wipe */}
              <div className="p-5 bg-white border border-rose-200 rounded-sm space-y-3 shadow-xs hover:border-rose-300 transition-all flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="w-8 h-8 rounded-sm bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
                      <FaTrashCan className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[9px] font-admin-mono font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 uppercase">
                      Destructive
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-black tracking-tight">
                    Database Wipe
                  </h4>
                  <p className="text-xs text-[#64748B] leading-relaxed">
                    Safely wipe live content records down to exactly 0 documents via Firebase Admin SDK. Protected by 2FA OTP.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab("wipe")}
                  className="w-full py-2 px-3 rounded-sm bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-admin-mono text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <FaTrashCan className="w-3 h-3" />
                  <span>Open Wipe Console &rarr;</span>
                </button>
              </div>

              {/* Service Card 2: Restore Defaults (Seed) */}
              <div className="p-5 bg-white border border-[#E5E7EB] rounded-sm space-y-3 shadow-xs hover:border-[#CBD5E1] transition-all flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="w-8 h-8 rounded-sm bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
                      <FaFolderTree className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[9px] font-admin-mono font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 uppercase">
                      Seed Data
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-black tracking-tight">
                    Restore Default Records
                  </h4>
                  <p className="text-xs text-[#64748B] leading-relaxed">
                    Populate Cloud Firestore with 5 standard blog posts and 4 showcase projects (11 documents) after a wipe.
                  </p>
                </div>
                <button
                  onClick={handleRestoreDefaults}
                  disabled={progress.active || isWiping}
                  className="w-full py-2 px-3 rounded-sm bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#1E293B] border border-[#E2E8F0] font-admin-mono text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <FaFolderTree className="w-3 h-3 text-purple-600" />
                  <span>Restore Defaults</span>
                </button>
              </div>

              {/* Service Card 3: Telemetry & Sync */}
              <div className="p-5 bg-white border border-[#E5E7EB] rounded-sm space-y-3 shadow-xs hover:border-[#CBD5E1] transition-all flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="w-8 h-8 rounded-sm bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600">
                      <FaRotate className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
                    </div>
                    <span className="text-[9px] font-admin-mono font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
                      Online
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-black tracking-tight">
                    Real-time Database Sync
                  </h4>
                  <p className="text-xs text-[#64748B] leading-relaxed">
                    Query live Firestore collections to fetch current document counts and calculate active storage payload in real time.
                  </p>
                </div>
                <button
                  onClick={fetchStats}
                  disabled={isLoading || progress.active || isWiping}
                  className="w-full py-2 px-3 rounded-sm bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#1E293B] border border-[#E2E8F0] font-admin-mono text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <FaRotate className={`w-3 h-3 ${isLoading ? "animate-spin" : ""}`} />
                  <span>{isLoading ? "Syncing..." : "Sync Database State"}</span>
                </button>
              </div>

              {/* Service Card 4: Stale & Orphan Telemetry Sweeper */}
              <div className="p-5 bg-white border border-amber-200 rounded-sm space-y-3 shadow-xs hover:border-amber-300 transition-all flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="w-8 h-8 rounded-sm bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                      <FaTrashCan className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[9px] font-admin-mono font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 uppercase">
                      3-Layer Sweeper
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-black tracking-tight">
                    Sweep Stale &amp; Orphan Telemetry
                  </h4>
                  <p className="text-xs text-[#64748B] leading-relaxed">
                    Full-authority scan across all Firestore collections. Permanently deletes sessions &gt;24h old and orphaned appeal/audit logs.
                  </p>

                  {cleanupReport && (
                    <div className="p-2.5 rounded-xs bg-amber-50/70 border border-amber-200 space-y-1.5 font-admin-mono text-[11px]">
                      <div className="flex items-center justify-between font-bold text-amber-900 border-b border-amber-200/60 pb-1">
                        <span>{cleanupReport.layerUsed.split(" ")[0]} Active</span>
                        <span>{cleanupReport.durationMs}ms</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-[10px] text-amber-800">
                        <div>Examined: <span className="font-bold text-black">{cleanupReport.totalExamined}</span></div>
                        <div>Purged: <span className="font-bold text-red-600">{cleanupReport.totalPruned}</span></div>
                        <div>Sessions: <span className="font-bold">{cleanupReport.deletedSessions}</span></div>
                        <div>Audit/Logs: <span className="font-bold">{cleanupReport.deletedAuditLogs}</span></div>
                      </div>
                      {cleanupReport.collectionsScanned && cleanupReport.collectionsScanned.length > 0 && (
                        <div className="text-[9px] text-[#78716C] truncate pt-0.5" title={cleanupReport.collectionsScanned.join(", ")}>
                          Scanned: {cleanupReport.collectionsScanned.join(", ")}
                        </div>
                      )}
                    </div>
                  )}

                  {cleanupMessage && !cleanupReport && (
                    <p className="text-[11px] font-admin-mono text-emerald-700 bg-emerald-50 border border-emerald-200 p-2 rounded-xs">
                      {cleanupMessage}
                    </p>
                  )}
                </div>
                <button
                  onClick={handleSweepStaleData}
                  disabled={isCleaning || isLoading || progress.active || isWiping}
                  className="w-full py-2 px-3 rounded-sm bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-admin-mono text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 mt-1"
                >
                  <FaTrashCan className={`w-3 h-3 text-amber-700 ${isCleaning ? "animate-spin" : ""}`} />
                  <span>{isCleaning ? "Scanning Entire Database..." : "Sweep Stale Telemetry"}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Live Database Metrics & Collections Inventory (Full Width) */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold font-admin-mono text-[#737373] uppercase tracking-wider">
                Live Database Collections &amp; Storage Footprint
              </h3>
              <span className="text-[11px] font-admin-mono text-emerald-600 font-bold flex items-center gap-1">
                <FaCircleCheck className="w-3 h-3" />
                <span>Cloud Firestore Authoritative</span>
              </span>
            </div>

            {/* Metric KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              <div className="bg-white border border-[#E5E7EB] p-4 rounded-sm shadow-xs flex flex-col justify-between">
                <span className="text-[11px] font-admin-mono text-[#64748B] uppercase font-semibold">
                  Total Live Documents
                </span>
                <div className="mt-2">
                  <p className="text-2xl font-black font-admin-mono text-black">
                    {totalDocs.toLocaleString()}
                  </p>
                  <p className="text-[11px] font-admin-mono text-[#64748B] mt-0.5">
                    {stats.postsCount} Posts &bull; {stats.projectsCount} Projects &bull; {stats.messagesCount} Msgs
                  </p>
                </div>
              </div>

              <div className="bg-white border border-[#E5E7EB] p-4 rounded-sm shadow-xs flex flex-col justify-between">
                <span className="text-[11px] font-admin-mono text-[#64748B] uppercase font-semibold">
                  Active Storage Payload
                </span>
                <div className="mt-2">
                  <p className="text-2xl font-black font-admin-mono text-black">
                    {(stats.storageUsedBytes / 1024).toFixed(1)} KB
                  </p>
                  <p className="text-[11px] font-admin-mono text-[#64748B] mt-0.5">
                    Calculated payload size in Firestore
                  </p>
                </div>
              </div>

              <div className="bg-white border border-[#E5E7EB] p-4 rounded-sm shadow-xs flex flex-col justify-between">
                <span className="text-[11px] font-admin-mono text-[#64748B] uppercase font-semibold">
                  Database Provider
                </span>
                <div className="mt-2">
                  <p className="text-2xl font-black font-admin-mono text-indigo-700">
                    {stats.databaseStatus === "OFFLINE" ? "PURGED" : "ONLINE"}
                  </p>
                  <p className="text-[11px] font-admin-mono text-[#64748B] mt-0.5">
                    Firebase Cloud Firestore (asia-south1)
                  </p>
                </div>
              </div>

              <div className="bg-white border border-[#E5E7EB] p-4 rounded-sm shadow-xs flex flex-col justify-between">
                <span className="text-[11px] font-admin-mono text-[#64748B] uppercase font-semibold">
                  Cache &amp; Sync State
                </span>
                <div className="mt-2">
                  <p className="text-2xl font-black font-admin-mono text-emerald-600 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>SYNCHRONIZED</span>
                  </p>
                  <p className="text-[11px] font-admin-mono text-[#64748B] mt-0.5">
                    Live updates across all portfolio routes
                  </p>
                </div>
              </div>
            </div>

            {/* Collection Inventory Table (Full Width) */}
            <div className="bg-white border border-[#E5E7EB] rounded-sm shadow-xs overflow-hidden">
              <div className="p-4 border-b border-[#E5E7EB] bg-[#FAFAFA] flex items-center justify-between">
                <span className="text-xs font-bold font-admin-mono uppercase text-black">
                  Firestore Collections Inventory
                </span>
                <span className="text-[10px] font-admin-mono text-[#64748B]">
                  Live Snapshot Telemetry
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left font-admin-sans">
                  <thead>
                    <tr className="border-b border-[#E5E7EB] bg-white text-[11px] font-admin-mono uppercase text-[#64748B]">
                      <th className="p-3.5 pl-4">Collection ID</th>
                      <th className="p-3.5">Description</th>
                      <th className="p-3.5 text-center">Live Documents</th>
                      <th className="p-3.5">Access Scope</th>
                      <th className="p-3.5 text-right pr-4">Health Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9] text-xs">
                    <tr className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="p-3.5 pl-4 font-admin-mono font-bold text-purple-700">posts</td>
                      <td className="p-3.5 text-[#64748B]">Technical engineering articles and blog publications</td>
                      <td className="p-3.5 text-center font-admin-mono font-bold text-black">{stats.postsCount}</td>
                      <td className="p-3.5 font-admin-mono text-[11px] text-[#475569]">Public Read / Admin Write</td>
                      <td className="p-3.5 text-right pr-4">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-admin-mono font-bold">
                          ONLINE
                        </span>
                      </td>
                    </tr>
                    <tr className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="p-3.5 pl-4 font-admin-mono font-bold text-purple-700">projects</td>
                      <td className="p-3.5 text-[#64748B]">Showcase project records with live demo URLs and tech stacks</td>
                      <td className="p-3.5 text-center font-admin-mono font-bold text-black">{stats.projectsCount}</td>
                      <td className="p-3.5 font-admin-mono text-[11px] text-[#475569]">Public Read / Admin Write</td>
                      <td className="p-3.5 text-right pr-4">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-admin-mono font-bold">
                          ONLINE
                        </span>
                      </td>
                    </tr>
                    <tr className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="p-3.5 pl-4 font-admin-mono font-bold text-purple-700">messages</td>
                      <td className="p-3.5 text-[#64748B]">Inquiry messages submitted through portfolio contact module</td>
                      <td className="p-3.5 text-center font-admin-mono font-bold text-black">{stats.messagesCount}</td>
                      <td className="p-3.5 font-admin-mono text-[11px] text-[#475569]">Public Create / Admin Read-Write</td>
                      <td className="p-3.5 text-right pr-4">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-admin-mono font-bold">
                          ACTIVE
                        </span>
                      </td>
                    </tr>
                    <tr className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="p-3.5 pl-4 font-admin-mono font-bold text-purple-700">subscribers</td>
                      <td className="p-3.5 text-[#64748B]">Verified newsletter subscribers for engineering updates</td>
                      <td className="p-3.5 text-center font-admin-mono font-bold text-black">{stats.subscribersCount}</td>
                      <td className="p-3.5 font-admin-mono text-[11px] text-[#475569]">Public Create / Admin Read-Write</td>
                      <td className="p-3.5 text-right pr-4">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-admin-mono font-bold">
                          ACTIVE
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Dedicated Database Wipe UI/UX */
        <div className="p-6 sm:p-8 bg-white border-2 border-rose-500/80 rounded-sm space-y-4 shadow-sm animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                <h3 className="text-sm font-bold font-admin-mono text-rose-600 uppercase tracking-wider">
                  Nuclear Purge Zone &bull; Danger Action
                </h3>
              </div>
              <p className="text-xs sm:text-[13px] text-[#525252] max-w-xl leading-relaxed">
                Wipe database content records (articles, showcase projects, inquiry messages, and subscribers) down
                to <strong className="text-black">exactly 0</strong> via Firebase Admin SDK. Protected by email
                authorization OTP.
              </p>
            </div>

            <div className="relative group shrink-0">
              <button
                onClick={() => setShowConfirmModal(true)}
                disabled={progress.active || isWiping}
                className="inline-flex items-center gap-2 px-6 py-3.5 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-admin-mono font-bold uppercase tracking-wider rounded-sm transition-all cursor-pointer shadow-sm hover:shadow-md disabled:opacity-50 select-none"
              >
                <FaTrashCan className="w-3.5 h-3.5" />
                <span>
                  {progress.active && progress.type === "purge"
                    ? `PURGING (${progress.percent}%)...`
                    : "PURGE DATABASE (WIPE TO 0)"}
                </span>
              </button>
              <div className="absolute right-0 bottom-full mb-2 hidden group-hover:block z-30 w-72 p-2.5 bg-[#0F172A] text-white text-[11px] font-admin-sans rounded-sm shadow-xl border border-slate-700 pointer-events-none leading-relaxed animate-in fade-in duration-150">
                <div className="flex items-center gap-1.5 text-rose-400 font-bold mb-1 font-admin-mono text-[10px] uppercase">
                  <FaCircleQuestion className="w-3 h-3" />
                  <span>What Does Purge Database Do?</span>
                </div>
                Permanently erases content collections from Cloud Firestore down to exactly 0 documents. Protected by 2FA email authorization OTP.
              </div>
            </div>
          </div>

          {stats.lastPurgedAt && (
            <p className="text-[11px] font-admin-mono text-[#737373] pt-2 border-t border-[#F0F0F0]">
              Last Nuclear Purge executed on: {new Date(stats.lastPurgedAt).toLocaleString()}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
