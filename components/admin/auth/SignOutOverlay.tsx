"use client";

import React, { useState, useEffect, useRef } from "react";
import { FaRightFromBracket, FaCircleCheck } from "react-icons/fa6";

interface SignOutOverlayProps {
  isOpen: boolean;
  onComplete?: () => Promise<void> | void;
}

export const SignOutOverlay: React.FC<SignOutOverlayProps> = ({
  isOpen,
  onComplete,
}) => {
  const [progress, setProgress] = useState(4);
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (!isOpen) {
      setProgress(4);
      completedRef.current = false;
      return;
    }

    // Dynamic, deliberate progress ticker (~1.8s duration)
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }

        let inc = 2;
        if (prev < 30) {
          inc = Math.random() > 0.3 ? 3 : 2;
        } else if (prev < 70) {
          inc = Math.random() > 0.4 ? 3 : 2;
        } else if (prev < 90) {
          inc = Math.random() > 0.3 ? 3 : 2;
        } else {
          inc = 2;
        }

        const next = Math.min(prev + inc, 100);

        // When 100% is reached, trigger sign out after a brief visual confirmation
        if (next >= 100 && !completedRef.current) {
          completedRef.current = true;
          setTimeout(() => {
            if (onCompleteRef.current) {
              onCompleteRef.current();
            }
          }, 350);
        }

        return next;
      });
    }, 30);

    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#FAFAFA] flex flex-col items-center justify-center p-4 select-none animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-[#FFFFFF] border border-[#E2E8F0] p-6 sm:p-7 rounded-none sm:rounded-[2px] shadow-2xs space-y-4 animate-in zoom-in-95 duration-200">
        {/* Brand Header & Live Percentage */}
        <div className="flex items-center justify-between pb-3 border-b border-[#F1F5F9]">
          <span className="font-admin-sans text-base font-extrabold tracking-tight text-black">
            admin panel<span className="text-[#DC2626]">.</span>
          </span>
          <span
            className={`font-admin-mono text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-2xs font-bold transition-all duration-150 ${
              progress === 100
                ? "text-[#10B981] bg-[#F0FDF4] border border-[#BBF7D0]"
                : "text-[#DC2626] bg-[#FEF2F2] border border-[#FCA5A5]"
            }`}
          >
            {progress}%
          </span>
        </div>

        {/* Minimalist Status Header */}
        <div className="flex items-center gap-3">
          <div
            className={`w-8 h-8 rounded-sm border flex items-center justify-center shrink-0 transition-colors duration-200 ${
              progress === 100
                ? "bg-[#F0FDF4] border-[#BBF7D0]"
                : "bg-[#FEF2F2] border-[#FCA5A5]"
            }`}
          >
            {progress === 100 ? (
              <FaCircleCheck className="w-3.5 h-3.5 text-[#10B981]" />
            ) : (
              <FaRightFromBracket className="w-3.5 h-3.5 text-[#DC2626]" />
            )}
          </div>
          <div className="min-w-0">
            <h4 className="font-admin-sans font-bold text-xs text-black">
              {progress === 100 ? "Session Detached" : "Signing out..."}
            </h4>
            <p className="font-admin-mono text-[10px] text-[#64748B]">
              {progress === 100 ? "Redirecting to login" : "Clearing session & tokens"}
            </p>
          </div>
        </div>

        {/* Dynamic Smooth Progress Bar */}
        <div className="space-y-1 pt-1">
          <div className="w-full h-1.5 bg-[#F1F5F9] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-75 ease-out shadow-xs ${
                progress === 100 ? "bg-[#10B981]" : "bg-[#DC2626]"
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Minimal Footer */}
        <div className="flex items-center justify-between text-[9px] font-admin-mono text-[#94A3B8] pt-1 border-t border-[#F8FAFC]">
          <span>SUPERADMIN SECURE</span>
          <span
            className={`font-semibold tracking-wider transition-colors duration-150 ${
              progress === 100 ? "text-[#10B981]" : "text-[#DC2626]"
            }`}
          >
            {progress === 100 ? "DETACHED" : "SIGNING OUT"}
          </span>
        </div>
      </div>
    </div>
  );
};
