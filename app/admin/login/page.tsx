"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { AdminLoginForm, AdminFooter, AdminLoginLoader } from "@/components/admin";

export default function AdminLoginPage() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Brief smooth hydration hold on mount/refresh
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 450);
    return () => clearTimeout(timer);
  }, []);

  if (!isReady) {
    return <AdminLoginLoader />;
  }

  return (
    <div className="h-screen max-h-screen w-full flex flex-col justify-between bg-[#FFFFFF] text-black relative overflow-hidden select-none animate-in fade-in duration-150">
      {/* 1. Edge-to-Edge Top Navigation Bar with Exact Shiro Proportions */}
      <header className="w-full h-[57px] bg-[#FFFFFF] px-6 sm:px-12 flex items-center justify-between z-20 relative shrink-0">
        <Link
          href="/"
          className="font-admin-sans text-[20px] sm:text-[24px] font-extrabold tracking-tight text-black hover:opacity-80 transition-opacity"
        >
          admin panel<span className="text-[#7C3AED]">.</span>
        </Link>
        {/* Exact Shiro Horizontal Dashed Divider (4px dash, 4px gap) */}
        <div className="absolute bottom-0 inset-x-0 h-px pointer-events-none">
          <svg className="w-full h-px text-[#CBD5E1] overflow-visible">
            <line x1="0" y1="0" x2="100%" y2="0" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" />
          </svg>
        </div>
      </header>

      {/* 2. Architectural Dashed Grid Canvas & Center Card */}
      <main className="flex-1 min-h-0 w-full bg-[#FFFFFF] flex flex-col relative z-10 overflow-hidden">
        {/* Background Dashed Grid Columns (Exact Shiro Vector Dimensions: 4px dash, 4px gap) */}
        <div className="absolute inset-0 pointer-events-none flex justify-center">
          <div className="w-full max-w-5xl h-full relative">
            {/* Left Vertical Guide */}
            <div className="absolute left-0 inset-y-0 w-px">
              <svg className="w-px h-full text-[#CBD5E1] overflow-visible">
                <line x1="0" y1="0" x2="0" y2="100%" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" />
              </svg>
            </div>

            {/* Center Vertical Guide */}
            <div className="absolute left-1/2 -translate-x-1/2 inset-y-0 w-px">
              <svg className="w-px h-full text-[#E2E8F0] overflow-visible">
                <line x1="0" y1="0" x2="0" y2="100%" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" />
              </svg>
            </div>

            {/* Right Vertical Guide */}
            <div className="absolute right-0 inset-y-0 w-px">
              <svg className="w-px h-full text-[#CBD5E1] overflow-visible">
                <line x1="0" y1="0" x2="0" y2="100%" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" />
              </svg>
            </div>
          </div>
        </div>

        {/* Center Sign-In Card */}
        <div className="flex-1 min-h-0 flex flex-col justify-center items-center px-4 py-2 sm:py-4 relative z-10 overflow-hidden">
          <Suspense fallback={<AdminLoginLoader />}>
            <AdminLoginForm />
          </Suspense>
        </div>
      </main>

      {/* 3. Perfectly Centered Swiss Neutral Footer */}
      <AdminFooter />
    </div>
  );
}

