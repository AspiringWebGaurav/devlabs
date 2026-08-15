"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { DatabaseStats } from "@/lib/admin/database";
import { posts as defaultPosts } from "@/data/blog/posts";
import { projects as defaultProjects } from "@/data/index";
import { rtdb, ref, onValue } from "@/lib/admin/firebase";
import {
  FaDatabase,
  FaTrashCan,
  FaRotate,
  FaTriangleExclamation,
  FaCircleCheck,
  FaServer,
  FaBolt,
  FaFolderTree,
  FaSignal,
  FaHourglassHalf,
  FaCheck,
  FaSpinner,
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
    postsCount: defaultPosts.length,
    projectsCount: defaultProjects.length,
    messagesCount: 1,
    subscribersCount: 2,
    telemetryCount: 3,
    cacheKeysCount: 18,
    databaseStatus: "ONLINE",
    storageUsedBytes: (defaultPosts.length + defaultProjects.length + 6) * 1350,
    lastPurgedAt: null,
    isPurged: false,
    redisLatencyMs: 24,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Live Operation Progress Bar & Telemetry State
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

  // Fetch live stats from backend API
  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/database/stats", {
        cache: "no-store",
        credentials: "include",
      });
      const data = await res.json();
      if (data.success && data.stats) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error("Failed to fetch database stats:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

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
              const telemetryCount = val.telemetry ? Object.keys(val.telemetry).length : 0;
              const isPurged = val.meta?.purged === true || (postsCount === 0 && projectsCount === 0);
              const payloadBytes = new TextEncoder().encode(JSON.stringify(val)).length;

              setStats((prev) => ({
                postsCount,
                projectsCount,
                messagesCount,
                subscribersCount,
                telemetryCount,
                cacheKeysCount: isPurged ? 0 : prev.cacheKeysCount || 18,
                databaseStatus: "ONLINE",
                storageUsedBytes: payloadBytes > 0 ? payloadBytes : 0,
                lastPurgedAt: val.meta?.lastPurgedAt || prev.lastPurgedAt,
                isPurged,
                redisLatencyMs: prev.redisLatencyMs || 24,
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
      percent: 8,
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

  const updateProgressStage = (
    stageIndex: number,
    percent: number,
    stages: string[]
  ) => {
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

    // Dismiss progress after 3 seconds
    setTimeout(() => {
      setProgress((prev) => ({ ...prev, active: false }));
    }, 3000);
  };

  const failProgress = (errorMsg: string) => {
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    setProgress((prev) => ({ ...prev, active: false }));
    setNotification({
      type: "error",
      text: errorMsg,
    });
  };

  // Execute Nuclear Database Purge to 0 with Firebase Admin SDK & Graceful Lifecycles
  const handleExecutePurge = async () => {
    setShowConfirmModal(false);
    setNotification(null);

    const stages = [
      "1/4: Authenticating admin service account key",
      "2/4: Wiping Realtime DB document nodes to 0",
      "3/4: Flushing Upstash Redis cache storage",
      "4/4: Revalidating Next.js static edge routes",
    ];

    startProgressTracking("purge", "NUCLEAR DATABASE PURGE (WIPE TO 0)", stages, 1.8);

    try {
      // Stage 1: Auth Handshake
      updateProgressStage(0, 20, stages);
      await new Promise((r) => setTimeout(r, 250));

      // Stage 2: Database Wipe via Service Account
      updateProgressStage(1, 55, stages);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const res = await fetch("/api/admin/database/purge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Stage 3: Cache Flush
      updateProgressStage(2, 80, stages);
      await new Promise((r) => setTimeout(r, 250));

      // Stage 4: Sync
      updateProgressStage(3, 95, stages);
      const data = await res.json();
      await new Promise((r) => setTimeout(r, 200));

      if (data.success) {
        setStats({
          postsCount: 0,
          projectsCount: 0,
          messagesCount: 0,
          subscribersCount: 0,
          telemetryCount: 0,
          cacheKeysCount: 0,
          databaseStatus: "ONLINE",
          storageUsedBytes: 0,
          lastPurgedAt: data.purgedAt || new Date().toISOString(),
          isPurged: true,
          redisLatencyMs: 14,
        });

        completeProgress(
          "Nuclear Purge Completed: Entire database wiped to exactly 0 documents via Firebase Admin Service Account.",
          stages
        );
      } else {
        failProgress(data.error || "Purge failed: Admin access denied.");
      }
    } catch (err: unknown) {
      const error = err as Error;
      failProgress(
        error.name === "AbortError"
          ? "Purge timed out. Check network connection."
          : "Network error occurred while wiping database."
      );
    }
  };

  // Restore Default Sample Data via Firebase Admin SDK
  const handleRestoreDefaults = async () => {
    setNotification(null);

    const stages = [
      "1/4: Initializing Admin SDK Service Account",
      "2/4: Seeding showcase projects & markdown articles",
      "3/4: Restoring inquiries & newsletter subscribers",
      "4/4: Initializing Upstash Redis cache telemetry",
    ];

    startProgressTracking("seed", "RESTORING DEFAULT SHOWCASE DATABASE", stages, 1.8);

    try {
      // Stage 1
      updateProgressStage(0, 20, stages);
      await new Promise((r) => setTimeout(r, 250));

      // Stage 2
      updateProgressStage(1, 55, stages);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const res = await fetch("/api/admin/database/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Stage 3
      updateProgressStage(2, 80, stages);
      await new Promise((r) => setTimeout(r, 250));

      // Stage 4
      updateProgressStage(3, 95, stages);
      const data = await res.json();
      await new Promise((r) => setTimeout(r, 200));

      if (data.success) {
        setStats({
          postsCount: defaultPosts.length,
          projectsCount: defaultProjects.length,
          messagesCount: 1,
          subscribersCount: 2,
          telemetryCount: 3,
          cacheKeysCount: 18,
          databaseStatus: "ONLINE",
          storageUsedBytes: (defaultPosts.length + defaultProjects.length + 6) * 1350,
          lastPurgedAt: null,
          isPurged: false,
          redisLatencyMs: 18,
        });

        completeProgress(
          "Default showcase data successfully populated into live database via Firebase Admin SDK.",
          stages
        );
      } else {
        failProgress(data.error || "Failed to restore data.");
      }
    } catch (err: unknown) {
      const error = err as Error;
      failProgress(
        error.name === "AbortError"
          ? "Seed operation timed out. Please try again."
          : "Failed to connect to database seed endpoint."
      );
    }
  };

  const totalDocs =
    stats.postsCount +
    stats.projectsCount +
    stats.messagesCount +
    stats.subscribersCount +
    stats.telemetryCount;

  return (
    <div className="w-full h-full px-4 sm:px-8 lg:px-10 pt-3 sm:pt-4 pb-8 space-y-6 font-admin-sans">
      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5E7EB] rounded-sm max-w-md w-full p-6 sm:p-8 space-y-5 shadow-xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600">
              <FaTriangleExclamation className="w-6 h-6 shrink-0" />
              <h3 className="text-lg font-bold text-black tracking-tight">
                Confirm Nuclear Database Purge?
              </h3>
            </div>

            <p className="text-xs sm:text-[13px] text-[#525252] leading-relaxed">
              This action will permanently wipe <strong className="text-black">all {totalDocs} documents</strong>,
              articles, projects, subscribers, messages, and Redis cache keys down to{" "}
              <strong className="text-rose-600">0</strong> via Firebase Admin SDK.
            </p>

            <div className="p-3 bg-rose-50 border border-rose-200 text-[11px] font-admin-mono text-rose-700 rounded-sm">
              CAUTION: Portfolio and Blog views will immediately reflect 0 items live.
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 text-xs font-admin-mono text-[#525252] hover:text-black bg-[#F5F5F5] hover:bg-[#E5E5E5] rounded-sm cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleExecutePurge}
                className="px-4 py-2 text-xs font-admin-mono font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-sm cursor-pointer transition-colors shadow-xs"
              >
                YES, WIPE DATABASE TO 0
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5E7EB]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-admin-mono tracking-widest text-[#737373] uppercase font-medium">
              01. OVERVIEW &bull; LIVE DATABASE TELEMETRY
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-admin-mono text-emerald-600 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              LIVE WEBSOCKET
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-black tracking-tight">
            Database Services.
          </h1>
          <p className="text-xs sm:text-sm text-[#525252] mt-1">
            Firebase Admin SDK master control, real-time WebSocket telemetry, and nuclear wipe.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={fetchStats}
            disabled={isLoading || progress.active}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-sm bg-white border border-[#E5E5E5] hover:bg-[#F5F5F5] text-xs font-admin-mono text-[#171717] transition-all cursor-pointer shadow-xs disabled:opacity-50"
          >
            <FaRotate className={`w-2.5 h-2.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>{isLoading ? "Syncing..." : "Sync"}</span>
          </button>
          <button
            onClick={handleRestoreDefaults}
            disabled={progress.active}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-sm bg-white border border-[#E5E5E5] hover:bg-[#F5F5F5] text-xs font-admin-mono text-[#171717] transition-all cursor-pointer shadow-xs disabled:opacity-50"
          >
            <FaFolderTree className="w-2.5 h-2.5 text-[#A855F7]" />
            <span>{progress.active && progress.type === "seed" ? "Restoring..." : "Restore Defaults"}</span>
          </button>
        </div>
      </div>

      {/* Dynamic Swiss Live Progress Bar Terminal */}
      {progress.active && (
        <div className="p-5 sm:p-6 bg-[#111111] text-white border border-[#262626] rounded-sm space-y-4 shadow-lg animate-in fade-in slide-in-from-top-2 duration-200 font-admin-mono">
          {/* Top Title & Live Metrics */}
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

            {/* Realtime Timing Telemetry */}
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

          {/* Animated Graphic Progress Bar Track */}
          <div className="space-y-1.5">
            <div className="w-full h-2.5 bg-[#262626] rounded-full overflow-hidden border border-[#333333] relative">
              <div
                className={`h-full transition-all duration-300 ease-out relative ${
                  progress.type === "purge"
                    ? "bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500"
                    : "bg-gradient-to-r from-purple-600 via-[#A855F7] to-emerald-400"
                }`}
                style={{ width: `${progress.percent}%` }}
              >
                {/* Shimmer light effect */}
                <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.3),transparent)] animate-[shimmer_1.5s_infinite]" />
              </div>
            </div>
          </div>

          {/* Realtime Stage Ticks Grid */}
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

      {/* Realtime Backend Telemetry Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white border border-[#E5E7EB] rounded-sm flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-sm bg-[#F5F5F5] flex items-center justify-center text-black">
              <FaDatabase className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="text-[10px] font-admin-mono uppercase text-[#737373]">Firebase Realtime DB</p>
              <p className="text-xs font-semibold text-black">gaurav-portfolio-improved</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 text-[11px] font-admin-mono text-emerald-600 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            LIVE
          </span>
        </div>

        <div className="p-4 bg-white border border-[#E5E7EB] rounded-sm flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-sm bg-[#F5F5F5] flex items-center justify-center text-[#A855F7]">
              <FaBolt className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="text-[10px] font-admin-mono uppercase text-[#737373]">Upstash Redis Cache</p>
              <p className="text-xs font-semibold text-black">
                {stats.cacheKeysCount} active keys
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="inline-flex items-center gap-1 text-[11px] font-admin-mono text-emerald-600 font-semibold">
              <FaSignal className="w-2.5 h-2.5" />
              {stats.redisLatencyMs ? `${stats.redisLatencyMs}ms` : "ACTIVE"}
            </span>
          </div>
        </div>

        <div className="p-4 bg-white border border-[#E5E7EB] rounded-sm flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-sm bg-[#F5F5F5] flex items-center justify-center text-black">
              <FaServer className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="text-[10px] font-admin-mono uppercase text-[#737373]">Live Payload Size</p>
              <p className="text-xs font-semibold text-black">
                {(stats.storageUsedBytes / 1024).toFixed(2)} KB
              </p>
            </div>
          </div>
          <span className="text-xs font-admin-mono font-bold text-black">
            {totalDocs} Docs
          </span>
        </div>
      </div>

      {/* Live Collection Breakdown Counters */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-admin-mono font-bold text-black uppercase tracking-wider">
            Live Collections & Data Nodes
          </h3>
          <span className="text-[11px] font-admin-mono text-[#737373]">
            {stats.isPurged ? "Status: PURGED TO 0" : "Status: ACTIVE REPOSITORY"}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 bg-white border border-[#E5E7EB] rounded-sm space-y-3 shadow-xs">
            <div className="flex items-center justify-between text-[11px] font-admin-mono text-[#737373]">
              <span>01. ARTICLES</span>
              <span className="px-1.5 py-0.5 bg-[#F5F5F5] rounded-xs text-[10px]">/posts</span>
            </div>
            <p className="text-3xl font-black tracking-tight text-black font-admin-mono">
              {stats.postsCount}
            </p>
            <p className="text-[11px] text-[#737373]">Live markdown blog articles</p>
          </div>

          <div className="p-5 bg-white border border-[#E5E7EB] rounded-sm space-y-3 shadow-xs">
            <div className="flex items-center justify-between text-[11px] font-admin-mono text-[#737373]">
              <span>02. PROJECTS</span>
              <span className="px-1.5 py-0.5 bg-[#F5F5F5] rounded-xs text-[10px]">/projects</span>
            </div>
            <p className="text-3xl font-black tracking-tight text-black font-admin-mono">
              {stats.projectsCount}
            </p>
            <p className="text-[11px] text-[#737373]">Showcase works & case studies</p>
          </div>

          <div className="p-5 bg-white border border-[#E5E7EB] rounded-sm space-y-3 shadow-xs">
            <div className="flex items-center justify-between text-[11px] font-admin-mono text-[#737373]">
              <span>03. MESSAGES</span>
              <span className="px-1.5 py-0.5 bg-[#F5F5F5] rounded-xs text-[10px]">/messages</span>
            </div>
            <p className="text-3xl font-black tracking-tight text-black font-admin-mono">
              {stats.messagesCount}
            </p>
            <p className="text-[11px] text-[#737373]">Inquiry contact records</p>
          </div>

          <div className="p-5 bg-white border border-[#E5E7EB] rounded-sm space-y-3 shadow-xs">
            <div className="flex items-center justify-between text-[11px] font-admin-mono text-[#737373]">
              <span>04. SUBSCRIBERS</span>
              <span className="px-1.5 py-0.5 bg-[#F5F5F5] rounded-xs text-[10px]">/subscribers</span>
            </div>
            <p className="text-3xl font-black tracking-tight text-black font-admin-mono">
              {stats.subscribersCount}
            </p>
            <p className="text-[11px] text-[#737373]">Registered email subscribers</p>
          </div>
        </div>
      </div>

      {/* Nuclear Purge Danger Zone Card */}
      <div className="p-6 sm:p-8 bg-white border-2 border-rose-500/80 rounded-sm space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              <h3 className="text-sm font-bold font-admin-mono text-rose-600 uppercase tracking-wider">
                Nuclear Purge Zone &bull; Danger Action
              </h3>
            </div>
            <p className="text-xs sm:text-[13px] text-[#525252] max-w-xl leading-relaxed">
              Wipe all database nodes, articles, showcase projects, and messages down to{" "}
              <strong className="text-black">exactly 0</strong> via Firebase Admin SDK. Flushes Upstash Redis cache and synchronizes live portfolio state.
            </p>
          </div>

          <button
            onClick={() => setShowConfirmModal(true)}
            disabled={progress.active}
            className="shrink-0 inline-flex items-center gap-2 px-5 py-3 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-admin-mono font-bold uppercase tracking-wider rounded-sm transition-all cursor-pointer shadow-sm hover:shadow-md disabled:opacity-50 select-none"
          >
            <FaTrashCan className="w-3.5 h-3.5" />
            <span>
              {progress.active && progress.type === "purge"
                ? `PURGING (${progress.percent}%)...`
                : "PURGE DATABASE (WIPE TO 0)"}
            </span>
          </button>
        </div>

        {stats.lastPurgedAt && (
          <p className="text-[11px] font-admin-mono text-[#737373] pt-2 border-t border-[#F0F0F0]">
            Last Nuclear Purge executed on: {new Date(stats.lastPurgedAt).toLocaleString()}
          </p>
        )}
      </div>
    </div>
  );
}
