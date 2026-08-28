"use client";

import React, { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FaArrowsRotate, FaCheck, FaXmark } from "react-icons/fa6";
import { globalNuclearRefreshAction } from "@/lib/actions/cms.actions";
import { broadcastClientCmsChange } from "@/lib/public-data/client-broadcast";

export const GlobalRefreshButton: React.FC = () => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isActionRunning, setIsActionRunning] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const resetTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
      }
    };
  }, []);

  const isRefreshing = isActionRunning || isPending;

  const handleRefresh = async () => {
    if (isRefreshing) return;

    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
    }

    setStatus("idle");
    setErrorMessage(null);
    setIsActionRunning(true);

    const startTime = Date.now();

    try {
      // 1. Execute Server Action (Cache Invalidation & Dual-Channel Cross-Tab Broadcast)
      const res = await globalNuclearRefreshAction();

      // Ensure smooth continuous visible rotation cycle (min 800ms)
      const elapsed = Date.now() - startTime;
      if (elapsed < 800) {
        await new Promise((resolve) => setTimeout(resolve, 800 - elapsed));
      }

      if (!isMountedRef.current) return;

      if (res.success && res.data) {
        // 2. Broadcast Real-Time Synchronization to all open tabs
        broadcastClientCmsChange("all", res.data.timestamp);

        // 3. Trigger React 19 App Router Server Component Refresh
        startTransition(() => {
          router.refresh();
        });

        setStatus("success");
        resetTimerRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            setStatus("idle");
          }
        }, 1600);
      } else {
        setStatus("error");
        setErrorMessage(res.error || "Failed to complete global revalidation");
        resetTimerRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            setStatus("idle");
            setErrorMessage(null);
          }
        }, 2500);
      }
    } catch (err: unknown) {
      const elapsed = Date.now() - startTime;
      if (elapsed < 800) {
        await new Promise((resolve) => setTimeout(resolve, 800 - elapsed));
      }

      if (!isMountedRef.current) return;
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Network error during revalidation");
      resetTimerRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          setStatus("idle");
          setErrorMessage(null);
        }
      }, 2500);
    } finally {
      if (isMountedRef.current) {
        setIsActionRunning(false);
      }
    }
  };

  const getAriaLiveText = () => {
    if (isRefreshing) return "Refreshing application state and synchronizing live portfolio...";
    if (status === "success") return "Global refresh completed successfully.";
    if (status === "error") return `Global refresh failed: ${errorMessage || "Unknown error"}`;
    return "Global refresh ready.";
  };

  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        onClick={handleRefresh}
        disabled={isRefreshing}
        aria-label="Global Nuclear Refresh"
        aria-busy={isRefreshing}
        aria-disabled={isRefreshing}
        className={`relative group w-8 h-8 rounded-sm shrink-0 border flex items-center justify-center select-none outline-hidden transition-all duration-200 transform-gpu focus-visible:ring-2 focus-visible:ring-[#7C3AED] focus-visible:ring-offset-1 focus-visible:ring-offset-[#FFFFFF] ${
          isRefreshing
            ? "bg-[#F5F3FF] border-[#7C3AED] text-[#7C3AED] shadow-[0_0_16px_rgba(124,58,237,0.35)] ring-2 ring-[#7C3AED]/20 cursor-wait pointer-events-none scale-[0.98]"
            : status === "success"
            ? "bg-[#F0FDF4] border-[#86EFAC] text-[#16A34A] shadow-[0_0_14px_rgba(22,163,74,0.25)] ring-2 ring-[#16A34A]/20 cursor-pointer scale-100"
            : status === "error"
            ? "bg-[#FEF2F2] border-[#FCA5A5] text-[#DC2626] shadow-[0_0_14px_rgba(220,38,38,0.25)] ring-2 ring-[#DC2626]/20 cursor-pointer scale-100"
            : "bg-[#FFFFFF] hover:bg-[#FFFFFF] border-[#E2E8F0] hover:border-[#7C3AED]/60 text-[#64748B] hover:text-[#7C3AED] hover:shadow-[0_0_14px_rgba(124,58,237,0.25)] active:scale-[0.92] shadow-2xs cursor-pointer"
        }`}
      >
        {/* Screen Reader Live Status Announcement */}
        <span className="sr-only" aria-live="polite" aria-atomic="true">
          {getAriaLiveText()}
        </span>

        {/* Ambient Pulsing Radar Halo during active refresh */}
        {isRefreshing && (
          <span
            className="absolute inset-0 rounded-sm bg-[#7C3AED]/15 animate-ping opacity-75 pointer-events-none"
            aria-hidden="true"
          />
        )}

        {/* Dynamic Multi-State Icon Container with Locked Dimensions & Smooth Transitions */}
        <div className="relative w-3.5 h-3.5 flex items-center justify-center pointer-events-none transform-gpu">
          {status === "success" ? (
            <FaCheck
              key="check"
              className="w-3.5 h-3.5 text-[#16A34A] animate-in zoom-in-50 fade-in duration-200"
              aria-hidden="true"
            />
          ) : status === "error" ? (
            <FaXmark
              key="error"
              className="w-3.5 h-3.5 text-[#DC2626] animate-in zoom-in-75 fade-in duration-150"
              aria-hidden="true"
            />
          ) : (
            <FaArrowsRotate
              key="arrows"
              className={`w-3.5 h-3.5 shrink-0 transform-gpu will-change-transform transition-colors duration-200 ${
                isRefreshing ? "text-[#7C3AED]" : "text-current"
              }`}
              style={
                isRefreshing
                  ? {
                      animation: "spin 0.7s linear infinite",
                      WebkitAnimation: "spin 0.7s linear infinite",
                      transformOrigin: "50% 50%",
                    }
                  : undefined
              }
              aria-hidden="true"
            />
          )}
        </div>

        {/* Rich Floating Plain-English Help Tooltip */}
        <div
          role="tooltip"
          className="pointer-events-none absolute right-0 top-full mt-2.5 z-50 w-64 p-3 bg-[#0F172A] text-white border border-[#334155] rounded-xs shadow-xl opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 group-focus-visible:opacity-100 group-focus-visible:translate-y-0 transition-all duration-150 select-none text-left"
        >
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="font-admin-mono text-[10px] uppercase font-bold tracking-wider text-[#CBACF9]">
              Global Revalidation
            </span>
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isRefreshing
                  ? "bg-[#7C3AED] animate-ping"
                  : status === "success"
                  ? "bg-[#10B981]"
                  : status === "error"
                  ? "bg-[#EF4444]"
                  : "bg-[#94A3B8]"
              }`}
            />
          </div>
          <p className="font-admin-sans text-[11px] leading-relaxed text-[#CBD5E1]">
            {isRefreshing
              ? "Purging server-side Next.js caches & synchronizing all open tabs in real-time…"
              : status === "success"
              ? "Global cache purge & live site sync completed successfully."
              : status === "error"
              ? errorMessage || "Revalidation encountered an error."
              : "Purges server-side caches and synchronizes all open tabs with the latest database state."}
          </p>

          {/* Micro arrow indicator pointing to button */}
          <div className="absolute -top-1 right-3 w-2 h-2 bg-[#0F172A] border-t border-l border-[#334155] rotate-45 pointer-events-none" />
        </div>
      </button>
    </div>
  );
};


