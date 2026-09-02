"use client";

import React from "react";
import { FaWhatsapp } from "react-icons/fa";
import { IoChevronBack, IoDocumentTextOutline, IoBriefcaseOutline, IoPersonOutline, IoShieldCheckmarkOutline } from "react-icons/io5";
import type { AssistantViewProps } from "./types";

export const AssistantWhatsAppView: React.FC<AssistantViewProps> = ({ onBack }) => {
  // Configured WhatsApp public phone number for deep link
  const rawPhone = process.env.NEXT_PUBLIC_WHATSAPP_PHONE_NUMBER || "15551381395";
  const cleanPhone = rawPhone.replace(/[^0-9]/g, "");
  const prefilledMessage = encodeURIComponent("Hi Gaurav, I'm connecting via your portfolio");
  const deepLink = `https://wa.me/${cleanPhone}?text=${prefilledMessage}`;

  return (
    <div className="flex-1 flex flex-col justify-between p-4 sm:p-6 select-none w-full max-w-[440px] mx-auto text-left">
      {/* 1. Header with Back Button */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <button
            type="button"
            onClick={onBack}
            className="p-1.5 -ml-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer"
            aria-label="Back to main menu"
          >
            <IoChevronBack className="w-5 h-5" />
          </button>
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
            Official Recruiter Channel
          </span>
        </div>

        {/* 2. Channel Branding Card */}
        <div className="flex items-center gap-3.5 p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80 mb-4">
          <div className="w-11 h-11 rounded-xl bg-emerald-500 flex items-center justify-center text-white shadow-2xs shrink-0">
            <FaWhatsapp className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <h4 className="text-[15px] font-bold text-neutral-900 leading-tight">
              Connect on WhatsApp
            </h4>
            <p className="text-xs text-neutral-600 mt-0.5 leading-snug">
              Direct recruiter messaging with Gaurav
            </p>
          </div>
        </div>

        {/* 3. Feature Capabilities */}
        <div className="space-y-2 mb-4">
          <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-white border border-neutral-200/80 shadow-2xs">
            <IoDocumentTextOutline className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
            <div className="text-xs text-neutral-700 leading-snug">
              <strong className="font-semibold text-neutral-900">Instant Resume Overview:</strong> Request background summary and resume document.
            </div>
          </div>

          <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-white border border-neutral-200/80 shadow-2xs">
            <IoBriefcaseOutline className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
            <div className="text-xs text-neutral-700 leading-snug">
              <strong className="font-semibold text-neutral-900">Structured Opportunity Intake:</strong> Submit role, tech stack, and attach JDs safely.
            </div>
          </div>

          <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-white border border-neutral-200/80 shadow-2xs">
            <IoPersonOutline className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
            <div className="text-xs text-neutral-700 leading-snug">
              <strong className="font-semibold text-neutral-900">Human Direct Escalation:</strong> Request 1-on-1 human conversation with Gaurav.
            </div>
          </div>
        </div>

        {/* 4. Privacy Guarantee (Zero PII on Web) */}
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-neutral-50 border border-neutral-200/60 text-[11.5px] text-neutral-500 leading-relaxed mb-4">
          <IoShieldCheckmarkOutline className="w-4 h-4 text-neutral-400 mt-0.5 shrink-0" />
          <span>
            Zero website PII collection. Clicking below opens official WhatsApp directly on your device.
          </span>
        </div>
      </div>

      {/* 5. Primary Action Button (Deep Link) */}
      <div className="pt-2">
        <a
          href={deepLink}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-xs hover:shadow-sm active:scale-[0.99] transition-all cursor-pointer"
        >
          <FaWhatsapp className="w-5 h-5" />
          <span>Open WhatsApp Chat</span>
        </a>
      </div>
    </div>
  );
};
