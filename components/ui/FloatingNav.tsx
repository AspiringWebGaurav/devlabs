"use client";
import React, { JSX, useState, useEffect } from "react";
import {
  motion,
  AnimatePresence,
  useScroll,
  useMotionValueEvent,
} from "motion/react";
import Link from "next/link";
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
  const { scrollYProgress } = useScroll();

  // set true for the initial state so that nav bar is visible in the hero section
  const [visible, setVisible] = useState(true);

  // Auto-scroll to section on direct URL load (e.g. /about, /projects)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const pathname = window.location.pathname.replace(/^\//, "");
      if (pathname) {
        const timeoutId = setTimeout(() => {
          const element = document.getElementById(pathname);
          if (element) {
            element.scrollIntoView({ behavior: "smooth" });
          }
        }, 300);
        return () => clearTimeout(timeoutId);
      }
    }
  }, []);

  // Real-time Scroll-Spy to sync URL with visible section
  useEffect(() => {
    if (typeof window === "undefined") return;

    let isNavigating = false;
    let navigatingTimeout: NodeJS.Timeout;

    const handleScroll = () => {
      if (isNavigating) return;

      const scrollY = window.scrollY;
      if (scrollY < 250) {
        if (window.location.pathname !== "/") {
          window.history.replaceState(null, "", "/");
        }
        return;
      }

      const viewportMiddle = scrollY + window.innerHeight / 3;
      const sectionIds = ["about", "projects", "testimonials", "contact"];

      let currentSection = "";
      for (const id of sectionIds) {
        const el = document.getElementById(id);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (viewportMiddle >= top && viewportMiddle < top + height) {
            currentSection = id;
            break;
          }
        }
      }

      if (currentSection) {
        const targetPath = `/${currentSection}`;
        if (window.location.pathname !== targetPath) {
          window.history.replaceState(null, "", targetPath);
        }
      }
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
  }, []);

  useMotionValueEvent(scrollYProgress, "change", (current) => {
    // Check if current is not undefined and is a number
    if (typeof current === "number") {
      const prev = scrollYProgress.getPrevious() ?? 0;
      const direction = current - prev;

      if (current < 0.05) {
        // also set true for the initial state
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
    e.preventDefault();
    const sectionId = link.replace(/^\//, "").replace(/^#/, "");
    const element = document.getElementById(sectionId);
    if (element) {
      window.dispatchEvent(
        new CustomEvent("nav-scroll-start", { detail: { link } })
      );
      element.scrollIntoView({ behavior: "smooth" });
      window.history.replaceState(null, "", link);
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
          "flex max-w-fit md:min-w-[70vw] lg:min-w-fit fixed z-[5000] top-10 inset-x-0 mx-auto px-10 py-5 rounded-lg border border-black/.1 shadow-[0px_2px_3px_-1px_rgba(0,0,0,0.1),0px_1px_0px_0px_rgba(25,28,33,0.02),0px_0px_0px_1px_rgba(25,28,33,0.08)] items-center justify-center space-x-4",
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
            <span className="block sm:hidden">{navItem.icon}</span>
            <span className="text-sm !cursor-pointer">{navItem.name}</span>
          </Link>
        ))}
      </motion.div>
    </AnimatePresence>
  );
};
