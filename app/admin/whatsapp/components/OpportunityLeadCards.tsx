"use client";

import React from "react";
import { FaBuilding, FaUserTie, FaDownload, FaCalendarDays } from "react-icons/fa6";
import type { WhatsAppOpportunityLead } from "@/lib/whatsapp/types";

interface OpportunityLeadCardsProps {
  leads: WhatsAppOpportunityLead[];
}

export const OpportunityLeadCards: React.FC<OpportunityLeadCardsProps> = ({ leads }) => {
  if (!leads || leads.length === 0) {
    return (
      <div className="p-8 text-center bg-white border border-[#E2E8F0] rounded-xl text-neutral-500 text-xs font-admin-sans">
        No structured recruiter opportunity leads captured yet.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
      {leads.map((lead) => {
        const dateStr = new Date(lead.createdAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });

        const downloadUrl = lead.mediaStoragePath
          ? `/api/admin/whatsapp/media/${encodeURIComponent(lead.mediaStoragePath)}`
          : null;

        return (
          <div
            key={lead.id}
            className="p-4 bg-white border border-[#E2E8F0] hover:border-[#CBD5E1] rounded-xl shadow-2xs transition-all space-y-3 font-admin-sans"
          >
            {/* Header: Company & Status */}
            <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-[#7C3AED]/10 text-[#7C3AED] flex items-center justify-center shrink-0">
                  <FaBuilding className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-neutral-900 truncate">
                    {lead.company}
                  </h4>
                  <p className="text-[11px] text-neutral-500 truncate">
                    {lead.role}
                  </p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold tracking-wider uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                {lead.status}
              </span>
            </div>

            {/* Recruiter Details */}
            <div className="space-y-1.5 text-xs text-neutral-700">
              <div className="flex items-center gap-2 text-neutral-600">
                <FaUserTie className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                <span className="font-medium text-neutral-900">{lead.recruiterName}</span>
                <span className="text-neutral-400">&bull;</span>
                <span className="font-admin-mono text-[11px]">{lead.recruiterPhone}</span>
              </div>

              {lead.notes && (
                <div className="p-2.5 rounded-lg bg-neutral-50 text-neutral-600 text-[11.5px] leading-relaxed border border-neutral-100">
                  {lead.notes}
                </div>
              )}
            </div>

            {/* Footer: Date & Attachment */}
            <div className="flex items-center justify-between pt-1 text-[11px] text-neutral-400 border-t border-[#F8FAFC]">
              <div className="flex items-center gap-1.5">
                <FaCalendarDays className="w-3 h-3" />
                <span>{dateStr}</span>
              </div>

              {downloadUrl && (
                <a
                  href={downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-medium text-[11px] transition-colors cursor-pointer"
                >
                  <FaDownload className="w-2.5 h-2.5" />
                  <span>{lead.mediaFileName || "Job Description"}</span>
                </a>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
