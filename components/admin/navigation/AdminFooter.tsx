"use client";

import React from "react";
import { FaShieldHalved } from "react-icons/fa6";

interface AdminFooterProps {
  text?: string;
}

export const AdminFooter: React.FC<AdminFooterProps> = ({
  text = "Protected by Gaurav Portfolio Security Architecture",
}) => {
  return (
    <footer className="w-full bg-[#FFFFFF] py-4 px-6 sm:px-12 flex items-center justify-center gap-2 z-20 relative select-none">
      {/* Exact Shiro Horizontal Dashed Divider (4px dash, 4px gap) */}
      <div className="absolute top-0 inset-x-0 h-px pointer-events-none">
        <svg className="w-full h-px text-[#CBD5E1] overflow-visible">
          <line
            x1="0"
            y1="0"
            x2="100%"
            y2="0"
            stroke="currentColor"
            strokeWidth="1"
            strokeDasharray="4 4"
          />
        </svg>
      </div>

      <FaShieldHalved className="w-3 h-3 text-[#94A3B8] shrink-0" />
      <span className="font-admin-mono text-[10px] uppercase tracking-[0.16em] text-[#64748B] font-medium text-center">
        {text}
      </span>
    </footer>
  );
};
