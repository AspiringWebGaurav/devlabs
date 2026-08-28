"use client";

import React, { useState, useRef, useTransition } from "react";
import {
  FaPaperPlane,
  FaFloppyDisk,
  FaTrash,
  FaSpinner,
  FaCheck,
  FaCircleExclamation,
  FaTriangleExclamation,
  FaEye,
  FaPenToSquare,
  FaBold,
  FaItalic,
  FaCode,
  FaLock,
  FaPaperclip,
  FaXmark,
} from "react-icons/fa6";
import {
  ADMIN_MAIL_SENDERS,
  compileSafeHtml,
} from "@/lib/email/mail-service";
import type {
  MailDraftDocument,
  MailRecipient,
  MailSenderKey,
} from "@/lib/dal/repositories/types";
import {
  deleteMailDraftAction,
  saveMailDraftAction,
  sendAdminMailAction,
} from "../actions";
import { ButtonHelpBadge } from "@/components/admin/ui/ButtonHelpTooltip";
import { BUTTON_HELP } from "@/lib/admin/constants/button-help";

interface ComposerAttachment {
  name: string;
  sizeBytes: number;
  contentType: string;
  content: string; // Base64 Data URL
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

const DISALLOWED_EXTENSIONS = [".exe", ".bat", ".cmd", ".sh", ".vbs", ".msi", ".dll", ".scr"];

interface ComposeMailFormProps {
  initialDraft?: MailDraftDocument | null;
  onSendSuccess?: (messageId: string) => void;
  onDraftSaved?: (draft: MailDraftDocument) => void;
  onDiscard?: () => void;
}

function generateIdempotencyKey(): string {
  return "ik_" + Date.now() + "_" + Math.random().toString(36).substring(2, 10);
}

function parseEmailList(raw: string): MailRecipient[] {
  if (!raw.trim()) return [];
  return raw
    .split(/[,;\n]+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .map((item) => {
      // Support "Name <email@domain.com>" or "email@domain.com"
      const match = item.match(/^(.*?)\s*<([^>]+)>$/);
      if (match) {
        return { name: match[1].trim() || undefined, email: match[2].trim().toLowerCase() };
      }
      return { email: item.toLowerCase() };
    });
}

function formatRecipientString(recipients: MailRecipient[] = []): string {
  return recipients
    .map((r) => (r.name ? `${r.name} <${r.email}>` : r.email))
    .join(", ");
}

export const ComposeMailForm: React.FC<ComposeMailFormProps> = ({
  initialDraft,
  onSendSuccess,
  onDraftSaved,
  onDiscard,
}) => {
  const [idempotencyKey, setIdempotencyKey] = useState(generateIdempotencyKey);
  const [draftId, setDraftId] = useState<string | undefined>(initialDraft?.id);

  const [senderKey, setSenderKey] = useState<MailSenderKey>(initialDraft?.senderKey || "SECURITY");
  const [toInput, setToInput] = useState(formatRecipientString(initialDraft?.to || []));
  const [ccInput, setCcInput] = useState(formatRecipientString(initialDraft?.cc || []));
  const [bccInput, setBccInput] = useState(formatRecipientString(initialDraft?.bcc || []));
  const [showCc, setShowCc] = useState(Boolean(initialDraft?.cc && initialDraft.cc.length > 0));
  const [showBcc, setShowBcc] = useState(Boolean(initialDraft?.bcc && initialDraft.bcc.length > 0));
  const [subject, setSubject] = useState(initialDraft?.subject || "");
  const [body, setBody] = useState(initialDraft?.body || "");

  // Attachments State & Refs
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [attachments, setAttachments] = useState<ComposerAttachment[]>([]);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);

  const [isPreview, setIsPreview] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isSavingDraft, setIsSavingDraft] = useState(false);

  const [alert, setAlert] = useState<{
    type: "success" | "error" | "warning";
    message: string;
    detail?: string;
  } | null>(null);

