"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { IoArrowUp, IoLockClosedOutline, IoTimeOutline, IoSparkles, IoChevronDown } from "react-icons/io5";
import { CgSpinner } from "react-icons/cg";
import { BsLightningChargeFill } from "react-icons/bs";

interface ChatMessage {
  id: string;
  sender: "gaurav" | "visitor" | "user";
  senderName?: string;
  text: string;
  createdAt?: string;
  timestamp?: string;
}

type DeliveryStage = "idle" | "sending" | "notifying" | "notified";

const PAGE_SIZE = 15;

interface LiveChatVerifiedComposerProps {
  name: string;
  email: string;
  onBack: () => void;
  onSignOut?: () => void;
}

export const LiveChatVerifiedComposer: React.FC<LiveChatVerifiedComposerProps> = ({
  name,
  email,
  onSignOut,
}) => {
  const firstName = name.split(" ")[0] || name || "there";

  const welcomeMessage: ChatMessage = useMemo(
    () => ({
      id: "msg_welcome",
      sender: "gaurav",
      senderName: "Gaurav Patil",
      text: `Hi ${firstName}! Welcome to my direct channel.\n\nFeel free to share any engineering opportunity, project inquiry, or question. Messages sent here are routed to me with high priority.\n\nI will follow up shortly — you'll see my reply in this conversation and receive an instant email notification at ${email}.`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }),
    [firstName, email]
  );

  const [messages, setMessages] = useState<ChatMessage[]>([welcomeMessage]);
  const [visibleLimit, setVisibleLimit] = useState(PAGE_SIZE);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [inputText, setInputText] = useState("");
  const [isVisitorLocked, setIsVisitorLocked] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [deliveryStage, setDeliveryStage] = useState<DeliveryStage>("idle");
  const [sendError, setSendError] = useState<string | null>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [hasNewMessageBelow, setHasNewMessageBelow] = useState(false);

  const [isCircuitBroken, setIsCircuitBroken] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const timersRef = useRef<NodeJS.Timeout[]>([]);
  const consecutiveErrorsRef = useRef(0);
  const isIdleRef = useRef(false);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const broadcastRef = useRef<BroadcastChannel | null>(null);
  const hasInitialScrolledRef = useRef(false);
  const prevMessagesCountRef = useRef(1);
  const prevVisibleLimitRef = useRef(PAGE_SIZE);

  // Robust bottom scrolling with requestAnimationFrame for layout-ready execution
  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const container = scrollContainerRef.current;
    if (container) {
      if (behavior === "auto") {
        container.scrollTop = container.scrollHeight;
      } else {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: "smooth",
        });
      }
    }
    messagesEndRef.current?.scrollIntoView({ behavior, block: "end" });
    setHasNewMessageBelow(false);
  }, []);

  // Distance from bottom check
  const isNearBottom = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return true;
    const threshold = 120;
    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    return distanceFromBottom <= threshold;
  }, []);

  // Scroll listener for floating "Jump to Latest" button
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    const isScrolledUp = distanceFromBottom > 120;
    setShowScrollBottom(isScrolledUp);
    if (!isScrolledUp) {
      setHasNewMessageBelow(false);
    }
  }, []);

  // Server message segmentation for pagination
  const serverMessages = useMemo(
    () => messages.filter((m) => m.id !== "msg_welcome"),
    [messages]
  );
  const totalServerMessages = serverMessages.length;
  const hasOlderMessages = totalServerMessages > visibleLimit;
  const remainingOlderCount = Math.max(0, totalServerMessages - visibleLimit);

  const displayedMessages = useMemo(() => {
    if (!hasOlderMessages) {
      return [welcomeMessage, ...serverMessages];
    }
    return serverMessages.slice(-visibleLimit);
  }, [hasOlderMessages, welcomeMessage, serverMessages, visibleLimit]);

  // Facebook-style smooth load older history with scroll-offset preservation
  const handleLoadOlderMessages = () => {
    if (isLoadingOlder || !hasOlderMessages) return;
    setIsLoadingOlder(true);

    const container = scrollContainerRef.current;
    const oldScrollHeight = container ? container.scrollHeight : 0;
    const oldScrollTop = container ? container.scrollTop : 0;

    const timerId = setTimeout(() => {
      setVisibleLimit((prev) => Math.min(prev + PAGE_SIZE, totalServerMessages));
      setIsLoadingOlder(false);

      requestAnimationFrame(() => {
        if (container) {
          const newScrollHeight = container.scrollHeight;
          container.scrollTop = oldScrollTop + (newScrollHeight - oldScrollHeight);
        }
      });
    }, 200);

    timersRef.current.push(timerId);
  };

  // Clear all pending timeouts and abort controllers on unmount
  useEffect(() => {
    return () => {
      timersRef.current.forEach((t) => clearTimeout(t));
      timersRef.current = [];
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      abortControllerRef.current?.abort();
      broadcastRef.current?.close();
    };
  }, []);

  // Reset idle state on user activity
  const resetIdleState = useCallback(() => {
    isIdleRef.current = false;
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    // Mark idle after 10 minutes of complete inactivity
    idleTimerRef.current = setTimeout(() => {
      isIdleRef.current = true;
    }, 10 * 60 * 1000);
  }, []);

  // 1. Fetch transcript and lock state from server (Robust with 401 kill switch and error backoff)
  const fetchMessages = useCallback(async (isManualRetry = false) => {
    if (isManualRetry) {
      consecutiveErrorsRef.current = 0;
      setIsCircuitBroken(false);
    }

    try {
      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();

      const res = await fetch("/api/assistant/chat/messages", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        signal: abortControllerRef.current.signal,
      });

      // Kill Switch: If session is revoked or expired, stop polling and sign out
      if (res.status === 401) {
        onSignOut?.();
        return;
      }

      const data = await res.json();
      if (res.ok && data.ok) {
        consecutiveErrorsRef.current = 0;
        if (isCircuitBroken) setIsCircuitBroken(false);

        const locked = data.isVisitorLocked === true;
        setIsVisitorLocked(locked);

        setDeliveryStage((prev) => {
          if (locked && prev === "idle") return "notified";
          if (!locked) return "idle";
          return prev;
        });

        if (Array.isArray(data.messages) && data.messages.length > 0) {
          const serverMsgs: ChatMessage[] = data.messages.map((m: {
            id: string;
            sender: "visitor" | "gaurav";
            senderName?: string;
            text: string;
            createdAt?: string;
          }) => ({
            id: m.id,
            sender: m.sender,
            senderName: m.senderName,
            text: m.text,
            timestamp: m.createdAt
              ? new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              : new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          }));

          setMessages([welcomeMessage, ...serverMsgs]);
        }
      } else {
        throw new Error(data.message || "Failed to sync");
      }
    } catch (err) {
      if ((err as Error)?.name === "AbortError") return;
      consecutiveErrorsRef.current += 1;
      // Circuit Breaker: If 5 consecutive failures occur, pause polling to avoid server hammering
      if (consecutiveErrorsRef.current >= 5) {
        setIsCircuitBroken(true);
      }
    }
  }, [welcomeMessage, isCircuitBroken, onSignOut]);

  // Adjust textarea height dynamically up to 140px
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    resetIdleState();
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 140)}px`;
    }
  };

  // Multi-Tab Shared Sync Channel
  useEffect(() => {
    if (typeof BroadcastChannel !== "undefined") {
      try {
        const bc = new BroadcastChannel("live_chat_transcript_sync");
        broadcastRef.current = bc;
        bc.onmessage = (event) => {
          if (event.data?.type === "REFRESH_TRANSCRIPT") {
            fetchMessages(true);
          }
        };
      } catch {
        // Safe fallback
      }
    }
  }, [fetchMessages]);

  const lockStartedAtRef = useRef<number | null>(null);
  const [isSessionPaused, setIsSessionPaused] = useState(false);

  // 2. Smart Cost-Optimized Polling Scheduler (Zero-Burn Policy)
  useEffect(() => {
    fetchMessages();
    resetIdleState();

    let timeoutId: NodeJS.Timeout | null = null;
    let sessionPauseTimer: NodeJS.Timeout | null = null;
    let isDisposed = false;

    // Auto-pause polling after 25 minutes of continuous idle to prevent overnight background burn
    const armSessionPauseTimer = () => {
      if (sessionPauseTimer) clearTimeout(sessionPauseTimer);
      sessionPauseTimer = setTimeout(() => {
        setIsSessionPaused(true);
      }, 25 * 60 * 1000);
    };

    armSessionPauseTimer();

    const scheduleNextPoll = () => {
      if (isDisposed) return;

      // Kill Switch: Do not poll if circuit is broken, tab is hidden, or session is paused
      if (consecutiveErrorsRef.current >= 5 || document.visibilityState === "hidden" || isSessionPaused) {
        return;
      }

      // Smart State-Aware Cadence Calculation:
      let delayMs = 15000; // Default unlocked heartbeat

      if (isVisitorLocked) {
        // Visitor is actively awaiting Gaurav's reply
        if (!lockStartedAtRef.current) lockStartedAtRef.current = Date.now();
        const waitingMs = Date.now() - lockStartedAtRef.current;

        if (waitingMs < 2 * 60 * 1000) {
          delayMs = 5000; // 0 - 2 mins: Fast 5s cadence
        } else if (waitingMs < 8 * 60 * 1000) {
          delayMs = 10000; // 2 - 8 mins: Relaxed 10s cadence
        } else if (waitingMs < 20 * 60 * 1000) {
          delayMs = 20000; // 8 - 20 mins: 20s cadence
        } else {
          delayMs = 30000; // > 20 mins: 30s cadence
        }
      } else {
        // Visitor is unlocked; Gaurav has replied; only background heartbeat is needed
        lockStartedAtRef.current = null;
        delayMs = isIdleRef.current ? 30000 : 15000;
      }

      // Exponential error backoff
      if (consecutiveErrorsRef.current === 1) delayMs = Math.max(delayMs, 8000);
      else if (consecutiveErrorsRef.current >= 2) delayMs = Math.max(delayMs, 16000);

      timeoutId = setTimeout(async () => {
        if (!isDisposed && document.visibilityState === "visible" && !isSessionPaused) {
          await fetchMessages();
          scheduleNextPoll();
        }
      }, delayMs);
    };

    scheduleNextPoll();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && !isSessionPaused) {
        resetIdleState();
        armSessionPauseTimer();
        fetchMessages(true);
        scheduleNextPoll();
      } else if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };

    const handleOnline = () => {
      if (!isSessionPaused) {
        fetchMessages(true);
        scheduleNextPoll();
      }
    };

    const handleUserActivity = () => {
      resetIdleState();
      armSessionPauseTimer();
      if (isSessionPaused) {
        setIsSessionPaused(false);
        fetchMessages(true);
        scheduleNextPoll();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("online", handleOnline);
    window.addEventListener("pointerdown", handleUserActivity, { passive: true });
    window.addEventListener("keydown", handleUserActivity, { passive: true });

    return () => {
      isDisposed = true;
      if (timeoutId) clearTimeout(timeoutId);
      if (sessionPauseTimer) clearTimeout(sessionPauseTimer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("pointerdown", handleUserActivity);
      window.removeEventListener("keydown", handleUserActivity);
    };
  }, [fetchMessages, resetIdleState, isVisitorLocked, isSessionPaused]);

  // 3. Robust Multi-Stage Auto-Scroll Engine (Facebook Messenger / WhatsApp style)
  useEffect(() => {
    const isOlderMessagesExpansion = visibleLimit > prevVisibleLimitRef.current;
    prevVisibleLimitRef.current = visibleLimit;

    // If the user expanded history upward via "Load older messages", preserve scroll offset without scrolling to bottom
    if (isOlderMessagesExpansion) {
      prevMessagesCountRef.current = messages.length;
      return;
    }

    const isMessageCountIncreased = messages.length > prevMessagesCountRef.current;
    prevMessagesCountRef.current = messages.length;

    // Stage 1: Initial History Mount / Load (When history is fetched from server or on first paint)
    if (!hasInitialScrolledRef.current) {
      scrollToBottom("auto");

      // Double frame verification to handle async font paint, avatar load, and layout reflow
      const timerId1 = setTimeout(() => {
        scrollToBottom("auto");
      }, 50);
      const timerId2 = setTimeout(() => {
        scrollToBottom("auto");
        if (serverMessages.length > 0) {
          hasInitialScrolledRef.current = true;
        }
      }, 150);
      timersRef.current.push(timerId1, timerId2);
      return;
    }

    // Stage 2: User is sending or actively dispatched a message -> Instant / smooth scroll
    if (isSending || deliveryStage === "sending") {
      scrollToBottom("smooth");
      return;
    }

    // Stage 3: New message arrived from server / polling / other tab
    if (isMessageCountIncreased) {
      const latestMsg = messages[messages.length - 1];
      const isFromUser = latestMsg?.sender === "visitor" || latestMsg?.sender === "user";

      if (isFromUser || isNearBottom()) {
        // User was already near bottom or sent this message -> Smoothly scroll down
        scrollToBottom("smooth");
      } else {
        // User deliberately scrolled up -> Keep their position and show new message badge on floating button
        setHasNewMessageBelow(true);
      }
    }
  }, [messages, visibleLimit, isSending, deliveryStage, scrollToBottom, isNearBottom, serverMessages.length]);

  // 4. Dispatch visitor message to Gaurav with realistic lifecycle transitions
  const handleSendMessage = async () => {
    const trimmed = inputText.trim();
    if (!trimmed || isSending || isVisitorLocked) return;

    setSendError(null);
    setIsSending(true);
    setDeliveryStage("sending");

    // Optimistic visitor message
    const tempId = `usr_${Date.now()}`;
    const optimisticMsg: ChatMessage = {
      id: tempId,
      sender: "visitor",
      senderName: name,
      text: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setInputText("");
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }
    setIsVisitorLocked(true); // Lock immediately on send

    try {
      const res = await fetch("/api/assistant/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: trimmed }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        setSendError(data.message || "Failed to deliver message. Please try again.");
        setIsVisitorLocked(false);
        setDeliveryStage("idle");
      } else {
        // Realistic progression: Sending -> Notifying -> Notified
        setDeliveryStage("notifying");
        const timerId = setTimeout(() => {
          setDeliveryStage("notified");
        }, 1200);
        timersRef.current.push(timerId);

        broadcastRef.current?.postMessage({
          type: "REFRESH_TRANSCRIPT",
          threadId: data.thread?.id,
        });
      }
    } catch {
      setSendError("Network error. Please check your connection.");
      setIsVisitorLocked(false);
      setDeliveryStage("idle");
    } finally {
      setIsSending(false);
      fetchMessages();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full w-full bg-white relative overflow-hidden select-none">
      {/* 1. Message Transcript */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0 select-text overscroll-contain"
      >
        {/* Top Pagination Landmark / Load Older Messages Trigger */}
        {hasOlderMessages ? (
          <div className="flex flex-col items-center justify-center pb-2 animate-in fade-in duration-150">
            <button
              type="button"
              onClick={handleLoadOlderMessages}
              disabled={isLoadingOlder}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-100 hover:bg-neutral-200/80 border border-neutral-200/80 text-neutral-700 text-[11px] font-medium transition-all shadow-2xs cursor-pointer active:scale-95 disabled:opacity-50"
            >
              {isLoadingOlder ? (
                <>
                  <CgSpinner className="w-3.5 h-3.5 animate-spin text-[#7C3AED]" />
                  <span>Loading older history...</span>
                </>
              ) : (
                <>
                  <IoTimeOutline className="w-3.5 h-3.5 text-neutral-500" />
                  <span>Load older messages ({remainingOlderCount} earlier)</span>
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-2.5 text-center space-y-1 animate-in fade-in duration-200 border-b border-neutral-100/80 mb-2">
            <div className="w-6 h-6 rounded-full bg-purple/10 border border-purple/20 flex items-center justify-center text-[#7C3AED]">
              <IoSparkles className="w-3 h-3" />
            </div>
            <p className="text-[11px] font-semibold text-neutral-800 tracking-tight">Beginning of Direct Channel</p>
            <p className="text-[10px] text-neutral-400 font-mono">End-to-end encrypted with Gaurav Patil</p>
          </div>
        )}

        {displayedMessages.map((msg, index) => {
          const isUser = msg.sender === "user" || msg.sender === "visitor";
          const isLatestVisitorMsg = isUser && index === displayedMessages.length - 1;

          return (
            <div key={msg.id} className="space-y-1.5">
              <div
                className={`flex items-start gap-2.5 ${
                  isUser ? "flex-row-reverse" : "flex-row"
                } animate-in fade-in slide-in-from-bottom-2 duration-150`}
              >
                {/* Avatar */}
                {isUser ? (
                  <div className="w-8 h-8 rounded-full bg-[#7C3AED] text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-2xs">
                    {name.slice(0, 2).toUpperCase() || "ME"}
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-neutral-900 text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-2xs">
                    GP
                  </div>
                )}

                {/* Message Bubble */}
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-[13px] sm:text-[13.5px] leading-relaxed shadow-2xs ${
                    isUser
                      ? "bg-[#7C3AED] text-white rounded-tr-xs"
                      : "bg-neutral-100/90 text-neutral-800 rounded-tl-xs border border-neutral-200/60"
                  }`}
                >
                  <div className="whitespace-pre-wrap break-words">{msg.text}</div>
                  <div
                    className={`text-[10px] mt-1.5 text-right font-mono ${
                      isUser ? "text-purple-200" : "text-neutral-400"
                    }`}
                  >
                    {msg.timestamp}
                  </div>
                </div>
              </div>

              {/* Gaurav Reply Celebratory Status Badge */}
              {!isUser && msg.id !== "msg_welcome" && (
                <div className="flex items-center justify-start pl-10 animate-in fade-in duration-200">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple/10 border border-purple/20 text-[#7C3AED] text-[11px] font-medium shadow-2xs">
                    <BsLightningChargeFill className="w-3 h-3 text-[#7C3AED] shrink-0" />
                    <span>Gaurav replied &bull; {msg.timestamp}</span>
                  </div>
                </div>
              )}

              {/* Dynamic Notification Lifecycle Badge */}
              {isLatestVisitorMsg && isVisitorLocked && (
                <div className="flex items-center justify-end pr-10 animate-in fade-in duration-200">
                  {deliveryStage === "sending" && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-100 border border-neutral-200 text-neutral-600 text-[11px] font-medium shadow-2xs animate-pulse">
                      <CgSpinner className="w-3 h-3 animate-spin text-[#7C3AED]" />
                      <span>Delivering to Gaurav&apos;s direct channel...</span>
                    </div>
                  )}

                  {deliveryStage === "notifying" && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple/10 border border-purple/30 text-[#7C3AED] text-[11px] font-medium shadow-2xs animate-pulse">
                      <BsLightningChargeFill className="w-3 h-3 text-[#7C3AED] shrink-0" />
                      <span>Notifying Gaurav on high priority...</span>
                    </div>
                  )}

                  {deliveryStage === "notified" && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple/10 border border-purple/20 text-[#7C3AED] text-[11px] font-medium shadow-2xs">
                      <BsLightningChargeFill className="w-3 h-3 text-[#7C3AED] shrink-0" />
                      <span>System has notified Gaurav on high priority. Gaurav&apos;s reply will show here.</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {isCircuitBroken && (
          <div className="flex items-center justify-center p-2 animate-in fade-in duration-200">
            <button
              type="button"
              onClick={() => fetchMessages(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-medium shadow-2xs hover:bg-amber-100 transition-colors cursor-pointer"
            >
              <span>Connection paused &bull; Tap to reconnect</span>
            </button>
          </div>
        )}

        {isSessionPaused && (
          <div className="flex items-center justify-center p-2 animate-in fade-in duration-200">
            <button
              type="button"
              onClick={() => {
                setIsSessionPaused(false);
                fetchMessages(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-medium shadow-2xs hover:bg-slate-200 transition-colors cursor-pointer"
            >
              <span>Live sync paused &bull; Tap to resume</span>
            </button>
          </div>
        )}

        {sendError && (
          <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs text-center animate-in fade-in">
            {sendError}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Floating Scroll to Bottom Jump Button (Facebook/WhatsApp Style) */}
      {showScrollBottom && (
        <button
          type="button"
          onClick={() => scrollToBottom("smooth")}
          className="absolute right-4 bottom-20 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/95 backdrop-blur-md border border-neutral-200 text-neutral-700 hover:text-neutral-900 text-xs font-medium shadow-md hover:shadow-lg transition-all duration-200 hover:bg-neutral-50 active:scale-95 cursor-pointer animate-in fade-in zoom-in-95"
          aria-label="Scroll to latest message"
        >
          {hasNewMessageBelow && (
            <span className="w-2 h-2 rounded-full bg-[#7C3AED] animate-pulse" />
          )}
          <span className="text-[11px] font-semibold">{hasNewMessageBelow ? "New message" : "Latest"}</span>
          <IoChevronDown className="w-3.5 h-3.5 text-[#7C3AED]" />
        </button>
      )}

      {/* 2. Auto-Expanding Input Bar / Turn-Locked State */}
      <div className="p-3.5 bg-white border-t border-neutral-100 shrink-0 select-none">
        {isVisitorLocked ? (
          <div className="w-full py-3 px-4 rounded-2xl bg-neutral-50 border border-neutral-200/70 flex items-center justify-between gap-3 text-neutral-400 shadow-2xs">
            <div className="flex items-center gap-2 text-xs font-medium text-neutral-500">
              <IoLockClosedOutline className="w-4 h-4 text-neutral-400 shrink-0" />
              <span>Awaiting Gaurav&apos;s reply...</span>
            </div>
            <span className="text-[10px] font-mono text-neutral-400 bg-neutral-200/60 px-2 py-0.5 rounded-md">
              Turn Locked
            </span>
          </div>
        ) : (
          <div className="relative flex items-end w-full bg-neutral-100 focus-within:bg-white border border-neutral-200 focus-within:border-neutral-400 focus-within:ring-2 focus-within:ring-neutral-200/60 rounded-2xl transition-all shadow-2xs py-1">
            <textarea
              ref={inputRef}
              rows={1}
              value={inputText}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              disabled={isSending}
              placeholder="Type your message to Gaurav..."
              className="w-full py-2.5 pl-4 pr-11 text-[14.5px] sm:text-[13.5px] bg-transparent text-neutral-900 placeholder-neutral-400 focus:outline-none resize-none min-h-[40px] max-h-36 leading-normal overflow-y-auto"
            />

            <button
              type="button"
              onClick={handleSendMessage}
              disabled={!inputText.trim() || isSending}
              className={`absolute right-1.5 bottom-1.5 w-8 h-8 sm:w-7 sm:h-7 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                inputText.trim() && !isSending
                  ? "bg-[#7C3AED] text-white hover:bg-[#6D28D9] shadow-2xs active:scale-90"
                  : "bg-neutral-200 text-neutral-400 cursor-not-allowed"
              }`}
              aria-label="Send message"
            >
              {isSending ? <CgSpinner className="w-4 h-4 animate-spin" /> : <IoArrowUp className="w-4 h-4" />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
