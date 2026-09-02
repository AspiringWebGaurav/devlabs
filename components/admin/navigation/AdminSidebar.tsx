"use client";

import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FaCompass,
  FaHeading,
  FaTableCellsLarge,
  FaFolderOpen,
  FaQuoteRight,
  FaBuilding,
  FaBriefcase,
  FaDiagramProject,
  FaBars,
  FaShareNodes,
  FaBullhorn,
  FaCopyright,
  FaMagnifyingGlass,
  FaImages,
  FaEnvelope,
  FaPaperPlane,
  FaCommentDots,
  FaShieldHalved,
  FaRotate,
  FaRightFromBracket,
  FaWhatsapp,
} from "react-icons/fa6";

import { useAdminSession } from "@/components/admin/context";
import { AdminProfileCard } from "@/components/admin/profile";
import { SignOutOverlay } from "@/components/admin/auth/SignOutOverlay";
import { ButtonHelpBadge } from "@/components/admin/ui/ButtonHelpTooltip";
import { BUTTON_HELP } from "@/lib/admin/constants/button-help";


// Module-level persistent cache across React unmount/remount cycles during App Router transitions
let cachedSidebarScroll = 0;

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export const AdminSidebar: React.FC = () => {
  const pathname = usePathname();
  const { user, signOut } = useAdminSession();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const navScrollRef = useRef<HTMLDivElement | null>(null);
  const activeItemRef = useRef<HTMLAnchorElement | null>(null);

  // Synchronous restoration helper
  const restoreScrollPosition = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    let target = cachedSidebarScroll;
    if (target === 0 && typeof window !== "undefined") {
      try {
        const saved = sessionStorage.getItem("admin_sidebar_scroll");
        if (saved) target = Number(saved) || 0;
      } catch {}
    }

    if (target > 0) {
      node.scrollTop = target;
    }
  }, []);

  // Frame-0 Callback Ref: Sets scrollTop synchronously upon DOM node instantiation before browser paint
  const setNavScrollRef = useCallback(
    (node: HTMLDivElement | null) => {
      navScrollRef.current = node;
      restoreScrollPosition(node);
    },
    [restoreScrollPosition]
  );

  // Layout effect to guarantee scroll lock & handle direct deep links
  useIsomorphicLayoutEffect(() => {
    if (navScrollRef.current) {
      let target = cachedSidebarScroll;
      if (target === 0 && typeof window !== "undefined") {
        try {
          const saved = sessionStorage.getItem("admin_sidebar_scroll");
          if (saved) target = Number(saved) || 0;
        } catch {}
      }

      if (target > 0) {
        navScrollRef.current.scrollTop = target;
      } else if (activeItemRef.current) {
        // Direct initial landing without prior scroll history: bring active item into view instantly
        activeItemRef.current.scrollIntoView({ block: "nearest" });
      }
    }
  }, [pathname]);

  const recordScroll = (pos: number) => {
    cachedSidebarScroll = pos;
    try {
      sessionStorage.setItem("admin_sidebar_scroll", String(pos));
    } catch {}
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    recordScroll(e.currentTarget.scrollTop);
  };

  const handleNavClick = () => {
    if (navScrollRef.current) {
      recordScroll(navScrollRef.current.scrollTop);
    }
  };

  const handleInitiateSignOut = () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
  };

  const handleExecuteSignOut = async () => {
    await signOut();
  };

  const overviewItems = [
    {
      id: "00",
      label: "Command Hub",
      href: "/admin",
      icon: FaCompass,
    },
  ];

  const cmsItems = [
    { id: "01", label: "Hero & Bio", href: "/admin/hero", icon: FaHeading },
    { id: "02", label: "Bento Cards", href: "/admin/cards", icon: FaTableCellsLarge },
    { id: "03", label: "Projects", href: "/admin/projects", icon: FaFolderOpen },
    { id: "04", label: "Testimonials", href: "/admin/testimonials", icon: FaQuoteRight },
    { id: "05", label: "Client Logos", href: "/admin/clients", icon: FaBuilding },
    { id: "06", label: "Experience", href: "/admin/experience", icon: FaBriefcase },
    { id: "07", label: "Approach Phases", href: "/admin/approach", icon: FaDiagramProject },
    { id: "08", label: "Navigation", href: "/admin/navigation", icon: FaBars },
    { id: "09", label: "Social Links", href: "/admin/social", icon: FaShareNodes },
    { id: "10", label: "Call to Action", href: "/admin/cta", icon: FaBullhorn },
    { id: "11", label: "Footer", href: "/admin/footer", icon: FaCopyright },
    { id: "12", label: "SEO & Metadata", href: "/admin/seo", icon: FaMagnifyingGlass },
    { id: "13", label: "Assistant", href: "/admin/assistant", icon: FaCommentDots },
  ];

  const opsItems = [
    { id: "14", label: "Media Assets", href: "/admin/media", icon: FaImages },
    { id: "15", label: "Inquiries & Leads", href: "/admin/inquiries", icon: FaEnvelope },
    { id: "16", label: "Mail Center", href: "/admin/mail", icon: FaPaperPlane },
    { id: "17", label: "Cloudflare Security", href: "/admin/cloudflare", icon: FaShieldHalved },
    { id: "18", label: "Database Reset", href: "/admin/purge", icon: FaRotate },
    { id: "19", label: "WhatsApp Recruiter", href: "/admin/whatsapp", icon: FaWhatsapp },
  ];

  const isProfileActive = pathname === "/admin/profile";

  const renderNavGroup = (title: string, items: typeof cmsItems) => (
    <div className="space-y-1.5">
      <span className="font-admin-mono text-xs uppercase tracking-[0.18em] text-[#64748B] font-bold block mb-2 px-1">
        {title}
      </span>
      <nav className="space-y-1">
        {items.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.id}
              ref={isActive ? activeItemRef : null}
              href={item.href}
              onClick={handleNavClick}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-sm text-xs sm:text-[13px] font-admin-mono transition-all duration-150 border ${
                isActive
                  ? "bg-[#F8FAFC] border-[#E2E8F0] text-black font-semibold shadow-2xs"
                  : "border-transparent text-[#475569] hover:text-black hover:bg-[#F8FAFC] hover:border-[#F1F5F9]"
              }`}
            >
              <span
                className={`text-xs font-semibold shrink-0 ${
                  isActive ? "text-[#7C3AED]" : "text-[#64748B]"
                }`}
              >
                {item.id}.
              </span>
              <span className="flex-1 truncate">{item.label}</span>
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-[#7C3AED]" : "text-[#94A3B8]"}`} />
            </Link>
          );
        })}
      </nav>
    </div>
  );

  return (
    <aside className="w-full md:w-68 lg:w-72 bg-[#FFFFFF] border-r border-[#E5E7EB] shrink-0 flex flex-col md:sticky md:top-[57px] md:h-[calc(100vh-57px)] select-none">
      {/* 1. Scrollable Navigation Menu Area (Instant Frame-0 persistent locking without animation shake) */}
      <div
        ref={setNavScrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto min-h-0 p-4 sm:p-5 space-y-5"
      >
        {renderNavGroup("Overview", overviewItems)}
        {renderNavGroup("Content Modules", cmsItems)}
        {renderNavGroup("Operations", opsItems)}
      </div>

      {/* 2. Fixed Stationary Bottom Panel (Profile & Sign-Out never scroll away) */}
      <div className="p-4 sm:p-5 border-t border-[#E5E7EB] bg-[#FFFFFF] space-y-3 shrink-0 z-10 shadow-2xs relative">
        <AdminProfileCard user={user} isActive={isProfileActive} onClick={handleNavClick} />

        <button
          onClick={handleInitiateSignOut}
          disabled={isSigningOut}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-3 text-xs font-admin-mono text-[#991B1B] hover:text-[#FFFFFF] bg-[#FEF2F2] hover:bg-[#DC2626] border border-[#FCA5A5] hover:border-[#DC2626] rounded-sm transition-all duration-150 cursor-pointer shadow-2xs active:scale-[0.99] disabled:opacity-60"
        >
          {isSigningOut ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-[#991B1B] border-t-transparent rounded-full animate-spin shrink-0" />
              <span className="font-semibold uppercase tracking-wider text-[11px]">
                Signing Out...
              </span>
            </>
          ) : (
            <>
              <FaRightFromBracket className="w-3.5 h-3.5 shrink-0" />
              <span className="font-semibold uppercase tracking-wider text-[11px]">
                Sign Out
              </span>
              <ButtonHelpBadge text={BUTTON_HELP.SIGN_OUT} position="right" />
            </>
          )}
        </button>

      </div>

      {/* Dynamic Smooth Balanced Sign-Out Overlay */}
      <SignOutOverlay isOpen={isSigningOut} onComplete={handleExecuteSignOut} />
    </aside>
  );

};

