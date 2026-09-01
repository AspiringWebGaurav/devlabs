"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export type UserScrollIntent = "AT_BOTTOM" | "NEAR_BOTTOM" | "SCROLLED_AWAY";
export type LifecycleState =
  | "UNINITIALIZED"
  | "INITIALIZING"
  | "READY"
  | "SETTLING"
  | "HISTORY_PREPEND"
  | "DESTROYED";

export type ScrollReason =
  | "initial-load"
  | "admin-reply"
  | "visitor-message"
  | "latest-button"
  | "composer-resize"
  | "layout-settle"
  | "history-restore";

export interface ChatMessageItem {
  id: string;
  sender: "gaurav" | "visitor" | "user" | string;
  createdAt?: string;
  timestamp?: string;
}

export interface UseChatAutoScrollOptions {
  /** Unique conversation identifier (e.g. threadId or email) for invalidation */
  conversationKey: string;
  /** List of current messages */
  messages: ChatMessageItem[];
  /** Sender identity considered as admin / high-priority reply (default: "gaurav") */
  adminSender?: string;
  /** Sender identity considered as visitor / user (default: "visitor") */
  visitorSender?: string;
  /** Invariant tolerance in pixels to consider viewport at bottom (default: 24) */
  bottomTolerance?: number;
  /** Threshold in pixels to classify user as near bottom (default: 90) */
  nearBottomThreshold?: number;
  /** Whether the chat window/modal is currently open (default: true) */
  isOpen?: boolean;
}

export interface UseChatAutoScrollReturn {
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  messagesContentRef: React.RefObject<HTMLDivElement | null>;
  composerContainerRef: React.RefObject<HTMLDivElement | null>;
  handleScroll: () => void;
  scrollToLatest: (behavior?: ScrollBehavior, reason?: ScrollReason) => void;
  prepareHistoryPrepend: () => { oldScrollHeight: number; oldScrollTop: number } | null;
  finishHistoryPrepend: (snapshot: { oldScrollHeight: number; oldScrollTop: number } | null) => void;
  showScrollBottom: boolean;
  hasNewMessageBelow: boolean;
  userScrollIntent: UserScrollIntent;
  lifecycleState: LifecycleState;
}

