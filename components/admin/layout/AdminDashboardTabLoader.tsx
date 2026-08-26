"use client";

import React, { useState, useEffect } from "react";

const TELEMETRY_STAGES = [
  "Synchronizing dashboard telemetry...",
  "Mounting active service bindings...",
  "Rendering analytics workspace...",
];

export const AdminDashboardTabLoader: React.FC = () => {
  const [stageIdx, setStageIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStageIdx((prev) => (prev + 1) % TELEMETRY_STAGES.length);
    }, 900);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full h-full min-h-[380px] flex flex-col items-center justify-center p-8 bg-[#FFFFFF] border border-dashed border-[#CBD5E1] rounded-sm select-none">
      <div className="flex flex-col items-center space-y-4 max-w-xs text-center animate-in fade-in duration-200">
        {/* Pure Dynamic GPU-Accelerated Concentric Dual-Ring Spinner */}
        <div className="relative w-12 h-12 flex items-center justify-center">
          {/* Outer Track Ring */}
          <div className="absolute inset-0 rounded-full border-2 border-[#F1F5F9]" />
          
          {/* Outer High-Speed Primary Arc */}
          <svg
            className="absolute inset-0 w-full h-full animate-spin text-[#7C3AED]"
            viewBox="0 0 48 48"
            fill="none"
            style={{ animationDuration: "1s" }}
          >
            <circle
              cx="24"
              cy="24"
              r="20"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray="30 95"
            />
          </svg>

          {/* Inner Counter-Rotating Precision Arc */}
          <svg
            className="w-7 h-7 text-[#0F172A]"
            viewBox="0 0 28 28"
            fill="none"
            style={{
              animation: "spin 1.6s linear infinite reverse",
            }}
          >
            <circle
              cx="14"
              cy="14"
              r="10"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray="16 48"
            />
          </svg>

          {/* Center Pulsing Micro-Core */}
          <div className="absolute w-1.5 h-1.5 rounded-full bg-[#7C3AED] shadow-2xs" />
        </div>

        {/* Dynamic Status Typography */}
        <div className="space-y-1">
          <h3 className="font-admin-sans font-bold text-sm text-black tracking-tight">
            Loading Workspace
          </h3>
          <p className="font-admin-mono text-[11px] text-[#64748B] h-4 transition-all duration-200">
            {TELEMETRY_STAGES[stageIdx]}
          </p>
        </div>

        {/* Dynamic Micro Status Chip with Active Radar Ping */}
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xs font-admin-mono text-[9px] uppercase tracking-wider text-[#475569] font-semibold shadow-2xs">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#7C3AED] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#7C3AED]" />
          </span>
          <span>Live Telemetry</span>
        </div>
      </div>
    </div>
  );
};
