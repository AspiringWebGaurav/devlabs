"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { AssistantHeader } from "./AssistantHeader";
import { AssistantHomeView } from "./AssistantHomeView";
import { AssistantQuestionsView } from "./AssistantQuestionsView";
import { AssistantChatView } from "./AssistantChatView";
import type { AssistantWindowProps, AssistantView } from "./types";

export const AssistantWindow: React.FC<AssistantWindowProps> = ({
  isOpen,
  onClose,
  assistantName = "Gaurav Assistant",
  avatarUrl,
  onExitComplete,
}) => {
  const windowRef = useRef<HTMLDivElement | null>(null);
  const prefersReducedMotion = useReducedMotion();
  const [currentView, setCurrentView] = useState<AssistantView>("home");
  const [slideDirection, setSlideDirection] = useState<1 | -1>(1);

  // Reset to Home view whenever the window closes
  useEffect(() => {
    if (!isOpen) {
      setCurrentView("home");
    }
  }, [isOpen]);

  const handleNavigate = (view: AssistantView) => {
    setSlideDirection(1);
    setCurrentView(view);
  };

  const handleBack = () => {
    setSlideDirection(-1);
    setCurrentView("home");
  };

  // 1. Dispatch assistant-modal-state event on open/close for coordination with FloatingNav & ScrollToTop
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("assistant-modal-state", { detail: { isOpen } })
      );
    }

    return () => {
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("assistant-modal-state", { detail: { isOpen: false } })
        );
      }
    };
  }, [isOpen]);

  // 2. If ContactModal opens, auto-close the assistant window to prevent overlapping overlays
  useEffect(() => {
    if (typeof window === "undefined" || !isOpen) return;

    const handleContactModalState = (e: Event) => {
      const customEvent = e as CustomEvent<{ isOpen?: boolean }>;
      if (customEvent.detail?.isOpen) {
        onClose();
      }
    };

    window.addEventListener("contact-modal-state", handleContactModalState);
    return () => window.removeEventListener("contact-modal-state", handleContactModalState);
  }, [isOpen, onClose]);

  // 3. Reversible iOS Safari & Desktop Scroll Lock with Pre-existing Style Preservation
  useEffect(() => {
    if (!isOpen || typeof window === "undefined") return;

    const prevStyles = {
      overflow: document.body.style.overflow,
      position: document.body.style.position,
      top: document.body.style.top,
      width: document.body.style.width,
      touchAction: document.body.style.touchAction,
    };
    const scrollY = window.scrollY;

    // Apply rock-solid fixed body scroll lock
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    document.body.style.touchAction = "none";

    return () => {
      // Restore pre-existing styles and scroll position exactly
      document.body.style.overflow = prevStyles.overflow;
      document.body.style.position = prevStyles.position;
      document.body.style.top = prevStyles.top;
      document.body.style.width = prevStyles.width;
      document.body.style.touchAction = prevStyles.touchAction;
      window.scrollTo({ top: scrollY, behavior: "instant" });
    };
  }, [isOpen]);

  // 5. Focus Entry on Dialog Mount (Zero arbitrary setTimeout)
  useEffect(() => {
    if (!isOpen) return;

    // Immediate frame-0 focus entry
    if (windowRef.current) {
      const closeBtn = windowRef.current.querySelector<HTMLElement>('button[aria-label="Close assistant"]');
      const focusable = closeBtn || windowRef.current.querySelector<HTMLElement>('button, [tabindex="0"]');
      if (focusable) {
        focusable.focus({ preventScroll: true });
      } else {
        windowRef.current.focus({ preventScroll: true });
      }
    }
  }, [isOpen]);

  // 6. Keyboard accessibility: Escape to close and Ref-Scoped Tab cycle trap
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === "Tab" && isOpen && windowRef.current) {
        const focusableElements = windowRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length > 0) {
          const first = focusableElements[0];
          const last = focusableElements[focusableElements.length - 1];

          if (e.shiftKey) {
            if (document.activeElement === first) {
              last.focus();
              e.preventDefault();
            }
          } else {
            if (document.activeElement === last) {
              first.focus();
              e.preventDefault();
            }
          }
        }
      }
    },
    [isOpen, onClose]
  );

  useEffect(() => {
    if (!isOpen) return;
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleKeyDown]);

  return (
    <AnimatePresence onExitComplete={onExitComplete}>
      {isOpen && (
        <motion.div
          key="assistant-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{
            opacity: 0,
            transition: prefersReducedMotion ? { duration: 0.12 } : { duration: 0.24, ease: "easeInOut" },
          }}
          transition={{ duration: 0.24, ease: "easeInOut" }}
          onClick={onClose}
          className="fixed inset-0 z-[5050] bg-black/45 backdrop-blur-md cursor-pointer"
          aria-hidden="true"
        />
      )}

      {isOpen && (
        <motion.div
          key="assistant-window-modal"
          ref={windowRef}
          role="dialog"
          aria-modal="true"
          aria-label={assistantName}
          tabIndex={-1}
          initial={
            prefersReducedMotion
              ? { opacity: 0 }
              : { opacity: 0, scale: 0.85, y: 16 }
          }
          animate={
            prefersReducedMotion
              ? { opacity: 1 }
              : { opacity: 1, scale: 1, y: 0 }
          }
          exit={
            prefersReducedMotion
              ? { opacity: 0, transition: { duration: 0.12 } }
              : {
                  opacity: 0,
                  scale: 0.85,
                  y: 16,
                  transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] },
                }
          }
          transition={
            prefersReducedMotion
              ? { duration: 0.15 }
              : {
                  type: "spring",
                  stiffness: 350,
                  damping: 26,
                  mass: 0.75,
                }
          }
          className="fixed z-[5060] flex flex-col bg-white text-neutral-900 overflow-hidden inset-0 w-full h-[100dvh] max-h-[100dvh] rounded-none border-0 sm:inset-auto sm:bottom-6 sm:right-6 sm:w-[460px] md:w-[485px] lg:w-[495px] sm:max-w-[calc(100vw-3rem)] sm:h-[580px] md:h-[620px] lg:h-[650px] sm:max-h-[calc(100dvh-4.5rem)] sm:rounded-[22px] sm:border sm:border-neutral-200/90 sm:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3),0_0_0_1px_rgba(0,0,0,0.06)] focus:outline-none"
          style={{
            transformOrigin: "bottom right",
            paddingTop: "env(safe-area-inset-top, 0px)",
            paddingBottom: "env(safe-area-inset-bottom, 0px)",
            paddingLeft: "env(safe-area-inset-left, 0px)",
            paddingRight: "env(safe-area-inset-right, 0px)",
          }}
        >
            {/* 1. Fixed Header with Dynamic Identity, Back Navigation & Accessible Close Button */}
            <AssistantHeader
              onClose={onClose}
              onBack={handleBack}
              currentView={currentView}
              assistantName={assistantName}
              avatarUrl={avatarUrl}
            />

            {/* 2. Scrollable Body: Dynamic Animated Page Views (Home / Questions / Chat) */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 bg-white flex flex-col items-center justify-center select-none relative">
              <AnimatePresence mode="wait" custom={slideDirection}>
                <motion.div
                  key={currentView}
                  custom={slideDirection}
                  initial={
                    prefersReducedMotion
                      ? { opacity: 0 }
                      : { opacity: 0, x: slideDirection * 24 }
                  }
                  animate={
                    prefersReducedMotion
                      ? { opacity: 1 }
                      : { opacity: 1, x: 0 }
                  }
                  exit={
                    prefersReducedMotion
                      ? { opacity: 0 }
                      : { opacity: 0, x: -slideDirection * 24 }
                  }
                  transition={
                    prefersReducedMotion
                      ? { duration: 0.1 }
                      : { duration: 0.2, ease: [0.16, 1, 0.3, 1] }
                  }
                  className="w-full flex-1 flex flex-col items-center justify-center"
                >
                  {currentView === "home" && (
                    <AssistantHomeView
                      onNavigate={handleNavigate}
                      onBack={handleBack}
                      assistantName={assistantName}
                      avatarUrl={avatarUrl}
                    />
                  )}
                  {currentView === "questions" && (
                    <AssistantQuestionsView
                      onNavigate={handleNavigate}
                      onBack={handleBack}
                      assistantName={assistantName}
                      avatarUrl={avatarUrl}
                    />
                  )}
                  {currentView === "chat" && (
                    <AssistantChatView
                      onNavigate={handleNavigate}
                      onBack={handleBack}
                      assistantName={assistantName}
                      avatarUrl={avatarUrl}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* 3. Fixed Footer: Policy Disclaimer */}
            <div className="p-3 sm:p-4 pt-2 bg-white shrink-0 select-none border-t border-neutral-100/80">
              <div className="text-[11px] sm:text-[12px] leading-relaxed text-[#70707b] text-center px-1 max-w-[96%] mx-auto">
                <p>
                  AI assistant can make mistakes. Subject to our{" "}
                  <a
                    href="/terms?focus=assistant#assistant-terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#52525c] hover:text-black underline underline-offset-2 transition-colors font-medium"
                  >
                    Terms of Service
                  </a>
                  {" "}and{" "}
                  <a
                    href="/privacy?focus=assistant#assistant-privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#52525c] hover:text-black underline underline-offset-2 transition-colors font-medium"
                  >
                    Privacy Policy
                  </a>
                  .
                </p>
              </div>
            </div>
          </motion.div>
        )}
    </AnimatePresence>
  );
};
