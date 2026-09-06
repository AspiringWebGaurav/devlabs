"use client";

import React from "react";
import {
  FaShieldHalved,
  FaCircleCheck,
  FaCircleInfo,
} from "react-icons/fa6";

import { ADMIN_MAIL_SENDERS } from "@/lib/email/mail-service";

export const SenderIdentitiesView: React.FC = () => {
  const officialSenders = Object.values(ADMIN_MAIL_SENDERS).filter((s) => !s.isLegacy);

  return (
    <div className="space-y-6 font-admin-sans">
      {/* Overview Banner */}
      <div className="p-4 bg-[#FFFFFF] border border-[#E2E8F0] rounded-none sm:rounded-sm shadow-2xs space-y-2">
        <div className="flex items-center gap-2">
          <FaShieldHalved className="w-4 h-4 text-[#7C3AED]" />
          <h3 className="font-bold text-sm text-black">
            Official Sender Registry ({officialSenders.length} Verified Brevo Identities)
          </h3>
        </div>
        <p className="font-admin-mono text-xs text-[#64748B] leading-relaxed">
          Primary Domain: <strong className="text-black">gauravpatil.site</strong> (Verified DKIM &bull; DMARC Configured).
          All outbound communications are strictly routed through verified Brevo REST API v3 sender accounts.
        </p>
      </div>

      {/* Official Senders Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#7C3AED]" />
            <h4 className="font-admin-sans font-bold text-xs uppercase tracking-wider text-black">
              Official Identities — gauravpatil.site
            </h4>
          </div>
          <span className="font-admin-mono text-[11px] text-[#64748B]">{officialSenders.length} Senders</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {officialSenders.map((sender) => (
            <div
              key={sender.key}
              className="p-5 bg-[#FFFFFF] border border-[#E2E8F0] hover:border-[#CBD5E1] rounded-none sm:rounded-sm transition-colors shadow-2xs space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="px-1.5 py-0.5 bg-[#F5F3FF] border border-[#DDD6FE] text-[#7C3AED] font-admin-mono text-[10px] rounded-xs font-bold uppercase">
                    {sender.key}
                  </span>
                  <h4 className="font-bold text-sm text-black mt-1">
                    {sender.displayName}
                  </h4>
                  <p className="font-admin-mono text-xs text-[#7C3AED] mt-0.5 select-all">
                    {sender.email}
                  </p>
                </div>

                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#F0FDF4] border border-[#BBF7D0] text-[#166534] font-admin-mono text-[10px] rounded-xs font-semibold shrink-0">
                  <FaCircleCheck className="w-2.5 h-2.5 text-[#10B981]" />
                  Verified
                </span>
              </div>

              <p className="font-admin-sans text-xs text-[#475569] leading-relaxed">
                {sender.purpose}
              </p>

              <div className="pt-2 border-t border-[#F1F5F9] font-admin-mono text-[11px] text-[#64748B] flex items-center justify-between">
                <span>Reply-To:</span>
                <span className="text-black">{sender.defaultReplyTo}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Security Advisory */}
      <div className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-sm text-xs font-admin-mono text-[#64748B] flex items-start gap-2.5">
        <FaCircleInfo className="w-4 h-4 text-[#7C3AED] shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          All 6 senders on gauravpatil.site are cryptographically signed with DKIM and protected via DMARC. Outbound dispatch is managed through Brevo v3 transactional email API with automated idempotency locking.
        </p>
      </div>
    </div>
  );
};
