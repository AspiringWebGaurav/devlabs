"use client";

import React from "react";
import { IoClose, IoChatbubbleEllipses, IoChevronBack, IoLogOutOutline } from "react-icons/io5";
import type { AssistantHeaderProps } from "./types";

export const AssistantHeader: React.FC<AssistantHeaderProps> = ({
  onClose,
  onBack,
  currentView = "home",
  assistantName = "Gaurav Assistant",
  authState,
  onSignOut,
}) => {
  const isChildView = currentView !== "home";

  return (
    <header className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-neutral-100 bg-white/95 backdrop-blur-md shrink-0 select-none">
      {/* Left: Identity or Back Navigation */}
      <div className="flex items-center gap-2.5 min-w-0">
        {isChildView && onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1 px-2.5 py-1.5 -ml-1 rounded-full text-xs font-semibold text-neutral-700 hover:text-neutral-950 bg-neutral-100 hover:bg-neutral-200/80 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]"
            aria-label="Back to Home"
          >
            <IoChevronBack className="w-4 h-4 text-neutral-600 shrink-0" />
            <span>Back</span>
          </button>
        ) : (
          <div className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#7C3AED]/10 border border-[#7C3AED]/20 flex items-center justify-center text-[#7C3AED] shrink-0 overflow-hidden shadow-2xs">
            <IoChatbubbleEllipses className="w-4 h-4 text-[#7C3AED]" />
          </div>
        )}

        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm sm:text-[15px] font-bold text-neutral-950 leading-tight tracking-tight truncate">
              {currentView === "questions"
                ? "Predefined Questions"
                : currentView === "chat"
                ? "Live Chat with Gaurav"
                : assistantName}
            </span>
            {currentView === "chat" && authState === "AUTHENTICATED" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Verified
              </span>
            )}
          </div>
          <div className="text-[11px] font-medium text-neutral-500 leading-tight mt-0.5 truncate">
            {currentView === "chat" ? (
              <span>Direct Channel &bull; High Priority</span>
            ) : (
              <span>{isChildView ? assistantName : "Portfolio Guide"}</span>
            )}
          </div>
        </div>
      </div>

      {/* Right Controls: Sleek Executive Sign Out & Close Modal */}
      <div className="flex items-center gap-1.5 shrink-0">
        {currentView === "chat" && authState === "AUTHENTICATED" && onSignOut && (
          <button
            type="button"
            onClick={onSignOut}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-neutral-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
            title="Sign out of Live Chat session"
            aria-label="Sign out of Live Chat"
          >
            <IoLogOutOutline className="w-4 h-4 text-neutral-400 group-hover:text-rose-500" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        )}

        <button
          type="button"
          onClick={onClose}
          className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors duration-150 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED] shrink-0"
          aria-label="Close assistant"
        >
          <IoClose className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
};
