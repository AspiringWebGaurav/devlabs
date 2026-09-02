"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { AssistantHeader } from "./AssistantHeader";
import { AssistantHomeView } from "./AssistantHomeView";
import { AssistantQuestionsView } from "./AssistantQuestionsView";
import { AssistantChatView } from "./AssistantChatView";
import { AssistantWhatsAppView } from "./AssistantWhatsAppView";
import type {
  AssistantWindowProps,
  AssistantView,
  LiveChatAuthState,
} from "./types";

export const AssistantWindow: React.FC<AssistantWindowProps> = ({
  isOpen,
  onClose,
  assistantName = "Gaurav Assistant",
  avatarUrl,
  onExitComplete,
  initialView = "home",
}) => {
  const windowRef = useRef<HTMLDivElement | null>(null);
  const prefersReducedMotion = useReducedMotion();
  const [currentView, setCurrentView] = useState<AssistantView>(initialView);
  const [slideDirection, setSlideDirection] = useState<1 | -1>(1);

  // Set view if initialView changes while open
  useEffect(() => {
    if (isOpen && initialView) {
      setCurrentView(initialView);
    }
  }, [isOpen, initialView]);

  // Reset to initialView whenever the window closes
  useEffect(() => {
    if (!isOpen) {
      setCurrentView(initialView || "home");
    }
  }, [isOpen, initialView]);

  // Live Chat sync state for header
  const [chatAuthState, setChatAuthState] = useState<LiveChatAuthState>("CHECKING");
  const [chatSignOutFn, setChatSignOutFn] = useState<(() => void) | undefined>(undefined);

  const handleRegisterSignOut = useCallback((fn: () => void) => {
    setChatSignOutFn(() => fn);
  }, []);

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
          className="fixed inset-0 z-[5050] bg-black/60 backdrop-blur-md cursor-pointer"
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
          className="fixed z-[5060] flex flex-col bg-white text-neutral-950 overflow-hidden inset-0 w-full h-[100dvh] max-h-[100dvh] rounded-none border-0 sm:inset-auto sm:bottom-6 sm:right-6 sm:w-[460px] md:w-[485px] lg:w-[495px] sm:max-w-[calc(100vw-3rem)] sm:h-[580px] md:h-[620px] lg:h-[650px] sm:max-h-[calc(100dvh-4.5rem)] sm:rounded-[22px] sm:border sm:border-neutral-200/80 sm:shadow-[0_20px_50px_rgba(0,0,0,0.12),0_0_0_1px_rgba(0,0,0,0.04)] focus:outline-none"
          style={{
            transformOrigin: "bottom right",
            colorScheme: "light",
            paddingTop: "env(safe-area-inset-top, 0px)",
            paddingBottom: "env(safe-area-inset-bottom, 0px)",
            paddingLeft: "env(safe-area-inset-left, 0px)",
            paddingRight: "env(safe-area-inset-right, 0px)",
          }}
        >
          {/* 1. Dynamic Header */}
          <AssistantHeader
            onClose={onClose}
            onBack={handleBack}
            currentView={currentView}
            assistantName={assistantName}
            avatarUrl={avatarUrl}
            authState={chatAuthState}
            onSignOut={chatSignOutFn}
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
                className="w-full h-full flex-1 flex flex-col items-center justify-center"
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
                    onAuthStateChange={setChatAuthState}
                    onRegisterSignOut={handleRegisterSignOut}
                  />
                )}
                {currentView === "whatsapp" && (
                  <AssistantWhatsAppView
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
          {/* 3. Fixed Footer: Terms, Privacy & Do's and Don'ts */}
          <footer className="py-2.5 px-3 sm:px-4 bg-white shrink-0 select-none border-t border-neutral-100">
            <div className="text-[11px] sm:text-[11.5px] leading-relaxed text-neutral-500 text-center px-1 max-w-[96%] mx-auto flex items-center justify-center flex-wrap gap-x-2.5 gap-y-0.5">
              <Link
                href="/terms?focus=assistant#assistant-terms"
                target="_blank"
                rel="noopener noreferrer"
                className="text-neutral-500 hover:text-[#7C3AED] font-medium transition-colors hover:underline hover:underline-offset-2"
              >
                Terms of Service
              </Link>
              <span className="text-neutral-300">•</span>
              <Link
                href="/privacy?focus=assistant#assistant-privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-neutral-500 hover:text-[#7C3AED] font-medium transition-colors hover:underline hover:underline-offset-2"
              >
                Privacy Policy
              </Link>
              <span className="text-neutral-300">•</span>
              <Link
                href="/chat#dos-and-donts"
                target="_blank"
                rel="noopener noreferrer"
                className="text-neutral-700 hover:text-[#7C3AED] font-semibold transition-colors hover:underline hover:underline-offset-2"
              >
                Do&apos;s &amp; Don&apos;ts
              </Link>
            </div>
          </footer>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

