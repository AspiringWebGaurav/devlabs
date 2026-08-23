"use client";

import React from "react";
import Link from "next/link";
import { FaCircleCheck, FaArrowsRotate } from "react-icons/fa6";

interface AdminHeaderProps {
  breadcrumb?: string;
  isSyncing?: boolean;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  breadcrumb = "OVERVIEW",
  isSyncing = false,
}) => {
  return (
    <header className="w-full bg-[#FFFFFF]/90 backdrop-blur-md sticky top-0 z-30 px-6 sm:px-12 py-3.5 flex items-center justify-between relative transition-colors duration-150">
      {/* 1. Real-Time Top Glass Progress Line (Non-Blocking) */}
      {isSyncing && (
        <div className="absolute top-0 inset-x-0 h-[2px] bg-[#F1F5F9] overflow-hidden">
          <div className="h-full bg-gradient-to-r from-[#7C3AED] via-[#A855F7] to-[#10B981] animate-pulse w-full transition-all duration-300" />
        </div>
      )}

      {/* 2. Left: Brand & Breadcrumb */}
      <div className="flex items-center gap-3">
        <Link
          href="/admin"
          className="font-admin-sans text-[20px] sm:text-[24px] font-extrabold tracking-tight text-black hover:opacity-80 transition-opacity"
        >
          admin panel<span className="text-[#7C3AED]">.</span>
        </Link>
        <span className="text-[#CBD5E1] font-admin-mono text-sm">/</span>
        <span className="font-admin-mono text-xs uppercase tracking-widest text-[#64748B] font-semibold">
          {breadcrumb}
        </span>
      </div>

      {/* 3. Right: Non-Blocking Real-Time Glass Indicator */}
      <div className="flex items-center gap-2">
        {isSyncing ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#F5F3FF] border border-[#DDD6FE] text-[#7C3AED] text-[10px] font-admin-mono font-bold tracking-wider uppercase animate-in fade-in duration-150 shadow-2xs">
            <FaArrowsRotate className="w-2.5 h-2.5 animate-spin text-[#7C3AED]" />
            <span className="hidden sm:inline">Telemetry Syncing...</span>
            <span className="sm:hidden">Syncing</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#F0FDF4] border border-[#BBF7D0] text-[#166534] text-[10px] font-admin-mono font-bold tracking-wider uppercase animate-in fade-in duration-150 shadow-2xs">
            <FaCircleCheck className="w-2.5 h-2.5 text-[#10B981]" />
            <span className="hidden sm:inline">Live Connected</span>
            <span className="sm:hidden">Live</span>
          </div>
        )}
      </div>

      {/* Shiro Horizontal Dashed Divider (4px dash, 4px gap) */}
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
  );
};
