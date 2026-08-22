"use client";

import React from "react";
import Image from "next/image";
import { FaShieldHalved, FaXmark, FaGoogle } from "react-icons/fa6";
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
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-[#FFFFFF] border border-[#E5E7EB] rounded-none sm:rounded-[2px] shadow-lg p-6 space-y-6 animate-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-4">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] tracking-[0.2em] text-[#64748B] uppercase font-bold">
              Administrator Profile
            </span>
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
          <div className="relative w-14 h-14 rounded-full overflow-hidden border border-[#CBD5E1] bg-[#E2E8F0] shrink-0">
            <Image
              src={
                user?.avatar ||
                "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
              }
              alt={user?.name || "Admin"}
              fill
              unoptimized
              className="object-cover"
            />
          </div>
          <div className="flex flex-col min-w-0">
            <h3 className="text-sm font-bold font-sans text-black leading-snug">
              {user?.name || "Gaurav Patil"}
            </h3>
            <p className="text-xs font-mono text-[#64748B] truncate mt-0.5">
              {user?.email || "gauravpatil9262@gmail.com"}
            </p>
            <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold text-[#7C3AED] uppercase tracking-wider mt-1">
              <FaShieldHalved className="w-2.5 h-2.5" />
              Super Administrator
            </span>
          </div>
        </div>

        {/* Security Details */}
        <div className="space-y-2 text-xs font-mono">
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
            className="px-4 py-2 bg-[#000000] text-[#FFFFFF] font-mono text-xs font-bold uppercase tracking-wider rounded-sm hover:bg-[#18181B] transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
