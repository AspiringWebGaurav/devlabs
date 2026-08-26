"use client";

import React, { useState, useEffect, useRef } from "react";
import { FaShieldHalved, FaCircleCheck } from "react-icons/fa6";

export const AdminAuthenticatingClient: React.FC = () => {
  const [progress, setProgress] = useState(6);
  const redirectedRef = useRef(false);

  useEffect(() => {
    // Deliberate, smooth progress ticker (~2.8s duration)
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          if (!redirectedRef.current) {
            redirectedRef.current = true;
            setTimeout(() => {
              window.location.replace("/admin");
            }, 500);
          }
          return 100;
        }

        let inc = 1;
        if (prev < 25) {
          inc = 1;
        } else if (prev < 65) {
          inc = Math.random() > 0.45 ? 2 : 1;
        } else if (prev < 88) {
          inc = 1;
        } else if (prev < 96) {
          inc = Math.random() > 0.5 ? 2 : 1;
        } else {
          inc = 1;
        }

        const next = Math.min(prev + inc, 100);
        if (next === 100 && !redirectedRef.current) {
          redirectedRef.current = true;
          setTimeout(() => {
            window.location.replace("/admin");
          }, 500);
        }
        return next;
      });
    }, 36);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen w-full bg-[#FAFAFA] flex flex-col items-center justify-center p-4 select-none">
      <div className="w-full max-w-sm bg-[#FFFFFF] border border-[#E2E8F0] p-6 sm:p-7 rounded-none sm:rounded-[2px] shadow-2xs space-y-4 animate-in zoom-in-95 duration-200">
        {/* Brand Header & Live Percentage */}
        <div className="flex items-center justify-between pb-3 border-b border-[#F1F5F9]">
          <span className="font-admin-sans text-base font-extrabold tracking-tight text-black">
            admin panel<span className="text-[#7C3AED]">.</span>
          </span>
          <span
            className={`font-admin-mono text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-2xs font-bold transition-all duration-150 ${
              progress === 100
                ? "text-[#10B981] bg-[#F0FDF4] border border-[#BBF7D0]"
                : "text-[#7C3AED] bg-[#F5F3FF] border border-[#DDD6FE]"
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
                : "bg-[#F8FAFC] border-[#E2E8F0]"
            }`}
          >
            {progress === 100 ? (
              <FaCircleCheck className="w-3.5 h-3.5 text-[#10B981]" />
            ) : (
              <FaShieldHalved className="w-3.5 h-3.5 text-[#7C3AED]" />
            )}
          </div>
          <div className="min-w-0">
            <h4 className="font-admin-sans font-bold text-xs text-black">
              {progress === 100 ? "Ready" : "Signing in..."}
            </h4>
            <p className="font-admin-mono text-[10px] text-[#64748B]">
              {progress === 100 ? "Opening workspace" : "Authenticating superadmin"}
            </p>
          </div>
        </div>

        {/* Dynamic Smooth Progress Bar */}
        <div className="space-y-1 pt-1">
          <div className="w-full h-1.5 bg-[#F1F5F9] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-75 ease-out shadow-xs ${
                progress === 100 ? "bg-[#10B981]" : "bg-[#7C3AED]"
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
              progress === 100 ? "text-[#10B981]" : "text-[#7C3AED]"
            }`}
          >
            {progress === 100 ? "AUTHENTICATED" : "LOADING"}
          </span>
        </div>
      </div>
    </div>
  );
};
