"use client";

import React from "react";
import { FaUserTie, FaBan } from "react-icons/fa6";
import type { WhatsAppThread } from "@/lib/whatsapp/types";

interface RecruiterConversationsListProps {
  threads: WhatsAppThread[];
  selectedThreadId: string | null;
  onSelectThread: (thread: WhatsAppThread) => void;
}

export const RecruiterConversationsList: React.FC<RecruiterConversationsListProps> = ({
  threads,
  selectedThreadId,
  onSelectThread,
}) => {
  if (!threads || threads.length === 0) {
    return (
      <div className="p-6 text-center text-xs text-neutral-400 bg-white border border-[#E2E8F0] rounded-xl font-admin-sans">
        No active recruiter conversations recorded.
      </div>
    );
  }

  return (
    <div className="space-y-1.5 font-admin-sans">
      {threads.map((thread) => {
        const isSelected = thread.id === selectedThreadId;
        const lastActivityStr = thread.lastInboundMessageAt
          ? new Date(thread.lastInboundMessageAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })
          : "";

        return (
          <button
            type="button"
            key={thread.id}
            onClick={() => onSelectThread(thread)}
            className={`w-full p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
              isSelected
                ? "bg-[#7C3AED]/10 border-[#7C3AED] shadow-2xs"
                : "bg-white hover:bg-neutral-50 border-[#E2E8F0] text-neutral-800"
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                  thread.optedOut
                    ? "bg-red-50 text-red-600 border border-red-200"
                    : isSelected
                    ? "bg-[#7C3AED] text-white"
                    : "bg-neutral-100 text-neutral-600"
                }`}
              >
                {thread.optedOut ? (
                  <FaBan className="w-4 h-4" />
                ) : (
                  <FaUserTie className="w-4 h-4" />
                )}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-xs text-neutral-900 truncate">
                    {thread.recruiterName || "Recruiter"}
                  </span>
                  {thread.unreadByAdmin && (
                    <span className="w-2 h-2 rounded-full bg-[#7C3AED] shrink-0" title="Unread activity" />
                  )}
                </div>
                <p className="font-admin-mono text-[11px] text-neutral-500 truncate">
                  {thread.recruiterPhone}
                </p>
              </div>
            </div>

            <div className="text-right shrink-0 ml-2">
              <span className="text-[10.5px] text-neutral-400 block">{lastActivityStr}</span>
              {thread.leadSubmitted && (
                <span className="mt-0.5 inline-block px-1.5 py-0.2 rounded text-[9.5px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Lead
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
};
