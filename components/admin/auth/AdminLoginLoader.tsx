import React from "react";
import Link from "next/link";
import { AdminFooter } from "../navigation/AdminFooter";

/**
 * Tier 4 Loader: Dedicated Admin Login Route Loader
 * Provides an unbreakable, CLS=0 frame-0 loading experience for /admin/login
 * and unauthenticated /admin navigation with zero dashboard layout leaks or flashing.
 */
export const AdminLoginLoader: React.FC = () => {
  return (
    <div className="h-screen max-h-screen w-full flex flex-col justify-between bg-[#FFFFFF] text-black relative overflow-hidden select-none animate-in fade-in duration-150">
      {/* 1. Edge-to-Edge Top Navigation Bar (Exact Shiro Proportions) */}
      <header className="w-full bg-[#FFFFFF] px-6 sm:px-12 py-3.5 sm:py-4 flex items-center justify-between z-20 relative shrink-0">
        <Link
          href="/"
          className="font-admin-sans text-[20px] sm:text-[24px] font-extrabold tracking-tight text-black hover:opacity-80 transition-opacity"
        >
          admin panel<span className="text-[#7C3AED]">.</span>
        </Link>
        {/* Exact Shiro Horizontal Dashed Divider (4px dash, 4px gap) */}
        <div className="absolute bottom-0 inset-x-0 h-px pointer-events-none">
          <svg className="w-full h-px text-[#CBD5E1] overflow-visible">
            <line
              x1="0"
              y1="0"
              x2="100%"
              y2="0"
              stroke="currentColor"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
          </svg>
        </div>
      </header>

      {/* 2. Architectural Dashed Grid Canvas & Center Card */}
      <main className="flex-1 min-h-0 w-full bg-[#FFFFFF] flex flex-col relative z-10 overflow-hidden">
        {/* Background Dashed Grid Columns */}
        <div className="absolute inset-0 pointer-events-none flex justify-center">
          <div className="w-full max-w-5xl h-full relative">
            {/* Left Vertical Guide */}
            <div className="absolute left-0 inset-y-0 w-px">
              <svg className="w-px h-full text-[#CBD5E1] overflow-visible">
                <line
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="100%"
                  stroke="currentColor"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
              </svg>
            </div>

            {/* Center Vertical Guide */}
            <div className="absolute left-1/2 -translate-x-1/2 inset-y-0 w-px">
              <svg className="w-px h-full text-[#E2E8F0] overflow-visible">
                <line
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="100%"
                  stroke="currentColor"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
              </svg>
            </div>

            {/* Right Vertical Guide */}
            <div className="absolute right-0 inset-y-0 w-px">
              <svg className="w-px h-full text-[#CBD5E1] overflow-visible">
                <line
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="100%"
                  stroke="currentColor"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Center Sign-In Card (Identical 1:1 geometry to AdminLoginForm) */}
        <div className="flex-1 min-h-0 flex flex-col justify-center items-center px-4 py-2 sm:py-4 relative z-10 overflow-hidden">
          <div className="w-full max-w-md">
            <div className="w-full bg-[#FFFFFF] border border-[#E2E8F0] rounded-none sm:rounded-[2px] shadow-2xs overflow-hidden">
              {/* Card Top Section */}
              <div className="p-6 sm:p-8 space-y-1.5 border-b border-[#F1F5F9]">
                <h1 className="text-2xl font-bold font-admin-sans text-black tracking-[-0.035em]">
                  Sign in to Admin.
                </h1>
                <p className="text-xs text-[#475569] font-admin-sans leading-relaxed">
                  Access is strictly restricted to authorized Superadmin identities.
                </p>
              </div>

              {/* Card Bottom Section */}
              <div className="p-6 sm:p-8 space-y-4">
                {/* Calm Swiss Action Button Skeleton */}
                <div className="w-full h-11 bg-[#000000] text-white rounded-none sm:rounded-[2px] flex items-center justify-center gap-3 font-admin-mono text-xs font-semibold shadow-2xs">
                  <svg
                    className="w-3.5 h-3.5 animate-spin text-[#7C3AED]"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="3"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span className="tracking-wide">Preparing Gateway...</span>
                </div>

                {/* Terms Notice */}
                <p className="text-[11px] font-admin-sans text-[#94A3B8] text-center pt-1 leading-relaxed">
                  By signing in you agree to the{" "}
                  <span className="text-[#64748B] underline decoration-[#CBD5E1]">Admin Terms</span>{" "}
                  and{" "}
                  <span className="text-[#64748B] underline decoration-[#CBD5E1]">Privacy Policy</span>.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* 3. Perfectly Centered Swiss Neutral Footer */}
      <AdminFooter />
    </div>
  );
};
