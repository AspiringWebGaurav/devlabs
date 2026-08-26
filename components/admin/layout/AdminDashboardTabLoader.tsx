"use client";

import React from "react";
import { FaCircleNotch } from "react-icons/fa6";

export const AdminDashboardTabLoader: React.FC = () => {
  return (
    <div className="w-full h-full min-h-[380px] flex flex-col items-center justify-center p-8 bg-[#FFFFFF] border border-dashed border-[#CBD5E1] rounded-sm select-none">
      <div className="flex flex-col items-center space-y-4 max-w-xs text-center animate-in fade-in zoom-in-95 duration-150">
        {/* Dedicated Admin Dashboard Dual-Ring Spinner */}
        <div className="relative w-10 h-10 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-2 border-[#F1F5F9]" />
          <FaCircleNotch className="w-8 h-8 text-[#7C3AED] animate-spin shrink-0" />
        </div>

        {/* Status Typography */}
        <div className="space-y-1">
          <h3 className="font-admin-sans font-bold text-sm text-black tracking-tight">
            Loading Workspace...
          </h3>
          <p className="font-admin-mono text-[11px] text-[#64748B]">
            Synchronizing dashboard telemetry
          </p>
        </div>

        {/* Micro Status Chip */}
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xs font-admin-mono text-[9px] uppercase tracking-wider text-[#64748B] font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-[#7C3AED] animate-pulse" />
          <span>Syncing Tab</span>
        </div>
      </div>
    </div>
  );
};