  // Sync state if initialDraft changes
  React.useEffect(() => {
    if (initialDraft) {
      setDraftId(initialDraft.id);
      setSenderKey(initialDraft.senderKey);
      setToInput(formatRecipientString(initialDraft.to || []));
      setCcInput(formatRecipientString(initialDraft.cc || []));
      setBccInput(formatRecipientString(initialDraft.bcc || []));
      setShowCc(Boolean(initialDraft.cc && initialDraft.cc.length > 0));
      setShowBcc(Boolean(initialDraft.bcc && initialDraft.bcc.length > 0));
      setSubject(initialDraft.subject || "");
      setBody(initialDraft.body || "");
      setAttachments([]);
      setAttachmentError(null);
      if (initialDraft.attachments && initialDraft.attachments.length > 0) {
        const fileNames = initialDraft.attachments.map((a) => a.name).join(", ");
        setAlert({
          type: "warning",
          message: `Draft loaded with ${initialDraft.attachments.length} saved attachment reference(s).`,
          detail: `Referenced files (${fileNames}) must be re-attached from your device before sending to stream active Base64 payloads.`,
        });
      } else {
        setAlert(null);
      }
    }
  }, [initialDraft]);

  const selectedIdentity = ADMIN_MAIL_SENDERS[senderKey] || ADMIN_MAIL_SENDERS.SECURITY;

  // File Attachment Handlers
  const handleFileSelect = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setAttachmentError(null);

    if (attachments.length + fileList.length > 5) {
      setAttachmentError("Maximum 5 attachments allowed per email.");
      return;
    }

    let runningTotal = attachments.reduce((sum, a) => sum + a.sizeBytes, 0);
    const validFiles: File[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();

      if (DISALLOWED_EXTENSIONS.includes(ext)) {
        setAttachmentError(`File "${file.name}" has an executable file extension (${ext}) which is blocked.`);
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        setAttachmentError(`File "${file.name}" exceeds the 5MB single file limit.`);
        return;
      }

      if (runningTotal + file.size > 10 * 1024 * 1024) {
        setAttachmentError("Combined attachments exceed 10MB maximum quota.");
        return;
      }

      // Check for duplicates by name
      if (attachments.some((a) => a.name === file.name)) {
        setAttachmentError(`Attachment "${file.name}" is already attached.`);
        return;
      }

      runningTotal += file.size;
      validFiles.push(file);
    }

    // Read to Base64 asynchronously
    validFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64Data = reader.result as string;
        setAttachments((prev) => {
          if (prev.some((a) => a.name === file.name)) return prev;
          return [
            ...prev,
            {
              name: file.name,
              sizeBytes: file.size,
              contentType: file.type || "application/octet-stream",
              content: base64Data,
            },
          ];
        });
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveAttachment = (indexToRemove: number) => {
    setAttachments((prev) => prev.filter((_, idx) => idx !== indexToRemove));
    setAttachmentError(null);
  };


