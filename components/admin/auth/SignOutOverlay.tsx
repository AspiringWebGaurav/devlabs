"use client";

import React from "react";
import { FaRightFromBracket } from "react-icons/fa6";

interface SignOutOverlayProps {
  isOpen: boolean;
}

export const SignOutOverlay: React.FC<SignOutOverlayProps> = ({ isOpen }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#FAFAFA]/90 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-sm bg-[#FFFFFF] border border-[#E2E8F0] p-6 rounded-none sm:rounded-sm shadow-sm space-y-4 animate-in zoom-in-95 duration-150">
        <div className="flex items-center gap-3.5">
          <div className="w-9 h-9 rounded-sm bg-[#FEF2F2] border border-[#FCA5A5] flex items-center justify-center shrink-0">
            <FaRightFromBracket className="w-4 h-4 text-[#DC2626]" />
          </div>
          <div className="min-w-0">
            <h3 className="font-admin-sans font-bold text-sm text-black">
              Signing Out...
            </h3>
            <p className="font-admin-mono text-[11px] text-[#64748B] mt-0.5 truncate">
              Detaching secure session & tokens
            </p>
          </div>
        </div>

        {/* Minimalist Progress Track */}
        <div className="w-full h-1 bg-[#F1F5F9] rounded-full overflow-hidden">
          <div className="h-full bg-[#7C3AED] rounded-full animate-pulse w-3/4 transition-all duration-300" />
        </div>

        <p className="font-admin-mono text-[10px] text-[#94A3B8] text-center tracking-wider uppercase">
          Clearing cryptographic state
        </p>
      </div>
    </div>
  );
};
