"use client";

import React, { useState } from "react";
import type { InquiryItem } from "@/lib/admin/repositories/types";
import { formatRelativeTime } from "@/lib/admin/utils";
import { FaInbox, FaReply, FaPaperPlane, FaCheck, FaEnvelope } from "react-icons/fa6";
import { ReplyInquiryModal } from "./ReplyInquiryModal";

interface InquiriesListProps {
  inquiries: InquiryItem[];
}

export const InquiriesList: React.FC<InquiriesListProps> = ({ inquiries: initialInquiries }) => {
  const [inquiries, setInquiries] = useState<InquiryItem[]>(initialInquiries);
  const [selectedInquiry, setSelectedInquiry] = useState<{
    id?: string;
    toEmail: string;
    toName?: string;
    subject: string;
    message?: string;
  } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Sync state if props change
  React.useEffect(() => {
    setInquiries(initialInquiries);
  }, [initialInquiries]);

  const handleOpenDirectCompose = () => {
    setSelectedInquiry({
      id: undefined,
      toEmail: "",
      toName: "",
      subject: "",
      message: "",
    });
    setIsModalOpen(true);
  };

  const handleOpenReply = (item: InquiryItem) => {
    const defaultSubject = item.subject?.startsWith("Re:")
      ? item.subject
      : `Re: ${item.subject || "Portfolio Inquiry"}`;

    setSelectedInquiry({
      id: item.id,
      toEmail: item.email,
      toName: item.name,
      subject: defaultSubject,
      message: `Hi ${item.name.split(" ")[0] || item.name},\n\n`,
    });
    setIsModalOpen(true);
  };

  const handleSendSuccess = (messageId: string) => {
    if (selectedInquiry?.id) {
      setInquiries((prev) =>
        prev.map((item) =>
          item.id === selectedInquiry.id
            ? {
                ...item,
                status: "read",
                repliedAt: new Date().toISOString(),
                replyMessageId: messageId,
              }
            : item
        )
      );
    }
    setNotification(`Email reply successfully dispatched via Brevo (ID: ${messageId.substring(0, 16)}...)`);
    setTimeout(() => setNotification(null), 6000);
  };

  return (
    <div className="space-y-4">
      {/* Inbox Control Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 bg-[#FFFFFF] border border-[#E2E8F0] rounded-none sm:rounded-sm shadow-2xs">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#7C3AED]" />
          <span className="font-admin-sans font-bold text-xs uppercase tracking-wider text-black">
            Inbound Communications ({inquiries.length})
          </span>
        </div>

        <button
          type="button"
          onClick={handleOpenDirectCompose}
          className="px-3 py-1.5 text-xs font-admin-sans font-semibold text-white bg-[#7C3AED] hover:bg-[#6D28D9] rounded-sm shadow-2xs transition-colors flex items-center gap-2 cursor-pointer"
        >
          <FaPaperPlane className="w-3 h-3" />
          <span>Direct Outreach Reply / Compose</span>
        </button>
      </div>

      {notification && (
        <div className="p-3 bg-[#ECFDF5] border border-[#A7F3D0] rounded-sm flex items-center justify-between text-xs text-[#065F46] animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <FaCheck className="w-3.5 h-3.5 text-[#10B981]" />
            <span>{notification}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-[#065F46] hover:text-black font-admin-mono text-[11px]"
          >
            Dismiss
          </button>
        </div>
      )}

      {inquiries.length === 0 ? (
        <div className="w-full p-8 sm:p-12 bg-[#FFFFFF] border border-[#E2E8F0] rounded-none sm:rounded-sm flex flex-col items-center justify-center text-center space-y-3 shadow-2xs">
          <div className="w-10 h-10 rounded-sm bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-center">
            <FaInbox className="w-4 h-4 text-[#94A3B8]" />
          </div>
          <div>
            <h3 className="font-admin-sans font-bold text-sm text-black">Inbox is Empty</h3>
            <p className="font-admin-mono text-xs text-[#64748B] mt-0.5 max-w-sm">
              Contact form submissions and portfolio inquiries will appear here in real-time.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {inquiries.map((item) => (
            <div
              key={item.id}
              className="p-4 sm:p-5 bg-[#FFFFFF] border border-[#E2E8F0] hover:border-[#CBD5E1] rounded-none sm:rounded-sm transition-colors shadow-2xs space-y-3"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      item.repliedAt
                        ? "bg-[#10B981]"
                        : item.status === "unread"
                        ? "bg-[#7C3AED]"
                        : "bg-[#94A3B8]"
                    }`}
                  />
                  <span className="font-admin-sans font-bold text-sm text-black truncate">
                    {item.name}
                  </span>
                  <span className="font-admin-mono text-xs text-[#64748B] truncate">
                    &lt;{item.email}&gt;
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {item.repliedAt && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#F0FDF4] border border-[#BBF7D0] text-[#166534] font-admin-mono text-[10px] rounded-xs font-semibold">
                      <FaCheck className="w-2.5 h-2.5" />
                      Replied
                    </span>
                  )}
                  <span className="font-admin-mono text-[11px] text-[#94A3B8]">
                    {formatRelativeTime(item.createdAt)}
                  </span>
                </div>
              </div>

              {item.subject && (
                <div className="font-admin-sans font-semibold text-xs text-[#0F172A] flex items-center gap-1.5">
                  <FaEnvelope className="w-3 h-3 text-[#94A3B8]" />
                  <span>{item.subject}</span>
                </div>
              )}

              <p className="font-admin-sans text-xs text-[#334155] leading-relaxed whitespace-pre-wrap bg-[#FAFAFA] p-3 border border-[#F1F5F9] rounded-xs">
                {item.message}
              </p>

              {item.repliedAt && item.replyMessage && (
                <div className="p-3 bg-[#F8FAFC] border-l-2 border-[#7C3AED] rounded-xs space-y-1">
                  <div className="flex items-center justify-between font-admin-mono text-[10px] text-[#64748B]">
                    <span>Sent Reply via security@gauravservices.eu.cc</span>
                    <span>{formatRelativeTime(item.repliedAt)}</span>
                  </div>
                  <p className="font-admin-sans text-xs text-[#475569] italic line-clamp-2">
                    &ldquo;{item.replyMessage}&rdquo;
                  </p>
                </div>
              )}

              <div className="flex items-center justify-end pt-1">
                <button
                  type="button"
                  onClick={() => handleOpenReply(item)}
                  className="px-3 py-1 text-xs font-admin-sans font-medium text-[#7C3AED] hover:text-[#6D28D9] bg-[#F5F3FF] hover:bg-[#EDE9FE] border border-[#DDD6FE] rounded-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <FaReply className="w-3 h-3" />
                  <span>Reply via Brevo</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reply / Compose Modal */}
      <ReplyInquiryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        inquiryId={selectedInquiry?.id}
        defaultToEmail={selectedInquiry?.toEmail || ""}
        defaultToName={selectedInquiry?.toName || ""}
        defaultSubject={selectedInquiry?.subject || ""}
        defaultMessage={selectedInquiry?.message || ""}
        onSuccess={handleSendSuccess}
      />
    </div>
  );
};
