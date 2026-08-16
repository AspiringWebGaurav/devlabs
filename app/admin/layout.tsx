"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Geist, Geist_Mono } from "next/font/google";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminLoader } from "@/components/admin/AdminLoader";
import {
  getClientAdminSession,
  clearClientAdminSession,
  touchAdminSession,
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

const INACTIVITY_TIMEOUT_MS = 2 * 60 * 60 * 1000; // 2 hours inactivity limit

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

  // Gracefully handle logout on session expiration
  const handleSessionExpire = useCallback(async () => {
    await clearClientAdminSession();
    setCurrentUser(null);
    router.push("/admin/login?reason=session_expired");
  }, [router]);

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

  // Initial Auth Check
  useEffect(() => {
    if (isLoginPage) {
      setIsCheckingAuth(false);
      return;
    }

    const session = getClientAdminSession();
    if (
      !session.isAuthenticated ||
      !session.user ||
      session.user.email.trim().toLowerCase() !== "gauravpatil9262@gmail.com"
    ) {
      router.push("/admin/login");
    } else {
      setCurrentUser(session.user);
      lastActiveRef.current = Date.now();
    }
    setIsCheckingAuth(false);
  }, [pathname, isLoginPage, router]);

  // Background Session Heartbeat & Inactivity Monitor
  useEffect(() => {
    if (isLoginPage) return;

    // 1. Periodic check every 15 seconds
    const interval = setInterval(() => {
      const session = getClientAdminSession();
      const now = Date.now();

      // Check TTL expiry
      if (!session.isAuthenticated || !session.user) {
        handleSessionExpire();
        return;
      }

      // Check inactivity
      if (now - lastActiveRef.current > INACTIVITY_TIMEOUT_MS) {
        handleSessionExpire();
      }
    }, 15000);

    // 2. Activity listeners (resets inactivity timer & touches session)
    const handleUserActivity = () => {
      lastActiveRef.current = Date.now();
      touchAdminSession();
    };

    window.addEventListener("mousemove", handleUserActivity, { passive: true });
    window.addEventListener("keydown", handleUserActivity, { passive: true });
    window.addEventListener("click", handleUserActivity, { passive: true });
    window.addEventListener("scroll", handleUserActivity, { passive: true });

    return () => {
      clearInterval(interval);
      window.removeEventListener("mousemove", handleUserActivity);
      window.removeEventListener("keydown", handleUserActivity);
      window.removeEventListener("click", handleUserActivity);
      window.removeEventListener("scroll", handleUserActivity);
    };
  }, [isLoginPage, handleSessionExpire]);

  // Login page has its own full-bleed layout
  if (isLoginPage) {
    return (
      <div className={`${adminSans.variable} ${adminMono.variable} font-admin-sans antialiased`}>
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
        <AdminLoader
          label="VERIFYING SESSION"
          sublabel="Authenticating administrator credentials..."
          fullscreen
        />
      </div>
    );
  }

  const getSectionTitle = () => {
    if (pathname === "/admin") return "DATABASE";
    const segment = pathname.replace("/admin/", "").replace("/admin", "").replace("/", "");
    return segment.toUpperCase() || "DATABASE";
  };

  return (
    <div className={`${adminSans.variable} ${adminMono.variable} font-admin-sans h-screen flex flex-col bg-[#FAFAFA] text-[#0F172A] antialiased selection:bg-black selection:text-white overflow-hidden animate-in fade-in duration-300`}>
      {/* Background Hairline Grid */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#F0F0F0_1px,transparent_1px),linear-gradient(to_bottom,#F0F0F0_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none -z-10 opacity-70" />

      {/* Fixed Dynamic Admin Header */}
      <AdminHeader user={currentUser} sectionTitle={getSectionTitle()} />

      {/* Body: Independent Scrolling Sidebar + Independent Scrolling Main Area (Full Space) */}
      <div className="flex-1 flex flex-col lg:flex-row w-full overflow-hidden">
        <AdminSidebar />
        <main className="flex-1 h-full overflow-y-auto p-0">
          {children}
        </main>
      </div>
    </div>
  );
}
