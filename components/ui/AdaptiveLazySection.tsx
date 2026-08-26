"use client";

import React, { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface AdaptiveLazySectionProps {
  id?: string;
  minHeight?: string;
  className?: string;
  children: React.ReactNode;
  placeholder?: React.ReactNode;
}

const KNOWN_SECTIONS = ["about", "projects", "testimonials", "experience", "approach", "contact"];

/**
 * Screen-Adaptive Lazy Section Controller
 * - Renders skeleton placeholders with 100% immediate visibility (Zero blank space on fast scroll).
 * - On Mobile (< 768px): Uses an anticipatory 800px viewport margin to pre-fetch chunks before fast touch flings.
 * - On Desktop (>= 768px): Uses a 1000px viewport margin for instant WebGL and shader compilation.
 * - Progressive Idle Pre-Warming: Uses requestIdleCallback to quietly hydrate downstream sections in sequence.
 * - Direct deep-links & navigation events trigger immediate hydration with zero layout shift (CLS = 0).
 */
export function AdaptiveLazySection({
  id,
  minHeight = "400px",
  className,
  children,
  placeholder,
}: AdaptiveLazySectionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hasRendered, setHasRendered] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check if directly loaded via deep-link URL (e.g. /projects, /about, /testimonials, /contact) or hard refresh while scrolled
    const savedActiveSection =
      typeof sessionStorage !== "undefined"
        ? sessionStorage.getItem("portfolio_active_section")
        : null;

    if (id) {
      const currentPath = window.location.pathname.replace(/^\//, "").replace(/^#/, "");
      const targetIndex = KNOWN_SECTIONS.indexOf(currentPath);
      const savedIndex = savedActiveSection ? KNOWN_SECTIONS.indexOf(savedActiveSection) : -1;
      const currentIndex = KNOWN_SECTIONS.indexOf(id);

      if (
        currentPath === id ||
        window.location.hash === `#${id}` ||
        savedActiveSection === id ||
        (targetIndex !== -1 && currentIndex !== -1 && currentIndex <= targetIndex) ||
        (savedIndex !== -1 && currentIndex !== -1 && currentIndex <= savedIndex) ||
        window.scrollY > 150
      ) {
        setHasRendered(true);
        return;
      }
    }

    // Listen for custom navigation scroll events from FloatingNav or Hero buttons
    const handleNavStart = (e: Event) => {
      const customEvent = e as CustomEvent<{ link?: string }>;
      const link = customEvent.detail?.link || "";
      const targetId = link.replace(/^\//, "").replace(/^#/, "");
      const targetIndex = KNOWN_SECTIONS.indexOf(targetId);
      const currentIndex = KNOWN_SECTIONS.indexOf(id || "");

      if (
        (id && targetId === id) ||
        (targetIndex !== -1 && currentIndex !== -1 && currentIndex <= targetIndex)
      ) {
        setHasRendered(true);
      }
    };

    window.addEventListener("nav-scroll-start", handleNavStart);

    // Progressive idle pre-warmer: hydrate sequentially during browser idle moments
    let idleTimer: NodeJS.Timeout | null = null;
    let idleCallbackId: number | null = null;

    const sectionIndex = id ? KNOWN_SECTIONS.indexOf(id) : 0;
    const staggeredDelay = 600 + Math.max(0, sectionIndex) * 350;

    if (typeof window !== "undefined") {
      if ("requestIdleCallback" in window) {
        idleCallbackId = (window as Window & { requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => number }).requestIdleCallback(
          () => {
            idleTimer = setTimeout(() => {
              setHasRendered(true);
            }, staggeredDelay);
          },
          { timeout: 3500 }
        );
      } else {
        idleTimer = setTimeout(() => {
          setHasRendered(true);
        }, staggeredDelay);
      }
    }

    // Generous anticipatory Intersection Observer
    const isMobile = window.innerWidth < 768;
    const rootMargin = isMobile ? "800px 0px" : "1000px 0px";

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHasRendered(true);
          observer.disconnect();
          if (idleTimer) clearTimeout(idleTimer);
        }
      },
      { rootMargin }
    );

    const el = containerRef.current;
    if (el) {
      observer.observe(el);
    }

    return () => {
      observer.disconnect();
      window.removeEventListener("nav-scroll-start", handleNavStart);
      if (idleTimer) clearTimeout(idleTimer);
      if (idleCallbackId !== null && "cancelIdleCallback" in window) {
        (window as Window & { cancelIdleCallback: (id: number) => void }).cancelIdleCallback(idleCallbackId);
      }
    };
  }, [id]);

  return (
    <div
      ref={containerRef}
      id={id}
      style={{ minHeight: !hasRendered ? minHeight : undefined }}
      className={cn("w-full relative opacity-100", className)}
    >
      {hasRendered ? (
        <div className="w-full animate-in fade-in duration-300 ease-out">{children}</div>
      ) : (
        placeholder || (
          <div
            style={{ minHeight }}
            className="w-full flex items-center justify-center pointer-events-none"
          />
        )
      )}
    </div>
  );
}

export default AdaptiveLazySection;
