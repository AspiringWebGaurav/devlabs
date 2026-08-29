"use client";

import React from "react";
import { IoChatbubblesOutline, IoArrowBack } from "react-icons/io5";
import type { AssistantViewProps } from "./types";

export const AssistantChatView: React.FC<AssistantViewProps> = ({ onBack }) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-8 select-none w-full max-w-[440px] mx-auto">
      {/* Icon Capsule */}
      <div className="w-14 h-14 rounded-2xl bg-[#F5F3FF] border border-[#DDD6FE] flex items-center justify-center text-[#7C3AED] shadow-2xs mb-4">
        <IoChatbubblesOutline className="w-7 h-7" />
      </div>

      {/* View Title & Subtitle */}
      <h3 className="text-xl sm:text-2xl font-bold text-neutral-950 tracking-tight leading-tight">
        Live Chat
      </h3>
      <p className="text-xs sm:text-sm text-neutral-500 max-w-[340px] mt-2 leading-relaxed">
        Real-time interactive assistant messaging is coming soon.
      </p>

      {/* Return to Options Action Button */}
      <button
        type="button"
        onClick={onBack}
        className="mt-6 inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-neutral-700 hover:text-neutral-950 bg-neutral-100/90 hover:bg-neutral-200/90 border border-neutral-200/80 rounded-full transition-all duration-150 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]"
      >
        <IoArrowBack className="w-3.5 h-3.5" />
        <span>Return to Assistant Home</span>
      </button>
    </div>
  );
};
