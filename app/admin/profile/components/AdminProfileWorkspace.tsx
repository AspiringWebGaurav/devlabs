"use client";

import React, { useState } from "react";
import { FaShieldHalved } from "react-icons/fa6";
import { useAdminSession } from "@/components/admin/context";

export const AdminProfileWorkspace: React.FC = () => {
  const { user } = useAdminSession();
  const [imageError, setImageError] = useState(false);

  const displayName = user?.name || "Gaurav Patil";
  const displayEmail = user?.email || "gauravpatil9262@gmail.com";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex-1 flex flex-col space-y-5 animate-in fade-in duration-200">
      {/* 1. Superadmin Identity Card: Left Side DP & Name */}
      <div className="bg-[#FFFFFF] border border-[#E2E8F0] p-4 sm:p-5 rounded-none sm:rounded-sm shadow-2xs shrink-0">
        <div className="flex items-center gap-3.5">
          {/* Left Side DP */}
          <div className="relative w-11 h-11 rounded-full overflow-hidden border border-[#CBD5E1] bg-[#18181B] shrink-0 flex items-center justify-center shadow-2xs">
            {user?.avatar && !imageError ? (
              <img
                src={user.avatar}
                alt={displayName}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="w-full h-full bg-[#18181B] text-white flex items-center justify-center font-admin-mono font-bold text-sm tracking-wider">
                {initials}
              </div>
            )}
          </div>

          {/* Identity Info */}
          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold font-admin-sans text-black tracking-tight truncate">
                {displayName}
              </h2>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-2xs bg-[#F5F3FF] border border-[#DDD6FE] text-[#7C3AED] font-admin-mono text-[9px] uppercase font-bold tracking-wider shrink-0">
                <FaShieldHalved className="w-2.5 h-2.5" />
                Superadmin
              </span>
            </div>
            <p className="text-[11px] font-admin-mono text-[#64748B] truncate">
              {displayEmail}
            </p>
          </div>
        </div>
      </div>

      {/* 2. Responsive Flexbox Dashed Canvas: Zero unnecessary scrollbar when clean; scrolls dynamically as data expands */}
      <div className="w-full flex-1 min-h-[220px] bg-[#FFFFFF] border border-dashed border-[#CBD5E1] rounded-none sm:rounded-sm shadow-2xs" />
    </div>
  );
};
