"use client";

import React, { useEffect, useState, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Geist, Geist_Mono } from "next/font/google";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminLoader } from "@/components/admin/AdminLoader";
import {
  getClientAdminSession,
  setClientAdminSession,
  clearClientAdminSession,
  isAuthorizedAdminEmail,
} from "@/lib/admin/auth";
import { AdminUser } from "@/types/admin";

const adminSans = Geist({
  variable: "--font-admin-sans",
  subsets: ["latin"],
});

const adminMono = Geist_Mono({
  variable: "--font-admin-mono",
  subsets: ["latin"],
});

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const lastActiveRef = useRef<number>(Date.now());

  const isLoginPage = pathname === "/admin/login";
  const isPublicLegalPage =
    pathname === "/admin/terms" ||
    pathname === "/admin/privacy" ||
    pathname === "/admin/blocked";
  const isStandalonePage = isLoginPage || isPublicLegalPage;

  // Enforce Clean Light Theme on <html> and <body> for all Admin views
  useEffect(() => {
    const htmlEl = document.documentElement;
    const bodyEl = document.body;
    htmlEl.classList.remove("dark");
    htmlEl.style.colorScheme = "light";
    bodyEl.style.backgroundColor = "#FAFAFA";
    bodyEl.style.color = "#0F172A";

    return () => {
      htmlEl.classList.add("dark");
      htmlEl.style.colorScheme = "dark";
      bodyEl.style.backgroundColor = "";
      bodyEl.style.color = "";
    };
  }, []);

  // Isolate Admin: Strip and suppress any Switchyy overlays/locks from Admin Panel
  useEffect(() => {
    const stripSwitchy = () => {
      document.documentElement.classList.remove("switchy-lock");
      document.body.classList.remove("switchy-lock");
      const overlay = document.getElementById("switchy-overlay");
      if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
      const lock = document.getElementById("switchy-early-lock");
      if (lock && lock.parentNode) lock.parentNode.removeChild(lock);
      const badge = document.getElementById("switchy-debug-badge");
      if (badge && badge.parentNode) badge.parentNode.removeChild(badge);
    };

    stripSwitchy();

    const observer = new MutationObserver(() => {
      if (
        document.getElementById("switchy-overlay") ||
        document.getElementById("switchy-early-lock") ||
        document.documentElement.classList.contains("switchy-lock") ||
        document.body.classList.contains("switchy-lock")
      ) {
        stripSwitchy();
      }
    });

    observer.observe(document.documentElement, { attributes: true, childList: true, subtree: true });

    return () => {
      observer.disconnect();
    };
  }, []);

  // Suppress unhandled DOM Event / AbortError rejections
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (
        event.reason instanceof Event ||
        (event.reason && (event.reason.toString() === "[object Event]" || event.reason.name === "AbortError"))
      ) {
        event.preventDefault();
      }
    };
    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    return () => {
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  // Initial Auth Check with dual client/server verification and failsafe timeout
  useEffect(() => {
    // If on a standalone page (login, terms, privacy), skip auth redirect
    if (isStandalonePage) {
      setIsCheckingAuth(false);
      return;
    }

    let isMounted = true;

    const performAuthCheck = async () => {
      // 1. Fast Synchronous Check (localStorage & document.cookie)
      const localSession = getClientAdminSession();
      if (
        localSession.isAuthenticated &&
        localSession.user &&
        (localSession.user.role === "superadmin" || (await isAuthorizedAdminEmail(localSession.user.email)))
      ) {
        if (isMounted) {
          setCurrentUser(localSession.user);
          lastActiveRef.current = Date.now();
          setIsCheckingAuth(false);
          // Persist current active route & sub-tab query
          if (!isStandalonePage && typeof window !== "undefined") {
            const currentFullPath = pathname + window.location.search;
            localStorage.setItem("admin_last_route", currentFullPath);
          }
        }
        return;
      }

      // 2. Server-side Cookie Verification fallback
      try {
        const res = await fetch("/api/admin/auth/session", {
          cache: "no-store",
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          if (
            data.authenticated &&
            data.user &&
            (data.user.role === "superadmin" || (await isAuthorizedAdminEmail(data.user.email)))
          ) {
            setClientAdminSession(data.user);
            if (isMounted) {
              setCurrentUser(data.user);
              lastActiveRef.current = Date.now();
              setIsCheckingAuth(false);
              // Persist current active route & sub-tab query
              if (!isStandalonePage && typeof window !== "undefined") {
                const currentFullPath = pathname + window.location.search;
                localStorage.setItem("admin_last_route", currentFullPath);
              }
            }
            return;
          }
        }
      } catch {
        // Fall through to unauthenticated handler
      }

      // 3. If unauthenticated, clear any stale state and redirect cleanly without ugly URL query params
      await clearClientAdminSession();
      if (isMounted) {
        setIsCheckingAuth(false);
        const currentTarget = pathname + (typeof window !== "undefined" ? window.location.search : "");
        if (typeof window !== "undefined" && currentTarget && currentTarget !== "/admin/login") {
          sessionStorage.setItem("admin_target_route", currentTarget);
        }
        router.replace("/admin/login");
      }
    };

    performAuthCheck();

    // 4. Failsafe Timeout: screen will never be stuck on loader > 2.5s
    const timeout = setTimeout(() => {
      if (isMounted) {
        setIsCheckingAuth(false);
      }
    }, 2500);

    return () => {
      isMounted = false;
      clearTimeout(timeout);
    };
  }, [pathname, isStandalonePage, router]);

  // Standalone admin pages (login, terms, privacy, blocked) have their own full-bleed standalone layout
  if (isStandalonePage) {
    return (
      <div className={`${adminSans.variable} ${adminMono.variable} font-admin-sans antialiased min-h-screen bg-[#FAFAFA] text-black`}>
        <style dangerouslySetInnerHTML={{ __html: `
          #switchy-overlay, #switchy-early-lock, #switchy-debug-badge { display: none !important; visibility: hidden !important; pointer-events: none !important; opacity: 0 !important; }
          .switchy-lock { overflow: auto !important; touch-action: auto !important; overscroll-behavior: auto !important; }
        `}} />
        {children}
      </div>
    );
  }

  if (isCheckingAuth || !currentUser) {
    return (
      <div
        style={{ minHeight: "100vh", backgroundColor: "#FAFAFA", width: "100%" }}
        className={`${adminSans.variable} ${adminMono.variable} font-admin-sans antialiased`}
      >
        <style dangerouslySetInnerHTML={{ __html: `
          #switchy-overlay, #switchy-early-lock, #switchy-debug-badge { display: none !important; visibility: hidden !important; pointer-events: none !important; opacity: 0 !important; }
          .switchy-lock { overflow: auto !important; touch-action: auto !important; overscroll-behavior: auto !important; }
        `}} />
        <AdminLoader
          label="VERIFYING SESSION"
          sublabel="Authenticating administrator credentials..."
          fullscreen
        />
      </div>
    );
  }

  const getSectionTitle = () => {
    if (pathname === "/admin") return "DATABASE SERVICES";
    if (pathname.startsWith("/admin/settings")) return "ADMIN PROFILE & SECURITY";
    if (pathname.startsWith("/admin/export")) return "DATA EXPORT & INTELLIGENCE";
    const segment = pathname.replace("/admin/", "").replace("/admin", "").replace("/", "");
    return segment.toUpperCase() || "DATABASE SERVICES";
  };

  return (
    <div className={`${adminSans.variable} ${adminMono.variable} font-admin-sans h-screen flex flex-col bg-[#FAFAFA] text-[#0F172A] antialiased selection:bg-black selection:text-white overflow-hidden animate-in fade-in duration-300`}>
      <style dangerouslySetInnerHTML={{ __html: `
        #switchy-overlay, #switchy-early-lock, #switchy-debug-badge { display: none !important; visibility: hidden !important; pointer-events: none !important; opacity: 0 !important; }
        .switchy-lock { overflow: auto !important; touch-action: auto !important; overscroll-behavior: auto !important; }
      `}} />
      {/* Background Hairline Grid */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#F0F0F0_1px,transparent_1px),linear-gradient(to_bottom,#F0F0F0_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none -z-10 opacity-70" />

      {/* Fixed Dynamic Admin Header */}
      <AdminHeader user={currentUser} sectionTitle={getSectionTitle()} />

      {/* Body: Independent Scrolling Sidebar + Independent Scrolling Main Area (Full Space) */}
      <div className="flex-1 flex flex-col lg:flex-row w-full overflow-hidden">
        <AdminSidebar user={currentUser} />
        <main className="flex-1 h-full overflow-y-auto p-0">
          {children}
        </main>
      </div>
    </div>
  );
}
