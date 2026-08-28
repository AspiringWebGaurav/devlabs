"use client";

import React, { useState } from "react";
import {
  FaEnvelope,
  FaCheck,
  FaCircleExclamation,
  FaTriangleExclamation,
  FaSpinner,
  FaXmark,
  FaEye,
  FaInbox,
  FaChevronLeft,
  FaChevronRight,
  FaLock,
  FaPaperclip,
} from "react-icons/fa6";
import type { MailDocument, PaginatedResult } from "@/lib/dal/repositories/types";
import { formatRelativeTime } from "@/lib/admin/utils";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

interface SentMailLedgerProps {
  initialData: PaginatedResult<MailDocument>;
  onPageChange?: (page: number) => void;
}

export const SentMailLedger: React.FC<SentMailLedgerProps> = ({
  initialData,
  onPageChange,
}) => {
  const [selectedMail, setSelectedMail] = useState<MailDocument | null>(null);
  const items = initialData.items || [];

  return (
    <div className="space-y-4 font-admin-sans">
      {/* Ledger Header Bar */}
      <div className="flex items-center justify-between p-3.5 bg-[#FFFFFF] border border-[#E2E8F0] rounded-none sm:rounded-sm shadow-2xs">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#7C3AED]" />
          <span className="font-admin-sans font-bold text-xs uppercase tracking-wider text-black">
            Outbound Mail Ledger ({initialData.total || items.length})
          </span>
        </div>

        <div className="font-admin-mono text-[11px] text-[#64748B] flex items-center gap-1.5">
          <FaLock className="w-2.5 h-2.5 text-[#10B981]" />
          <span>Immutable Audit Ledger</span>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="w-full p-8 sm:p-12 bg-[#FFFFFF] border border-[#E2E8F0] rounded-none sm:rounded-sm flex flex-col items-center justify-center text-center space-y-3 shadow-2xs">
          <div className="w-10 h-10 rounded-sm bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-center">
            <FaInbox className="w-4 h-4 text-[#94A3B8]" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-black">No Outbound Emails Found</h3>
            <p className="font-admin-mono text-xs text-[#64748B] mt-0.5 max-w-sm">
              Emails dispatched through the Admin Mail Center will appear here with delivery telemetry.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          {items.map((mail) => (
            <div
              key={mail.id}
              className="p-4 bg-[#FFFFFF] border border-[#E2E8F0] hover:border-[#CBD5E1] rounded-none sm:rounded-sm transition-colors shadow-2xs space-y-2.5"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {/* Status Indicator */}
                  {mail.status === "SENT" && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#F0FDF4] border border-[#BBF7D0] text-[#166534] font-admin-mono text-[10px] rounded-xs font-semibold shrink-0">
                      <FaCheck className="w-2.5 h-2.5 text-[#10B981]" />
                      SENT
                    </span>
                  )}
                  {mail.status === "DELIVERY_UNCERTAIN" && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#FFFBEB] border border-[#FDE68A] text-[#92400E] font-admin-mono text-[10px] rounded-xs font-semibold shrink-0">
                      <FaTriangleExclamation className="w-2.5 h-2.5 text-[#F59E0B]" />
                      UNCERTAIN
                    </span>
                  )}
                  {mail.status === "FAILED" && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] font-admin-mono text-[10px] rounded-xs font-semibold shrink-0">
                      <FaCircleExclamation className="w-2.5 h-2.5 text-[#EF4444]" />
                      FAILED
                    </span>
                  )}
                  {mail.status === "SENDING" && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#EFF6FF] border border-[#BFDBFE] text-[#1E40AF] font-admin-mono text-[10px] rounded-xs font-semibold shrink-0">
                      <FaSpinner className="w-2.5 h-2.5 animate-spin" />
                      IN-FLIGHT
                    </span>
                  )}

                  {/* Attachment Badge */}
                  {mail.attachments && mail.attachments.length > 0 && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#F5F3FF] border border-[#DDD6FE] text-[#7C3AED] font-admin-mono text-[10px] rounded-xs font-semibold shrink-0">
                      <FaPaperclip className="w-2.5 h-2.5 text-[#7C3AED]" />
                      <span>{mail.attachments.length} {mail.attachments.length === 1 ? "file" : "files"}</span>
                    </span>
                  )}

                  <span className="font-admin-mono text-xs font-bold text-black truncate">
                    {mail.senderEmail}
                  </span>
                  <span className="font-admin-mono text-[11px] text-[#64748B] truncate">
                    &rarr; {mail.to.map((t) => t.email).join(", ")}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-admin-mono text-[11px] text-[#94A3B8]">
                    {formatRelativeTime(mail.sentAt || mail.createdAt)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedMail(mail)}
                    className="p-1.5 px-2.5 text-xs font-admin-mono text-[#7C3AED] hover:text-white bg-[#F5F3FF] hover:bg-[#7C3AED] border border-[#DDD6FE] hover:border-[#7C3AED] rounded-xs transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <FaEye className="w-3 h-3" />
                    <span>View</span>
                  </button>
                </div>
              </div>

              {/* Subject line */}
              <div className="flex items-center gap-2 text-xs font-semibold text-[#0F172A]">
                <FaEnvelope className="w-3 h-3 text-[#94A3B8] shrink-0" />
                <span className="truncate">{mail.subject}</span>
              </div>

              {/* Error reason if failed or uncertain */}
              {mail.errorMessage && mail.status !== "SENT" && (
                <p className="font-admin-mono text-[11px] text-[#991B1B] bg-[#FEF2F2] p-2 border border-[#FECACA] rounded-xs">
                  {mail.errorMessage}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination Footer */}
      {(initialData.hasMore || (initialData.page && initialData.page > 1)) && (
        <div className="flex items-center justify-between p-3 bg-[#FFFFFF] border border-[#E2E8F0] rounded-sm font-admin-mono text-xs text-[#64748B]">
          <span>Page {initialData.page || 1}</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!initialData.page || initialData.page <= 1}
              onClick={() => onPageChange && onPageChange((initialData.page || 1) - 1)}
              className="px-3 py-1 bg-[#F8FAFC] border border-[#E2E8F0] rounded-sm text-[#475569] hover:text-black disabled:opacity-40 cursor-pointer flex items-center gap-1"
            >
              <FaChevronLeft className="w-2.5 h-2.5" />
              <span>Previous</span>
            </button>
            <button
              type="button"
              disabled={!initialData.hasMore}
              onClick={() => onPageChange && onPageChange((initialData.page || 1) + 1)}
              className="px-3 py-1 bg-[#F8FAFC] border border-[#E2E8F0] rounded-sm text-[#475569] hover:text-black disabled:opacity-40 cursor-pointer flex items-center gap-1"
            >
              <span>Next</span>
              <FaChevronRight className="w-2.5 h-2.5" />
            </button>
          </div>
        </div>
      )}

      {/* Slide-over Detail Modal */}
      {selectedMail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedMail(null);
          }}
        >
          <div className="w-full max-w-2xl bg-[#FFFFFF] border border-[#E2E8F0] rounded-sm shadow-xl flex flex-col max-h-[85vh] overflow-hidden text-black font-admin-sans">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E2E8F0] bg-[#FAFAFA]">
              <div>
                <h3 className="font-bold text-sm text-black truncate max-w-md">
                  {selectedMail.subject}
                </h3>
                <p className="font-admin-mono text-[11px] text-[#64748B] mt-0.5">
                  ID: {selectedMail.id}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMail(null)}
                className="p-1.5 text-[#64748B] hover:text-black hover:bg-[#E2E8F0]/50 rounded-sm transition-colors"
              >
                <FaXmark className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Metadata Ledger */}
            <div className="p-5 space-y-3 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-sm font-admin-mono text-xs">
                <div>
                  <span className="text-[#94A3B8] block text-[10px] uppercase">From</span>
                  <span className="font-bold text-black">{selectedMail.senderEmail}</span>
                </div>
                <div>
                  <span className="text-[#94A3B8] block text-[10px] uppercase">Reply-To</span>
                  <span>{selectedMail.replyTo}</span>
                </div>
                <div>
                  <span className="text-[#94A3B8] block text-[10px] uppercase">To</span>
                  <span>{selectedMail.to.map((t) => (t.name ? `${t.name} <${t.email}>` : t.email)).join(", ")}</span>
                </div>
                <div>
                  <span className="text-[#94A3B8] block text-[10px] uppercase">Status</span>
                  <span className="font-bold">{selectedMail.status}</span>
                </div>
                {selectedMail.cc && selectedMail.cc.length > 0 && (
                  <div className="sm:col-span-2">
                    <span className="text-[#94A3B8] block text-[10px] uppercase">CC</span>
                    <span>{selectedMail.cc.map((c) => c.email).join(", ")}</span>
                  </div>
                )}
                {selectedMail.brevoMessageId && (
                  <div className="sm:col-span-2">
                    <span className="text-[#94A3B8] block text-[10px] uppercase">Brevo Message ID</span>
                    <span className="text-[#7C3AED] select-all">{selectedMail.brevoMessageId}</span>
                  </div>
                )}
                {selectedMail.attachments && selectedMail.attachments.length > 0 && (
                  <div className="sm:col-span-2">
                    <span className="text-[#94A3B8] block text-[10px] uppercase mb-1">Attached Documents ({selectedMail.attachments.length})</span>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedMail.attachments.map((att, idx) => (
                        <div
                          key={`${att.name}-${idx}`}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#FFFFFF] border border-[#E2E8F0] rounded-xs font-admin-mono text-[11px] text-black"
                        >
                          <FaPaperclip className="w-2.5 h-2.5 text-[#7C3AED]" />
                          <span className="font-semibold">{att.name}</span>
                          <span className="text-[#94A3B8] text-[10px]">({formatBytes(att.sizeBytes)})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Rendered Email Body Content */}
              <div>
                <label className="block font-admin-mono text-[11px] uppercase tracking-wider text-[#64748B] mb-1.5">
                  Message Content (Text View)
                </label>
                <div className="p-4 bg-[#FAFAFA] border border-[#E2E8F0] rounded-sm text-xs leading-relaxed font-admin-sans whitespace-pre-wrap max-h-72 overflow-y-auto">
                  {selectedMail.textBody}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 border-t border-[#E2E8F0] flex justify-end bg-[#FAFAFA]">
              <button
                type="button"
                onClick={() => setSelectedMail(null)}
                className="px-4 py-1.5 text-xs font-admin-mono bg-[#FFFFFF] border border-[#E2E8F0] text-[#475569] hover:text-black rounded-sm transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