  // Rich Text Insertion Helper
  const handleInsertFormatting = (prefix: string, suffix: string = prefix) => {
    const textarea = document.getElementById("compose-body-input") as HTMLTextAreaElement | null;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = body.substring(start, end);
    const replacement = `${prefix}${selectedText || "text"}${suffix}`;

    const newBody = body.substring(0, start) + replacement + body.substring(end);
    setBody(newBody);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + (selectedText.length || 4));
    }, 0);
  };

  const handleSaveDraft = async () => {
    if (isPending || isSavingDraft) return;
    setIsSavingDraft(true);
    setAlert(null);

    const toRecipients = parseEmailList(toInput);
    const ccRecipients = parseEmailList(ccInput);
    const bccRecipients = parseEmailList(bccInput);

    const draftAttachments = attachments.map((att) => ({
      name: att.name,
      sizeBytes: att.sizeBytes,
      contentType: att.contentType,
    }));

    try {
      const res = await saveMailDraftAction({
        id: draftId,
        senderKey,
        to: toRecipients,
        cc: ccRecipients,
        bcc: bccRecipients,
        subject: subject.trim(),
        body: body.trim(),
        attachments: draftAttachments,
      });

      if (res.success && res.data) {
        setDraftId(res.data.id);
        setAlert({
          type: "success",
          message: "Draft saved successfully to Firestore.",
        });
        if (onDraftSaved) onDraftSaved(res.data);
      } else {
        setAlert({
          type: "error",
          message: res.error || "Failed to save draft.",
        });
      }
    } catch (err: unknown) {
      setAlert({
        type: "error",
        message: (err as Error).message || "An unexpected error occurred while saving draft.",
      });
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleDiscard = async () => {
    if (draftId) {
      await deleteMailDraftAction(draftId).catch(() => {});
    }
    setDraftId(undefined);
    setToInput("");
    setCcInput("");
    setBccInput("");
    setSubject("");
    setBody("");
    setAttachments([]);
    setAttachmentError(null);
    setAlert(null);
    setIdempotencyKey(generateIdempotencyKey());
    if (onDiscard) onDiscard();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isPending) return;

    const toRecipients = parseEmailList(toInput);
    const ccRecipients = parseEmailList(ccInput);
    const bccRecipients = parseEmailList(bccInput);

    if (toRecipients.length === 0) {
      setAlert({ type: "error", message: "Please specify at least one valid 'To' recipient email address." });
      return;
    }

    if (!subject.trim()) {
      setAlert({ type: "error", message: "Subject line cannot be empty." });
      return;
    }

    if (!body.trim()) {
      setAlert({ type: "error", message: "Email body cannot be empty." });
      return;
    }

    const totalCount = toRecipients.length + ccRecipients.length + bccRecipients.length;
    if (totalCount > 50) {
      setAlert({ type: "error", message: "Total recipients (To + CC + BCC) cannot exceed 50." });
      return;
    }

    setAlert(null);

    startTransition(async () => {
      try {
        const payloadAttachments = attachments.map((att) => ({
          name: att.name,
          sizeBytes: att.sizeBytes,
          contentType: att.contentType,
          content: att.content,
        }));

        const res = await sendAdminMailAction({
          idempotencyKey,
          draftId,
          senderKey,
          to: toRecipients,
          cc: ccRecipients,
          bcc: bccRecipients,
          subject: subject.trim(),
          body: body.trim(),
          attachments: payloadAttachments.length > 0 ? payloadAttachments : undefined,
        });

        if (res.status === "SENT" && res.messageId) {
          setAlert({
            type: "success",
            message: `Email successfully dispatched via Brevo REST API v3.`,
            detail: `Message ID: ${res.messageId}`,
          });

          // Reset form on confirmed success
          setDraftId(undefined);
          setToInput("");
          setCcInput("");
          setBccInput("");
          setSubject("");
          setBody("");
          setAttachments([]);
          setAttachmentError(null);
          setIdempotencyKey(generateIdempotencyKey());

          if (onSendSuccess) onSendSuccess(res.messageId);
        } else if (res.status === "DELIVERY_UNCERTAIN") {
          setAlert({
            type: "warning",
            message: "Delivery status unconfirmed due to gateway timeout.",
            detail:
              res.error ||
              "The connection to Brevo timed out. Automated resending is blocked to prevent duplicate emails. Please check your Brevo dashboard before resending.",
          });
        } else {
          setAlert({
            type: "error",
            message: res.error || "Brevo rejected the email dispatch request.",
          });
        }
      } catch (err: unknown) {
        setAlert({
          type: "error",
          message: (err as Error).message || "An unexpected error occurred during dispatch.",
        });
      }
    });
  };

  return (
    <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-sm shadow-2xs font-admin-sans">
      {/* Compose Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-[#E2E8F0] bg-[#FAFAFA]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-sm bg-[#F5F3FF] border border-[#DDD6FE] flex items-center justify-center text-[#7C3AED]">
            <FaPaperPlane className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-black">Compose Outbound Message</h3>
            <p className="font-admin-mono text-[11px] text-[#64748B] flex items-center gap-1.5 mt-0.5">
              <FaLock className="w-2.5 h-2.5 text-[#10B981]" />
              <span>Brevo REST API v3 Dedicated Outbound Channel</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setIsPreview(!isPreview)}
            className={`px-3 py-1.5 text-xs font-admin-mono rounded-sm transition-colors border flex items-center gap-1.5 cursor-pointer ${
              isPreview
                ? "bg-[#7C3AED] text-white border-[#6D28D9]"
                : "bg-[#FFFFFF] text-[#475569] border-[#E2E8F0] hover:bg-[#F8FAFC]"
            }`}
          >
            {isPreview ? <FaPenToSquare className="w-3 h-3" /> : <FaEye className="w-3 h-3" />}
            <span>{isPreview ? "Edit Mode" : "HTML Preview"}</span>
          </button>
        </div>
      </div>

      {/* Status Alerts */}
      {alert && (
        <div className="p-4 border-b border-[#E2E8F0]">
          {alert.type === "success" && (
            <div className="p-3 bg-[#F0FDF4] border border-[#BBF7D0] rounded-sm text-xs text-[#166534] space-y-1">
              <div className="flex items-center gap-2 font-semibold">
                <FaCheck className="w-3.5 h-3.5 text-[#10B981]" />
                <span>{alert.message}</span>
              </div>
              {alert.detail && (
                <p className="font-admin-mono text-[11px] text-[#15803D] pl-5.5">{alert.detail}</p>
              )}
            </div>
          )}

          {alert.type === "warning" && (
            <div className="p-3 bg-[#FFFBEB] border border-[#FDE68A] rounded-sm text-xs text-[#92400E] space-y-1">
              <div className="flex items-center gap-2 font-semibold">
                <FaTriangleExclamation className="w-3.5 h-3.5 text-[#F59E0B]" />
                <span>{alert.message}</span>
              </div>
              {alert.detail && (
                <p className="font-admin-sans text-[11px] text-[#B45309] pl-5.5 leading-relaxed">
                  {alert.detail}
                </p>
              )}
            </div>
          )}

          {alert.type === "error" && (
            <div className="p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-sm text-xs text-[#991B1B] flex items-start gap-2.5">
              <FaCircleExclamation className="w-4 h-4 text-[#EF4444] shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">{alert.message}</span>
                {alert.detail && <p className="font-admin-mono text-[11px] mt-0.5">{alert.detail}</p>}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
        {/* From Identity Selector */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="font-admin-mono text-[11px] uppercase tracking-wider text-[#64748B] font-bold">
              From Identity (Verified Brevo Senders)
            </label>
            <div className="font-admin-mono text-[11px] text-[#10B981] flex items-center gap-1.5 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
              <span>Reply-To: {selectedIdentity.defaultReplyTo}</span>
            </div>
          </div>
          <select
            value={senderKey}
            onChange={(e) => setSenderKey(e.target.value as MailSenderKey)}
            disabled={isPending}
            className="w-full px-3 py-2 text-xs font-admin-sans font-semibold bg-[#FAFAFA] border border-[#E2E8F0] rounded-sm focus:outline-hidden focus:border-[#7C3AED] focus:bg-[#FFFFFF] transition-colors cursor-pointer"
          >
            {Object.values(ADMIN_MAIL_SENDERS).map((identity) => (
              <option key={identity.key} value={identity.key}>
                {identity.displayName} &lt;{identity.email}&gt;
              </option>
            ))}
          </select>

          {/* No-Reply Advisory Notice */}
          {selectedIdentity.isNoReply && (
            <div className="mt-2 p-2 bg-[#FFFBEB] border border-[#FDE68A] rounded-sm text-xs text-[#92400E] flex items-center gap-2">
              <FaTriangleExclamation className="w-3.5 h-3.5 text-[#F59E0B] shrink-0" />
              <span>
                <strong>Unmonitored Mailbox:</strong> Recipients replying to this address will not receive a response.
              </span>
            </div>
          )}
        </div>

        {/* To Recipient Field */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="font-admin-mono text-[11px] uppercase tracking-wider text-[#64748B] font-bold">
              To Recipients
            </label>
            <div className="flex items-center gap-3 font-admin-mono text-[11px] text-[#7C3AED]">
              {!showCc && (
                <button
                  type="button"
                  onClick={() => setShowCc(true)}
                  className="hover:underline cursor-pointer font-semibold"
                >
                  + CC
                </button>
              )}
              {!showBcc && (
                <button
                  type="button"
                  onClick={() => setShowBcc(true)}
                  className="hover:underline cursor-pointer font-semibold"
                >
                  + BCC
                </button>
              )}
            </div>
          </div>
          <input
            type="text"
            value={toInput}
            onChange={(e) => setToInput(e.target.value)}
            disabled={isPending}
            placeholder="john@example.com, Sarah <sarah@domain.com>"
            className="w-full px-3 py-2 text-xs font-admin-mono bg-[#FAFAFA] border border-[#E2E8F0] rounded-sm focus:outline-hidden focus:border-[#7C3AED] focus:bg-[#FFFFFF] transition-colors"
          />
        </div>

        {/* CC Field */}
        {showCc && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-admin-mono text-[11px] uppercase tracking-wider text-[#64748B] font-bold">
                CC Recipients
              </label>
              <button
                type="button"
                onClick={() => {
                  setCcInput("");
                  setShowCc(false);
                }}
                className="font-admin-mono text-[10px] text-[#94A3B8] hover:text-[#DC2626]"
              >
                Remove CC
              </button>
            </div>
            <input
              type="text"
              value={ccInput}
              onChange={(e) => setCcInput(e.target.value)}
              disabled={isPending}
              placeholder="colleague@domain.com"
              className="w-full px-3 py-2 text-xs font-admin-mono bg-[#FAFAFA] border border-[#E2E8F0] rounded-sm focus:outline-hidden focus:border-[#7C3AED] focus:bg-[#FFFFFF] transition-colors"
            />
          </div>
        )}

        {/* BCC Field */}
        {showBcc && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-admin-mono text-[11px] uppercase tracking-wider text-[#64748B] font-bold">
                BCC Recipients (Private Copy)
              </label>
              <button
                type="button"
                onClick={() => {
                  setBccInput("");
                  setShowBcc(false);
                }}
                className="font-admin-mono text-[10px] text-[#94A3B8] hover:text-[#DC2626]"
              >
                Remove BCC
              </button>
            </div>
            <input
              type="text"
              value={bccInput}
              onChange={(e) => setBccInput(e.target.value)}
              disabled={isPending}
              placeholder="archive@domain.com"
              className="w-full px-3 py-2 text-xs font-admin-mono bg-[#FAFAFA] border border-[#E2E8F0] rounded-sm focus:outline-hidden focus:border-[#7C3AED] focus:bg-[#FFFFFF] transition-colors"
            />
          </div>
        )}

        {/* Subject Line */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="font-admin-mono text-[11px] uppercase tracking-wider text-[#64748B] font-bold">
              Subject Line
            </label>
            <span className="font-admin-mono text-[10px] text-[#94A3B8]">
              {subject.length} / 200
            </span>
          </div>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            disabled={isPending}
            maxLength={200}
            placeholder="Official Portfolio Communication"
            className="w-full px-3 py-2 text-xs font-admin-sans font-semibold bg-[#FAFAFA] border border-[#E2E8F0] rounded-sm focus:outline-hidden focus:border-[#7C3AED] focus:bg-[#FFFFFF] transition-colors"
          />
        </div>

        {/* Hidden File Input for Attachments */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.png,.jpg,.jpeg,.webp,.zip"
          onChange={(e) => {
            handleFileSelect(e.target.files);
            e.target.value = "";
          }}
        />

        {/* Message Content & Rich Formatting */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="font-admin-mono text-[11px] uppercase tracking-wider text-[#64748B] font-bold">
              Message Content
            </label>

            {/* Quick Formatting & Attachment Controls */}
            {!isPreview && (
              <div className="flex items-center gap-1.5">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleInsertFormatting("**")}
                    title="Bold (**text**)"
                    className="p-1 px-2 text-[11px] font-admin-mono text-[#475569] hover:text-black bg-[#F1F5F9] hover:bg-[#E2E8F0] rounded-xs transition-colors flex items-center gap-1"
                  >
                    <FaBold className="w-2.5 h-2.5" />
                    <span>B</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertFormatting("*")}
                    title="Italic (*text*)"
                    className="p-1 px-2 text-[11px] font-admin-mono text-[#475569] hover:text-black bg-[#F1F5F9] hover:bg-[#E2E8F0] rounded-xs transition-colors flex items-center gap-1"
                  >
                    <FaItalic className="w-2.5 h-2.5" />
                    <span>I</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertFormatting("`")}
                    title="Code (`code`)"
                    className="p-1 px-2 text-[11px] font-admin-mono text-[#475569] hover:text-black bg-[#F1F5F9] hover:bg-[#E2E8F0] rounded-xs transition-colors flex items-center gap-1"
                  >
                    <FaCode className="w-2.5 h-2.5" />
                    <span>Code</span>
                  </button>
                </div>

                <div className="h-3.5 w-[1px] bg-[#CBD5E1]" />

                {/* Attach File Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isPending || attachments.length >= 5}
                  title="Attach files (PDF, images, documents up to 10MB total)"
                  className={`p-1 px-2 text-[11px] font-admin-mono rounded-xs transition-colors flex items-center gap-1 cursor-pointer border ${
                    attachments.length > 0
                      ? "bg-[#F5F3FF] text-[#7C3AED] border-[#DDD6FE] hover:bg-[#EDE9FE] font-bold"
                      : "text-[#475569] hover:text-black bg-[#F1F5F9] hover:bg-[#E2E8F0] border-transparent"
                  } disabled:opacity-50`}
                >
                  <FaPaperclip className="w-2.5 h-2.5 text-[#7C3AED]" />
                  <span>Attach ({attachments.length}/5)</span>
                  <ButtonHelpBadge text={BUTTON_HELP.ATTACH_FILES} />
                </button>
              </div>
            )}
          </div>

          {isPreview ? (
            <div className="w-full min-h-[140px] max-h-[200px] overflow-y-auto p-3.5 bg-[#FFFFFF] border border-[#E2E8F0] rounded-sm text-xs leading-relaxed font-admin-sans">
              <div
                dangerouslySetInnerHTML={{
                  __html: compileSafeHtml(body, subject),
                }}
              />
            </div>
          ) : (
            <textarea
              id="compose-body-input"
              rows={5}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              disabled={isPending}
              placeholder="Compose your email message here. Use standard paragraphs and formatting..."
              className="w-full px-3 py-2.5 text-xs font-admin-sans leading-relaxed bg-[#FAFAFA] border border-[#E2E8F0] rounded-sm focus:outline-hidden focus:border-[#7C3AED] focus:bg-[#FFFFFF] transition-colors resize-none"
            />
          )}

          {/* Attached Files List Container (Zero Shake / Compact) */}
          {attachments.length > 0 && (
            <div className="mt-2 p-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-sm space-y-1.5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between font-admin-mono text-[10px] text-[#64748B]">
                <span className="flex items-center gap-1 font-semibold uppercase tracking-wider text-black">
                  <FaPaperclip className="w-2.5 h-2.5 text-[#7C3AED]" />
                  Attached Files ({attachments.length}/5)
                </span>
                <span>
                  {formatBytes(attachments.reduce((sum, a) => sum + a.sizeBytes, 0))} / 10 MB Max
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {attachments.map((att, idx) => (
                  <div
                    key={`${att.name}-${idx}`}
                    className="flex items-center gap-1.5 px-2 py-0.5 bg-[#FFFFFF] border border-[#E2E8F0] hover:border-[#CBD5E1] rounded-xs text-xs font-admin-mono text-black transition-colors"
                  >
                    <FaPaperclip className="w-2.5 h-2.5 text-[#7C3AED] shrink-0" />
                    <span className="font-medium truncate max-w-[160px] sm:max-w-[220px]" title={att.name}>
                      {att.name}
                    </span>
                    <span className="text-[#94A3B8] text-[10px]">
                      ({formatBytes(att.sizeBytes)})
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveAttachment(idx)}
                      disabled={isPending}
                      className="ml-1 text-[#94A3B8] hover:text-[#DC2626] cursor-pointer p-0.5"
                      title="Remove attachment"
                    >
                      <FaXmark className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Attachment Error Notice */}
          {attachmentError && (
            <div className="mt-2 p-2 bg-[#FEF2F2] border border-[#FECACA] rounded-xs text-xs font-admin-mono text-[#991B1B] flex items-center justify-between animate-in fade-in duration-100">
              <div className="flex items-center gap-1.5">
                <FaCircleExclamation className="w-3 h-3 text-[#EF4444] shrink-0" />
                <span>{attachmentError}</span>
              </div>
              <button
                type="button"
                onClick={() => setAttachmentError(null)}
                className="text-[#991B1B] hover:text-black cursor-pointer"
              >
                <FaXmark className="w-3 h-3" />
              </button>
            </div>
          )}

          <div className="flex items-center justify-between font-admin-mono text-[10px] text-[#94A3B8] mt-1">
            <span>Formats into clean, responsive HTML email container</span>
            <span>{body.length} characters</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="pt-3 border-t border-[#E2E8F0] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={isPending || isSavingDraft}
              className="px-3.5 py-2 text-xs font-admin-mono text-[#475569] hover:text-black bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#E2E8F0] rounded-sm transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSavingDraft ? <FaSpinner className="w-3 h-3 animate-spin" /> : <FaFloppyDisk className="w-3 h-3 text-[#7C3AED]" />}
              <span>{isSavingDraft ? "Saving..." : "Save Draft"}</span>
              <ButtonHelpBadge text={BUTTON_HELP.SAVE_DRAFT} />
            </button>

            <button
              type="button"
              onClick={handleDiscard}
              disabled={isPending}
              className="px-3.5 py-2 text-xs font-admin-mono text-[#DC2626] hover:text-white bg-[#FEF2F2] hover:bg-[#DC2626] border border-[#FECACA] hover:border-[#DC2626] rounded-sm transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <FaTrash className="w-3 h-3" />
              <span>Discard</span>
              <ButtonHelpBadge text={BUTTON_HELP.DISCARD_DRAFT} />
            </button>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full sm:w-auto px-5 py-2 text-xs font-admin-sans font-bold text-white bg-[#7C3AED] hover:bg-[#6D28D9] border border-[#6D28D9] rounded-sm shadow-2xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isPending ? (
              <>
                <FaSpinner className="w-3.5 h-3.5 animate-spin" />
                <span>Dispatching via Brevo...</span>
              </>
            ) : (
              <>
                <FaPaperPlane className="w-3.5 h-3.5" />
                <span>Send Email Now</span>
                <ButtonHelpBadge text={BUTTON_HELP.SEND_MAIL} />
              </>
            )}
          </button>
        </div>
      </form>
    </div>


  );
};
