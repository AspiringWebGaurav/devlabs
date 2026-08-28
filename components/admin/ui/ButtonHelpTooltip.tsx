"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

interface ButtonHelpBadgeProps {
  text: string;
  position?: "top" | "bottom" | "left" | "right";
  align?: "center" | "left" | "right";
  className?: string;
}

interface TooltipCoords {
  top: number;
  left: number;
  width: number;
  arrowLeft: number;
  placement: "top" | "bottom";
}

export const ButtonHelpBadge: React.FC<ButtonHelpBadgeProps> = ({
  text,
  position = "top",
  align = "center",
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<TooltipCoords | null>(null);

  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const tr = triggerRef.current.getBoundingClientRect();

    // If trigger element is completely scrolled out of the viewport, close tooltip
    if (tr.bottom < 0 || tr.top > window.innerHeight) {
      setIsOpen(false);
      return;
    }

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const margin = 16;

    // Explicit deterministic width clamped to viewport width
    const width = Math.min(vw < 640 ? 250 : 280, vw - margin * 2);
    const th = tooltipRef.current ? tooltipRef.current.offsetHeight : 72;

    // Determine vertical placement (top vs bottom) with viewport bounds checking
    let placement: "top" | "bottom" = "top";
    if (position === "bottom") {
      if (tr.bottom + 8 + th <= vh - margin || tr.top - th - 8 < margin) {
        placement = "bottom";
      } else {
        placement = "top";
      }
    } else {
      if (tr.top - th - 8 >= margin || tr.bottom + 8 + th > vh - margin) {
        placement = "top";
      } else {
        placement = "bottom";
      }
    }

    const top = placement === "top" ? tr.top - th - 8 : tr.bottom + 8;

    // Determine horizontal placement and clamp strictly within [margin, vw - width - margin]
    const triggerCenterX = tr.left + tr.width / 2;
    let targetLeft: number;

    if (align === "right") {
      targetLeft = tr.right - width;
    } else if (align === "left") {
      targetLeft = tr.left;
    } else {
      targetLeft = triggerCenterX - width / 2;
    }

    const maxLeft = Math.max(margin, vw - width - margin);
    const clampedLeft = Math.max(margin, Math.min(maxLeft, targetLeft));

    // Calculate micro arrow horizontal offset relative to the tooltip bubble
    const rawArrowLeft = triggerCenterX - clampedLeft;
    const arrowLeft = Math.max(14, Math.min(width - 14, rawArrowLeft));

    setCoords({
      top,
      left: clampedLeft,
      width,
      arrowLeft,
      placement,
    });
  }, [position, align]);

  // Recalculate position whenever tooltip opens or when measured dimensions become available
  useEffect(() => {
    if (!isOpen) return;

    updatePosition();
    const animId = requestAnimationFrame(updatePosition);

    const handleScroll = () => updatePosition();
    const handleResize = () => updatePosition();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };

    window.addEventListener("scroll", handleScroll, { passive: true, capture: true });
    window.addEventListener("resize", handleResize, { passive: true });
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, updatePosition]);

  // Click outside to close (useful on touch / mobile)
  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node) &&
        tooltipRef.current &&
        !tooltipRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", handleOutsideClick);
    return () => {
      document.removeEventListener("pointerdown", handleOutsideClick);
    };
  }, [isOpen]);

  return (
    <>
      <span
        ref={triggerRef}
        className={`group/help relative inline-flex items-center justify-center ${className}`}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setIsOpen(false)}
        onClick={(e) => {
          // Prevent activating parent button/link when clicking or tapping help badge
          e.preventDefault();
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        role="button"
        tabIndex={0}
        aria-label={text}
      >
        <span
          className="w-3.5 h-3.5 rounded-full border border-current flex items-center justify-center text-[9px] font-admin-mono font-bold opacity-70 group-hover/help:opacity-100 group-focus/help:opacity-100 transition-opacity ml-1.5 shrink-0 cursor-help select-none"
        >
          ?
        </span>
      </span>

      {/* Floating Tooltip Bubble rendered in Document Body Portal for Zero Overflow Clipping */}
      {mounted &&
        isOpen &&
        coords &&
        createPortal(
          <span
            ref={tooltipRef}
            role="tooltip"
            style={{
              position: "fixed",
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              width: `${coords.width}px`,
              zIndex: 999999,
            }}
            className="pointer-events-none p-3 bg-[#0F172A] text-[#F8FAFC] text-xs font-admin-sans rounded-xs shadow-2xl border border-[#334155] leading-relaxed text-left whitespace-normal break-words normal-case font-normal tracking-normal select-none transition-opacity duration-150"
          >
            {text}

            {/* Micro Arrow Pointer with Pixel-Perfect Alignment */}
            {coords.placement === "top" ? (
              <span
                style={{ left: `${coords.arrowLeft}px` }}
                className="absolute -bottom-1 -translate-x-1/2 w-2 h-2 bg-[#0F172A] border-r border-b border-[#334155] rotate-45 pointer-events-none"
              />
            ) : (
              <span
                style={{ left: `${coords.arrowLeft}px` }}
                className="absolute -top-1 -translate-x-1/2 w-2 h-2 bg-[#0F172A] border-l border-t border-[#334155] rotate-45 pointer-events-none"
              />
            )}
          </span>,
          document.body
        )}
    </>
  );
};


