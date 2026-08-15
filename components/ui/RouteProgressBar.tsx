"use client";

import React, { useEffect, useState, useRef, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";

function ProgressBarInternal() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const activeUrlRef = useRef<string>("");
  const fallbackTimerRef = useRef<NodeJS.Timeout | null>(null);

  const startProgress = () => {
    if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
    setIsFinishing(false);
    setIsVisible(true);
    setProgress(0);

    // Immediate micro-tick to initiate smooth continuous glide
    requestAnimationFrame(() => {
      setProgress(75);
    });

    // If route takes longer, gently ease towards 92%
    fallbackTimerRef.current = setTimeout(() => {
      setProgress(92);
    }, 1200);
  };

  const completeProgress = () => {
    if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
    setIsFinishing(true);
    setProgress(100);

    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => {
        setProgress(0);
        setIsFinishing(false);
      }, 250);
    }, 250);

    return () => clearTimeout(timer);
  };

  // Trigger completion on route changes
  useEffect(() => {
    const currentUrl = `${pathname}${searchParams ? `?${searchParams.toString()}` : ""}`;
    if (activeUrlRef.current && activeUrlRef.current !== currentUrl) {
      completeProgress();
    }
    activeUrlRef.current = currentUrl;
  }, [pathname, searchParams]);

  // Intercept internal navigation clicks
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleLinkClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("a");
      if (!target) return;

      const href = target.getAttribute("href");
      if (!href) return;

      if (
        href.startsWith("http") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        href.startsWith("#") ||
        target.getAttribute("target") === "_blank" ||
        e.ctrlKey ||
        e.metaKey ||
        e.shiftKey ||
        e.altKey
      ) {
        return;
      }

      const currentPath = window.location.pathname;
      const targetPath = href.split("?")[0].split("#")[0];

      if (targetPath && targetPath !== currentPath) {
        startProgress();
      }
    };

    document.addEventListener("click", handleLinkClick, { capture: true });
    return () => {
      document.removeEventListener("click", handleLinkClick, { capture: true });
      if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
    };
  }, []);

  if (!isVisible && progress === 0) return null;

  // Single fluid transition curve
  const transitionStyle = isFinishing
    ? "width 250ms cubic-bezier(0.4, 0, 0.2, 1), opacity 250ms ease-out"
    : progress <= 75
    ? "width 1200ms cubic-bezier(0.16, 1, 0.3, 1), opacity 200ms ease-in"
    : "width 3000ms cubic-bezier(0.25, 1, 0.5, 1), opacity 200ms ease-in";

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[99999] pointer-events-none overflow-hidden"
      style={{
        opacity: isVisible ? 1 : 0,
        transition: "opacity 250ms ease-out",
      }}
      aria-hidden="true"
    >
      {/* Ambient Purple Glow Halo */}
      <div
        className="absolute top-0 left-0 h-[8px] sm:h-[10px] bg-[#CBACF9]/30 blur-[5px] rounded-r-full pointer-events-none"
        style={{
          width: `${progress}%`,
          transition: transitionStyle,
        }}
      />

      {/* Main Clean Signature Portfolio Purple Beam */}
      <div
        className="h-[3.5px] sm:h-[4px] bg-gradient-to-r from-[#A855F7] via-[#CBACF9] to-[#F3E8FF] rounded-r-full pointer-events-none"
        style={{
          width: `${progress}%`,
          transition: transitionStyle,
          boxShadow:
            "0 0 16px #CBACF9, 0 0 8px #CBACF9, 0 0 28px rgba(203, 172, 249, 0.85)",
        }}
      />
    </div>
  );
}

export const RouteProgressBar = () => {
  return (
    <Suspense fallback={null}>
      <ProgressBarInternal />
    </Suspense>
  );
};
