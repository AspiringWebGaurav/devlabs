"use client";

import React from "react";
import Link from "next/link";
import { AdminUser } from "@/types/admin";

interface AdminHeaderProps {
  user?: AdminUser | null;
  sectionTitle?: string;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  sectionTitle = "DATABASE SERVICES",
}) => {
  return (
    <header className="sticky top-0 z-30 w-full bg-white/95 backdrop-blur-md border-b border-[#E5E7EB] px-4 sm:px-6 py-2.5 flex items-center justify-between transition-colors font-admin-sans">
      {/* Brand & Section Eyebrow */}
      <div className="flex items-center gap-4 sm:gap-6">
        <Link href="/admin" className="flex items-center gap-2 group">
          <span className="text-xl sm:text-2xl font-black tracking-tight text-black group-hover:opacity-80 transition-opacity">
            admin panel<span className="text-[#A855F7]">.</span>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-2 text-[#9CA3AF] text-xs font-admin-mono">
          <span>/</span>
          <span className="text-black font-semibold uppercase tracking-wider">{sectionTitle}</span>
        </div>
      </div>

      {/* Right side kept completely clean and blank */}
      <div />
    </header>
  );
};
