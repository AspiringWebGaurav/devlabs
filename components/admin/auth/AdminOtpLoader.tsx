import React from "react";
import Link from "next/link";
import { AdminFooter } from "../navigation/AdminFooter";

/**
 * Dedicated Admin OTP Route Loader
 * Provides an unbreakable, CLS=0 frame-0 loading experience for /admin/otp
 * with zero layout leaks or flashing.
 */
export const AdminOtpLoader: React.FC = () => {
  return (
    <div className="h-screen max-h-screen w-full flex flex-col justify-between bg-[#FFFFFF] text-black relative overflow-hidden select-none animate-in fade-in duration-150">
      {/* 1. Edge-to-Edge Top Navigation Bar */}
      <header className="w-full h-[57px] bg-[#FFFFFF] px-6 sm:px-12 flex items-center justify-between z-20 relative shrink-0">
        <Link
          href="/"
          className="font-admin-sans text-[20px] sm:text-[24px] font-extrabold tracking-tight text-black hover:opacity-80 transition-opacity"
        >
          admin panel<span className="text-[#7C3AED]">.</span>
        </Link>
        {/* Exact Shiro Horizontal Dashed Divider */}
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
            <div className="absolute left-0 inset-y-0 w-px">
              <svg className="w-px h-full text-[#CBD5E1] overflow-visible">
                <line x1="0" y1="0" x2="0" y2="100%" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" />
              </svg>
            </div>
            <div className="absolute left-1/2 -translate-x-1/2 inset-y-0 w-px">
              <svg className="w-px h-full text-[#E2E8F0] overflow-visible">
                <line x1="0" y1="0" x2="0" y2="100%" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" />
              </svg>
            </div>
            <div className="absolute right-0 inset-y-0 w-px">
              <svg className="w-px h-full text-[#CBD5E1] overflow-visible">
                <line x1="0" y1="0" x2="0" y2="100%" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" />
              </svg>
            </div>
          </div>
        </div>

        {/* Center OTP Card */}
        <div className="flex-1 min-h-0 flex flex-col justify-center items-center px-4 py-2 sm:py-4 relative z-10 overflow-hidden">
          <div className="w-full max-w-[420px]">
            <div className="w-full bg-[#FFFFFF] border border-[#E2E8F0] rounded-none sm:rounded-[2px] shadow-2xs overflow-hidden">
              {/* Card Header */}
              <div className="p-4 sm:p-5 space-y-1 border-b border-[#F1F5F9]">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 rounded-full bg-[#7C3AED]" />
                  <span className="font-admin-mono text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                    Two-Factor Authentication
                  </span>
                </div>
                <h1 className="text-xl sm:text-[22px] font-bold font-admin-sans text-black tracking-[-0.03em] leading-tight">
                  Enter Verification Code.
                </h1>
                <p className="text-xs sm:text-[13px] text-[#475569] font-admin-sans leading-relaxed pt-0.5">
                  A 6-digit one-time passcode was dispatched to your Superadmin email.
                </p>
              </div>

              {/* Card Body */}
              <div className="p-4 sm:p-5 space-y-3.5 sm:space-y-4">
                {/* 6-Digit OTP Sockets Skeleton */}
                <div className="grid grid-cols-6 gap-2 sm:gap-2.5">
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className="h-12 sm:h-13 bg-[#F8FAFC] border border-[#CBD5E1] rounded-sm flex items-center justify-center font-admin-mono text-sm text-[#94A3B8]"
                    >
                      •
                    </div>
                  ))}
                </div>

                {/* Verify Button Skeleton */}
                <div className="w-full py-3 sm:py-3.5 bg-[#000000] text-white font-admin-mono text-xs font-bold uppercase tracking-widest rounded-sm flex items-center justify-center gap-2 shadow-xs">
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
                  <span>Verifying Session...</span>
                </div>

                {/* Cancel Link */}
                <div className="pt-0.5 text-center">
                  <span className="font-admin-mono text-[11px] text-[#64748B]">
                    &larr; Cancel and return to sign in
                  </span>
                </div>
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
