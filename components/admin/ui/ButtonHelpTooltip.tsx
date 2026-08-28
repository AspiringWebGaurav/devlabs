"use client";

import React, { useState } from "react";

interface ButtonHelpBadgeProps {
  text: string;
  position?: "top" | "bottom" | "left" | "right";
  align?: "center" | "left" | "right";
  className?: string;
}

export const ButtonHelpBadge: React.FC<ButtonHelpBadgeProps> = ({
  text,
  position = "top",
  align = "center",
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const getPositionClasses = () => {
    if (position === "right") {
      return "left-full ml-3 top-1/2 -translate-y-1/2";
    }
    if (position === "left") {
      return "right-full mr-3 top-1/2 -translate-y-1/2";
    }
    if (position === "bottom") {
      if (align === "right") return "top-full mt-2 right-0 left-auto translate-x-0";
      if (align === "left") return "top-full mt-2 left-0 right-auto translate-x-0";
      return "top-full mt-2 left-1/2 -translate-x-1/2";
    }
    // Default: position === "top"
    if (align === "right") return "bottom-full mb-2 right-0 left-auto translate-x-0";
    if (align === "left") return "bottom-full mb-2 left-0 right-auto translate-x-0";
    return "bottom-full mb-2 left-1/2 -translate-x-1/2";
  };

  return (
    <span
      className={`group/help relative inline-flex items-center justify-center ${className}`}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
      onClick={(e) => {
        // Prevent button click when tapping the help badge on mobile
        e.stopPropagation();
        setIsOpen((prev) => !prev);
      }}
      role="tooltip"
      aria-label={text}
    >
      <span
        className="w-3.5 h-3.5 rounded-full border border-current flex items-center justify-center text-[9px] font-admin-mono font-bold opacity-70 group-hover/help:opacity-100 transition-opacity ml-1.5 shrink-0 cursor-help select-none"
      >
        ?
      </span>

      {/* Floating Tooltip Bubble with Micro Arrow */}
      <span
        className={`pointer-events-none absolute z-50 ${getPositionClasses()} transition-all duration-150 p-2.5 bg-[#0F172A] text-white text-[11px] font-admin-sans rounded-xs shadow-2xl border border-[#334155] w-max max-w-[240px] sm:max-w-xs leading-relaxed text-left whitespace-normal normal-case font-normal tracking-normal ${
          isOpen ? "opacity-100 visible" : "opacity-0 invisible"
        }`}
      >
        {text}

        {/* Micro Arrow Pointer */}
        {position === "right" && (
          <span className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-[#0F172A] border-l border-b border-[#334155] rotate-45 pointer-events-none" />
        )}
        {position === "left" && (
          <span className="absolute -right-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-[#0F172A] border-r border-t border-[#334155] rotate-45 pointer-events-none" />
        )}
        {position === "top" && (
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#0F172A] border-r border-b border-[#334155] rotate-45 pointer-events-none" />
        )}
        {position === "bottom" && (
          <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#0F172A] border-l border-t border-[#334155] rotate-45 pointer-events-none" />
        )}
      </span>
    </span>
  );
};


