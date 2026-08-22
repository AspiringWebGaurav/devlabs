"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  FaChevronDown,
  FaChevronUp,
  FaArrowRightFromBracket,
  FaUserGear,
} from "react-icons/fa6";
import { AdminUser } from "@/types/admin";
import { useAdminSignOut, SignOutModal } from "@/components/admin/SignOutModal";

const NAV_LINKS = [
  { num: "01", label: "Database Services", href: "/admin" },
  { num: "02", label: "Admin Profile & Security", href: "/admin/settings" },
  { num: "03", label: "Data Export & Intelligence", href: "/admin/export" },
];

interface AdminSidebarProps {
  user?: AdminUser | null;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ user }) => {
  const pathname = usePathname();
  const containerRef = useRef<HTMLElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const [canScrollDown, setCanScrollDown] = useState(false);
  const [canScrollUp, setCanScrollUp] = useState(false);

  // Sign out engine
  const { isSigningOut, signOutStep, signOutPercent, startSignOut } = useAdminSignOut();

  const isSettingsActive = pathname === "/admin/settings" || pathname.startsWith("/admin/settings/");

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
    <>
      {/* High-Security Sign-Out Fullscreen Frosted Blank Glass Overlay */}
      <SignOutModal
        isOpen={isSigningOut}
        step={signOutStep}
        percent={signOutPercent}
      />

      {/* Main Sidebar Shell */}
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
          className="w-full flex-1 overflow-y-auto p-4 sm:p-6 scroll-smooth"
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
            "pointer-events-none absolute bottom-[76px] left-0 right-0 z-20 h-10 bg-gradient-to-t from-white via-white/80 to-transparent flex items-end justify-center pb-1 transition-opacity duration-300",
            canScrollDown ? "opacity-100" : "opacity-0"
          )}
        >
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/95 border border-[#E5E5E5] shadow-xs text-[9px] font-admin-mono text-[#525252] animate-bounce">
            <span className="tracking-wider">MORE</span>
            <FaChevronDown className="w-2 h-2 text-[#A855F7]" />
          </div>
        </div>

        {/* Bottom-Pinned Administrator Profile Card - Navigates directly to right-side window tab */}
        <div className="border-t border-[#E5E7EB] bg-[#FAFAFA] p-2.5 shrink-0 select-none">
          <div className="flex items-center justify-between gap-1.5">
            {/* Direct Navigation Trigger to Admin Settings / Profile in main window */}
            <Link
              href="/admin/settings"
              title="Open Administrator Profile & Security in right-side window"
              className={cn(
                "flex-1 flex items-center gap-2 p-1.5 rounded-md border transition-all duration-150 text-left group min-w-0",
                isSettingsActive
                  ? "bg-black text-white border-black shadow-xs"
                  : "hover:bg-white border-transparent hover:border-[#E2E8F0] text-slate-900"
              )}
            >
              {/* Avatar with Online Indicator */}
              <div className="relative shrink-0">
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold font-admin-mono shadow-xs border transition-transform group-hover:scale-105",
                    isSettingsActive
                      ? "bg-white text-black border-white/20"
                      : "bg-slate-950 text-white border-slate-200"
                  )}
                >
                  <span className="text-[#EA4335] font-black font-sans text-xs">G</span>
                </div>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white" />
              </div>

              {/* User Identity Info */}
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "text-xs font-bold tracking-tight truncate font-admin-sans leading-tight transition-colors",
                    isSettingsActive ? "text-white" : "text-slate-900 group-hover:text-purple-700"
                  )}
                >
                  {user?.name || "Gaurav patil"}
                </p>
                <div className="flex items-center gap-1 mt-0.5">
                  <span
                    className={cn(
                      "text-[9px] font-admin-mono leading-none",
                      isSettingsActive ? "text-white/70" : "text-[#737373]"
                    )}
                  >
                    SUPER ADMIN
                  </span>
                  <FaUserGear
                    className={cn(
                      "w-2.5 h-2.5",
                      isSettingsActive ? "text-purple-300" : "text-purple-600 opacity-60 group-hover:opacity-100"
                    )}
                  />
                </div>
              </div>
            </Link>

            {/* Quick Sign Out Action Button */}
            <button
              type="button"
              onClick={startSignOut}
              disabled={isSigningOut}
              title="Sign out of Admin Session"
              className="flex items-center gap-1 px-2 py-1.5 rounded-md bg-white hover:bg-rose-50 border border-[#E2E8F0] hover:border-rose-200 text-slate-600 hover:text-rose-600 transition-all duration-150 text-xs font-admin-mono font-medium shadow-xs cursor-pointer active:scale-95 shrink-0"
            >
              <FaArrowRightFromBracket className="w-3 h-3 text-rose-500" />
              <span className="text-[10.5px]">Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
