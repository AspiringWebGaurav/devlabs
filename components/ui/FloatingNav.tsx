"use client";

import React, { JSX, useState, useEffect, useRef, useCallback } from "react";
import {
  motion,
  AnimatePresence,
  useScroll,
  useMotionValueEvent,
} from "motion/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

const SECTIONS = ["about", "projects", "testimonials", "experience", "approach", "contact"] as const;

export const FloatingNav = ({
  navItems,
  className,
}: {
  navItems: {
    name: string;
    link: string;
    icon?: JSX.Element;
  }[];
  className?: string;
}) => {
  const pathname = usePathname();
  const router = useRouter();
  const { scrollYProgress } = useScroll();

  // set true for the initial state so that nav bar is visible in the hero section
  const [visible, setVisible] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const isNavigatingRef = useRef(false);
  const navigationTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Listen for Contact Modal open/close state to dynamically hide navbar
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleModalState = (e: Event) => {
      const customEvent = e as CustomEvent<{ isOpen?: boolean }>;
      setIsModalOpen(!!customEvent.detail?.isOpen);
    };

    window.addEventListener("contact-modal-state", handleModalState);
    return () => window.removeEventListener("contact-modal-state", handleModalState);
  }, []);

  // =========================================================================
  // 1. Layout-Stabilized Auto-Scroll on Direct Load & Hard Refresh
  // =========================================================================
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Prevent browser native scroll restore from fighting dynamic React layout
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }

    const currentSection = window.location.pathname.replace(/^\//, "").replace(/^#/, "");
    if (!currentSection || !SECTIONS.includes(currentSection as typeof SECTIONS[number])) {
      return;
    }

    // Lock scroll-spy during initial glide
    isNavigatingRef.current = true;

    // Pre-hydrate target section and preceding sections
    window.dispatchEvent(
      new CustomEvent("nav-scroll-start", { detail: { link: `/${currentSection}` } })
    );

    const scrollToTarget = () => {
      if (currentSection === "contact") {
        window.scrollTo({
          top: document.documentElement.scrollHeight,
          behavior: "smooth",
        });
      } else {
        const el = document.getElementById(currentSection);
        if (el) {
          const navOffset = window.innerWidth < 768 ? 60 : 75;
          const targetY = el.getBoundingClientRect().top + window.scrollY - navOffset;
          window.scrollTo({
            top: Math.max(0, targetY),
            behavior: "smooth",
          });
        }
      }
    };

    // Staggered multi-frame alignment as heavy dynamic chunks (WebGL / Canvas) hydrate
    const t1 = setTimeout(scrollToTarget, 80);
    const t2 = setTimeout(scrollToTarget, 280);
    const t3 = setTimeout(scrollToTarget, 650);
    const t4 = setTimeout(scrollToTarget, 1100);

    const unlockTimer = setTimeout(() => {
      isNavigatingRef.current = false;
    }, 1400);

    // Dynamic Height Observer: Re-anchor if below-the-fold layout expands during load
    let lastHeight = document.documentElement.scrollHeight;
    let resizeObserver: ResizeObserver | null = null;

    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => {
        const newHeight = document.documentElement.scrollHeight;
        if (Math.abs(newHeight - lastHeight) > 50 && isNavigatingRef.current) {
          lastHeight = newHeight;
          scrollToTarget();
        }
      });
      resizeObserver.observe(document.body);
    }

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(unlockTimer);
      if (resizeObserver) resizeObserver.disconnect();
    };
  }, []);

  // =========================================================================
  // 2. Universal Dominant-Viewport Scroll-Spy (Mobile + Tablet + Desktop)
  // =========================================================================
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (pathname && pathname.startsWith("/blog")) return;

    let ticking = false;

    const handleScroll = () => {
      if (isNavigatingRef.current || ticking) return;
      ticking = true;

      requestAnimationFrame(() => {
        ticking = false;
        if (isNavigatingRef.current) return;

        const scrollY = window.scrollY;
        const viewportHeight = window.innerHeight;
        const docHeight = document.documentElement.scrollHeight;

        // 1. Hero fold detection
        if (scrollY < 120) {
          if (window.location.pathname !== "/" && !window.location.pathname.startsWith("/blog")) {
            window.history.replaceState(null, "", "/");
          }
          return;
        }

        // 2. Absolute bottom detection (Footer / Contact view)
        if (viewportHeight + scrollY >= docHeight - 120) {
          if (window.location.pathname !== "/contact") {
            window.history.replaceState(null, "", "/contact");
          }
          return;
        }

        // 3. Dominant Section Calculation (Mathematical intersection area in viewport)
        let maxVisibleHeight = 0;
        let dominantSection = "";

        for (const id of SECTIONS) {
          const el = document.getElementById(id);
          if (el) {
            const rect = el.getBoundingClientRect();
            const visibleTop = Math.max(0, rect.top);
            const visibleBottom = Math.min(viewportHeight, rect.bottom);
            const visibleHeight = Math.max(0, visibleBottom - visibleTop);

            if (visibleHeight > maxVisibleHeight) {
              maxVisibleHeight = visibleHeight;
              dominantSection = id;
            }
          }
        }

        if (dominantSection) {
          // Map intermediate sections to primary navbar routes
          let targetPath = `/${dominantSection}`;
          if (dominantSection === "experience") targetPath = "/testimonials";
          if (dominantSection === "approach") targetPath = "/contact";

          if (window.location.pathname !== targetPath) {
            window.history.replaceState(null, "", targetPath);
          }
        }
      });
    };

    const onNavStartCustom = () => {
      isNavigatingRef.current = true;
      if (navigationTimerRef.current) clearTimeout(navigationTimerRef.current);
      navigationTimerRef.current = setTimeout(() => {
        isNavigatingRef.current = false;
      }, 1000);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("nav-scroll-start", onNavStartCustom);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("nav-scroll-start", onNavStartCustom);
      if (navigationTimerRef.current) clearTimeout(navigationTimerRef.current);
    };
  }, [pathname]);

  // =========================================================================
  // 3. Navbar Visibility & Directional Motion
  // =========================================================================
  useMotionValueEvent(scrollYProgress, "change", (current) => {
    if (typeof current === "number") {
      const prev = scrollYProgress.getPrevious() ?? 0;
      const direction = current - prev;

      if (current < 0.05) {
        setVisible(true);
      } else {
        if (direction < 0) {
          setVisible(true);
        } else {
          setVisible(false);
        }
      }
    }
  });

  // =========================================================================
  // 4. Smooth Nav Click Handler (Touch-Optimized for Mobile)
  // =========================================================================
  const handleNavClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, link: string) => {
      if (link === "/blog" || link.startsWith("/blog")) {
        return;
      }

      const sectionId = link.replace(/^\//, "").replace(/^#/, "");
      const isHomePage =
        pathname === "/" ||
        ["/about", "/projects", "/testimonials", "/experience", "/approach", "/contact"].includes(pathname);

      if (isHomePage) {
        e.preventDefault();

        // Lock scroll-spy during animated glide
        isNavigatingRef.current = true;
        if (navigationTimerRef.current) clearTimeout(navigationTimerRef.current);
        navigationTimerRef.current = setTimeout(() => {
          isNavigatingRef.current = false;
        }, 1000);

        window.dispatchEvent(
          new CustomEvent("nav-scroll-start", { detail: { link } })
        );

        if (sectionId === "contact") {
          window.scrollTo({
            top: document.documentElement.scrollHeight,
            behavior: "smooth",
          });
        } else {
          const el = document.getElementById(sectionId);
          if (el) {
            const navOffset = window.innerWidth < 768 ? 60 : 75;
            const targetY = el.getBoundingClientRect().top + window.scrollY - navOffset;
            window.scrollTo({
              top: Math.max(0, targetY),
              behavior: "smooth",
            });
          }
        }

        window.history.replaceState(null, "", link);
      } else {
        e.preventDefault();
        router.push(`/#${sectionId}`);
      }
    },
    [pathname, router]
  );

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{
          opacity: 1,
          y: -100,
        }}
        animate={{
          y: (visible && !isModalOpen) ? 0 : -100,
          opacity: (visible && !isModalOpen) ? 1 : 0,
        }}
        transition={{
          duration: 0.2,
        }}
        className={cn(
          "flex max-w-[96vw] sm:max-w-fit fixed z-[5000] top-4 sm:top-10 inset-x-0 mx-auto px-3 sm:px-6 md:px-10 py-2 sm:py-3 md:py-4 rounded-xl sm:rounded-2xl border border-white/[0.15] shadow-lg items-center justify-center space-x-1 sm:space-x-3 md:space-x-4 select-none",
          "hover:shadow-[0_8px_32px_0_rgba(31,38,135,0.37)] transition-shadow duration-300",
          className
        )}
        style={{
          backdropFilter: "blur(30px) saturate(150%)",
          WebkitBackdropFilter: "blur(30px) saturate(150%)",
          backgroundColor: "rgba(255, 255, 255, 0.025)",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.2)",
          top: "calc(1rem + env(safe-area-inset-top, 0px))",
        }}
      >
        {navItems.map((navItem, idx: number) => (
          <Link
            key={`nav-link-${idx}-${navItem.name}`}
            href={navItem.link}
            onClick={(e) => handleNavClick(e, navItem.link)}
            className={cn(
              "relative dark:text-neutral-50 items-center flex space-x-1 text-neutral-400 dark:hover:text-neutral-200 hover:text-neutral-500 touch-manipulation py-2 px-1.5 sm:px-2.5 min-h-[44px] transition-colors"
            )}
          >
            {navItem.icon && <span className="block sm:hidden">{navItem.icon}</span>}
            <span className="text-[11px] xs:text-xs sm:text-sm !cursor-pointer font-medium whitespace-nowrap">{navItem.name}</span>
          </Link>
        ))}
      </motion.div>
    </AnimatePresence>
  );
};