export function useChatAutoScroll({
  conversationKey,
  messages,
  adminSender = "gaurav",
  visitorSender = "visitor",
  bottomTolerance = 24,
  nearBottomThreshold = 90,
  isOpen = true,
}: UseChatAutoScrollOptions): UseChatAutoScrollReturn {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const messagesContentRef = useRef<HTMLDivElement | null>(null);
  const composerContainerRef = useRef<HTMLDivElement | null>(null);

  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [hasNewMessageBelow, setHasNewMessageBelow] = useState(false);
  const [userScrollIntent, setUserScrollIntent] = useState<UserScrollIntent>("AT_BOTTOM");
  const [lifecycleState, setLifecycleState] = useState<LifecycleState>("UNINITIALIZED");

  // High-frequency mutable refs for race-free synchronization
  const isFollowingBottomRef = useRef(true);
  const isProgrammaticScrollRef = useRef(false);
  const generationRef = useRef(0);
  const rafIdRef = useRef<number | null>(null);
  const settleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const verifyRafIdRef = useRef<number | null>(null);
  const seenMessageIdsRef = useRef<Set<string>>(new Set());
  const prevLatestMessageIdRef = useRef<string | null>(null);
  const isHydratedRef = useRef(false);
  const isPrependInProgressRef = useRef(false);

  // Computes precise distance from bottom of scrollable viewport
  const getDistanceFromBottom = useCallback((container: HTMLElement): number => {
    return container.scrollHeight - container.scrollTop - container.clientHeight;
  }, []);

  // Cancel any active programmatic animation loop
  const cancelActiveScroll = useCallback(() => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    if (verifyRafIdRef.current) {
      cancelAnimationFrame(verifyRafIdRef.current);
      verifyRafIdRef.current = null;
    }
    if (settleTimerRef.current) {
      clearTimeout(settleTimerRef.current);
      settleTimerRef.current = null;
    }
    isProgrammaticScrollRef.current = false;
  }, []);

  // Authoritative Programmatic Scroll Execution (Smooth cubic easing + dynamic target reflow)
  const executeScroll = useCallback(
    (behavior: ScrollBehavior = "smooth", reason: ScrollReason = "layout-settle") => {
      const container = scrollContainerRef.current;
      if (!container || !isOpen) return;

      const capturedGen = generationRef.current;
      isProgrammaticScrollRef.current = true;

      if (process.env.NODE_ENV === "development" && false as boolean) {
        console.debug("[useChatAutoScroll] executeScroll:", reason);
      }

      cancelActiveScroll();

      const isReducedMotion =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (behavior === "auto" || isReducedMotion) {
        const targetScrollTop = Math.max(0, container.scrollHeight - container.clientHeight);
        container.scrollTop = targetScrollTop;
        isProgrammaticScrollRef.current = false;
        setLifecycleState("READY");
        return;
      }

      // High-precision smooth cubic easing scroll
      setLifecycleState("SETTLING");
      const startScrollTop = container.scrollTop;
      const initialTarget = Math.max(0, container.scrollHeight - container.clientHeight);
      const distance = Math.abs(initialTarget - startScrollTop);

      // Dynamic duration: ~260ms to 380ms based on scroll displacement
      const duration = Math.min(380, Math.max(240, distance * 0.35));
      let startTime: number | null = null;

      const step = (timestamp: number) => {
        if (generationRef.current !== capturedGen || !scrollContainerRef.current) return;
        if (!startTime) startTime = timestamp;
        const elapsed = timestamp - startTime;
        const progress = Math.min(1, elapsed / duration);

        // Cubic ease-out: 1 - (1 - t)^3
        const ease = 1 - Math.pow(1 - progress, 3);

        const c = scrollContainerRef.current;
        const dynamicTarget = Math.max(0, c.scrollHeight - c.clientHeight);
        c.scrollTop = startScrollTop + (dynamicTarget - startScrollTop) * ease;

        if (progress < 1) {
          rafIdRef.current = requestAnimationFrame(step);
        } else {
          // Final exact bottom anchor
          if (isFollowingBottomRef.current) {
            c.scrollTop = Math.max(0, c.scrollHeight - c.clientHeight);
          }

          // Single bounded post-layout verification frame (guards against subpixel layout shift)
          verifyRafIdRef.current = requestAnimationFrame(() => {
            if (generationRef.current !== capturedGen || !scrollContainerRef.current) return;
            const finalContainer = scrollContainerRef.current;
            if (isFollowingBottomRef.current) {
              const finalDist = getDistanceFromBottom(finalContainer);
              if (finalDist > bottomTolerance) {
                finalContainer.scrollTop = Math.max(0, finalContainer.scrollHeight - finalContainer.clientHeight);
              }
            }
            isProgrammaticScrollRef.current = false;
            setLifecycleState("READY");
          });
        }
      };

      rafIdRef.current = requestAnimationFrame(step);
    },
    [isOpen, bottomTolerance, getDistanceFromBottom, cancelActiveScroll]
  );

  // Public scrollToLatest method (for floating "Latest" button or explicit send)
  const scrollToLatest = useCallback(
    (behavior: ScrollBehavior = "smooth", reason: ScrollReason = "latest-button") => {
      isFollowingBottomRef.current = true;
      setHasNewMessageBelow(false);
      setShowScrollBottom(false);
      setUserScrollIntent("AT_BOTTOM");
      executeScroll(behavior, reason);
    },
    [executeScroll]
  );

  // User onScroll Event Handler (Continuously captures user scroll intent)
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    // If scroll was triggered programmatically by the engine, do not overwrite user intent
    if (isProgrammaticScrollRef.current) {
      return;
    }

    const distance = getDistanceFromBottom(container);

    if (distance <= bottomTolerance) {
      setUserScrollIntent("AT_BOTTOM");
      isFollowingBottomRef.current = true;
      setShowScrollBottom(false);
      setHasNewMessageBelow(false);
    } else if (distance <= nearBottomThreshold) {
      setUserScrollIntent("NEAR_BOTTOM");
      isFollowingBottomRef.current = true;
      setShowScrollBottom(false);
    } else {
      setUserScrollIntent("SCROLLED_AWAY");
      isFollowingBottomRef.current = false;
      setShowScrollBottom(true);
    }
  }, [bottomTolerance, nearBottomThreshold, getDistanceFromBottom]);

  // User Gesture Interruption Listeners (Wheel & Touchmove passively detect physical scroll gestures)
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || !isOpen) return;

    const handleUserInteraction = () => {
      cancelActiveScroll();
      const distance = getDistanceFromBottom(container);
      if (distance > bottomTolerance) {
        isFollowingBottomRef.current = false;
        setUserScrollIntent("SCROLLED_AWAY");
        setShowScrollBottom(true);
      }
    };

    container.addEventListener("wheel", handleUserInteraction, { passive: true });
    container.addEventListener("touchmove", handleUserInteraction, { passive: true });

    return () => {
      container.removeEventListener("wheel", handleUserInteraction);
      container.removeEventListener("touchmove", handleUserInteraction);
    };
  }, [isOpen, bottomTolerance, getDistanceFromBottom, cancelActiveScroll]);

  // History Prepend Offset Preservation Helpers
  const prepareHistoryPrepend = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return null;
    isPrependInProgressRef.current = true;
    setLifecycleState("HISTORY_PREPEND");
    return {
      oldScrollHeight: container.scrollHeight,
      oldScrollTop: container.scrollTop,
    };
  }, []);

  const finishHistoryPrepend = useCallback((snapshot: { oldScrollHeight: number; oldScrollTop: number } | null) => {
    const container = scrollContainerRef.current;
    if (!container || !snapshot) {
      isPrependInProgressRef.current = false;
      return;
    }

    requestAnimationFrame(() => {
      if (!scrollContainerRef.current) return;
      const c = scrollContainerRef.current;
      const newScrollHeight = c.scrollHeight;
      const delta = newScrollHeight - snapshot.oldScrollHeight;
      c.scrollTop = snapshot.oldScrollTop + delta;
      isPrependInProgressRef.current = false;
      setLifecycleState("READY");
    });
  }, []);

  // 1. Conversation Switch & Lifecycle Invalidation
  useEffect(() => {
    generationRef.current += 1;
    seenMessageIdsRef.current = new Set();
    prevLatestMessageIdRef.current = null;
    isHydratedRef.current = false;
    isFollowingBottomRef.current = true;
    setHasNewMessageBelow(false);
    setShowScrollBottom(false);
    setLifecycleState("INITIALIZING");

    const rafRef = rafIdRef;
    const verifyRef = verifyRafIdRef;
    const timerRef = settleTimerRef;

    return () => {
      generationRef.current += 1;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (verifyRef.current) cancelAnimationFrame(verifyRef.current);
      if (timerRef.current) clearTimeout(timerRef.current);
      setLifecycleState("DESTROYED");
    };
  }, [conversationKey]);

  // 2. Message Event Classification & Auto-Scroll Engine
  useEffect(() => {
    if (!isOpen || isPrependInProgressRef.current) return;

    const currentMessages = messages;
    if (currentMessages.length === 0) return;

    const latestMessage = currentMessages[currentMessages.length - 1];
    const latestId = latestMessage?.id;
    const seenIds = seenMessageIdsRef.current;

    // A. Initial Hydration Event
    if (!isHydratedRef.current || seenIds.size === 0) {
      currentMessages.forEach((m) => seenIds.add(m.id));
      prevLatestMessageIdRef.current = latestId;
      isHydratedRef.current = true;
      isFollowingBottomRef.current = true;
      setUserScrollIntent("AT_BOTTOM");

      // Initial scroll to bottom
      requestAnimationFrame(() => {
        executeScroll("auto", "initial-load");
      });
      return;
    }

    // B. Check if a genuinely new message was appended
    const isNewLatest = latestId && !seenIds.has(latestId) && latestId !== prevLatestMessageIdRef.current;

    // Update seen IDs set (tracks deduplication across optimistic/server reconciliation)
    currentMessages.forEach((m) => seenIds.add(m.id));
    prevLatestMessageIdRef.current = latestId;

    if (!isNewLatest) {
      // Message update or reconciliation without append -> Do not trigger auto-scroll
      return;
    }

    // Classify Message Author
    const isFromAdmin = latestMessage.sender === adminSender || latestMessage.sender === "gaurav";
    const isFromVisitor = latestMessage.sender === visitorSender || latestMessage.sender === "user";

    if (isFromVisitor) {
      // Visitor sent a message -> Always follow immediately
      isFollowingBottomRef.current = true;
      setUserScrollIntent("AT_BOTTOM");
      setShowScrollBottom(false);
      setHasNewMessageBelow(false);
      executeScroll("smooth", "visitor-message");
    } else if (isFromAdmin) {
      // High-Priority Admin Reply
      if (isFollowingBottomRef.current) {
        // Visitor was at or near bottom -> Follow smoothly and settle
        setUserScrollIntent("AT_BOTTOM");
        setShowScrollBottom(false);
        setHasNewMessageBelow(false);
        executeScroll("smooth", "admin-reply");
      } else {
        // Visitor was reading older history -> Do NOT hijack viewport; show "New message" indicator
        setShowScrollBottom(true);
        setHasNewMessageBelow(true);
      }
    } else {
      // System / other message
      if (isFollowingBottomRef.current) {
        executeScroll("smooth", "layout-settle");
      } else {
        setShowScrollBottom(true);
        setHasNewMessageBelow(true);
      }
    }
  }, [messages, isOpen, adminSender, visitorSender, executeScroll]);

  // 3. State-Aware ResizeObserver on Message Stream & Composer Footer
  useEffect(() => {
    if (typeof ResizeObserver === "undefined" || !isOpen) return;

    const container = scrollContainerRef.current;
    const content = messagesContentRef.current || container;
    const composer = composerContainerRef.current;

    if (!container) return;

    const capturedGen = generationRef.current;
    let lastContentHeight = content ? content.scrollHeight : 0;
    let lastComposerHeight = composer ? composer.offsetHeight : 0;

    const observer = new ResizeObserver(() => {
      if (generationRef.current !== capturedGen || isPrependInProgressRef.current) return;

      const currentContentHeight = content ? content.scrollHeight : 0;
      const currentComposerHeight = composer ? composer.offsetHeight : 0;

      const hasContentResized = Math.abs(currentContentHeight - lastContentHeight) >= 2;
      const hasComposerResized = Math.abs(currentComposerHeight - lastComposerHeight) >= 2;

      lastContentHeight = currentContentHeight;
      lastComposerHeight = currentComposerHeight;

      if (hasContentResized || hasComposerResized) {
        // If user is in follow-latest mode (e.g. composer expansion or message entrance animation)
        if (isFollowingBottomRef.current && scrollContainerRef.current) {
          const c = scrollContainerRef.current;
          const distance = getDistanceFromBottom(c);
          if (distance > bottomTolerance) {
            // Typing/composer resizing uses instant snap for zero lag; message layout uses smooth glide
            executeScroll(hasComposerResized ? "auto" : "smooth", hasComposerResized ? "composer-resize" : "layout-settle");
          }
        }
      }
    });

    if (content) observer.observe(content);
    if (composer) observer.observe(composer);

    return () => {
      observer.disconnect();
    };
  }, [isOpen, bottomTolerance, getDistanceFromBottom, executeScroll]);

  // 4. Modal Open Synchronization
  useEffect(() => {
    if (isOpen && isHydratedRef.current && isFollowingBottomRef.current) {
      requestAnimationFrame(() => {
        executeScroll("auto", "initial-load");
      });
    }
  }, [isOpen, executeScroll]);

  return {
    scrollContainerRef,
    messagesContentRef,
    composerContainerRef,
    handleScroll,
    scrollToLatest,
    prepareHistoryPrepend,
    finishHistoryPrepend,
    showScrollBottom,
    hasNewMessageBelow,
    userScrollIntent,
    lifecycleState,
  };
}
