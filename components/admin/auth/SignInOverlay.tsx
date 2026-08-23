"use client";

import React from "react";
import { FaGoogle } from "react-icons/fa6";

interface SignInOverlayProps {
  isOpen: boolean;
}

export const SignInOverlay: React.FC<SignInOverlayProps> = ({ isOpen }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#FAFAFA]/90 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150 select-none">
      <div className="w-full max-w-sm bg-[#FFFFFF] border border-[#E2E8F0] p-6 rounded-none sm:rounded-sm shadow-sm space-y-4 animate-in zoom-in-95 duration-150">
        <div className="flex items-center gap-3.5">
          <div className="w-9 h-9 rounded-sm bg-[#F5F3FF] border border-[#DDD6FE] flex items-center justify-center shrink-0">
            <FaGoogle className="w-4 h-4 text-[#7C3AED]" />
          </div>
          <div className="min-w-0">
            <h3 className="font-admin-sans font-bold text-sm text-black">
              Authorizing Superadmin...
            </h3>
            <p className="font-admin-mono text-[11px] text-[#64748B] mt-0.5 truncate">
              Redirecting to Google OAuth 2.0 Gateway
            </p>
          </div>
        </div>

        {/* Minimalist Progress Track */}
        <div className="w-full h-1 bg-[#F1F5F9] rounded-full overflow-hidden">
          <div className="h-full bg-[#7C3AED] rounded-full w-3/4 transition-all duration-300" />
        </div>

        <p className="font-admin-mono text-[10px] text-[#94A3B8] text-center tracking-wider uppercase">
          Initializing cryptographic PKCE handshake
        </p>
      </div>
    </div>
  );
};
