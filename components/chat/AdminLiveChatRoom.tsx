"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  IoShieldCheckmark,
  IoPaperPlane,
  IoMailOutline,
  IoPersonCircleOutline,
  IoArrowBack,
  IoRefresh,
  IoCheckmarkDoneOutline,
  IoTimeOutline,
  IoSparkles,
} from "react-icons/io5";
import { CgSpinner } from "react-icons/cg";
import { BsLightningChargeFill } from "react-icons/bs";
import type { LiveChatThreadDocument, LiveChatMessageDocument } from "@/lib/dal/repositories/live-chat.repository";

const PAGE_SIZE = 15;

export const AdminLiveChatRoom: React.FC = () => {
  const searchParams = useSearchParams();
  const threadId = searchParams.get("threadId") || "";
  const token = searchParams.get("token") || "";

  const [thread, setThread] = useState<LiveChatThreadDocument | null>(null);
  const [messages, setMessages] = useState<LiveChatMessageDocument[]>([]);
  const [visibleLimit, setVisibleLimit] = useState(PAGE_SIZE);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const [replyText, setReplyText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);

  const [isCircuitBroken, setIsCircuitBroken] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const timersRef = useRef<NodeJS.Timeout[]>([]);
  const consecutiveErrorsRef = useRef(0);
  const isIdleRef = useRef(false);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const broadcastRef = useRef<BroadcastChannel | null>(null);
  const isInitialLoadRef = useRef(true);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const totalMessages = messages.length;
  const hasOlderMessages = totalMessages > visibleLimit;
  const remainingOlderCount = Math.max(0, totalMessages - visibleLimit);

  const displayedMessages = useMemo(() => {
    return hasOlderMessages ? messages.slice(-visibleLimit) : messages;
  }, [hasOlderMessages, messages, visibleLimit]);

  // Facebook-style smooth load older history with scroll-offset preservation
  const handleLoadOlderMessages = () => {
    if (isLoadingOlder || !hasOlderMessages) return;
    setIsLoadingOlder(true);

    const container = scrollContainerRef.current;
    const oldScrollHeight = container ? container.scrollHeight : 0;
    const oldScrollTop = container ? container.scrollTop : 0;

    const timerId = setTimeout(() => {
      setVisibleLimit((prev) => Math.min(prev + PAGE_SIZE, totalMessages));
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

  // Clear timers and abort pending requests on unmount
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
    idleTimerRef.current = setTimeout(() => {
      isIdleRef.current = true;
    }, 10 * 60 * 1000);
  }, []);

  // 1. Fetch Thread Transcript from API with AbortController & Circuit Breaker
  const fetchThread = useCallback(async (silent = false, isManualRetry = false) => {
    if (!threadId || !token) {
      setAuthError("Missing chat room authentication credentials in URL.");
      setIsLoading(false);
      return;
    }

    if (isManualRetry) {
      consecutiveErrorsRef.current = 0;
      setIsCircuitBroken(false);
    }

    if (!silent) setIsLoading(true);

    try {
      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();

      const res = await fetch(
        `/api/assistant/chat/admin/room?threadId=${encodeURIComponent(threadId)}&token=${encodeURIComponent(token)}`,
        {
          method: "GET",
          signal: abortControllerRef.current.signal,
        }
      );

      const data = await res.json();
      if (res.ok && data.ok) {
        consecutiveErrorsRef.current = 0;
        if (isCircuitBroken) setIsCircuitBroken(false);
        setThread(data.thread);
        setMessages(data.messages || []);
        setAuthError(null);
      } else {
        if (res.status === 403) {
          setAuthError(data.message || "Invalid or expired chat room access link.");
          return;
        }
        throw new Error(data.message || "Fetch failed");
      }
    } catch (err) {
      if ((err as Error)?.name === "AbortError") return;
      consecutiveErrorsRef.current += 1;
      if (consecutiveErrorsRef.current >= 5) {
        setIsCircuitBroken(true);
      }
      if (!silent) setAuthError("Network error. Unable to load chat room.");
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [threadId, token, isCircuitBroken]);

  const [replyError, setReplyError] = useState<string | null>(null);

  // URL Parameter Reactivity: Reset state when switching between multiple magic room tabs/links
  useEffect(() => {
    setThread(null);
    setMessages([]);
    setIsLoading(true);
    setAuthError(null);
    setReplyError(null);
    consecutiveErrorsRef.current = 0;
    setIsCircuitBroken(false);
  }, [threadId, token]);

  // Adjust textarea height dynamically up to 140px
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setReplyText(e.target.value);
    resetIdleState();
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
    }
  };

  // Multi-Tab Shared Sync Channel with Thread-Level Scoping
  useEffect(() => {
    if (typeof BroadcastChannel !== "undefined") {
      try {
        const bc = new BroadcastChannel("live_chat_transcript_sync");
        broadcastRef.current = bc;
        bc.onmessage = (event) => {
          if (event.data?.type === "REFRESH_TRANSCRIPT") {
            // Strict Isolation: Only refresh if the event matches this specific thread
            if (!event.data.threadId || event.data.threadId === threadId) {
              fetchThread(true, true);
            }
          }
        };
      } catch {
        // Safe fallback
      }
    }
  }, [fetchThread, threadId]);

  const [isSessionPaused, setIsSessionPaused] = useState(false);

  // 2. Smart Cost-Optimized Polling Scheduler (Zero-Burn Policy)
  useEffect(() => {
    fetchThread();
    resetIdleState();

    let timeoutId: NodeJS.Timeout | null = null;
    let sessionPauseTimer: NodeJS.Timeout | null = null;
    let isDisposed = false;
    const roomOpenedAt = Date.now();

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
      const roomElapsedMs = Date.now() - roomOpenedAt;
      let delayMs = 15000;

      if (roomElapsedMs < 2 * 60 * 1000) {
        delayMs = 5000; // 0 - 2 mins: Fast 5s cadence
      } else if (roomElapsedMs < 8 * 60 * 1000) {
        delayMs = 10000; // 2 - 8 mins: 10s cadence
      } else if (roomElapsedMs < 20 * 60 * 1000) {
        delayMs = 20000; // 8 - 20 mins: 20s cadence
      } else {
        delayMs = 30000; // > 20 mins: 30s cadence
      }

      if (isIdleRef.current) delayMs = Math.max(delayMs, 25000);

      // Exponential error backoff
      if (consecutiveErrorsRef.current === 1) delayMs = Math.max(delayMs, 8000);
      else if (consecutiveErrorsRef.current >= 2) delayMs = Math.max(delayMs, 16000);

      timeoutId = setTimeout(async () => {
        if (!isDisposed && document.visibilityState === "visible" && !isSessionPaused) {
          await fetchThread(true);
          scheduleNextPoll();
        }
      }, delayMs);
    };

    scheduleNextPoll();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && !isSessionPaused) {
        resetIdleState();
        armSessionPauseTimer();
        fetchThread(true, true);
        scheduleNextPoll();
      } else if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };

    const handleOnline = () => {
      if (!isSessionPaused) {
        fetchThread(true, true);
        scheduleNextPoll();
      }
    };

    const handleUserActivity = () => {
      resetIdleState();
      armSessionPauseTimer();
      if (isSessionPaused) {
        setIsSessionPaused(false);
        fetchThread(true, true);
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
  }, [fetchThread, resetIdleState, isSessionPaused]);

  useEffect(() => {
    if (isInitialLoadRef.current && messages.length > 0) {
      scrollToBottom();
      isInitialLoadRef.current = false;
    } else if (isSending) {
      scrollToBottom();
    }
  }, [messages, isSending]);

  // 3. Dispatch Gaurav's Reply with Multi-Room Broadcast and Safe Fallback
  const handleSendReply = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = replyText.trim();
    if (!trimmed || isSending || !thread) return;

    setIsSending(true);
    setSendSuccess(false);
    setReplyError(null);

    // Optimistic Gaurav Reply
    const optimisticMsg: LiveChatMessageDocument = {
      id: `temp_${Date.now()}`,
      threadId: thread.id,
      sender: "gaurav",
      senderName: "Gaurav Patil",
      text: trimmed,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setReplyText("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    try {
      const res = await fetch("/api/assistant/chat/admin/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          threadId: thread.id,
          token,
          message: trimmed,
        }),
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        setSendSuccess(true);
        const timerId = setTimeout(() => setSendSuccess(false), 3500);
        timersRef.current.push(timerId);
        if (data.thread) setThread(data.thread);

        // Notify other open tabs for this exact thread
        broadcastRef.current?.postMessage({
          type: "REFRESH_TRANSCRIPT",
          threadId: thread.id,
        });
      } else {
        setReplyError(data.message || "Failed to deliver reply. Please try again.");
      }
    } catch {
      setReplyError("Network error. Unable to send reply.");
    } finally {
      setIsSending(false);
      fetchThread(true);
      if (textareaRef.current) textareaRef.current.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendReply();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen w-full bg-slate-50 text-neutral-900 flex flex-col items-center justify-center p-4 font-sans">
        <div className="flex flex-col items-center gap-3 p-8 rounded-3xl bg-white border border-neutral-200 shadow-xl">
          <CgSpinner className="w-8 h-8 animate-spin text-[#7C3AED]" />
          <p className="text-sm text-neutral-600 font-medium">Authenticating secure live chat room...</p>
        </div>
      </div>
    );
  }

  if (authError || !thread) {
    return (
      <div className="min-h-screen w-full bg-slate-50 text-neutral-900 flex flex-col items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full p-8 rounded-3xl bg-white border border-neutral-200 text-center space-y-4 shadow-xl">
          <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-200 text-rose-500 mx-auto flex items-center justify-center text-xl font-bold">
            !
          </div>
          <h1 className="text-lg font-bold text-neutral-900">Chat Room Access Denied</h1>
          <p className="text-xs text-neutral-500 leading-relaxed">
            {authError || "This conversation link has expired or contains invalid security credentials."}
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-semibold transition-colors shadow-sm"
          >
            <IoArrowBack className="w-4 h-4" />
            <span>Return to Portfolio</span>
          </Link>
        </div>
      </div>
    );
  }

  const visitorInitial = thread.visitorName.slice(0, 2).toUpperCase() || "VS";

  return (
    <div className="min-h-[100dvh] w-full bg-slate-100/90 sm:bg-slate-100 text-neutral-900 flex flex-col items-center justify-center p-0 sm:p-4 md:p-6 font-sans select-none">
      {/* Standalone Chat Bubble Canvas (Bubble-Matched Light Theme) */}
      <div className="w-full sm:max-w-2xl flex flex-col h-[100dvh] sm:h-[92vh] sm:max-h-[860px] bg-white rounded-none sm:rounded-3xl border-0 sm:border border-neutral-200/90 shadow-2xl overflow-hidden relative z-10">
        
        {/* 1. Header Bar with Verified Visitor Metadata */}
        <div className="px-3.5 py-3 sm:px-4 sm:py-3.5 bg-white border-b border-neutral-100 flex items-center justify-between shrink-0 shadow-2xs">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-[#7C3AED] text-white flex items-center justify-center font-bold text-xs sm:text-sm shadow-2xs shrink-0">
              {visitorInitial}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h2 className="text-[14.5px] sm:text-base font-bold text-neutral-900 tracking-tight truncate">
                  {thread.visitorName}
                </h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-700 text-[10px] font-semibold shrink-0">
                  <IoShieldCheckmark className="w-3 h-3 text-emerald-600" />
                  <span>Verified</span>
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <p className="text-xs text-neutral-500 truncate flex items-center gap-1">
                  <IoMailOutline className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                  <span className="truncate">{thread.visitorEmail}</span>
                </p>
                <span className="text-neutral-300 hidden sm:inline">•</span>
                <span className="text-[10.5px] text-[#7C3AED] hidden sm:inline-flex items-center gap-1 font-mono font-medium">
                  <BsLightningChargeFill className="w-2.5 h-2.5" />
                  <span>Direct Channel</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fetchThread(false)}
              className="w-9 h-9 sm:w-8 sm:h-8 rounded-xl bg-neutral-50 hover:bg-neutral-100 active:scale-95 border border-neutral-200/80 text-neutral-600 flex items-center justify-center transition-all cursor-pointer"
              title="Refresh conversation"
              aria-label="Refresh conversation"
            >
              <IoRefresh className="w-4 h-4" />
            </button>
            <a
              href={`mailto:${thread.visitorEmail}`}
              className="inline-flex items-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200/80 active:scale-95 border border-neutral-200 text-xs font-semibold text-neutral-700 transition-all"
              title="Email visitor directly"
            >
              <IoPersonCircleOutline className="w-4 h-4 text-[#7C3AED]" />
              <span className="hidden sm:inline">Email Directly</span>
              <span className="sm:hidden">Email</span>
            </a>
          </div>
        </div>

        {/* 2. Message Transcript Area (Clean Bubble White/Light Theme) */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto px-3.5 py-4 sm:px-5 sm:py-5 space-y-3.5 sm:space-y-4 min-h-0 select-text bg-white overscroll-contain"
        >
          {/* Top Pagination Landmark / Load Older Messages Trigger */}
          {hasOlderMessages ? (
            <div className="flex flex-col items-center justify-center pb-2 animate-in fade-in duration-150">
              <button
                type="button"
                onClick={handleLoadOlderMessages}
                disabled={isLoadingOlder}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-neutral-100 hover:bg-neutral-200/80 border border-neutral-200/80 text-neutral-700 text-[11.5px] sm:text-[11px] font-medium transition-all shadow-2xs cursor-pointer active:scale-95 disabled:opacity-50"
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
          ) : messages.length > 0 ? (
            <div className="flex flex-col items-center justify-center py-2.5 text-center space-y-1 animate-in fade-in duration-200 border-b border-neutral-100/80 mb-2">
              <div className="w-6 h-6 rounded-full bg-purple/10 border border-purple/20 flex items-center justify-center text-[#7C3AED]">
                <IoSparkles className="w-3 h-3" />
              </div>
              <p className="text-[11.5px] sm:text-[11px] font-semibold text-neutral-800 tracking-tight">Beginning of Conversation</p>
              <p className="text-[10.5px] sm:text-[10px] text-neutral-400 font-mono">Authenticated channel with {thread.visitorName}</p>
            </div>
          ) : null}

          {messages.length === 0 ? (
            <div className="text-center py-16 text-neutral-400 text-xs flex flex-col items-center gap-2">
              <IoTimeOutline className="w-6 h-6 text-neutral-300" />
              <span>No messages in this conversation yet.</span>
            </div>
          ) : (
            displayedMessages.map((msg) => {
              const isAdmin = msg.sender === "gaurav";

              return (
                <div key={msg.id} className="space-y-1.5">
                  <div
                    className={`flex items-start gap-2.5 ${isAdmin ? "flex-row-reverse" : "flex-row"} animate-in fade-in slide-in-from-bottom-1 duration-150`}
                  >
                    {/* Avatar */}
                    {isAdmin ? (
                      <div className="w-8 h-8 rounded-full bg-neutral-900 text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-2xs">
                        GP
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-[#7C3AED] text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-2xs">
                        {visitorInitial.slice(0, 1)}
                      </div>
                    )}

                    {/* Message Bubble */}
                    <div
                      className={`max-w-[88%] sm:max-w-[75%] rounded-2xl px-3.5 py-2.5 sm:px-4 sm:py-3 text-[14px] sm:text-[13.5px] leading-relaxed shadow-2xs ${
                        isAdmin
                          ? "bg-[#7C3AED] text-white rounded-tr-xs"
                          : "bg-neutral-100/90 text-neutral-800 rounded-tl-xs border border-neutral-200/60"
                      }`}
                    >
                      <div className="whitespace-pre-wrap break-words">{msg.text}</div>
                      <div
                        className={`text-[10.5px] sm:text-[10px] mt-1 text-right font-mono ${
                          isAdmin ? "text-purple-200" : "text-neutral-400"
                        }`}
                      >
                        {msg.createdAt
                          ? new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                          : "Just now"}
                      </div>
                    </div>
                  </div>

                  {/* Gaurav / Admin Celebratory Status Badge */}
                  {isAdmin && (
                    <div className="flex items-center justify-end pr-10 animate-in fade-in duration-200">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple/10 border border-purple/20 text-[#7C3AED] text-[11.5px] sm:text-[11px] font-medium shadow-2xs">
                        <BsLightningChargeFill className="w-3 h-3 text-[#7C3AED] shrink-0" />
                        <span>
                          You replied &bull;{" "}
                          {msg.createdAt
                            ? new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                            : "Just now"}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}

          {isCircuitBroken && (
            <div className="flex items-center justify-center p-2 animate-in fade-in duration-200">
              <button
                type="button"
                onClick={() => fetchThread(false, true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[11.5px] sm:text-[11px] font-medium shadow-2xs hover:bg-amber-100 transition-colors cursor-pointer"
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
                  fetchThread(false, true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-[11.5px] sm:text-[11px] font-medium shadow-2xs hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <span>Live sync paused &bull; Tap to resume</span>
              </button>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* 3. Gaurav Auto-Expanding Reply Composer Bar (Bubble-Matched) */}
        <div className="p-3 sm:p-4 bg-white border-t border-neutral-100 shrink-0 select-none pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {sendSuccess && (
            <div className="mb-2 text-center text-emerald-600 text-xs sm:text-[13px] flex items-center justify-center gap-1 animate-in fade-in">
              <IoCheckmarkDoneOutline className="w-4 h-4" />
              <span>Reply delivered to {thread.visitorName} &bull; Email notification sent!</span>
            </div>
          )}

          {replyError && (
            <div className="mb-2 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs sm:text-[13px] text-center animate-in fade-in">
              {replyError}
            </div>
          )}

          <form onSubmit={handleSendReply} className="relative flex items-end w-full bg-neutral-100 focus-within:bg-white border border-neutral-200 focus-within:border-neutral-400 focus-within:ring-2 focus-within:ring-neutral-200/60 rounded-2xl transition-all shadow-2xs py-1">
            <textarea
              ref={textareaRef}
              rows={1}
              value={replyText}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              disabled={isSending}
              placeholder={`Reply to ${thread.visitorName}...`}
              className="w-full py-2.5 pl-4 pr-12 text-[15px] sm:text-[14px] bg-transparent text-neutral-900 placeholder-neutral-400 focus:outline-none resize-none min-h-[44px] max-h-36 leading-normal overflow-y-auto"
            />

            <button
              type="submit"
              disabled={!replyText.trim() || isSending}
              className={`absolute right-1.5 bottom-1.5 w-9 h-9 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                replyText.trim() && !isSending
                  ? "bg-[#7C3AED] text-white hover:bg-[#6D28D9] shadow-2xs active:scale-90"
                  : "bg-neutral-200 text-neutral-400 cursor-not-allowed"
              }`}
              aria-label="Send reply"
            >
              {isSending ? <CgSpinner className="w-4 h-4 animate-spin" /> : <IoPaperPlane className="w-4 h-4" />}
            </button>
          </form>

          <p className="text-[10.5px] sm:text-[10px] text-neutral-400 text-center mt-2 font-mono">
            Direct authenticated session &bull; Your reply sends immediately and emails {thread.visitorName}.
          </p>
        </div>
      </div>
    </div>
  );
};
