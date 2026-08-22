"use client";

import React from "react";
import { FaCube } from "react-icons/fa6";

export const OverviewCanvas: React.FC = () => {
  return (
    <div className="w-full bg-[#FFFFFF] border border-dashed border-[#CBD5E1] rounded-sm p-12 sm:p-16 flex flex-col items-center justify-center text-center">
      <div className="w-12 h-12 rounded-full bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-center mb-4">
        <FaCube className="w-5 h-5 text-[#94A3B8]" />
      </div>
      <h2 className="text-base font-bold font-sans text-black">
        Admin Framework Ready
      </h2>
      <p className="text-xs text-[#64748B] font-sans max-w-md mt-1.5 leading-relaxed">
        Clean modular structure initialized. Ready for custom CMS, analytics, or feature integrations.
      </p>
    </div>
  );
};
