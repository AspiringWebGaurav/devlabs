"use client";

import React from "react";
import Link from "next/link";
import { FaShieldHalved } from "react-icons/fa6";

interface AdminFooterProps {
  text?: string;
  showLinks?: boolean;
}

export const AdminFooter: React.FC<AdminFooterProps> = ({
  text = "Protected by Gaurav Portfolio Security Architecture",
  showLinks = true,
}) => {
  return (
    <footer className="w-full bg-[#FFFFFF] py-3.5 px-6 sm:px-12 flex flex-col sm:flex-row items-center justify-between gap-3 z-20 relative select-none">
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

      {/* Left / Status Section */}
      <div className="flex items-center gap-2 text-[#64748B]">
        <FaShieldHalved className="w-3 h-3 text-[#94A3B8] shrink-0" />
        <span className="font-admin-mono text-[10px] uppercase tracking-[0.16em] font-medium text-center sm:text-left">
          {text}
        </span>
      </div>

      {/* Right End: Terms & Privacy Governance Links */}
      {showLinks && (
        <div className="flex items-center gap-2.5 font-admin-mono text-[10px] uppercase tracking-[0.16em] text-[#64748B]">
          <Link
            href="/admin/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-black transition-colors"
          >
            Terms
          </Link>
          <span className="text-[#CBD5E1] font-mono select-none">|</span>
          <Link
            href="/admin/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-black transition-colors"
          >
            Privacy
          </Link>
        </div>
      )}
    </footer>
  );
};
