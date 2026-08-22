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

/**
 * Screen-Adaptive Lazy Section Controller
 * - On Mobile (< 768px): Uses a conservative 200px viewport margin to conserve cellular data and CPU.
 * - On Desktop (>= 768px): Uses an anticipatory 500px viewport margin to pre-warm 3D visual shaders.
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
  const [isVisible, setIsVisible] = useState(false);
  const [hasRendered, setHasRendered] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check if directly loaded via deep-link URL (e.g. /projects, /about, /testimonials, /contact)
    if (id) {
      const currentPath = window.location.pathname.replace(/^\//, "").replace(/^#/, "");
      if (currentPath === id || window.location.hash === `#${id}`) {
        setIsVisible(true);
        setHasRendered(true);
        return;
      }
    }

    // Listen for custom navigation scroll events from FloatingNav or Hero buttons
    const handleNavStart = (e: Event) => {
      const customEvent = e as CustomEvent<{ link?: string }>;
      const link = customEvent.detail?.link || "";
      const targetId = link.replace(/^\//, "").replace(/^#/, "");
      if (id && targetId === id) {
        setIsVisible(true);
        setHasRendered(true);
      }
    };

    window.addEventListener("nav-scroll-start", handleNavStart);

    // Adaptive viewport detection
    const isMobile = window.innerWidth < 768;
    const rootMargin = isMobile ? "200px 0px" : "500px 0px";

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          setHasRendered(true);
          observer.disconnect();
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
    };
  }, [id]);

  return (
    <div
      ref={containerRef}
      id={id}
      style={{ minHeight: !hasRendered ? minHeight : undefined }}
      className={cn("w-full transition-opacity duration-500 ease-out", className, {
        "opacity-100": isVisible,
        "opacity-0": !isVisible && !hasRendered,
      })}
    >
      {hasRendered ? (
        children
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
