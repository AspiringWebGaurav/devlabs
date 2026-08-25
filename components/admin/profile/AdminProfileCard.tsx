"use client";

import React, { useState } from "react";
import Link from "next/link";
import { FaChevronRight } from "react-icons/fa6";
import type { AdminUser } from "@/types/admin";

interface AdminProfileCardProps {
  user: AdminUser | null;
  isActive?: boolean;
}

export const AdminProfileCard: React.FC<AdminProfileCardProps> = ({
  user,
  isActive = false,
}) => {
  const [imageError, setImageError] = useState(false);
  const displayName = user?.name || "Gaurav Patil";
  const displayEmail = user?.email || "gauravpatil5737@gmail.com";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Link
      href="/admin/profile"
      className={`w-full text-left flex items-center gap-2.5 p-2.5 rounded-sm transition-all duration-150 cursor-pointer group shadow-2xs border ${
        isActive
          ? "bg-[#F8FAFC] border-[#CBD5E1] ring-1 ring-[#7C3AED]/30 text-black font-semibold"
          : "bg-[#F8FAFC] hover:bg-[#F1F5F9] active:bg-[#E2E8F0] border-[#E2E8F0] hover:border-[#CBD5E1]"
      }`}
      title="Superadmin Identity & Credentials Workspace"
    >
      {/* Dynamic Profile Avatar with no-referrer for Google CDN */}
      <div
        className={`relative w-8 h-8 rounded-full overflow-hidden border bg-[#18181B] shrink-0 transition-all duration-150 flex items-center justify-center ${
          isActive ? "border-[#7C3AED]" : "border-[#CBD5E1] group-hover:border-[#94A3B8]"
        }`}
      >
        {user?.avatar && !imageError ? (
          <img
            src={user.avatar}
            alt={displayName}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-150"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full bg-[#18181B] text-white flex items-center justify-center font-admin-mono font-bold text-[10px] tracking-wider">
            {initials}
          </div>
        )}
      </div>

      {/* Dynamic Identity */}
      <div className="flex flex-col min-w-0 flex-1">
        <span className="text-xs font-semibold font-admin-sans text-black leading-tight truncate">
          {displayName}
        </span>
        <span className="text-[9px] font-admin-mono text-[#64748B] truncate group-hover:text-[#475569]">
          {displayEmail}
        </span>
      </div>

      <FaChevronRight
        className={`w-2.5 h-2.5 transition-all duration-150 shrink-0 ${
          isActive
            ? "text-[#7C3AED] translate-x-0.5"
            : "text-[#94A3B8] group-hover:text-black group-hover:translate-x-0.5"
        }`}
      />
    </Link>
  );
};
