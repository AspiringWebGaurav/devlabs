"use client";

import React from "react";
import Link from "next/link";

interface AdminHeaderProps {
  breadcrumb?: string;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  breadcrumb = "PORTFOLIO SERVICES",
}) => {
  return (
    <header className="w-full h-[57px] bg-[#FFFFFF] sticky top-0 z-30 px-6 sm:px-12 flex items-center justify-between relative select-none">
      {/* Left: Brand & Breadcrumb */}
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

      {/* Right side is completely clean */}
      <div className="flex items-center" />

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
