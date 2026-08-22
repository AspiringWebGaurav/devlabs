"use client";

import React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { FaRightFromBracket } from "react-icons/fa6";
import { clearClientAdminSession } from "@/lib/admin/auth";

interface AdminHeaderProps {
  breadcrumb?: string;
  userEmail?: string;
  userName?: string;
  userAvatar?: string;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  breadcrumb = "OVERVIEW",
  userEmail = "gauravpatil9262@gmail.com",
  userName = "Gaurav Patil",
  userAvatar = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
}) => {
  const router = useRouter();

  const handleSignOut = async () => {
    clearClientAdminSession();
    try {
      await fetch("/api/admin/auth/session", { method: "DELETE" });
    } catch {
      // Ignore network errors on logout
    }
    router.replace("/admin/login");
    router.refresh();
  };

  return (
    <header className="w-full bg-[#FFFFFF] border-b border-[#E5E7EB] sticky top-0 z-30 px-4 sm:px-8 py-3.5 flex items-center justify-between">
      {/* Left: Brand & Breadcrumb */}
      <div className="flex items-center gap-3">
        <span className="font-mono text-sm font-black tracking-tight text-black">
          admin panel<span className="text-[#A855F7]">.</span>
        </span>
        <span className="text-[#94A3B8] font-mono text-xs">/</span>
        <span className="font-mono text-[11px] uppercase tracking-widest text-[#64748B] font-semibold">
          {breadcrumb}
        </span>
      </div>

      {/* Right: Superadmin User Profile & Sign-Out */}
      <div className="flex items-center gap-4">
        <div className="hidden sm:flex items-center gap-2.5 bg-[#F8FAFC] border border-[#E2E8F0] px-3 py-1.5 rounded-sm">
          <div className="relative w-6 h-6 rounded-full overflow-hidden border border-[#CBD5E1]">
            <Image src={userAvatar} alt={userName} fill className="object-cover" />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-xs font-semibold text-black leading-none">{userName}</span>
            <span className="text-[9px] font-mono uppercase tracking-wider text-[#A855F7] font-bold mt-0.5">
              Super Admin
            </span>
          </div>
        </div>

        <button
          onClick={handleSignOut}
          className="flex items-center gap-1.5 text-xs font-mono text-[#64748B] hover:text-black border border-[#E5E7EB] hover:border-black/30 bg-[#FFFFFF] px-3 py-1.5 rounded-sm transition-all duration-150"
          title={`Sign out (${userEmail})`}
        >
          <FaRightFromBracket className="w-3 h-3 text-[#EF4444]" />
          <span>Sign Out</span>
        </button>
      </div>
    </header>
  );
};
