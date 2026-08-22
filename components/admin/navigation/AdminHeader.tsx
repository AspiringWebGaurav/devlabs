"use client";

import React from "react";
import Link from "next/link";
import { FaArrowUpRightFromSquare } from "react-icons/fa6";

interface AdminHeaderProps {
  breadcrumb?: string;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  breadcrumb = "OVERVIEW",
}) => {
  return (
    <header className="w-full bg-[#FFFFFF] border-b border-[#E5E7EB] sticky top-0 z-30 px-4 sm:px-8 py-3.5 flex items-center justify-between">
      {/* Left: Brand & Breadcrumb */}
      <div className="flex items-center gap-3">
        <span className="font-mono text-sm font-black tracking-tight text-black">
          admin panel<span className="text-[#7C3AED]">.</span>
        </span>
        <span className="text-[#94A3B8] font-mono text-xs">/</span>
        <span className="font-mono text-[11px] uppercase tracking-widest text-[#64748B] font-semibold">
          {breadcrumb}
        </span>
      </div>

      {/* Right: Clean Live Portfolio Link */}
      <div className="flex items-center gap-3">
        <Link
          href="/"
          target="_blank"
          className="flex items-center gap-2 px-3 py-1.5 bg-[#FFFFFF] hover:bg-[#F8FAFC] text-black border border-[#E5E7EB] hover:border-black/30 rounded-sm text-xs font-mono transition-all duration-150"
        >
          <span>Live Portfolio</span>
          <FaArrowUpRightFromSquare className="w-2.5 h-2.5 text-[#7C3AED]" />
        </Link>
      </div>
    </header>
  );
};
