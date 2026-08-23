"use client";

import React, { useState } from "react";
import Image from "next/image";
import { FaCheck, FaArrowRight, FaArrowRightArrowLeft } from "react-icons/fa6";
import { AuthButtonState } from "./GoogleAuthButton";

interface EnterpriseAccountCardProps {
  name: string;
  email: string;
  avatar?: string;
  role?: string;
  state: AuthButtonState;
  onContinue: () => void;
  onSwitchAccount: () => void;
  disabled?: boolean;
}

export const EnterpriseAccountCard: React.FC<EnterpriseAccountCardProps> = ({
  name,
  email,
  avatar,
  role = "Superadmin",
  state,
  onContinue,
  onSwitchAccount,
  disabled = false,
}) => {
  const [imageError, setImageError] = useState(false);
  const isBusy = state === "connecting" || state === "verifying";
  const isSuccess = state === "success";

  return (
    <div className="space-y-4">
      {/* 1. Account Profile Info Tile */}
      <div className="p-4 bg-[#FFFFFF] border border-[#E2E8F0] rounded-[2px] flex items-center justify-between gap-3 shadow-2xs hover:border-[#CBD5E1] transition-colors">
        <div className="flex items-center gap-3.5 min-w-0">
          {/* Avatar Container with Online Indicator */}
          <div className="relative shrink-0">
            {avatar && !imageError ? (
              <Image
                src={avatar}
                alt={name}
                width={40}
                height={40}
                className="w-10 h-10 rounded-full object-cover border border-[#E2E8F0]"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-[#18181B] text-white flex items-center justify-center font-admin-mono text-xs font-bold tracking-wider">
                {name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2)}
              </div>
            )}
            {/* Active Verified Status Dot */}
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#10B981] border-2 border-white" />
          </div>

          {/* Identity Information */}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-admin-sans font-bold text-sm text-black truncate tracking-tight">
                {name}
              </p>
              <span className="font-admin-mono text-[9px] uppercase tracking-wider text-[#7C3AED] bg-[#F5F3FF] border border-[#DDD6FE] px-1.5 py-0.5 rounded-2xs font-bold shrink-0">
                {role}
              </span>
            </div>
            <p className="font-admin-mono text-[11px] text-[#64748B] truncate mt-0.5">
              {email}
            </p>
          </div>
        </div>

        {/* Verified Tag */}
        <span className="hidden sm:inline-block font-admin-mono text-[10px] text-[#10B981] bg-[#F0FDF4] border border-[#BBF7D0] px-2 py-0.5 rounded-2xs font-semibold shrink-0">
          Last Used
        </span>
      </div>

      {/* 2. Fast Resume Primary Action Button */}
      <button
        onClick={onContinue}
        disabled={disabled || isBusy || isSuccess}
        type="button"
        className={`w-full py-3.5 px-4 rounded-sm font-admin-mono text-xs font-bold uppercase tracking-[0.16em] transition-all duration-150 flex items-center justify-center gap-2.5 shadow-xs cursor-pointer ${
          isSuccess
            ? "bg-[#10B981] text-white"
            : isBusy
            ? "bg-[#18181B] text-white/80 cursor-wait opacity-90"
            : "bg-[#000000] text-[#FFFFFF] hover:bg-[#18181B] active:scale-[0.99] disabled:opacity-60"
        }`}
      >
        {isSuccess ? (
          <>
            <FaCheck className="w-3.5 h-3.5 text-white animate-in zoom-in-50" />
            <span>Access Granted</span>
          </>
        ) : isBusy ? (
          <>
            <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
            <span>{state === "connecting" ? "Connecting..." : "Verifying..."}</span>
          </>
        ) : (
          <>
            <span>Continue as {name.split(" ")[0]}</span>
            <FaArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
          </>
        )}
      </button>

      {/* 3. Switch Account Toggle Link */}
      <div className="text-center pt-0.5">
        <button
          onClick={onSwitchAccount}
          disabled={isBusy || isSuccess}
          type="button"
          className="inline-flex items-center gap-1.5 text-xs font-admin-mono text-[#64748B] hover:text-black transition-colors cursor-pointer disabled:opacity-50"
        >
          <FaArrowRightArrowLeft className="w-3 h-3 text-[#7C3AED]" />
          <span>Use a different Google account</span>
        </button>
      </div>
    </div>
  );
};
