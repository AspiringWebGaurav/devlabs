"use client";

import React, { useState, useTransition } from "react";
import {
  FaDownload,
  FaCheck,
  FaCheckDouble,
  FaShieldHalved,
  FaTriangleExclamation,
  FaClock,
  FaLock,
  FaRotate,
  FaBan,
  FaCircleXmark,
} from "react-icons/fa6";
import { ReconcileAmbiguousModal } from "./ReconcileAmbiguousModal";
import { retryFailedOutboxMessageAction } from "../actions";
import type { WhatsAppMessage, WhatsAppThread, OutboxMessageStatus } from "@/lib/whatsapp/types";

interface RecruiterChatViewerProps {
  thread: WhatsAppThread | null;
  messages: WhatsAppMessage[];
  loading?: boolean;
  onRefresh?: () => void;
}

export const RecruiterChatViewer: React.FC<RecruiterChatViewerProps> = ({
  thread,
  messages,
  loading = false,
  onRefresh,
}) => {
  const [reconcileTarget, setReconcileTarget] = useState<{
    operationId: string;
    lastError?: string;
  } | null>(null);

  const [retryingOpId, setRetryingOpId] = useState<string | null>(null);
  const [, startRetry] = useTransition();

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

  const isWindowActive = Boolean(
    thread.customerServiceWindowExpiresAt && thread.customerServiceWindowExpiresAt > Date.now()
  );

  const handleRetryDispatch = (operationId: string) => {
    setRetryingOpId(operationId);
    startRetry(async () => {
      try {
        await retryFailedOutboxMessageAction(operationId);
        onRefresh?.();
      } finally {
        setRetryingOpId(null);
      }
    });
  };

  const renderStatusBadge = (status?: OutboxMessageStatus, metaStatus?: string) => {
    switch (status) {
      case "PENDING":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] text-neutral-400" title="Enqueued in outbox">
            <FaClock className="w-2.5 h-2.5" />
            <span>Pending</span>
          </span>
        );
      case "CLAIMED":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] text-amber-500" title="Leased by dispatcher">
            <FaLock className="w-2.5 h-2.5" />
            <span>Claimed</span>
          </span>
        );
      case "SENDING":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] text-blue-500" title="Connecting to Meta">
            <FaRotate className="w-2.5 h-2.5 animate-spin" />
            <span>Sending</span>
          </span>
        );
      case "META_ACCEPTED":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] text-white/80" title="Accepted by Meta gateway">
            <FaCheck className="w-2.5 h-2.5" />
            <span>Accepted</span>
          </span>
        );
      case "DELIVERED":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] text-white/80" title="Delivered to device">
            <FaCheckDouble className="w-2.5 h-2.5" />
            <span>Delivered</span>
          </span>
        );
      case "READ":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] text-sky-300 font-bold" title="Read by recruiter">
            <FaCheckDouble className="w-2.5 h-2.5" />
            <span>Read</span>
          </span>
        );
      case "AMBIGUOUS":
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9.5px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
            <FaTriangleExclamation className="w-2.5 h-2.5" />
            <span>Ambiguous</span>
          </span>
        );
      case "RECONCILING":
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9.5px] font-bold bg-purple-100 text-purple-800 border border-purple-300">
            <FaRotate className="w-2.5 h-2.5 animate-spin" />
            <span>Reconciling</span>
          </span>
        );
      case "CONFIRMED_ACCEPTED":
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9.5px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <FaCheck className="w-2.5 h-2.5" />
            <span>Confirmed</span>
          </span>
        );
      case "CONFIRMED_NOT_ACCEPTED":
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9.5px] font-bold bg-amber-100 text-amber-800">
            <span>Rejected</span>
          </span>
        );
      case "RETRY_PENDING":
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9.5px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
            <FaRotate className="w-2.5 h-2.5" />
            <span>Retry Ready</span>
          </span>
        );
      case "UNRESOLVED":
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9.5px] font-bold bg-purple-100 text-purple-800 border border-purple-300">
            <span>Quarantined</span>
          </span>
        );
      case "POLICY_BLOCKED":
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9.5px] font-bold bg-red-100 text-red-800">
            <FaBan className="w-2.5 h-2.5" />
            <span>Policy Blocked</span>
          </span>
        );
      case "DEAD_LETTER":
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9.5px] font-bold bg-red-100 text-red-800 border border-red-300">
            <FaCircleXmark className="w-2.5 h-2.5" />
            <span>Dead Letter</span>
          </span>
        );
      case "SUPERSEDED":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] text-neutral-400 line-through">
            <span>Superseded</span>
          </span>
        );
      default:
        if (metaStatus) {
          return <span className="text-[10px] text-white/70">{metaStatus}</span>;
        }
        return null;
    }
  };

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
          <span>Authoritative Live Ledger</span>
        </div>
      </div>

      {/* 2. Messages Ledger Stream */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#F8FAFC]/50 min-h-[360px] max-h-[520px]">
        {loading ? (
          <div className="p-8 text-center text-xs text-neutral-400">Loading conversation history...</div>
        ) : messages.length === 0 ? (
          <div className="p-8 text-center text-xs text-neutral-400">No message events logged in this conversation yet.</div>
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

            const isAmbiguous = msg.outboxStatus === "AMBIGUOUS";
            const isRetryPending = msg.outboxStatus === "RETRY_PENDING";

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isInbound ? "items-start" : "items-end"}`}
              >
                <div
                  className={`max-w-[85%] p-3 rounded-xl text-xs leading-relaxed shadow-2xs ${
                    isInbound
                      ? "bg-white text-neutral-900 border border-[#E2E8F0] rounded-tl-none"
                      : isAmbiguous
                      ? "bg-amber-50 text-amber-950 border border-amber-300 rounded-tr-none"
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

                  {/* AMBIGUOUS Resolution Banner */}
                  {isAmbiguous && msg.operationId && (
                    <div className="mt-2.5 pt-2 border-t border-amber-200 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[10px] text-amber-800 truncate font-semibold">
                          {msg.lastError || "Network timeout &mdash; status unknown"}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setReconcileTarget({
                            operationId: msg.operationId!,
                            lastError: msg.lastError,
                          })
                        }
                        className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[10.5px] font-bold shrink-0 cursor-pointer transition-colors shadow-2xs"
                      >
                        Reconcile
                      </button>
                    </div>
                  )}

                  {/* RETRY_PENDING Safe Dispatch Banner */}
                  {isRetryPending && msg.operationId && (
                    <div className="mt-2.5 pt-2 border-t border-white/20 flex items-center justify-between gap-2">
                      <p className="text-[10px] text-white/80 truncate">
                        Non-acceptance verified &bull; Ready for retry
                      </p>
                      <button
                        type="button"
                        disabled={retryingOpId === msg.operationId}
                        onClick={() => handleRetryDispatch(msg.operationId!)}
                        className="px-2 py-1 bg-white text-[#7C3AED] hover:bg-neutral-100 rounded text-[10.5px] font-bold shrink-0 cursor-pointer transition-colors shadow-2xs disabled:opacity-50"
                      >
                        {retryingOpId === msg.operationId ? "Retrying..." : "Retry Dispatch"}
                      </button>
                    </div>
                  )}

                  {/* Footer Meta & Status Indicators */}
                  <div
                    className={`flex items-center justify-end gap-1.5 mt-1.5 text-[10px] ${
                      isInbound
                        ? "text-neutral-400"
                        : isAmbiguous
                        ? "text-amber-700 font-medium"
                        : "text-white/70"
                    }`}
                  >
                    <span>{timeStr}</span>
                    {!isInbound && renderStatusBadge(msg.outboxStatus, msg.metaStatus)}
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

      {/* 4. Reconcile Modal */}
      {reconcileTarget && (
        <ReconcileAmbiguousModal
          isOpen={true}
          operationId={reconcileTarget.operationId}
          destinationPhone={thread.recruiterPhone}
          lastError={reconcileTarget.lastError}
          onClose={() => setReconcileTarget(null)}
          onSuccess={() => {
            setReconcileTarget(null);
            onRefresh?.();
          }}
        />
      )}
    </div>
  );
};

