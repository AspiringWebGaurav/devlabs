"use client";

import React from "react";
import {
  IoClose,
  IoShieldCheckmarkOutline,
  IoMailOutline,
  IoChatbubblesOutline,
  IoLockClosedOutline,
} from "react-icons/io5";
import { BsLightningChargeFill } from "react-icons/bs";

interface LiveChatLearnMoreModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LiveChatLearnMoreModal: React.FC<LiveChatLearnMoreModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-50 bg-white/95 backdrop-blur-md flex flex-col p-4 sm:p-5 overflow-y-auto animate-in fade-in zoom-in-95 duration-200 select-none">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-neutral-100 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-purple/10 border border-purple/20 flex items-center justify-center text-[#7C3AED] shrink-0 shadow-2xs">
            <BsLightningChargeFill className="w-4 h-4 text-[#7C3AED]" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-neutral-900 tracking-tight leading-none">
              How Live Chat Works
            </h3>
            <p className="text-[11px] text-neutral-500 mt-0.5">
              Direct personal connection with Gaurav
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <IoClose className="w-4 h-4" />
        </button>
      </div>

      {/* 5-Step Non-Technical Explanatory Cards */}
      <div className="flex-1 py-3.5 space-y-2.5 overflow-y-auto">
        {/* Step 1 */}
        <div className="p-3 rounded-2xl bg-neutral-50/80 border border-neutral-200/60 flex items-start gap-3 shadow-2xs">
          <div className="w-7 h-7 rounded-xl bg-purple/10 text-[#7C3AED] flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
            1
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-900">
              <BsLightningChargeFill className="w-3 h-3 text-[#7C3AED]" />
              <span>Instant High-Priority Delivery</span>
            </div>
            <p className="text-[11.5px] text-neutral-600 leading-relaxed mt-0.5">
              When you send a message, our system alerts Gaurav directly on his private notification feed with top priority.
            </p>
          </div>
        </div>

        {/* Step 2 */}
        <div className="p-3 rounded-2xl bg-neutral-50/80 border border-neutral-200/60 flex items-start gap-3 shadow-2xs">
          <div className="w-7 h-7 rounded-xl bg-purple/10 text-[#7C3AED] flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
            2
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-900">
              <IoShieldCheckmarkOutline className="w-3.5 h-3.5 text-emerald-600" />
              <span>Secure One-Click Access</span>
            </div>
            <p className="text-[11.5px] text-neutral-600 leading-relaxed mt-0.5">
              Gaurav receives an authenticated, one-click access link on his personal device to open a private conversation room.
            </p>
          </div>
        </div>

        {/* Step 3 */}
        <div className="p-3 rounded-2xl bg-neutral-50/80 border border-neutral-200/60 flex items-start gap-3 shadow-2xs">
          <div className="w-7 h-7 rounded-xl bg-purple/10 text-[#7C3AED] flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
            3
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-900">
              <IoChatbubblesOutline className="w-3.5 h-3.5 text-[#7C3AED]" />
              <span>Real-Time In-Bubble Conversation</span>
            </div>
            <p className="text-[11.5px] text-neutral-600 leading-relaxed mt-0.5">
              Gaurav&apos;s replies stream directly into this chat bubble with zero delay while you stay on the page.
            </p>
          </div>
        </div>

        {/* Step 4 */}
        <div className="p-3 rounded-2xl bg-neutral-50/80 border border-neutral-200/60 flex items-start gap-3 shadow-2xs">
          <div className="w-7 h-7 rounded-xl bg-purple/10 text-[#7C3AED] flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
            4
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-900">
              <IoMailOutline className="w-3.5 h-3.5 text-blue-600" />
              <span>Automatic Email Backup Alerts</span>
            </div>
            <p className="text-[11.5px] text-neutral-600 leading-relaxed mt-0.5">
              If you close the tab or step away, you&apos;ll receive an email notification with a 1-click button to resume chatting anytime.
            </p>
          </div>
        </div>

        {/* Step 5 */}
        <div className="p-3 rounded-2xl bg-neutral-50/80 border border-neutral-200/60 flex items-start gap-3 shadow-2xs">
          <div className="w-7 h-7 rounded-xl bg-purple/10 text-[#7C3AED] flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
            5
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-900">
              <IoLockClosedOutline className="w-3.5 h-3.5 text-amber-600" />
              <span>100% Private &amp; Spam-Free</span>
            </div>
            <p className="text-[11.5px] text-neutral-600 leading-relaxed mt-0.5">
              Your email is strictly used for identity verification and reply notifications. Zero marketing, zero spam, 100% private.
            </p>
          </div>
        </div>
      </div>

      {/* Footer Action */}
      <div className="pt-2 border-t border-neutral-100 shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-semibold shadow-2xs hover:shadow-sm transition-all cursor-pointer text-center"
        >
          Got it &rarr;
        </button>
      </div>
    </div>
  );
};
