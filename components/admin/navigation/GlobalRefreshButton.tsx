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
      // 1. Execute Server Action (Cache Invalidation & Realtime Dual-Channel Signaling)
      const res = await globalNuclearRefreshAction();

      // Ensure minimum visible animation time (700ms) so fast spin is visibly perceived
      const elapsed = Date.now() - startTime;
      if (elapsed < 700) {
        await new Promise((resolve) => setTimeout(resolve, 700 - elapsed));
      }

      if (!isMountedRef.current) return;

      if (res.success && res.data) {
        // 2. Local Same-Origin Cross-Tab Synchronization
        broadcastClientCmsChange("all", res.data.timestamp);

        // 3. React 19 App Router Server Component Refresh Transition
        startTransition(() => {
          router.refresh();
        });

        setStatus("success");
        resetTimerRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            setStatus("idle");
          }
        }, 1800);
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
      if (elapsed < 700) {
        await new Promise((resolve) => setTimeout(resolve, 700 - elapsed));
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

  const getTooltip = () => {
    if (isRefreshing) return "Refreshing Admin & Live Portfolio…";
    if (status === "success") return "Global Refresh Completed";
    if (status === "error") return errorMessage ? `Refresh Failed: ${errorMessage}` : "Refresh Failed — Click to retry";
    return "Global Nuclear Refresh • Revalidate all caches and sync live site";
  };

  const getAriaLiveText = () => {
    if (isRefreshing) return "Refreshing application state and synchronizing live portfolio...";
    if (status === "success") return "Global refresh completed successfully.";
    if (status === "error") return `Global refresh failed: ${errorMessage || "Unknown error"}`;
    return "Global refresh ready.";
  };

  return (
    <button
      type="button"
      onClick={handleRefresh}
      disabled={isRefreshing}
      title={getTooltip()}
      aria-label={getTooltip()}
      aria-busy={isRefreshing}
      aria-disabled={isRefreshing}
      className={`relative group w-8 h-8 rounded-sm shrink-0 border flex items-center justify-center select-none outline-hidden transition-all duration-150 focus-visible:ring-2 focus-visible:ring-[#7C3AED] focus-visible:ring-offset-1 focus-visible:ring-offset-[#FFFFFF] ${
        isRefreshing
          ? "bg-[#F5F3FF] border-[#C4B5FD] text-[#7C3AED] shadow-2xs cursor-wait pointer-events-none"
          : status === "success"
          ? "bg-[#F0FDF4] border-[#86EFAC] text-[#16A34A] shadow-2xs"
          : status === "error"
          ? "bg-[#FEF2F2] border-[#FCA5A5] text-[#DC2626] shadow-2xs"
          : "bg-[#FFFFFF] hover:bg-[#F8FAFC] active:scale-[0.94] border-[#E2E8F0] hover:border-[#CBD5E1] text-[#64748B] hover:text-[#0F172A] shadow-2xs cursor-pointer"
      }`}
    >
      {/* Screen Reader Announcement for Live Status Changes */}
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {getAriaLiveText()}
      </span>

      {/* Dynamic Micro-Radar Halo while Active Refreshing */}
      {isRefreshing && (
        <span
          className="absolute inset-0 rounded-sm bg-[#7C3AED]/20 animate-ping opacity-40 pointer-events-none motion-reduce:hidden"
          aria-hidden="true"
        />
      )}

      {/* Dynamic Icon States with Fast Smooth Spin & Pop Transition */}
      {isRefreshing ? (
        <FaArrowsRotate
          className="w-3.5 h-3.5 transform-gpu animate-[spin_0.6s_linear_infinite] text-[#7C3AED] motion-reduce:animate-none motion-reduce:opacity-90"
          aria-hidden="true"
        />
      ) : status === "success" ? (
        <FaCheck
          className="w-3.5 h-3.5 text-[#16A34A] animate-in zoom-in-75 fade-in duration-200"
          aria-hidden="true"
        />
      ) : status === "error" ? (
        <FaXmark
          className="w-3.5 h-3.5 text-[#DC2626] animate-in zoom-in-90 fade-in duration-150"
          aria-hidden="true"
        />
      ) : (
        <FaArrowsRotate
          className="w-3.5 h-3.5 text-[#64748B] group-hover:text-[#0F172A] group-hover:rotate-180 transition-transform duration-300 ease-out"
          aria-hidden="true"
        />
      )}
    </button>
  );
};
