"use client";

import React from "react";
import Image from "next/image";
import { FaChevronRight } from "react-icons/fa6";
import type { AdminUser } from "@/types/admin";

interface AdminProfileCardProps {
  user: AdminUser | null;
  onClick: () => void;
}

export const AdminProfileCard: React.FC<AdminProfileCardProps> = ({
  user,
  onClick,
}) => {
  return (
    <button
      onClick={onClick}
      className="w-full text-left flex items-center gap-2.5 bg-[#F8FAFC] hover:bg-[#F1F5F9] active:bg-[#E2E8F0] border border-[#E2E8F0] hover:border-[#CBD5E1] p-2.5 rounded-sm transition-all duration-150 cursor-pointer group shadow-2xs"
      title="View Administrator Profile & Credentials"
    >
      <div className="relative w-8 h-8 rounded-full overflow-hidden border border-[#CBD5E1] group-hover:border-[#94A3B8] bg-[#E2E8F0] shrink-0 transition-all duration-150">
        <Image
          src={
            user?.avatar ||
            "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
          }
          alt={user?.name || "Admin"}
          fill
          unoptimized
          className="object-cover group-hover:scale-105 transition-transform duration-150"
        />
      </div>
      <div className="flex flex-col min-w-0 flex-1">
        <span className="text-xs font-semibold text-black leading-tight truncate group-hover:text-black">
          {user?.name || "Gaurav Patil"}
        </span>
        <span className="text-[9px] font-mono text-[#64748B] truncate group-hover:text-[#475569]">
          {user?.email || "gauravpatil9262@gmail.com"}
        </span>
      </div>
      <FaChevronRight className="w-2.5 h-2.5 text-[#94A3B8] group-hover:text-black group-hover:translate-x-0.5 transition-all duration-150 shrink-0" />
    </button>
  );
};
