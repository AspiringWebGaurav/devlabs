"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { AssistantWindow } from "./AssistantWindow";
import { AssistantTurnstileGate } from "./auth/AssistantTurnstileGate";
import type { AssistantBubbleProps, AssistantPositionMode, AssistantView } from "./types";

const DRAG_THRESHOLD_PX = 6;
const STORAGE_KEY = "gaurav_assistant_drag_pos";

interface DragCoordinates {
  x: number;
  y: number;
}

interface PointerOrigin {
  pointerId: number;
  clientX: number;
  clientY: number;
  scrollY: number;
  time: number;
}

export const AssistantBubble: React.FC<AssistantBubbleProps> = ({ config }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isWindowMounted, setIsWindowMounted] = useState(false);
  const [isTurnstileGateOpen, setIsTurnstileGateOpen] = useState(false);
  const [isPreparingTurnstile, setIsPreparingTurnstile] = useState(false);
  const [initialView, setInitialView] = useState<AssistantView>("home");
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [customPosition, setCustomPosition] = useState<DragCoordinates | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const triggerButtonRef = useRef<HTMLButtonElement | null>(null);
  const dragStartRef = useRef<{ pointerX: number; pointerY: number; bubbleX: number; bubbleY: number } | null>(null);
  const hasDraggedRef = useRef(false);
  const pointerOriginRef = useRef<PointerOrigin | null>(null);
  const hasMovedPastThresholdRef = useRef(false);
  const wasCanceledRef = useRef(false);
  const lastScrollTimestampRef = useRef(0);
  const isPageScrollingRef = useRef(false);
  const scrollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const prepIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const prefersReducedMotion = useReducedMotion();

  const isEnabled = config?.isEnabled !== false;
  const assistantName = config?.assistantName || "Gaurav Assistant";
  const avatarUrl = config?.avatarUrl && config.avatarUrl.trim() !== "" ? config.avatarUrl.trim() : undefined;
  const positionMode: AssistantPositionMode = config?.positionMode === "draggable" ? "draggable" : "fixed";

  // Preload Cloudflare Turnstile Script eagerly in the background on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.turnstile) return;

    const existingScript = document.getElementById("cf-turnstile-script");
    if (!existingScript) {
      const script = document.createElement("script");
      script.id = "cf-turnstile-script";
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
  }, []);

  // Continuous scroll & wheel listener: tracks active scrolling and maintains 550ms lockout buffer
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onScrollOrWheel = () => {
      lastScrollTimestampRef.current = Date.now();
      isPageScrollingRef.current = true;
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
      scrollTimerRef.current = setTimeout(() => {
        isPageScrollingRef.current = false;
      }, 550);
    };
    window.addEventListener("scroll", onScrollOrWheel, { passive: true });
    window.addEventListener("wheel", onScrollOrWheel, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScrollOrWheel);
      window.removeEventListener("wheel", onScrollOrWheel);
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    };
  }, []);

  // Clean up any preparation timers on unmount
  useEffect(() => {
    return () => {
      if (prepIntervalRef.current) {
        clearInterval(prepIntervalRef.current);
      }
    };
  }, []);

  // Clamp coordinates within visible safe viewport bounds
  const clampPosition = useCallback((x: number, y: number): DragCoordinates => {
    if (typeof window === "undefined") return { x, y };

    const bubbleWidth = triggerButtonRef.current?.offsetWidth || 56;
    const bubbleHeight = triggerButtonRef.current?.offsetHeight || 56;
    const margin = 16;

    const safeLeft = margin;
    const safeRight = Math.max(margin, window.innerWidth - bubbleWidth - margin);
    const safeTop = margin;
    const safeBottom = Math.max(margin, window.innerHeight - bubbleHeight - margin);

    return {
      x: Math.min(Math.max(x, safeLeft), safeRight),
      y: Math.min(Math.max(y, safeTop), safeBottom),
    };
  }, []);

  // 1. Restore local session drag coordinates on mount (Draggable mode only)
  useEffect(() => {
    if (positionMode !== "draggable" || typeof window === "undefined") return;

    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as DragCoordinates;
        if (typeof parsed.x === "number" && typeof parsed.y === "number" && !isNaN(parsed.x) && !isNaN(parsed.y)) {
          setCustomPosition(clampPosition(parsed.x, parsed.y));
        }
      }
    } catch {
      // Graceful fallback to default positioning on storage restriction
    }
  }, [positionMode, clampPosition]);

  // 2. Re-clamp stored coordinates on window resize or orientation change
  useEffect(() => {
    if (positionMode !== "draggable" || typeof window === "undefined") return;

    const handleResize = () => {
      setCustomPosition((prev) => {
        if (!prev) return null;
        return clampPosition(prev.x, prev.y);
      });
    };

    window.addEventListener("resize", handleResize, { passive: true });
    window.addEventListener("orientationchange", handleResize, { passive: true });

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
    };
  }, [positionMode, clampPosition]);

  // 3. Listen to contact modal state to auto-close and avoid overlapping overlays
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleContactModalState = (e: Event) => {
      const customEvent = e as CustomEvent<{ isOpen?: boolean }>;
      const isContactOpen = !!customEvent.detail?.isOpen;
      setIsContactModalOpen(isContactOpen);
      if (isContactOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener("contact-modal-state", handleContactModalState);
    return () => window.removeEventListener("contact-modal-state", handleContactModalState);
  }, []);

  // 4. Live admin disable synchronization while open
  useEffect(() => {
    if (!isEnabled && isOpen) {
      setIsOpen(false);
    }
  }, [isEnabled, isOpen]);

  // 5. Clean external link ?chat=open query detection only (Zero surprise open)
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      sessionStorage.removeItem("gaurav_assistant_window_state");

      const urlParams = new URLSearchParams(window.location.search);
      const chatParam = urlParams.get("chat");

      if (chatParam === "open") {
        setInitialView("chat");
        setIsWindowMounted(true);
        setIsOpen(true);

        // Immediate address bar sanitization (clean URL so reload never repeats open)
        const cleanUrl = window.location.pathname + window.location.hash;
        window.history.replaceState({}, "", cleanUrl);
      }
    } catch {
      // Safe fallback
    }
  }, []);

  const isTurnstileSessionValid = useCallback((): boolean => {
    if (typeof window === "undefined") return true;
    try {
      const verifiedAtStr = sessionStorage.getItem("gaurav_assistant_turnstile_verified_at");
      if (!verifiedAtStr) return false;
      const verifiedAt = parseInt(verifiedAtStr, 10);
      if (isNaN(verifiedAt)) return false;
      // 30 minutes active session validity window
      return Date.now() - verifiedAt < 30 * 60 * 1000;
    } catch {
      return true;
    }
  }, []);

  const handleOpen = useCallback(() => {
    if (isPreparingTurnstile) return;

    if (isTurnstileSessionValid()) {
      setIsWindowMounted(true);
      setIsOpen(true);
      return;
    }

    // If Turnstile is already available in window or circuit is broken
    if (
      typeof window !== "undefined" &&
      (window.turnstile || sessionStorage.getItem("gaurav_cf_circuit_broken") === "true")
    ) {
      setIsTurnstileGateOpen(true);
      return;
    }

    // Turnstile is still loading in background -> Show dynamic animated dots on the chat bubble!
    setIsPreparingTurnstile(true);

    if (prepIntervalRef.current) {
      clearInterval(prepIntervalRef.current);
    }

    let attempts = 0;
    const maxAttempts = 35; // 3.5s timeout at 100ms interval
    prepIntervalRef.current = setInterval(() => {
      attempts++;
      if (typeof window !== "undefined" && window.turnstile) {
        if (prepIntervalRef.current) clearInterval(prepIntervalRef.current);
        setIsPreparingTurnstile(false);
        setIsTurnstileGateOpen(true);
      } else if (attempts >= maxAttempts) {
        if (prepIntervalRef.current) clearInterval(prepIntervalRef.current);
        setIsPreparingTurnstile(false);
        // Fallback: open gate anyway so visitor can authenticate via Email OTP / retry
        setIsTurnstileGateOpen(true);
      }
    }, 100);
  }, [isTurnstileSessionValid, isPreparingTurnstile]);

  const handleTurnstileVerified = useCallback(() => {
    setIsTurnstileGateOpen((wasGateOpen) => {
      if (wasGateOpen) {
        setIsWindowMounted(true);
        setIsOpen(true);
      }
      return false;
    });
  }, []);

  const handleClose = useCallback(() => {
    setIsHovered(false);
    setIsDragging(false);
    setIsOpen(false);
  }, []);

  // 6. Focus Restoration when Window finishes exit animation (Desktop only, prevents mobile sticky focus)
  const handleExitComplete = useCallback(() => {
    setIsWindowMounted(false);
    setIsHovered(false);
    setIsDragging(false);
    if (typeof window !== "undefined" && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      triggerButtonRef.current?.focus({ preventScroll: true });
    }
  }, []);

  // 7. Touch gesture handling: tracks start coordinates & scrollY to filter out swipe-scrolling
  const handleTouchStart = (e: React.TouchEvent<HTMLButtonElement>) => {
    const touch = e.touches[0];
    if (touch) {
      pointerOriginRef.current = {
        pointerId: 0,
        clientX: touch.clientX,
        clientY: touch.clientY,
        scrollY: typeof window !== "undefined" ? window.scrollY : 0,
        time: Date.now(),
      };
      hasMovedPastThresholdRef.current = false;
      wasCanceledRef.current = false;
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLButtonElement>) => {
    if (!pointerOriginRef.current) return;
    const touch = e.touches[0];
    if (touch) {
      const dx = Math.abs(touch.clientX - pointerOriginRef.current.clientX);
      const dy = Math.abs(touch.clientY - pointerOriginRef.current.clientY);
      if (dx >= DRAG_THRESHOLD_PX || dy >= DRAG_THRESHOLD_PX) {
        hasMovedPastThresholdRef.current = true;
      }
    }
    if (
      typeof window !== "undefined" &&
      Math.abs(window.scrollY - pointerOriginRef.current.scrollY) > 1.5
    ) {
      hasMovedPastThresholdRef.current = true;
    }
  };

  const handleTouchEnd = () => {
    if (pointerOriginRef.current && typeof window !== "undefined") {
      if (Math.abs(window.scrollY - pointerOriginRef.current.scrollY) > 1.5) {
        hasMovedPastThresholdRef.current = true;
      }
    }
  };

  const handleTouchCancel = () => {
    wasCanceledRef.current = true;
    hasMovedPastThresholdRef.current = true;
    pointerOriginRef.current = null;
  };

  // 8. Pointer Drag & Interaction Controller
  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.pointerType === "mouse") {
      setIsHovered(true);
    }

    pointerOriginRef.current = {
      pointerId: e.pointerId,
      clientX: e.clientX,
      clientY: e.clientY,
      scrollY: typeof window !== "undefined" ? window.scrollY : 0,
      time: Date.now(),
    };
    hasMovedPastThresholdRef.current = false;
    wasCanceledRef.current = false;

    if (positionMode !== "draggable") return;

    const btn = triggerButtonRef.current;
    if (!btn) return;

    const rect = btn.getBoundingClientRect();
    dragStartRef.current = {
      pointerX: e.clientX,
      pointerY: e.clientY,
      bubbleX: customPosition ? customPosition.x : rect.left,
      bubbleY: customPosition ? customPosition.y : rect.top,
    };
    hasDraggedRef.current = false;
    setIsDragging(false);

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!pointerOriginRef.current) return;

    const dx = e.clientX - pointerOriginRef.current.clientX;
    const dy = e.clientY - pointerOriginRef.current.clientY;
    const distance = Math.hypot(dx, dy);

    if (distance >= DRAG_THRESHOLD_PX) {
      hasMovedPastThresholdRef.current = true;
    }

    if (
      typeof window !== "undefined" &&
      Math.abs(window.scrollY - pointerOriginRef.current.scrollY) > 1.5
    ) {
      hasMovedPastThresholdRef.current = true;
    }

    if (positionMode !== "draggable" || !dragStartRef.current) return;

    if (distance >= DRAG_THRESHOLD_PX) {
      hasDraggedRef.current = true;
      setIsDragging(true);

      const targetX = dragStartRef.current.bubbleX + dx;
      const targetY = dragStartRef.current.bubbleY + dy;
      setCustomPosition(clampPosition(targetX, targetY));
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    setIsHovered(false);

    if (pointerOriginRef.current && typeof window !== "undefined") {
      const scrollDelta = Math.abs(window.scrollY - pointerOriginRef.current.scrollY);
      if (scrollDelta > 1.5) {
        hasMovedPastThresholdRef.current = true;
      }
    }

    if (positionMode !== "draggable") return;

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}

    if (hasDraggedRef.current && customPosition) {
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(customPosition));
      } catch {}
    }

    dragStartRef.current = null;
    setIsDragging(false);
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLButtonElement>) => {
    setIsHovered(false);
    wasCanceledRef.current = true;
    hasMovedPastThresholdRef.current = true;
    pointerOriginRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
    dragStartRef.current = null;
    hasDraggedRef.current = false;
    setIsDragging(false);
  };

  // Passive wheel event handler: marks active scroll immediately
  const handleWheel = () => {
    lastScrollTimestampRef.current = Date.now();
    isPageScrollingRef.current = true;
  };

  // Spacebar protection: prevents keyboard spacebar scrolling from activating button click
  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === " " || e.key === "Spacebar") {
      e.preventDefault();
      if (typeof window !== "undefined") {
        window.scrollBy({ top: window.innerHeight * 0.75, behavior: "smooth" });
      }
    }
  };

  // 9. Clean, Rock-Solid Click Handler: 9-Layer Defense
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    // Layer 1: Block untrusted / synthetic clicks
    if (!e.isTrusted) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    // Layer 2: Global Scroll Lockout: Reject clicks within 550ms of any window scroll or wheel
    const timeSinceLastScroll = Date.now() - lastScrollTimestampRef.current;
    if (timeSinceLastScroll < 550) {
      e.preventDefault();
      e.stopPropagation();
      pointerOriginRef.current = null;
      return;
    }

    // Layer 3: Block if page is actively scrolling
    if (isPageScrollingRef.current) {
      e.preventDefault();
      e.stopPropagation();
      pointerOriginRef.current = null;
      return;
    }

    // Layer 4: Block if gesture was canceled by the browser (touch/scroll takeover)
    if (wasCanceledRef.current) {
      e.preventDefault();
      e.stopPropagation();
      wasCanceledRef.current = false;
      pointerOriginRef.current = null;
      return;
    }

    // Layer 5: Block if pointer moved past displacement threshold or draggable displacement occurred
    if (hasMovedPastThresholdRef.current || hasDraggedRef.current) {
      e.preventDefault();
      e.stopPropagation();
      hasMovedPastThresholdRef.current = false;
      hasDraggedRef.current = false;
      pointerOriginRef.current = null;
      return;
    }

    // Layer 6: Mandatory verified pointerdown origin requirement
    if (!pointerOriginRef.current) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    const { clientX, clientY, scrollY, time } = pointerOriginRef.current;
    pointerOriginRef.current = null; // Consume immediately

    // Layer 7: Window scroll delta verification: if window scrolled by > 1.5px, it was a page scroll
    const currentScrollY = typeof window !== "undefined" ? window.scrollY : 0;
    if (Math.abs(currentScrollY - scrollY) > 1.5) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    // Layer 8: Physical distance moved verification
    const distanceMoved = Math.hypot(e.clientX - clientX, e.clientY - clientY);
    if (distanceMoved >= DRAG_THRESHOLD_PX) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    // Layer 9: Deliberate tap duration verification (30ms - 850ms)
    const tapDuration = Date.now() - time;
    if (tapDuration < 30 || tapDuration > 850) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    // Intentional, verified user click
    handleOpen();
  };

  // If assistant is disabled via admin config, render nothing
  if (!isEnabled) {
    return null;
  }

  // Positioning style based on mode
  const bubbleStyle: React.CSSProperties =
    positionMode === "draggable" && customPosition
      ? {
          position: "fixed",
          left: `${customPosition.x}px`,
          top: `${customPosition.y}px`,
          bottom: "auto",
          right: "auto",
          touchAction: "none",
        }
      : {
          position: "fixed",
          bottom: "calc(1.25rem + env(safe-area-inset-bottom, 0px))",
          right: "calc(1.25rem + env(safe-area-inset-right, 0px))",
          touchAction: "manipulation",
        };

  return (
    <>
      <AnimatePresence mode="wait">
        {!isWindowMounted && !isContactModalOpen && (
          <motion.button
            key="assistant-launcher-btn"
            ref={triggerButtonRef}
            type="button"
            onClick={handleClick}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchCancel}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
            onWheel={handleWheel}
            onKeyDown={handleKeyDown}
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.7, y: 16 }}
            animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
            exit={
              prefersReducedMotion
                ? { opacity: 0, transition: { duration: 0.1 } }
                : {
                    opacity: 0,
                    scale: 0.75,
                    y: 12,
                    transition: { duration: 0.16, ease: "easeOut" },
                  }
            }
            transition={
              prefersReducedMotion
                ? { duration: 0.12 }
                : {
                    type: "spring",
                    stiffness: 360,
                    damping: 24,
                    mass: 0.7,
                  }
            }
            whileHover={prefersReducedMotion ? undefined : { scale: 1.06, y: -2 }}
            whileTap={prefersReducedMotion ? undefined : { scale: 0.94 }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className={`fixed z-[4900] group flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white text-neutral-900 border ${
              isPreparingTurnstile
                ? "border-[#7C3AED] shadow-[0_12px_45px_rgba(124,58,237,0.45)] ring-2 ring-[#7C3AED]/30"
                : "border-neutral-200/90 shadow-[0_8px_30px_rgba(0,0,0,0.25)] hover:shadow-[0_12px_45px_rgba(124,58,237,0.45)] hover:border-[#7C3AED]/40"
            } transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED] focus-visible:ring-offset-2 focus-visible:ring-offset-[#000319] select-none ${
              positionMode === "draggable" ? (isDragging ? "cursor-grabbing" : "cursor-grab") : "cursor-pointer"
            }`}
            style={bubbleStyle}
            aria-label={isPreparingTurnstile ? `Preparing ${assistantName}...` : `Open ${assistantName}`}
            aria-haspopup="dialog"
            aria-expanded={isOpen}
          >
            {/* 1. Drag Grip Indicator (Namecheap style) - Visible on hover/active when draggable mode is enabled */}
            {positionMode === "draggable" && (
              <span
                className={`absolute -left-3.5 sm:-left-4 top-1/2 -translate-y-1/2 w-4 h-7 sm:w-4.5 sm:h-8 rounded-full bg-white/95 text-neutral-500 border border-neutral-200/90 shadow-[0_4px_12px_rgba(0,0,0,0.15)] flex items-center justify-center pointer-events-none transition-all duration-200 ${
                  isDragging
                    ? "opacity-100 scale-105 -translate-x-1 border-[#7C3AED]/60 text-[#7C3AED]"
                    : "opacity-0 group-hover:opacity-100 group-hover:-translate-x-1"
                }`}
                aria-hidden="true"
              >
                <span className="grid grid-cols-2 gap-0.5 sm:gap-1">
                  <span className="w-0.5 h-0.5 sm:w-1 sm:h-1 rounded-full bg-current" />
                  <span className="w-0.5 h-0.5 sm:w-1 sm:h-1 rounded-full bg-current" />
                  <span className="w-0.5 h-0.5 sm:w-1 sm:h-1 rounded-full bg-current" />
                  <span className="w-0.5 h-0.5 sm:w-1 sm:h-1 rounded-full bg-current" />
                  <span className="w-0.5 h-0.5 sm:w-1 sm:h-1 rounded-full bg-current" />
                  <span className="w-0.5 h-0.5 sm:w-1 sm:h-1 rounded-full bg-current" />
                </span>
              </span>
            )}

            {/* 2. Ambient subtle glow ring on hover */}
            <span
              className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#7C3AED]/20 via-transparent to-[#CBACF9]/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
              aria-hidden="true"
            />

            {/* 3. Icon: Speech Bubble with Namecheap-style Sea Wave Dots Animation */}
            <div
              className={`relative z-10 flex items-center justify-center transition-colors duration-200 pointer-events-none ${
                isPreparingTurnstile ? "text-[#7C3AED]" : "text-neutral-800 group-hover:text-[#7C3AED]"
              }`}
            >
              <svg
                viewBox="0 0 28 28"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-6 h-6 sm:w-7 sm:h-7 transition-transform duration-200 group-hover:scale-105"
              >
                {/* Speech Bubble Shell */}
                <path
                  d="M14 3.5C7.925 3.5 3 7.865 3 13.25c0 2.92 1.474 5.545 3.815 7.306-.283 1.637-1.028 3.315-2.085 4.396a.55.55 0 0 0 .47.893c2.72-.066 5.14-1.185 6.602-2.34.72.122 1.464.195 2.22.195 6.075 0 11-4.365 11-9.75S20.075 3.5 14 3.5z"
                  fill="currentColor"
                />

                {/* 3 Sea-Wave Animated Floating Dots (Static on normal, sea-wave on hover / mobile click / preparing) */}
                <motion.circle
                  cx="9.5"
                  cy="13.25"
                  r="1.45"
                  fill="#FFFFFF"
                  animate={
                    prefersReducedMotion || (!isHovered && !isDragging && !isPreparingTurnstile)
                      ? { y: 0 }
                      : {
                          y: [0, -3.2, 0],
                        }
                  }
                  transition={
                    prefersReducedMotion || (!isHovered && !isDragging && !isPreparingTurnstile)
                      ? { duration: 0.15 }
                      : {
                          duration: 0.7,
                          repeat: Infinity,
                          ease: "easeInOut",
                          delay: 0,
                        }
                  }
                />
                <motion.circle
                  cx="14"
                  cy="13.25"
                  r="1.45"
                  fill="#FFFFFF"
                  animate={
                    prefersReducedMotion || (!isHovered && !isDragging && !isPreparingTurnstile)
                      ? { y: 0 }
                      : {
                          y: [0, -3.2, 0],
                        }
                  }
                  transition={
                    prefersReducedMotion || (!isHovered && !isDragging && !isPreparingTurnstile)
                      ? { duration: 0.15 }
                      : {
                          duration: 0.7,
                          repeat: Infinity,
                          ease: "easeInOut",
                          delay: 0.16,
                        }
                  }
                />
                <motion.circle
                  cx="18.5"
                  cy="13.25"
                  r="1.45"
                  fill="#FFFFFF"
                  animate={
                    prefersReducedMotion || (!isHovered && !isDragging && !isPreparingTurnstile)
                      ? { y: 0 }
                      : {
                          y: [0, -3.2, 0],
                        }
                  }
                  transition={
                    prefersReducedMotion || (!isHovered && !isDragging && !isPreparingTurnstile)
                      ? { duration: 0.15 }
                      : {
                          duration: 0.7,
                          repeat: Infinity,
                          ease: "easeInOut",
                          delay: 0.32,
                        }
                  }
                />
              </svg>
            </div>
          </motion.button>
        )}
      </AnimatePresence>

      {/* The Open Assistant Shell (Empty Foundation) */}
      <AssistantWindow
        isOpen={isOpen}
        onClose={handleClose}
        assistantName={assistantName}
        avatarUrl={avatarUrl}
        onExitComplete={handleExitComplete}
        initialView={initialView}
      />

      {/* Cloudflare Turnstile Verification Dynamic Popover */}
      {isTurnstileGateOpen && (
        <AssistantTurnstileGate
          isOpen={isTurnstileGateOpen}
          onClose={() => setIsTurnstileGateOpen(false)}
          onVerified={handleTurnstileVerified}
          positionMode={positionMode}
          customPosition={customPosition}
        />
      )}
    </>
  );
};
