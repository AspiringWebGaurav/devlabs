"use client";

import React from "react";
import type { InquiryItem } from "@/lib/admin/repositories/types";
import { formatRelativeTime } from "@/lib/admin/utils";
import { FaInbox } from "react-icons/fa6";

interface InquiriesListProps {
  inquiries: InquiryItem[];
}

export const InquiriesList: React.FC<InquiriesListProps> = ({ inquiries }) => {
  if (inquiries.length === 0) {
    return (
      <div className="w-full p-8 sm:p-12 bg-[#FFFFFF] border border-[#E2E8F0] rounded-none sm:rounded-sm flex flex-col items-center justify-center text-center space-y-3 shadow-2xs">
        <div className="w-10 h-10 rounded-sm bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-center">
          <FaInbox className="w-4 h-4 text-[#94A3B8]" />
        </div>
        <div>
          <h3 className="font-admin-sans font-bold text-sm text-black">Inbox is Empty</h3>
          <p className="font-admin-mono text-xs text-[#64748B] mt-0.5 max-w-sm">
            Contact form submissions and portfolio inquiries will appear here in real-time.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {inquiries.map((item) => (
        <div
          key={item.id}
          className="p-4 sm:p-5 bg-[#FFFFFF] border border-[#E2E8F0] hover:border-[#CBD5E1] rounded-none sm:rounded-sm transition-colors shadow-2xs space-y-2"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full bg-[#7C3AED] shrink-0" />
              <span className="font-admin-sans font-bold text-sm text-black truncate">{item.name}</span>
              <span className="font-admin-mono text-xs text-[#64748B] truncate">&lt;{item.email}&gt;</span>
            </div>
            <span className="font-admin-mono text-[11px] text-[#94A3B8] shrink-0">
              {formatRelativeTime(item.createdAt)}
            </span>
          </div>

          <p className="font-admin-sans text-xs text-[#334155] leading-relaxed line-clamp-2">
            {item.message}
          </p>
        </div>
      ))}
    </div>
  );
};
