"use client";

import React, { useState, useTransition } from "react";
import { FaPaperPlane, FaXmark, FaLock, FaSpinner, FaCircleExclamation } from "react-icons/fa6";
import { replyToInquiryAction } from "../actions";
import { ButtonHelpBadge } from "@/components/admin/ui/ButtonHelpTooltip";
import { BUTTON_HELP } from "@/lib/admin/constants/button-help";


interface ReplyInquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
  inquiryId?: string;
  defaultToEmail?: string;
  defaultToName?: string;
  defaultSubject?: string;
  defaultMessage?: string;
  onSuccess?: (messageId: string, note?: string) => void;
}

export const ReplyInquiryModal: React.FC<ReplyInquiryModalProps> = ({
  isOpen,
  onClose,
  inquiryId,
  defaultToEmail = "",
  defaultToName = "",
  defaultSubject = "",
  defaultMessage = "",
  onSuccess,
}) => {
  const [toEmail, setToEmail] = useState(defaultToEmail);
  const [toName, setToName] = useState(defaultToName);
  const [subject, setSubject] = useState(defaultSubject);
  const [message, setMessage] = useState(defaultMessage);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Stable client-generated idempotency key preserved across retries of the same reply session
  const [idempotencyKey, setIdempotencyKey] = useState<string>(() =>
    `inq_reply_${inquiryId || "outreach"}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
  );

  // Reset form and generate fresh idempotency key when modal opens with new props
  React.useEffect(() => {
    if (isOpen) {
      setToEmail(defaultToEmail);
      setToName(defaultToName);
      setSubject(defaultSubject);
      setMessage(defaultMessage);
      setError(null);
      setIdempotencyKey(
        `inq_reply_${inquiryId || "outreach"}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
      );
    }
  }, [isOpen, defaultToEmail, defaultToName, defaultSubject, defaultMessage, inquiryId]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isPending) return; // Duplicate submission guard

    const trimmedEmail = toEmail.trim();
    const trimmedSubject = subject.trim();
    const trimmedMessage = message.trim();

    if (!trimmedEmail) {
      setError("Recipient email address is required.");
      return;
    }
    if (!trimmedSubject) {
      setError("Subject line is required.");
      return;
    }
    if (!trimmedMessage || trimmedMessage.length < 5) {
      setError("Message must be at least 5 characters long.");
      return;
    }

    setError(null);

    startTransition(async () => {
      try {
        const res = await replyToInquiryAction({
          id: inquiryId,
          idempotencyKey,
          toEmail: trimmedEmail,
          toName: toName.trim() || undefined,
          subject: trimmedSubject,
          message: trimmedMessage,
        });

        if (res.success) {
          // On confirmed Brevo dispatch success / existing record: Dismiss UI and clear state
          setError(null);
          if (onSuccess && res.messageId) {
            let note: string | undefined;
            if (res.status === "PERSISTENCE_PENDING") {
              note = res.warning || "Email accepted by Brevo; inquiry history sync is pending.";
            } else if (res.status === "ALREADY_REPLIED") {
              note = res.warning || "This inquiry was already replied to and marked as read.";
            } else {
              note = `Email reply successfully dispatched via Brevo (ID: ${res.messageId.substring(0, 16)}...)`;
            }
            onSuccess(res.messageId, note);
          }
          onClose();
        } else {
          // If dispatch failed: keep UI open and show real error safely without regenerating idempotencyKey
          setError(res.error || "Failed to dispatch email reply via Brevo.");
        }
      } catch (err: unknown) {
        const errorObj = err as Error;
        setError(errorObj.message || "An unexpected error occurred during dispatch.");
      }
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isPending) onClose();
      }}
    >
      <div className="w-full max-w-xl bg-[#FFFFFF] border border-[#E2E8F0] rounded-sm shadow-xl flex flex-col overflow-hidden text-black font-admin-sans">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E2E8F0] bg-[#FAFAFA]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-sm bg-[#F5F3FF] border border-[#DDD6FE] flex items-center justify-center text-[#7C3AED]">
              <FaPaperPlane className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-black">Dispatch Email Reply</h3>
              <p className="font-admin-mono text-[11px] text-[#64748B] flex items-center gap-1.5 mt-0.5">
                <FaLock className="w-2.5 h-2.5 text-[#10B981]" />
                <span>From: security@gauravpatil.online (Brevo Gateway)</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="p-1.5 text-[#64748B] hover:text-black hover:bg-[#E2E8F0]/50 rounded-sm transition-colors disabled:opacity-50"
          >
            <FaXmark className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-sm flex items-start gap-2.5 text-xs text-[#991B1B]">
              <FaCircleExclamation className="w-4 h-4 text-[#EF4444] shrink-0 mt-0.5" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          {/* Recipient Field */}
          <div>
            <label className="block font-admin-mono text-[11px] uppercase tracking-wider text-[#64748B] mb-1">
              To Recipient
            </label>
            <div className="flex gap-2">
              <input
                type="email"
                value={toEmail}
                onChange={(e) => setToEmail(e.target.value)}
                disabled={isPending}
                required
                placeholder="recipient@domain.com"
                className="flex-1 px-3 py-2 text-xs font-admin-mono bg-[#FAFAFA] border border-[#E2E8F0] rounded-sm focus:outline-hidden focus:border-[#7C3AED] focus:bg-[#FFFFFF] transition-colors disabled:opacity-60"
              />
              <input
                type="text"
                value={toName}
                onChange={(e) => setToName(e.target.value)}
                disabled={isPending}
                placeholder="Recipient Name (Optional)"
                className="w-1/3 px-3 py-2 text-xs font-admin-sans bg-[#FAFAFA] border border-[#E2E8F0] rounded-sm focus:outline-hidden focus:border-[#7C3AED] focus:bg-[#FFFFFF] transition-colors disabled:opacity-60"
              />
            </div>
          </div>

          {/* Subject Field */}
          <div>
            <label className="block font-admin-mono text-[11px] uppercase tracking-wider text-[#64748B] mb-1">
              Subject
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={isPending}
              required
              placeholder="Re: Inquiry Subject"
              className="w-full px-3 py-2 text-xs font-admin-sans font-medium bg-[#FAFAFA] border border-[#E2E8F0] rounded-sm focus:outline-hidden focus:border-[#7C3AED] focus:bg-[#FFFFFF] transition-colors disabled:opacity-60"
            />
          </div>

          {/* Message Field */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-admin-mono text-[11px] uppercase tracking-wider text-[#64748B]">
                Message Content
              </label>
              <span className="font-admin-mono text-[10px] text-[#94A3B8]">
                {message.length} characters
              </span>
            </div>
            <textarea
              rows={8}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={isPending}
              required
              placeholder="Write your email reply..."
              className="w-full px-3 py-2.5 text-xs font-admin-sans leading-relaxed bg-[#FAFAFA] border border-[#E2E8F0] rounded-sm focus:outline-hidden focus:border-[#7C3AED] focus:bg-[#FFFFFF] transition-colors resize-none disabled:opacity-60"
            />
          </div>

          {/* Modal Footer */}
          <div className="pt-2 flex items-center justify-between border-t border-[#E2E8F0]">
            <div className="font-admin-mono text-[11px] text-[#64748B] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#7C3AED]" />
              <span>Brevo REST API v3 Direct Outbound</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isPending}
                className="px-3.5 py-1.5 text-xs font-admin-sans font-medium text-[#475569] hover:text-black hover:bg-[#F1F5F9] border border-transparent rounded-sm transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="px-4 py-1.5 text-xs font-admin-sans font-semibold text-white bg-[#7C3AED] hover:bg-[#6D28D9] border border-[#6D28D9] rounded-sm shadow-2xs transition-colors flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isPending ? (
                  <>
                    <FaSpinner className="w-3 h-3 animate-spin" />
                    <span>Dispatching...</span>
                  </>
                ) : (
                  <>
                    <FaPaperPlane className="w-3 h-3" />
                    <span>Send Reply via Brevo</span>
                    <ButtonHelpBadge text={BUTTON_HELP.DISPATCH_REPLY} />
                  </>
                )}
              </button>

            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
