"use client";

import React, { useState } from "react";
import { FaXmark, FaShieldHalved, FaGoogle } from "react-icons/fa6";
import type { AdminUser } from "@/types/admin";
import { ADMIN_SESSION_TTL_HOURS } from "@/lib/admin/constants";

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
          <div className="relative w-14 h-14 rounded-full overflow-hidden border border-[#CBD5E1] bg-[#18181B] shrink-0 flex items-center justify-center">
            {user?.avatar && !imageError ? (
              <img
                src={user.avatar}
                alt={displayName}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="w-full h-full bg-[#18181B] text-white flex items-center justify-center font-admin-mono font-bold text-base tracking-wider">
                {initials}
              </div>
            )}
          </div>

          <div className="flex flex-col min-w-0">
            <span className="text-sm font-bold font-admin-sans text-black truncate">
              {displayName}
            </span>
            <span className="text-[11px] font-admin-mono text-[#64748B] truncate mt-0.5">
              {displayEmail}
            </span>
            <div className="mt-1.5 flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-2xs bg-[#F5F3FF] border border-[#DDD6FE] text-[#7C3AED] font-admin-mono text-[9px] uppercase font-bold tracking-wider">
                <FaShieldHalved className="w-2.5 h-2.5" />
                Superadmin
              </span>
            </div>
          </div>
        </div>

        {/* Session Security Details */}
        <div className="space-y-2">
          <span className="font-admin-mono text-[10px] uppercase tracking-[0.16em] text-[#94A3B8] font-bold block">
            Session Security Info
          </span>
          <div className="bg-[#F8FAFC] border border-[#E2E8F0] p-3 rounded-sm space-y-2 font-admin-mono text-[11px]">
            <div className="flex items-center justify-between text-[#64748B]">
              <span>Auth Provider</span>
              <span className="text-black font-semibold flex items-center gap-1">
                <FaGoogle className="w-2.5 h-2.5 text-[#4285F4]" /> Google OAuth 2.0 PKCE
              </span>
            </div>
            <div className="flex items-center justify-between text-[#64748B]">
              <span>Session Duration</span>
              <span className="text-black font-semibold">{ADMIN_SESSION_TTL_HOURS} Hours (Auto-Expiring Security TTL)</span>
            </div>
            <div className="flex items-center justify-between text-[#64748B]">
              <span>Storage Policy</span>
              <span className="text-black font-semibold">HttpOnly & Lax Cookie</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-admin-mono font-semibold bg-[#FAFAFA] hover:bg-[#F1F5F9] border border-[#CBD5E1] text-black rounded-sm transition-colors cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};
