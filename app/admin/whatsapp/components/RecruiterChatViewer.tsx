"use client";

import React from "react";
import { FaDownload, FaCheck, FaCheckDouble, FaShieldHalved } from "react-icons/fa6";
import type { WhatsAppMessage, WhatsAppThread } from "@/lib/whatsapp/types";

interface RecruiterChatViewerProps {
  thread: WhatsAppThread | null;
  messages: WhatsAppMessage[];
  loading?: boolean;
}

export const RecruiterChatViewer: React.FC<RecruiterChatViewerProps> = ({
  thread,
  messages,
  loading = false,
}) => {
  if (!thread) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 bg-white border border-[#E2E8F0] rounded-xl text-neutral-400 text-xs text-center font-admin-sans">
        Select a recruiter conversation on the left to view the audit ledger.
      </div>
    );
  }

  const windowExpiresStr = thread.customerServiceWindowExpiresAt
    ? new Date(thread.customerServiceWindowExpiresAt).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    : "Expired";

  const isWindowActive = thread.customerServiceWindowExpiresAt > Date.now();

  return (
    <div className="flex flex-col h-full bg-white border border-[#E2E8F0] rounded-xl overflow-hidden font-admin-sans">
      {/* 1. Thread Header */}
      <div className="p-3.5 border-b border-[#E2E8F0] bg-[#FAFAFA] flex items-center justify-between shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-neutral-900">
              {thread.recruiterName || "Recruiter"}
            </h3>
            <span className="font-admin-mono text-xs text-neutral-500">
              ({thread.recruiterPhone})
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5 text-[11px]">
            <span
              className={`inline-flex items-center gap-1 font-medium ${
                isWindowActive ? "text-emerald-600" : "text-amber-600"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isWindowActive ? "bg-emerald-500" : "bg-amber-500"}`} />
              {isWindowActive ? `24h Service Window Active (expires ~${windowExpiresStr})` : "24h Window Closed"}
            </span>

            {thread.optedOut && (
              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold uppercase bg-red-100 text-red-700">
                Opted Out
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-neutral-100 text-neutral-600 text-[11px] font-medium border border-neutral-200/60">
          <FaShieldHalved className="w-3 h-3 text-[#7C3AED]" />
          <span>Audit Mode</span>
        </div>
      </div>

      {/* 2. Messages Ledger Stream */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#F8FAFC]/50 min-h-[360px] max-h-[520px]">
        {loading ? (
          <div className="p-8 text-center text-xs text-neutral-400">Loading conversation history...</div>
        ) : messages.length === 0 ? (
          <div className="p-8 text-center text-xs text-neutral-400">No message events logged in this thread yet.</div>
        ) : (
          messages.map((msg) => {
            const isInbound = msg.direction === "inbound";
            const timeStr = new Date(msg.timestamp).toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
            });

            const downloadUrl = msg.mediaStoragePath
              ? `/api/admin/whatsapp/media/${encodeURIComponent(msg.mediaStoragePath)}`
              : null;

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isInbound ? "items-start" : "items-end"}`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-xl text-xs leading-relaxed shadow-2xs ${
                    isInbound
                      ? "bg-white text-neutral-900 border border-[#E2E8F0] rounded-tl-none"
                      : "bg-[#7C3AED] text-white rounded-tr-none"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{msg.body}</p>

                  {/* Private Attachment Download Link */}
                  {downloadUrl && (
                    <div className="mt-2 pt-2 border-t border-white/20">
                      <a
                        href={downloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                          isInbound
                            ? "bg-neutral-100 hover:bg-neutral-200 text-neutral-800"
                            : "bg-white/20 hover:bg-white/30 text-white"
                        }`}
                      >
                        <FaDownload className="w-2.5 h-2.5" />
                        <span>{msg.mediaFileName || "Attached Document"}</span>
                      </a>
                    </div>
                  )}

                  <div
                    className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
                      isInbound ? "text-neutral-400" : "text-white/70"
                    }`}
                  >
                    <span>{timeStr}</span>
                    {!isInbound && msg.metaStatus && (
                      <span title={`Status: ${msg.metaStatus}`}>
                        {msg.metaStatus === "read" ? (
                          <FaCheckDouble className="w-2.5 h-2.5 text-sky-300 inline" />
                        ) : msg.metaStatus === "delivered" ? (
                          <FaCheckDouble className="w-2.5 h-2.5 inline" />
                        ) : (
                          <FaCheck className="w-2.5 h-2.5 inline" />
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 3. Read-Only Notice Footer (Zero Arbitrary Outbound Composer Invariant) */}
      <div className="p-3 bg-[#FAFAFA] border-t border-[#E2E8F0] text-center text-[11px] text-neutral-500 shrink-0">
        <span>
          <strong>Audit &amp; Observability Ledger:</strong> Arbitrary outbound messaging is prohibited. Gaurav responds directly from his personal WhatsApp mobile device.
        </span>
      </div>
    </div>
  );
};
