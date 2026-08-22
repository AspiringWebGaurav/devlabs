"use client";
import React, { JSX, useState, useEffect } from "react";
import {
  motion,
  AnimatePresence,
  useScroll,
  useMotionValueEvent,
} from "motion/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

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

  // Auto-scroll to section on direct URL load (e.g. /about, /projects, /testimonials, /contact)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const section = window.location.pathname.replace(/^\//, "").replace(/^#/, "");
      if (
        section &&
        ["about", "projects", "testimonials", "contact"].includes(section)
      ) {
        const timeoutId = setTimeout(() => {
          const element = document.getElementById(section);
          if (element) {
            element.scrollIntoView({ behavior: "smooth" });
          }
        }, 300);
        return () => clearTimeout(timeoutId);
      }
    }
  }, []);

  // Real-time Scroll-Spy to sync URL with visible section (only on home routes)
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (pathname && pathname.startsWith("/blog")) return;

    let isNavigating = false;
    let navigatingTimeout: NodeJS.Timeout;
    let ticking = false;

    const handleScroll = () => {
      if (isNavigating || ticking) return;
      ticking = true;

      requestAnimationFrame(() => {
        ticking = false;
        if (isNavigating) return;

        const scrollY = window.scrollY;
        if (scrollY < 200) {
          if (
            window.location.pathname !== "/" &&
            !window.location.pathname.startsWith("/blog")
          ) {
            window.history.replaceState(null, "", "/");
          }
          return;
        }

        const sectionIds = ["about", "projects", "testimonials", "contact"];
        const trigger = window.innerHeight * 0.35; // 35% from top of viewport

        const isAtBottom =
          window.innerHeight + window.scrollY >=
          document.documentElement.scrollHeight - 80;

        let currentSection = "";

        if (isAtBottom) {
          currentSection = "contact";
        } else {
          // Track the lowest section whose top has scrolled past the trigger point
          for (const id of sectionIds) {
            const el = document.getElementById(id);
            if (el) {
              const rect = el.getBoundingClientRect();
              if (rect.top <= trigger) {
                currentSection = id;
              }
            }
          }
        }

        if (currentSection) {
          const targetPath = `/${currentSection}`;
          if (window.location.pathname !== targetPath) {
            window.history.replaceState(null, "", targetPath);
          }
        }
      });
    };

    const onNavClickCustom = () => {
      isNavigating = true;
      clearTimeout(navigatingTimeout);
      navigatingTimeout = setTimeout(() => {
        isNavigating = false;
      }, 900);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("nav-scroll-start", onNavClickCustom);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("nav-scroll-start", onNavClickCustom);
      clearTimeout(navigatingTimeout);
    };
  }, [pathname]);

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

  const handleNavClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    link: string
  ) => {
    if (link === "/blog" || link.startsWith("/blog")) {
      return;
    }

    const sectionId = link.replace(/^\//, "").replace(/^#/, "");
    const isHomePage =
      pathname === "/" ||
      ["/about", "/projects", "/testimonials", "/contact"].includes(pathname);

    if (isHomePage) {
      const element = document.getElementById(sectionId);
      if (element) {
        e.preventDefault();
        window.dispatchEvent(
          new CustomEvent("nav-scroll-start", { detail: { link } })
        );
        element.scrollIntoView({ behavior: "smooth" });
        window.history.replaceState(null, "", link);
      }
    } else {
      e.preventDefault();
      router.push(`/#${sectionId}`);
    }
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{
          opacity: 1,
          y: -100,
        }}
        animate={{
          y: visible ? 0 : -100,
          opacity: visible ? 1 : 0,
        }}
        transition={{
          duration: 0.2,
        }}
        className={cn(
          "flex max-w-fit fixed z-[5000] top-10 inset-x-0 mx-auto px-10 py-5 rounded-lg border border-black/.1 shadow-[0px_2px_3px_-1px_rgba(0,0,0,0.1),0px_1px_0px_0px_rgba(25,28,33,0.02),0px_0px_0px_1px_rgba(25,28,33,0.08)] items-center justify-center space-x-4",
          "hover:shadow-[0_8px_32px_0_rgba(31,38,135,0.37)] transition-shadow duration-300",
          className
        )}
        style={{
          backdropFilter: "blur(30px) saturate(150%)",
          backgroundColor: "rgba(255, 255, 255, 0.025)",
          borderRadius: "16px",
          border: "1px solid rgba(255, 255, 255, 0.15)",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
        }}
      >
        {navItems.map((navItem, idx: number) => (
          <Link
            key={`nav-link-${idx}-${navItem.name}`}
            href={navItem.link}
            onClick={(e) => handleNavClick(e, navItem.link)}
            className={cn(
              "relative dark:text-neutral-50 items-center flex space-x-1 text-neutral-600 dark:hover:text-neutral-300 hover:text-neutral-500"
            )}
          >
            {navItem.icon && <span className="block sm:hidden">{navItem.icon}</span>}
            <span className="text-sm !cursor-pointer">{navItem.name}</span>
          </Link>
        ))}
      </motion.div>
    </AnimatePresence>
  );
};

