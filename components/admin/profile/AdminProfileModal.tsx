"use client";

import React, { useState } from "react";
import Image from "next/image";
import { FaXmark, FaShieldHalved, FaGoogle } from "react-icons/fa6";
import type { AdminUser } from "@/types/admin";

interface AdminProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: AdminUser | null;
}

export const AdminProfileModal: React.FC<AdminProfileModalProps> = ({
  isOpen,
  onClose,
  user,
}) => {
  const [imageError, setImageError] = useState(false);
  if (!isOpen) return null;

  const displayName = user?.name || "Gaurav Patil";
  const displayEmail = user?.email || "gauravpatil9262@gmail.com";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-[#FFFFFF] border border-[#E2E8F0] w-full max-w-md rounded-none sm:rounded-sm shadow-xl p-6 space-y-6 animate-in zoom-in-95 duration-150 relative">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-4">
          <div className="flex items-center gap-2">
            <h2 className="font-admin-sans font-bold text-base text-black">
              Administrator Identity
            </h2>
            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-sm hover:bg-[#F1F5F9] text-[#64748B] hover:text-black transition-colors cursor-pointer"
            title="Close"
          >
            <FaXmark className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Profile Content */}
        <div className="flex items-center gap-4 bg-[#FAFAFA] border border-[#E2E8F0] p-4 rounded-sm">
          <div className="relative w-14 h-14 rounded-full overflow-hidden border border-[#CBD5E1] bg-[#18181B] shrink-0">
            {user?.avatar && !imageError ? (
              <Image
                src={user.avatar}
                alt={displayName}
                fill
                unoptimized
                className="object-cover"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="w-full h-full bg-[#18181B] text-white flex items-center justify-center font-admin-mono font-bold text-sm tracking-wider">
                {initials}
              </div>
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <h3 className="text-sm font-bold font-admin-sans text-black leading-snug truncate">
              {displayName}
            </h3>
            <p className="text-xs font-admin-mono text-[#64748B] truncate mt-0.5">
              {displayEmail}
            </p>
            <span className="inline-flex items-center gap-1.5 text-[10px] font-admin-mono font-bold text-[#7C3AED] uppercase tracking-wider mt-1">
              <FaShieldHalved className="w-2.5 h-2.5" />
              Super Administrator
            </span>
          </div>
        </div>

        {/* Security Details */}
        <div className="space-y-2 text-xs font-admin-mono">
          <div className="flex items-center justify-between py-2 border-b border-[#F1F5F9]">
            <span className="text-[#64748B]">Auth Provider</span>
            <span className="flex items-center gap-1.5 text-black font-semibold">
              <FaGoogle className="w-3 h-3 text-[#EA4335]" />
              Google OAuth 2.0
            </span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-[#F1F5F9]">
            <span className="text-[#64748B]">Access Level</span>
            <span className="text-[#10B981] font-semibold">Primary Superadmin</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-[#F1F5F9]">
            <span className="text-[#64748B]">Session State</span>
            <span className="text-[#10B981] font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
              Active / Secure
            </span>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="pt-2 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#000000] text-[#FFFFFF] font-admin-mono text-xs font-bold uppercase tracking-wider rounded-sm hover:bg-[#18181B] transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
