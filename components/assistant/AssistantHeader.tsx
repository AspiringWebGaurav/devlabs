"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { IoClose, IoChatbubbleEllipses, IoChevronBack } from "react-icons/io5";
import type { AssistantHeaderProps } from "./types";

export const AssistantHeader: React.FC<AssistantHeaderProps> = ({
  onClose,
  onBack,
  currentView = "home",
  assistantName = "Gaurav Assistant",
  avatarUrl,
}) => {
  const isChildView = currentView !== "home";

  return (
    <header className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-3.5 border-b border-neutral-100/90 bg-white shrink-0 select-none">
      {/* Left: Identity or Back Navigation */}
      <div className="flex items-center gap-2.5 min-w-0">
        {isChildView && onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1 px-2.5 py-1.5 -ml-1 rounded-full text-xs font-semibold text-neutral-700 hover:text-neutral-950 bg-neutral-100/80 hover:bg-neutral-200/80 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]"
            aria-label="Back to Home"
          >
            <IoChevronBack className="w-4 h-4 text-neutral-700 shrink-0" />
            <span>Back</span>
          </button>
        ) : (
          <div className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-neutral-100 border border-neutral-200/80 flex items-center justify-center text-neutral-800 shrink-0 overflow-hidden shadow-2xs">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={assistantName}
                width={36}
                height={36}
                className="w-full h-full object-cover"
              />
            ) : (
              <IoChatbubbleEllipses className="w-4.5 h-4.5 text-neutral-800" />
            )}
          </div>
        )}

        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm sm:text-[15px] font-semibold text-neutral-950 leading-tight tracking-tight truncate">
              {currentView === "questions"
                ? "Predefined Questions"
                : currentView === "chat"
                ? "Live Chat with Gaurav"
                : assistantName}
            </span>
            {!isChildView && (
              <span className="px-1.5 py-0.5 text-[9px] font-bold font-mono tracking-wider bg-neutral-100 text-neutral-600 rounded border border-neutral-200 uppercase leading-none shrink-0">
                Beta
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-neutral-500 leading-tight mt-0.5">
            <span>{isChildView ? assistantName : "Portfolio Guide"}</span>
            <span className="text-neutral-300">·</span>
            <Link
              href="/chat"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#7C3AED] hover:text-[#5B21B6] hover:underline font-medium transition-colors"
            >
              Learn more
            </Link>
          </div>
        </div>
      </div>

      {/* Right: Close Control */}
      <button
        type="button"
        onClick={onClose}
        className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors duration-150 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED] focus-visible:ring-offset-1 shrink-0"
        aria-label="Close assistant"
      >
        <IoClose className="w-5 h-5 text-neutral-600 group-hover:text-neutral-950" />
      </button>
    </header>
  );
};

