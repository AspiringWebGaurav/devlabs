"use client";

import React from "react";
import { IoHelpCircleOutline, IoChatbubblesOutline, IoChevronForward } from "react-icons/io5";
import { FaWhatsapp } from "react-icons/fa";
import type { AssistantViewProps } from "./types";

export const AssistantHomeView: React.FC<AssistantViewProps> = ({
  onNavigate,
  assistantName = "Gaurav Personal Assistant",
}) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-4 sm:px-6 py-4 sm:py-8 select-none w-full max-w-[440px] mx-auto">
      {/* 1. Header Greeting */}
      <div className="space-y-1 mb-5 sm:mb-7">
        <p className="text-[17px] sm:text-[21px] font-medium text-neutral-600 tracking-tight leading-snug">
          Get help from
        </p>
        <h3 className="text-[23px] sm:text-[28px] font-bold text-neutral-950 tracking-tight leading-tight">
          {assistantName}
        </h3>
        <p className="text-xs sm:text-[13px] text-neutral-500 font-normal pt-0.5">
          How can I help you today?
        </p>
      </div>

      {/* 2. The Two Primary Navigation Choices */}
      <div className="w-full space-y-2.5 sm:space-y-3">
        {/* Option 1: Live Chat with Gaurav */}
        <button
          type="button"
          onClick={() => onNavigate("chat")}
          className="w-full group p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white hover:bg-neutral-50/80 border border-neutral-200/90 hover:border-[#7C3AED]/50 transition-all duration-200 flex items-center justify-between text-left shadow-2xs hover:shadow-xs active:scale-[0.99] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]"
          aria-label="Open Live Chat with Gaurav"
        >
          <div className="flex items-center gap-3 sm:gap-3.5 min-w-0 flex-1">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[#7C3AED]/10 border border-[#7C3AED]/20 flex items-center justify-center text-[#7C3AED] shadow-2xs group-hover:scale-105 transition-transform shrink-0">
              <IoChatbubblesOutline className="w-5 h-5 sm:w-5.5 sm:h-5.5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="block text-sm sm:text-[15px] font-semibold text-neutral-900 leading-tight">
                  Live Chat with Gaurav
                </span>
                {/* Robust Centered Radar Live Indicator (Zero Clipping on all DPRs) */}
                <span className="relative flex items-center justify-center w-3 h-3 shrink-0 ml-0.5" title="Gaurav is live">
                  <span className="animate-ping absolute inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500 ring-1.5 ring-white shadow-xs" />
                </span>
              </div>
              <span className="block text-[11.5px] sm:text-xs text-neutral-500 mt-1 font-normal group-hover:text-neutral-600 transition-colors leading-snug">
                Direct conversation &mdash; notifies Gaurav live
              </span>
            </div>
          </div>
          <IoChevronForward className="w-5 h-5 text-neutral-400 group-hover:text-[#7C3AED] group-hover:translate-x-0.5 transition-all shrink-0 ml-1.5" />
        </button>

        {/* Option 2: Predefined Questions */}
        <button
          type="button"
          onClick={() => onNavigate("questions")}
          className="w-full group p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white hover:bg-neutral-50/80 border border-neutral-200/90 hover:border-[#7C3AED]/50 transition-all duration-200 flex items-center justify-between text-left shadow-2xs hover:shadow-xs active:scale-[0.99] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]"
          aria-label="Open Predefined Questions"
        >
          <div className="flex items-center gap-3 sm:gap-3.5 min-w-0 flex-1">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-neutral-100 border border-neutral-200/80 flex items-center justify-center text-neutral-700 shadow-2xs group-hover:scale-105 group-hover:text-[#7C3AED] transition-all shrink-0">
              <IoHelpCircleOutline className="w-5 h-5 sm:w-5.5 sm:h-5.5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="block text-sm sm:text-[15px] font-semibold text-neutral-900 leading-tight">
                Predefined Questions
              </span>
              <span className="block text-[11.5px] sm:text-xs text-neutral-500 mt-1 font-normal group-hover:text-neutral-600 transition-colors leading-snug">
                Common questions answered directly by Gaurav
              </span>
            </div>
          </div>
          <IoChevronForward className="w-5 h-5 text-neutral-400 group-hover:text-[#7C3AED] group-hover:translate-x-0.5 transition-all shrink-0 ml-1.5" />
        </button>

        {/* Option 3: Continue on WhatsApp */}
        <button
          type="button"
          onClick={() => onNavigate("whatsapp")}
          className="w-full group p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white hover:bg-neutral-50/80 border border-neutral-200/90 hover:border-emerald-500/50 transition-all duration-200 flex items-center justify-between text-left shadow-2xs hover:shadow-xs active:scale-[0.99] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          aria-label="Continue on WhatsApp"
        >
          <div className="flex items-center gap-3 sm:gap-3.5 min-w-0 flex-1">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-600 shadow-2xs group-hover:scale-105 transition-all shrink-0">
              <FaWhatsapp className="w-5 h-5 sm:w-5.5 sm:h-5.5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="block text-sm sm:text-[15px] font-semibold text-neutral-900 leading-tight">
                Continue on WhatsApp
              </span>
              <span className="block text-[11.5px] sm:text-xs text-neutral-500 mt-1 font-normal group-hover:text-neutral-600 transition-colors leading-snug">
                Official recruiter channel & opportunity intake
              </span>
            </div>
          </div>
          <IoChevronForward className="w-5 h-5 text-neutral-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all shrink-0 ml-1.5" />
        </button>
      </div>
    </div>
  );
};
