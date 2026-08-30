"use client";

import React from "react";
import { IoHelpCircleOutline, IoArrowBack } from "react-icons/io5";
import type { AssistantViewProps } from "./types";

export const AssistantQuestionsView: React.FC<AssistantViewProps> = ({ onBack }) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-4 sm:px-6 py-5 sm:py-8 select-none w-full max-w-[440px] mx-auto">
      {/* Icon Capsule */}
      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#F5F3FF] border border-[#DDD6FE] flex items-center justify-center text-[#7C3AED] shadow-2xs mb-3.5 sm:mb-4">
        <IoHelpCircleOutline className="w-6 h-6 sm:w-7 sm:h-7" />
      </div>

      {/* View Title & Subtitle */}
      <h3 className="text-lg sm:text-2xl font-bold text-neutral-950 tracking-tight leading-tight">
        Predefined Questions
      </h3>
      <p className="text-xs sm:text-sm text-neutral-500 max-w-[340px] mt-2 leading-relaxed">
        Common questions, portfolio highlights, and direct answers from Gaurav are coming soon.
      </p>

      {/* Return to Options Action Button */}
      <button
        type="button"
        onClick={onBack}
        className="mt-5 sm:mt-6 inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-neutral-700 hover:text-neutral-950 bg-neutral-100/90 hover:bg-neutral-200/90 border border-neutral-200/80 rounded-full transition-all duration-150 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]"
      >
        <IoArrowBack className="w-3.5 h-3.5" />
        <span>Return to Assistant Home</span>
      </button>
    </div>
  );
};
