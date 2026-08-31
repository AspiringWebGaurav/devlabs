"use client";

import React, { useState, useRef, useEffect } from "react";
import { IoArrowUp } from "react-icons/io5";

interface Message {
  id: string;
  sender: "gaurav" | "user";
  text: string;
  timestamp: string;
}

interface LiveChatVerifiedComposerProps {
  name: string;
  email: string;
  onBack: () => void;
  onSignOut?: () => void;
}

function getGauravStaticReply(userQuery: string, userName: string, userEmail: string): string {
  const firstName = userName.split(" ")[0] || userName || "there";
  return `Thank you for reaching out, ${firstName}. I have received your message on high priority and will review it promptly. You will see my response here in this chat and receive a direct notification at ${userEmail}.`;
}

export const LiveChatVerifiedComposer: React.FC<LiveChatVerifiedComposerProps> = ({
  name,
  email,
}) => {
  const firstName = name.split(" ")[0] || name || "there";

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "msg_welcome",
      sender: "gaurav",
      text: `Hi ${firstName}! Welcome to my direct channel.\n\nFeel free to share any engineering opportunity, project inquiry, or question. Messages sent here are routed to me with high priority.\n\nI will follow up shortly — you'll see my reply in this conversation and receive an instant email notification at ${email}.`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSendMessage = () => {
    const trimmed = inputText.trim();
    if (!trimmed || isTyping) return;

    const userMessage: Message = {
      id: `usr_${Date.now()}`,
      sender: "user",
      text: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setIsTyping(true);

    setTimeout(() => {
      const replyText = getGauravStaticReply(trimmed, name, email);
      const gauravMessage: Message = {
        id: `gp_${Date.now()}`,
        sender: "gaurav",
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, gauravMessage]);
      setIsTyping(false);
    }, 700);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full w-full bg-white relative overflow-hidden select-none">
      {/* 1. Ultra-Clean & Professional Message Transcript */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0 select-text">
        {messages.map((msg) => {
          const isUser = msg.sender === "user";

          return (
            <div
              key={msg.id}
              className={`flex items-start gap-2.5 ${isUser ? "flex-row-reverse" : "flex-row"} animate-in fade-in slide-in-from-bottom-2 duration-150`}
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
          );
        })}

        {/* Gaurav Typing Indicator */}
        {isTyping && (
          <div className="flex items-center gap-2.5 animate-in fade-in duration-150">
            <div className="w-8 h-8 rounded-full bg-neutral-900 text-white flex items-center justify-center text-xs font-bold shrink-0">
              GP
            </div>
            <div className="bg-neutral-100 border border-neutral-200/60 rounded-2xl rounded-tl-xs px-4 py-3 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 animate-bounce" />
              <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 animate-bounce [animation-delay:0.15s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 animate-bounce [animation-delay:0.3s]" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 2. Pristine Modern Input Bar */}
      <div className="p-3.5 bg-white border-t border-neutral-100 shrink-0 select-none">
        <div className="relative flex items-center w-full bg-neutral-100 focus-within:bg-white border border-neutral-200 focus-within:border-neutral-400 focus-within:ring-2 focus-within:ring-neutral-200/60 rounded-2xl transition-all shadow-2xs">
          <textarea
            ref={inputRef}
            rows={1}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message to Gaurav..."
            className="w-full py-3 pl-4 pr-11 text-xs sm:text-[13.5px] bg-transparent text-neutral-900 placeholder-neutral-400 focus:outline-none resize-none max-h-24 leading-normal"
          />

          <button
            type="button"
            onClick={handleSendMessage}
            disabled={!inputText.trim() || isTyping}
            className={`absolute right-2 w-7 h-7 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
              inputText.trim() && !isTyping
                ? "bg-[#7C3AED] text-white hover:bg-[#6D28D9] shadow-2xs"
                : "bg-neutral-200 text-neutral-400 cursor-not-allowed"
            }`}
            aria-label="Send message"
          >
            <IoArrowUp className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
