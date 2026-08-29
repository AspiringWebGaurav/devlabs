"use client";

import React from "react";
import { IoHelpCircleOutline, IoChatbubblesOutline, IoChevronForward } from "react-icons/io5";
import type { AssistantViewProps } from "./types";

export const AssistantHomeView: React.FC<AssistantViewProps> = ({
  onNavigate,
  assistantName = "Gaurav Personal Assistant",
}) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-5 sm:px-6 py-6 sm:py-8 select-none w-full max-w-[440px] mx-auto">
      {/* 1. Header Greeting */}
      <div className="space-y-1 mb-7 sm:mb-8">
        <p className="text-[19px] sm:text-[23px] font-medium text-neutral-700 tracking-tight leading-snug">
          Get help from
        </p>
        <h3 className="text-[25px] sm:text-[30px] font-bold text-neutral-950 tracking-tight leading-tight">
          {assistantName}
        </h3>
        <p className="text-xs sm:text-[13px] text-neutral-500 font-normal pt-1">
          How can I help you today?
        </p>
      </div>

      {/* 2. The Two Primary Navigation Choices */}
      <div className="w-full space-y-3">
        {/* Option 1: Predefined Questions */}
        <button
          type="button"
          onClick={() => onNavigate("questions")}
          className="w-full group p-3.5 sm:p-4 rounded-xl bg-neutral-50/90 hover:bg-neutral-100/90 border border-neutral-200/80 hover:border-[#7C3AED]/40 transition-all duration-200 flex items-center justify-between text-left shadow-2xs hover:shadow-xs active:scale-[0.99] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]"
          aria-label="Open Predefined Questions"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-white border border-neutral-200 flex items-center justify-center text-[#7C3AED] shadow-2xs group-hover:scale-105 transition-transform shrink-0">
              <IoHelpCircleOutline className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="block text-sm sm:text-[15px] font-semibold text-neutral-900 leading-tight">
                Predefined Questions
              </span>
              <span className="block text-xs text-neutral-500 truncate mt-0.5 font-normal">
                Browse quick topics, FAQs & common inquiries
              </span>
            </div>
          </div>
          <IoChevronForward className="w-5 h-5 text-neutral-400 group-hover:text-[#7C3AED] group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
        </button>

        {/* Option 2: Live Chat */}
        <button
          type="button"
          onClick={() => onNavigate("chat")}
          className="w-full group p-3.5 sm:p-4 rounded-xl bg-neutral-50/90 hover:bg-neutral-100/90 border border-neutral-200/80 hover:border-[#7C3AED]/40 transition-all duration-200 flex items-center justify-between text-left shadow-2xs hover:shadow-xs active:scale-[0.99] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]"
          aria-label="Open Live Chat"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-white border border-neutral-200 flex items-center justify-center text-[#7C3AED] shadow-2xs group-hover:scale-105 transition-transform shrink-0">
              <IoChatbubblesOutline className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="block text-sm sm:text-[15px] font-semibold text-neutral-900 leading-tight">
                Live Chat
              </span>
              <span className="block text-xs text-neutral-500 truncate mt-0.5 font-normal">
                Start a direct conversation with the assistant
              </span>
            </div>
          </div>
          <IoChevronForward className="w-5 h-5 text-neutral-400 group-hover:text-[#7C3AED] group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
        </button>
      </div>
    </div>
  );
};
