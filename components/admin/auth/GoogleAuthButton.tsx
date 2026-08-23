"use client";

import React from "react";
import { FaGoogle, FaCheck } from "react-icons/fa6";

export type AuthButtonState = "idle" | "connecting" | "verifying" | "success" | "error";

interface GoogleAuthButtonProps {
  state: AuthButtonState;
  onClick: () => void;
  disabled?: boolean;
}

export const GoogleAuthButton: React.FC<GoogleAuthButtonProps> = ({
  state,
  onClick,
  disabled = false,
}) => {
  const isBusy = state === "connecting" || state === "verifying";
  const isSuccess = state === "success";

  return (
    <button
      onClick={onClick}
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
          <FaGoogle className="w-3.5 h-3.5 text-[#EA4335] shrink-0" />
          <span>Continue with Google</span>
        </>
      )}
    </button>
  );
};
