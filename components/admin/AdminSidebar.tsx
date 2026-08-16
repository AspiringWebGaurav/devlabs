"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { FaChevronDown, FaChevronUp } from "react-icons/fa6";

const NAV_LINKS = [
  { num: "01", label: "Database Wipe", href: "/admin" },
];

export const AdminSidebar: React.FC = () => {
  const pathname = usePathname();
  const containerRef = useRef<HTMLElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const [canScrollDown, setCanScrollDown] = useState(false);
  const [canScrollUp, setCanScrollUp] = useState(false);

  const updateScrollState = useCallback(() => {
    const container = containerRef.current;
    const nav = navRef.current;
    if (!container || !nav) return;

    const lastItem = nav.lastElementChild as HTMLElement | null;
    if (!lastItem) {
      setCanScrollDown(false);
      setCanScrollUp(false);
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const lastItemRect = lastItem.getBoundingClientRect();

    // Has more content below only if the bottom of the last item is below the visible container bottom
    const hasMoreBelow = lastItemRect.bottom > containerRect.bottom + 6;
    const hasMoreAbove = container.scrollTop > 10;

    setCanScrollDown(hasMoreBelow);
    setCanScrollUp(hasMoreAbove);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    updateScrollState();
    container.addEventListener("scroll", updateScrollState, { passive: true });

    const ro = new ResizeObserver(updateScrollState);
    ro.observe(container);

    window.addEventListener("resize", updateScrollState);

    return () => {
      container.removeEventListener("scroll", updateScrollState);
      ro.disconnect();
      window.removeEventListener("resize", updateScrollState);
    };
  }, [updateScrollState]);

  return (
    <div className="relative w-full lg:w-60 shrink-0 lg:h-full flex flex-col bg-white border-b lg:border-b-0 lg:border-r border-[#E5E7EB] font-admin-sans overflow-hidden">
      {/* Dynamic Top Scroll Indicator */}
      <div
        className={cn(
          "pointer-events-none absolute top-0 left-0 right-0 z-20 h-10 bg-gradient-to-b from-white via-white/80 to-transparent flex items-center justify-center pt-1 transition-opacity duration-300",
          canScrollUp ? "opacity-100" : "opacity-0"
        )}
      >
        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/95 border border-[#E5E5E5] shadow-xs text-[9px] font-admin-mono text-[#737373]">
          <FaChevronUp className="w-2 h-2 text-[#A855F7] animate-pulse" />
          <span>TOP</span>
        </div>
      </div>

      {/* Main Scrollable Nav List */}
      <aside
        ref={containerRef}
        className="w-full h-full overflow-y-auto p-4 sm:p-6 scroll-smooth"
      >
        <div>
          <p className="text-[10px] font-admin-mono tracking-widest text-[#737373] uppercase mb-3 px-2 font-medium">
            Navigation
          </p>
          <nav ref={navRef} className="flex flex-wrap lg:flex-col gap-1">
            {NAV_LINKS.map((link) => {
              const isActive =
                link.href === "/admin"
                  ? pathname === "/admin"
                  : pathname === link.href || pathname.startsWith(link.href + "/");

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2 rounded-sm text-xs font-admin-mono font-medium transition-all",
                    isActive
                      ? "bg-black text-white shadow-sm"
                      : "text-[#525252] hover:bg-[#F5F5F5] hover:text-black"
                  )}
                >
                  <span className={cn("text-[10px] opacity-60", isActive && "text-white/70")}>
                    {link.num}.
                  </span>
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Dynamic Bottom Scroll Indicator & Animation */}
      <div
        className={cn(
          "pointer-events-none absolute bottom-0 left-0 right-0 z-20 h-14 bg-gradient-to-t from-white via-white/80 to-transparent flex items-end justify-center pb-2.5 transition-opacity duration-300",
          canScrollDown ? "opacity-100" : "opacity-0"
        )}
      >
        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/95 border border-[#E5E5E5] shadow-xs text-[9px] font-admin-mono text-[#525252] animate-bounce">
          <span className="tracking-wider">MORE</span>
          <FaChevronDown className="w-2 h-2 text-[#A855F7]" />
        </div>
      </div>
    </div>
  );
};
