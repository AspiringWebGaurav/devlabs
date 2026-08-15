"use client";

import React from "react";

interface AdminLoaderProps {
  label?: string;
  sublabel?: string;
  fullscreen?: boolean;
}

export const AdminLoader: React.FC<AdminLoaderProps> = ({
  label = "INITIALIZING WORKSPACE",
  sublabel = "Verifying encrypted admin telemetry...",
  fullscreen = true,
}) => {
  return (
    <div
      className={`w-full flex flex-col items-center justify-center font-admin-sans selection:bg-black selection:text-white ${
        fullscreen ? "min-h-screen bg-[#FAFAFA]" : "h-full min-h-[300px] bg-transparent"
      }`}
    >
      {/* Background Subtle Hairline Grid */}
      {fullscreen && (
        <div className="fixed inset-0 bg-[linear-gradient(to_right,#E5E7EB_1px,transparent_1px),linear-gradient(to_bottom,#E5E7EB_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none z-0 opacity-70" />
      )}

      {/* Shiro-Inspired Minimal Geometric Loader Frame */}
      <div className="flex flex-col items-center gap-6 p-8 max-w-xs text-center relative z-10">
        {/* Animated Geometric Aperture */}
        <div className="relative w-12 h-12 flex items-center justify-center">
          {/* Outer Hairline Rotating Ring */}
          <div className="absolute inset-0 border border-[#E5E7EB] border-t-black rounded-full animate-spin [animation-duration:1.2s]" />

          {/* Inner Pulsing Purple Core */}
          <div className="w-4 h-4 bg-black rounded-sm relative flex items-center justify-center shadow-xs">
            <span className="w-1.5 h-1.5 bg-[#A855F7] rounded-full animate-ping" />
          </div>

          {/* Precision Center Corner Hairlines */}
          <div className="absolute -top-1 -left-1 w-2 h-2 border-t border-l border-black" />
          <div className="absolute -bottom-1 -right-1 w-2 h-2 border-b border-r border-black" />
        </div>

        {/* Minimalist Monospace Typography */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-admin-mono tracking-[0.2em] text-black font-semibold uppercase">
              {label}
            </span>
          </div>
          <p className="text-[11px] font-admin-mono text-[#737373] leading-relaxed">
            {sublabel}
          </p>
        </div>
      </div>
    </div>
  );
};
