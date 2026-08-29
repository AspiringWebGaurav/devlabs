"use client";

import React, { useState, useRef, useEffect, useCallback, useTransition } from "react";
import {
  FaPaperPlane,
  FaFloppyDisk,
  FaTrash,
  FaSpinner,
  FaCheck,
  FaCircleExclamation,
  FaTriangleExclamation,
  FaCircleInfo,
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
import { useAdminConfirm } from "@/components/admin/context";
import {
  normalizeDraftState,
  isDraftEmpty,
  isDraftEqual,
  NormalizedDraftSnapshot,
} from "@/lib/mail/draft-normalizer";
import {
  validateSendEligibility,
  countMeaningfulWords,
  BLOCKED_ATTACHMENT_EXTENSIONS,
} from "@/lib/mail/send-validator";

interface ComposerAttachment {
  id: string;
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

interface ComposeMailFormProps {
  initialDraft?: MailDraftDocument | null;
  onSendSuccess?: (messageId: string) => void;
  onDraftSaved?: (draft: MailDraftDocument) => void;
  onDiscard?: () => void;
}

function generateCreateOperationId(): string {
  return "draft_op_" + Date.now() + "_" + Math.random().toString(36).substring(2, 10);
}

function generateSendOperationId(): string {
  return "send_op_" + Date.now() + "_" + Math.random().toString(36).substring(2, 10);
}

function generateAttachmentId(): string {
  return "att_" + Date.now() + "_" + Math.random().toString(36).substring(2, 8);
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
  const confirm = useAdminConfirm();

  // Core Identity & Synchronization State
  const [draftId, setDraftId] = useState<string | undefined>(initialDraft?.id);
  const [draftRevision, setDraftRevision] = useState<number | undefined>(initialDraft?.revision);
  const [lastSavedTimestamp, setLastSavedTimestamp] = useState<string | null>(initialDraft?.updatedAt || null);
  const createOperationIdRef = useRef<string>(initialDraft?.createOperationId || generateCreateOperationId());
  const activeSendOpIdRef = useRef<string | null>(null);

  // Form Field Inputs
  const [senderKey, setSenderKey] = useState<MailSenderKey>(initialDraft?.senderKey || "HELLO");
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

  // Concurrency, Baseline & In-Flight State
  const persistedBaselineRef = useRef<NormalizedDraftSnapshot>(
    normalizeDraftState(
      initialDraft
        ? {
            senderKey: initialDraft.senderKey,
            to: initialDraft.to,
            cc: initialDraft.cc,
            bcc: initialDraft.bcc,
            subject: initialDraft.subject,
            body: initialDraft.body,
            attachments: initialDraft.attachments,
          }
        : {}
    )
  );
  const saveGenerationRef = useRef<number>(0);

  const [isPreview, setIsPreview] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isDiscarding, setIsDiscarding] = useState(false);

  // Conflict Recovery State
  const [conflictState, setConflictState] = useState<{
    serverRevision: number;
    serverDraft?: MailDraftDocument;
  } | null>(null);

  // Notification Lifecycle & Timer State
  const notificationTimerRef = useRef<{ id: string; timer: ReturnType<typeof setTimeout> } | null>(null);
  const [notification, setNotification] = useState<{
    id: string;
    type: "success" | "error" | "warning" | "info";
    message: string;
    detail?: string;
  } | null>(null);

  const showNotification = useCallback(
    (type: "success" | "error" | "warning" | "info", message: string, detail?: string) => {
      const id = "notif_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);
      if (notificationTimerRef.current) {
        clearTimeout(notificationTimerRef.current.timer);
        notificationTimerRef.current = null;
      }
      setNotification({ id, type, message, detail });
      const duration = type === "success" || type === "info" ? 5000 : type === "warning" ? 7000 : 0;
      if (duration > 0) {
        const timer = setTimeout(() => {
          setNotification((current) => (current?.id === id ? null : current));
          if (notificationTimerRef.current?.id === id) {
            notificationTimerRef.current = null;
          }
        }, duration);
        notificationTimerRef.current = { id, timer };
      }
    },
    []
  );

  const dismissNotification = useCallback(() => {
    if (notificationTimerRef.current) {
      clearTimeout(notificationTimerRef.current.timer);
      notificationTimerRef.current = null;
    }
    setNotification(null);
  }, []);

  useEffect(() => {
    return () => {
      if (notificationTimerRef.current) {
        clearTimeout(notificationTimerRef.current.timer);
      }
    };
  }, []);

  // Sync state if initialDraft changes (e.g. Resumed from Drafts list)
  useEffect(() => {
    if (initialDraft) {
      setDraftId(initialDraft.id);
      setDraftRevision(initialDraft.revision);
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
      setLastSavedTimestamp(initialDraft.updatedAt || null);
      setConflictState(null);
      createOperationIdRef.current = initialDraft.createOperationId || generateCreateOperationId();
      activeSendOpIdRef.current = null;

      const loadedBaseline = normalizeDraftState({
        senderKey: initialDraft.senderKey,
        to: initialDraft.to,
        cc: initialDraft.cc,
        bcc: initialDraft.bcc,
        subject: initialDraft.subject,
        body: initialDraft.body,
        attachments: initialDraft.attachments,
      });
      persistedBaselineRef.current = loadedBaseline;

      if (initialDraft.attachments && initialDraft.attachments.length > 0) {
        const fileNames = initialDraft.attachments.map((a) => a.name).join(", ");
        showNotification(
          "warning",
          `Draft loaded with ${initialDraft.attachments.length} saved attachment reference(s).`,
          `Referenced files (${fileNames}) must be re-attached from your device before sending to stream active Base64 payloads.`
        );
      }
    }
  }, [initialDraft, showNotification]);

  const selectedIdentity = ADMIN_MAIL_SENDERS[senderKey] || ADMIN_MAIL_SENDERS.HELLO;

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

      if (BLOCKED_ATTACHMENT_EXTENSIONS.has(ext)) {
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
      if (attachments.some((a) => a.name.toLowerCase() === file.name.toLowerCase())) {
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
          if (prev.some((a) => a.name.toLowerCase() === file.name.toLowerCase())) return prev;
          return [
            ...prev,
            {
              id: generateAttachmentId(),
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

  // Derived Dynamic State Calculations
  const currentNormalized = normalizeDraftState({
    senderKey,
    to: toInput,
    cc: ccInput,
    bcc: bccInput,
    subject,
    body,
    attachments,
  });

  const isEmpty = isDraftEmpty(currentNormalized);
  const isDirty = !isDraftEqual(currentNormalized, persistedBaselineRef.current);
  const isLoaded = Boolean(draftId && !isDirty);

  const canSaveDraft = isDirty && !isEmpty && !isSavingDraft && !isDiscarding && !isPending;
  const canDiscard = (!isEmpty || Boolean(draftId)) && !isSavingDraft && !isDiscarding && !isPending;

  // Pure Send Eligibility Calculation
  const sendEligibility = validateSendEligibility({
    senderKey,
    to: toInput,
    cc: ccInput,
    bcc: bccInput,
    subject,
    body,
    attachments,
    isPending,
    isSavingDraft,
    isDiscarding,
    hasConflict: Boolean(conflictState),
    attachmentError,
  });

  const canSend = sendEligibility.canSend;
  const meaningfulWordCount = countMeaningfulWords(body);

  // Single Status Priority Badge Renderer
  const renderStatusBadge = () => {
    if (isDiscarding) {
      return (
        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-xs bg-[#FEF2F2] border border-[#FECACA] text-[10px] font-admin-mono text-[#991B1B] font-semibold">
          <FaSpinner className="w-2.5 h-2.5 animate-spin text-[#EF4444]" />
          <span>Deleting Draft...</span>
        </div>
      );
    }
    if (isPending) {
      return (
        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-xs bg-[#F5F3FF] border border-[#DDD6FE] text-[10px] font-admin-mono text-[#7C3AED] font-bold">
          <FaSpinner className="w-2.5 h-2.5 animate-spin text-[#7C3AED]" />
          <span>Sending via Brevo...</span>
        </div>
      );
    }
    if (isSavingDraft) {
      return (
        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-xs bg-[#F5F3FF] border border-[#DDD6FE] text-[10px] font-admin-mono text-[#7C3AED] font-semibold">
          <FaSpinner className="w-2.5 h-2.5 animate-spin text-[#7C3AED]" />
          <span>Saving Draft...</span>
        </div>
      );
    }
    if (conflictState) {
      return (
        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-xs bg-[#FFFBEB] border border-[#FDE68A] text-[10px] font-admin-mono text-[#B45309] font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] animate-pulse" />
          <span>Revision Conflict</span>
        </div>
      );
    }
    if (isDirty) {
      return (
        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-xs bg-[#FFFBEB] border border-[#FDE68A] text-[10px] font-admin-mono text-[#92400E] font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
          <span>Unsaved Changes</span>
        </div>
      );
    }
    if (isLoaded) {
      return (
        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-xs bg-[#F5F3FF] border border-[#DDD6FE] text-[10px] font-admin-mono text-[#7C3AED] font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-[#7C3AED]" />
          <span>Loaded Draft</span>
        </div>
      );
    }
    if (lastSavedTimestamp) {
      const date = new Date(lastSavedTimestamp);
      const timeStr = !isNaN(date.getTime())
        ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : "";
      return (
        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-xs bg-[#F0FDF4] border border-[#BBF7D0] text-[10px] font-admin-mono text-[#166534] font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
          <span>Draft Saved {timeStr ? `· ${timeStr}` : ""}</span>
        </div>
      );
    }
    return (
      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-xs bg-[#F1F5F9] border border-[#E2E8F0] text-[10px] font-admin-mono text-[#64748B] font-semibold">
        <span className="w-1.5 h-1.5 rounded-full bg-[#94A3B8]" />
        <span>Clean Editor</span>
      </div>
    );
  };

  // Immutable Save Draft Handler
  const handleSaveDraft = async () => {
    if (!canSaveDraft) return;

    const generation = ++saveGenerationRef.current;
    const inFlightSnapshot = currentNormalized;
    setIsSavingDraft(true);
    setConflictState(null);

    try {
      const draftAttachments = attachments.map((att) => ({
        id: att.id,
        name: att.name,
        sizeBytes: att.sizeBytes,
        contentType: att.contentType,
      }));

      const res = await saveMailDraftAction({
        id: draftId,
        createOperationId: !draftId ? createOperationIdRef.current : undefined,
        expectedRevision: draftRevision,
        senderKey: inFlightSnapshot.senderKey,
        to: inFlightSnapshot.to.map((email) => ({ email })),
        cc: inFlightSnapshot.cc.map((email) => ({ email })),
        bcc: inFlightSnapshot.bcc.map((email) => ({ email })),
        subject: inFlightSnapshot.subject,
        body: inFlightSnapshot.body,
        attachments: draftAttachments,
      });

      // Stale generation check: if another request started, discard response
      if (generation !== saveGenerationRef.current) return;

      if (res.success && res.data) {
        setDraftId(res.data.id);
        setDraftRevision(res.data.revision);
        setLastSavedTimestamp(res.data.updatedAt);
        persistedBaselineRef.current = inFlightSnapshot;

        showNotification("success", "Draft saved successfully to Firestore.", `Draft ID: ${res.data.id.substring(0, 16)}...`);
        if (onDraftSaved) onDraftSaved(res.data);
      } else if (res.code === "DRAFT_CONFLICT") {
        setConflictState({
          serverRevision: res.serverRevision || (draftRevision ? draftRevision + 1 : 2),
          serverDraft: res.serverDraft,
        });
        showNotification(
          "warning",
          "Draft revision conflict detected.",
          "This draft was modified elsewhere. Your current changes are preserved. Choose an action below."
        );
      } else {
        showNotification("error", res.error || "Failed to save draft.");
      }
    } catch (err: unknown) {
      if (generation === saveGenerationRef.current) {
        showNotification("error", (err as Error).message || "An unexpected error occurred while saving draft.");
      }
    } finally {
      if (generation === saveGenerationRef.current) {
        setIsSavingDraft(false);
      }
    }
  };

  // Conflict Recovery Handlers
  const handleKeepMyChanges = () => {
    if (!conflictState) return;
    setDraftRevision(conflictState.serverRevision);
    setConflictState(null);
    showNotification(
      "info",
      "Acquired latest server revision token.",
      "Your current changes were preserved. Click 'Save Draft' to confirm overwriting with your version."
    );
  };

  const handleReloadLatest = () => {
    if (!conflictState?.serverDraft) return;
    const sDraft = conflictState.serverDraft;
    setDraftId(sDraft.id);
    setDraftRevision(sDraft.revision);
    setSenderKey(sDraft.senderKey);
    setToInput(formatRecipientString(sDraft.to || []));
    setCcInput(formatRecipientString(sDraft.cc || []));
    setBccInput(formatRecipientString(sDraft.bcc || []));
    setShowCc(Boolean(sDraft.cc && sDraft.cc.length > 0));
    setShowBcc(Boolean(sDraft.bcc && sDraft.bcc.length > 0));
    setSubject(sDraft.subject || "");
    setBody(sDraft.body || "");
    setAttachments([]);
    setAttachmentError(null);
    setLastSavedTimestamp(sDraft.updatedAt);

    persistedBaselineRef.current = normalizeDraftState({
      senderKey: sDraft.senderKey,
      to: sDraft.to,
      cc: sDraft.cc,
      bcc: sDraft.bcc,
      subject: sDraft.subject,
      body: sDraft.body,
      attachments: sDraft.attachments,
    });

    setConflictState(null);
    showNotification("success", "Reloaded latest draft version from Firestore.");
  };

  // Discard & Delete Handler
  const handleDiscard = async () => {
    if (!canDiscard) return;

    const hasSavedDraft = Boolean(draftId);
    const hasUnsavedEdits = isDirty;

    if (hasSavedDraft || hasUnsavedEdits) {
      const confirmed = await confirm({
        title: hasSavedDraft ? "Discard & Delete Saved Draft?" : "Discard Unsaved Message?",
        description: hasSavedDraft
          ? "Are you sure you want to permanently delete this saved draft from Firestore? This action cannot be undone."
          : "Are you sure you want to discard your unsaved message and reset the composer?",
        variant: "danger",
        confirmLabel: hasSavedDraft ? "Delete Draft" : "Discard Message",
        cancelLabel: "Cancel",
      });
      if (!confirmed) return;
    }

    if (draftId) {
      setIsDiscarding(true);
      try {
        const res = await deleteMailDraftAction(draftId, draftRevision);
        if (!res.success) {
          showNotification("error", res.error || "Failed to delete saved draft.");
          setIsDiscarding(false);
          return;
        }
      } catch (err: unknown) {
        showNotification("error", (err as Error).message || "An unexpected error occurred during discard.");
        setIsDiscarding(false);
        return;
      } finally {
        setIsDiscarding(false);
      }
    }

    // Reset Form and Baseline
    setDraftId(undefined);
    setDraftRevision(undefined);
    setSenderKey("HELLO");
    setToInput("");
    setCcInput("");
    setBccInput("");
    setShowCc(false);
    setShowBcc(false);
    setSubject("");
    setBody("");
    setAttachments([]);
    setAttachmentError(null);
    setLastSavedTimestamp(null);
    setConflictState(null);
    persistedBaselineRef.current = normalizeDraftState({});
    createOperationIdRef.current = generateCreateOperationId();
    activeSendOpIdRef.current = null;

    showNotification("success", "Composer reset and draft discarded.");
    if (onDiscard) onDiscard();
  };

  // Submit Outbound Mail Dispatch
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSend || isPending || isSavingDraft || isDiscarding) return;

    // Capture immutable snapshot at exact send click time
    const inFlightSendSnapshot = currentNormalized;
    const toRecipients = parseEmailList(toInput);
    const ccRecipients = parseEmailList(ccInput);
    const bccRecipients = parseEmailList(bccInput);

    // Reuse or generate a fresh send operation identity
    if (!activeSendOpIdRef.current) {
      activeSendOpIdRef.current = generateSendOperationId();
    }
    const sendOperationId = activeSendOpIdRef.current;

    dismissNotification();

    startTransition(async () => {
      try {
        const payloadAttachments = attachments.map((att) => ({
          name: att.name,
          sizeBytes: att.sizeBytes,
          contentType: att.contentType,
          content: att.content,
        }));

        const res = await sendAdminMailAction({
          idempotencyKey: sendOperationId,
          draftId,
          expectedRevision: draftRevision,
          senderKey: inFlightSendSnapshot.senderKey,
          to: toRecipients,
          cc: ccRecipients,
          bcc: bccRecipients,
          subject: inFlightSendSnapshot.subject,
          body: inFlightSendSnapshot.body,
          attachments: payloadAttachments.length > 0 ? payloadAttachments : undefined,
        });

        if (res.status === "SENT" && res.messageId) {
          activeSendOpIdRef.current = null;
          showNotification(
            "success",
            "Email successfully dispatched via Brevo REST API v3.",
            `Message ID: ${res.messageId}`
          );

          // Send while typing protection: check if live editor was modified in-flight
          const liveEditorState = normalizeDraftState({
            senderKey,
            to: toInput,
            cc: ccInput,
            bcc: bccInput,
            subject,
            body,
            attachments,
          });

          const hasNewLiveEdits = !isDraftEqual(liveEditorState, inFlightSendSnapshot);

          if (!hasNewLiveEdits) {
            // No new edits during flight: reset composer cleanly
            setDraftId(undefined);
            setDraftRevision(undefined);
            setSenderKey("HELLO");
            setToInput("");
            setCcInput("");
            setBccInput("");
            setShowCc(false);
            setShowBcc(false);
            setSubject("");
            setBody("");
            setAttachments([]);
            setAttachmentError(null);
            setLastSavedTimestamp(null);
            setConflictState(null);
            persistedBaselineRef.current = normalizeDraftState({});
            createOperationIdRef.current = generateCreateOperationId();
          } else {
            // User typed newer edits during send: preserve them, clear sent draft ID
            setDraftId(undefined);
            setDraftRevision(undefined);
            persistedBaselineRef.current = normalizeDraftState({});
            createOperationIdRef.current = generateCreateOperationId();
            showNotification(
              "info",
              "Email dispatched. Your newer in-progress edits were preserved.",
              "The sent snapshot was recorded as SENT; your newer unsent changes remain in the editor."
            );
          }

          if (onSendSuccess) onSendSuccess(res.messageId);
        } else if (res.status === "DELIVERY_UNCERTAIN") {
          showNotification(
            "warning",
            "Delivery status unconfirmed due to gateway timeout.",
            res.error ||
              "The connection to Brevo timed out. Automated resending is blocked to prevent duplicate emails. Please check your Brevo dashboard before resending."
          );
        } else {
          showNotification("error", res.error || "Brevo rejected the email dispatch request.");
        }
      } catch (err: unknown) {
        showNotification("error", (err as Error).message || "An unexpected error occurred during dispatch.");
      }
    });
  };

  return (
    <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-sm shadow-2xs font-admin-sans">
      {/* Compose Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-2.5 border-b border-[#E2E8F0] bg-[#FAFAFA] gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-sm bg-[#F5F3FF] border border-[#DDD6FE] flex items-center justify-center text-[#7C3AED]">
            <FaPaperPlane className="w-3 h-3" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-xs sm:text-sm text-black">Compose Outbound Message</h3>
              {renderStatusBadge()}
            </div>
            <p className="font-admin-mono text-[10px] sm:text-[11px] text-[#64748B] flex items-center gap-1.5 mt-0.5">
              <FaLock className="w-2.5 h-2.5 text-[#10B981]" />
              <span>Brevo REST API v3 Dedicated Outbound Channel</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setIsPreview(!isPreview)}
            className={`px-2.5 py-1 text-xs font-admin-mono rounded-sm transition-colors border flex items-center gap-1.5 cursor-pointer ${
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

      {/* Conflict Recovery Banner */}
      {conflictState && (
        <div className="p-3.5 border-b border-[#FDE68A] bg-[#FFFBEB] space-y-2 animate-in fade-in duration-150 font-admin-sans">
          <div className="flex items-center gap-2 font-bold text-xs text-[#92400E]">
            <FaTriangleExclamation className="w-4 h-4 text-[#F59E0B] shrink-0" />
            <span>Draft Modified in Another Session (Server Revision {conflictState.serverRevision})</span>
          </div>
          <p className="text-[11px] text-[#B45309] leading-relaxed pl-6">
            Another tab or admin updated this draft in Firestore. Your current editor input has been safely preserved and NOT overwritten. Choose how to proceed:
          </p>
          <div className="flex items-center gap-2 pl-6 pt-1">
            <button
              type="button"
              onClick={handleKeepMyChanges}
              className="px-2.5 py-1 text-xs font-admin-mono font-bold bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-xs shadow-2xs cursor-pointer transition-colors"
            >
              Keep My Changes
            </button>
            {conflictState.serverDraft && (
              <button
                type="button"
                onClick={handleReloadLatest}
                className="px-2.5 py-1 text-xs font-admin-mono font-semibold bg-[#FFFFFF] hover:bg-[#F8FAFC] text-[#475569] border border-[#E2E8F0] rounded-xs cursor-pointer transition-colors"
              >
                Reload Latest
              </button>
            )}
          </div>
        </div>
      )}

      {/* Status Alerts & Notifications */}
      {notification && (
        <div className="p-3.5 border-b border-[#E2E8F0] animate-in fade-in duration-150">
          {notification.type === "success" && (
            <div className="p-2.5 bg-[#F0FDF4] border border-[#BBF7D0] rounded-sm text-xs text-[#166534] flex items-start justify-between gap-2">
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-semibold">
                  <FaCheck className="w-3.5 h-3.5 text-[#10B981] shrink-0" />
                  <span>{notification.message}</span>
                </div>
                {notification.detail && (
                  <p className="font-admin-mono text-[11px] text-[#15803D] pl-5.5">{notification.detail}</p>
                )}
              </div>
              <button
                type="button"
                onClick={dismissNotification}
                className="text-[#166534] hover:text-black cursor-pointer p-0.5 shrink-0"
                title="Dismiss notification"
              >
                <FaXmark className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {notification.type === "info" && (
            <div className="p-2.5 bg-[#F5F3FF] border border-[#DDD6FE] rounded-sm text-xs text-[#5B21B6] flex items-start justify-between gap-2">
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-semibold">
                  <FaCircleInfo className="w-3.5 h-3.5 text-[#7C3AED] shrink-0" />
                  <span>{notification.message}</span>
                </div>
                {notification.detail && (
                  <p className="font-admin-mono text-[11px] text-[#6D28D9] pl-5.5">{notification.detail}</p>
                )}
              </div>
              <button
                type="button"
                onClick={dismissNotification}
                className="text-[#5B21B6] hover:text-black cursor-pointer p-0.5 shrink-0"
                title="Dismiss notification"
              >
                <FaXmark className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {notification.type === "warning" && (
            <div className="p-2.5 bg-[#FFFBEB] border border-[#FDE68A] rounded-sm text-xs text-[#92400E] flex items-start justify-between gap-2">
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-semibold">
                  <FaTriangleExclamation className="w-3.5 h-3.5 text-[#F59E0B] shrink-0" />
                  <span>{notification.message}</span>
                </div>
                {notification.detail && (
                  <p className="font-admin-sans text-[11px] text-[#B45309] pl-5.5 leading-relaxed">
                    {notification.detail}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={dismissNotification}
                className="text-[#92400E] hover:text-black cursor-pointer p-0.5 shrink-0"
                title="Dismiss notification"
              >
                <FaXmark className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {notification.type === "error" && (
            <div className="p-2.5 bg-[#FEF2F2] border border-[#FECACA] rounded-sm text-xs text-[#991B1B] flex items-start justify-between gap-2">
              <div className="flex items-start gap-2.5">
                <FaCircleExclamation className="w-4 h-4 text-[#EF4444] shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">{notification.message}</span>
                  {notification.detail && <p className="font-admin-mono text-[11px] mt-0.5">{notification.detail}</p>}
                </div>
              </div>
              <button
                type="button"
                onClick={dismissNotification}
                className="text-[#991B1B] hover:text-black cursor-pointer p-0.5 shrink-0"
                title="Dismiss error"
              >
                <FaXmark className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-3">
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
            disabled={isPending || isSavingDraft || isDiscarding}
            className="w-full px-3 py-1.5 text-xs font-admin-sans font-semibold bg-[#FAFAFA] border border-[#E2E8F0] rounded-sm focus:outline-hidden focus:border-[#7C3AED] focus:bg-[#FFFFFF] transition-colors cursor-pointer disabled:opacity-60"
          >
            <optgroup label="PRIMARY — gauravpatil.online">
              {Object.values(ADMIN_MAIL_SENDERS)
                .filter((s) => !s.isLegacy)
                .map((identity) => (
                  <option key={identity.key} value={identity.key}>
                    {identity.displayName} &lt;{identity.email}&gt;
                  </option>
                ))}
            </optgroup>
            <optgroup label="LEGACY — gauravservices.eu.cc">
              {Object.values(ADMIN_MAIL_SENDERS)
                .filter((s) => s.isLegacy)
                .map((identity) => (
                  <option key={identity.key} value={identity.key}>
                    {identity.displayName} &lt;{identity.email}&gt;
                  </option>
                ))}
            </optgroup>
          </select>

          {/* No-Reply Advisory Notice */}
          {selectedIdentity.isNoReply && (
            <div className="mt-1.5 p-2 bg-[#FFFBEB] border border-[#FDE68A] rounded-sm text-xs text-[#92400E] flex items-center gap-2">
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
                  disabled={isPending || isSavingDraft || isDiscarding}
                  className="hover:underline cursor-pointer font-semibold disabled:opacity-50"
                >
                  + CC
                </button>
              )}
              {!showBcc && (
                <button
                  type="button"
                  onClick={() => setShowBcc(true)}
                  disabled={isPending || isSavingDraft || isDiscarding}
                  className="hover:underline cursor-pointer font-semibold disabled:opacity-50"
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
            disabled={isPending || isSavingDraft || isDiscarding}
            placeholder="john@example.com, Sarah <sarah@domain.com>"
            className="w-full px-3 py-1.5 text-xs font-admin-mono bg-[#FAFAFA] border border-[#E2E8F0] rounded-sm focus:outline-hidden focus:border-[#7C3AED] focus:bg-[#FFFFFF] transition-colors disabled:opacity-60"
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
                disabled={isPending || isSavingDraft || isDiscarding}
                className="font-admin-mono text-[10px] text-[#94A3B8] hover:text-[#DC2626] disabled:opacity-50"
              >
                Remove CC
              </button>
            </div>
            <input
              type="text"
              value={ccInput}
              onChange={(e) => setCcInput(e.target.value)}
              disabled={isPending || isSavingDraft || isDiscarding}
              placeholder="colleague@domain.com"
              className="w-full px-3 py-1.5 text-xs font-admin-mono bg-[#FAFAFA] border border-[#E2E8F0] rounded-sm focus:outline-hidden focus:border-[#7C3AED] focus:bg-[#FFFFFF] transition-colors disabled:opacity-60"
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
                disabled={isPending || isSavingDraft || isDiscarding}
                className="font-admin-mono text-[10px] text-[#94A3B8] hover:text-[#DC2626] disabled:opacity-50"
              >
                Remove BCC
              </button>
            </div>
            <input
              type="text"
              value={bccInput}
              onChange={(e) => setBccInput(e.target.value)}
              disabled={isPending || isSavingDraft || isDiscarding}
              placeholder="archive@domain.com"
              className="w-full px-3 py-1.5 text-xs font-admin-mono bg-[#FAFAFA] border border-[#E2E8F0] rounded-sm focus:outline-hidden focus:border-[#7C3AED] focus:bg-[#FFFFFF] transition-colors disabled:opacity-60"
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
            disabled={isPending || isSavingDraft || isDiscarding}
            maxLength={200}
            placeholder="Official Portfolio Communication"
            className="w-full px-3 py-1.5 text-xs font-admin-sans font-semibold bg-[#FAFAFA] border border-[#E2E8F0] rounded-sm focus:outline-hidden focus:border-[#7C3AED] focus:bg-[#FFFFFF] transition-colors disabled:opacity-60"
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
                    disabled={isPending || isSavingDraft || isDiscarding}
                    title="Bold (**text**)"
                    className="p-1 px-1.5 text-[11px] font-admin-mono text-[#475569] hover:text-black bg-[#F1F5F9] hover:bg-[#E2E8F0] rounded-xs transition-colors flex items-center gap-1 disabled:opacity-50"
                  >
                    <FaBold className="w-2.5 h-2.5" />
                    <span>B</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertFormatting("*")}
                    disabled={isPending || isSavingDraft || isDiscarding}
                    title="Italic (*text*)"
                    className="p-1 px-1.5 text-[11px] font-admin-mono text-[#475569] hover:text-black bg-[#F1F5F9] hover:bg-[#E2E8F0] rounded-xs transition-colors flex items-center gap-1 disabled:opacity-50"
                  >
                    <FaItalic className="w-2.5 h-2.5" />
                    <span>I</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertFormatting("`")}
                    disabled={isPending || isSavingDraft || isDiscarding}
                    title="Code (`code`)"
                    className="p-1 px-1.5 text-[11px] font-admin-mono text-[#475569] hover:text-black bg-[#F1F5F9] hover:bg-[#E2E8F0] rounded-xs transition-colors flex items-center gap-1 disabled:opacity-50"
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
                  disabled={isPending || isSavingDraft || isDiscarding || attachments.length >= 5}
                  title="Attach files (PDF, images, documents up to 10MB total)"
                  className={`p-1 px-2 text-[11px] font-admin-mono rounded-xs transition-colors flex items-center gap-1 cursor-pointer border ${
                    attachments.length > 0
                      ? "bg-[#F5F3FF] text-[#7C3AED] border-[#DDD6FE] hover:bg-[#EDE9FE] font-bold"
                      : "text-[#475569] hover:text-black bg-[#F1F5F9] hover:bg-[#E2E8F0] border-transparent"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <FaPaperclip className="w-2.5 h-2.5 text-[#7C3AED]" />
                  <span>Attach ({attachments.length}/5)</span>
                  <ButtonHelpBadge text={BUTTON_HELP.ATTACH_FILES} />
                </button>
              </div>
            )}
          </div>

          {isPreview ? (
            <div className="w-full min-h-[120px] max-h-[180px] overflow-y-auto p-3 bg-[#FFFFFF] border border-[#E2E8F0] rounded-sm text-xs leading-relaxed font-admin-sans">
              <div
                dangerouslySetInnerHTML={{
                  __html: compileSafeHtml(body, subject),
                }}
              />
            </div>
          ) : (
            <textarea
              id="compose-body-input"
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              disabled={isPending || isSavingDraft || isDiscarding}
              placeholder="Compose your email message here. Use standard paragraphs and formatting (minimum 3 words)..."
              className="w-full px-3 py-2 text-xs font-admin-sans leading-relaxed bg-[#FAFAFA] border border-[#E2E8F0] rounded-sm focus:outline-hidden focus:border-[#7C3AED] focus:bg-[#FFFFFF] transition-colors resize-none min-h-[90px] disabled:opacity-60"
            />
          )}

          {/* Attached Files List Container */}
          {attachments.length > 0 && (
            <div className="mt-1.5 p-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-sm space-y-1.5 animate-in fade-in duration-150">
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
                    key={att.id || `${att.name}-${idx}`}
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
                      disabled={isPending || isSavingDraft || isDiscarding}
                      className="ml-1 text-[#94A3B8] hover:text-[#DC2626] cursor-pointer p-0.5 disabled:opacity-50"
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
            <div className="mt-1.5 p-2 bg-[#FEF2F2] border border-[#FECACA] rounded-xs text-xs font-admin-mono text-[#991B1B] flex items-center justify-between animate-in fade-in duration-100">
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
            <span>
              {meaningfulWordCount} word{meaningfulWordCount === 1 ? "" : "s"} · {body.length} characters
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="pt-2.5 border-t border-[#E2E8F0] flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Save Draft Button */}
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={!canSaveDraft}
              title={
                !canSaveDraft
                  ? isEmpty
                    ? "Compose canvas is empty (add recipients, subject, body, or attachment)"
                    : !isDirty
                    ? "No unsaved changes to save"
                    : isSavingDraft
                    ? "Save in progress..."
                    : "Action unavailable"
                  : "Save draft to database"
              }
              className={`px-3 py-1.5 text-xs font-admin-mono rounded-sm transition-colors flex items-center gap-1.5 border min-w-[105px] justify-center ${
                canSaveDraft
                  ? "text-[#7C3AED] hover:text-black bg-[#F5F3FF] hover:bg-[#EDE9FE] border-[#DDD6FE] cursor-pointer font-bold shadow-2xs"
                  : "text-[#94A3B8] bg-[#F8FAFC] border-[#E2E8F0] cursor-not-allowed opacity-50"
              }`}
            >
              {isSavingDraft ? (
                <>
                  <FaSpinner className="w-3 h-3 animate-spin text-[#7C3AED]" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <FaFloppyDisk className={`w-3 h-3 ${canSaveDraft ? "text-[#7C3AED]" : "text-[#94A3B8]"}`} />
                  <span>Save Draft</span>
                  <ButtonHelpBadge text={BUTTON_HELP.SAVE_DRAFT} />
                </>
              )}
            </button>

            {/* Discard Button */}
            <button
              type="button"
              onClick={handleDiscard}
              disabled={!canDiscard}
              title={
                !canDiscard
                  ? "Nothing to discard (composer is blank and no draft is loaded)"
                  : isDiscarding
                  ? "Deleting draft..."
                  : "Discard message / delete draft"
              }
              className={`px-3 py-1.5 text-xs font-admin-mono rounded-sm transition-colors flex items-center gap-1.5 border min-w-[90px] justify-center ${
                canDiscard
                  ? "text-[#DC2626] hover:text-white bg-[#FEF2F2] hover:bg-[#DC2626] border-[#FECACA] hover:border-[#DC2626] cursor-pointer"
                  : "text-[#94A3B8] bg-[#F8FAFC] border-[#E2E8F0] cursor-not-allowed opacity-50"
              }`}
            >
              {isDiscarding ? (
                <>
                  <FaSpinner className="w-3 h-3 animate-spin" />
                  <span>Discarding...</span>
                </>
              ) : (
                <>
                  <FaTrash className="w-3 h-3" />
                  <span>Discard</span>
                  <ButtonHelpBadge text={BUTTON_HELP.DISCARD_DRAFT} />
                </>
              )}
            </button>
          </div>

          {/* Send Email Now Button */}
          <button
            type="submit"
            disabled={!canSend}
            aria-disabled={!canSend}
            title={sendEligibility.tooltipText}
            className={`w-full sm:w-auto px-4 py-1.5 text-xs font-admin-sans rounded-sm shadow-2xs transition-colors flex items-center justify-center gap-2 min-w-[145px] ${
              isPending
                ? "bg-[#7C3AED] text-white opacity-80 cursor-wait font-bold"
                : canSend
                ? "bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-bold cursor-pointer border border-[#6D28D9]"
                : "bg-[#F8FAFC] text-[#94A3B8] border border-[#E2E8F0] cursor-not-allowed opacity-50 font-semibold"
            }`}
          >
            {isPending ? (
              <>
                <FaSpinner className="w-3.5 h-3.5 animate-spin text-white" />
                <span>Sending via Brevo...</span>
              </>
            ) : (
              <>
                <FaPaperPlane className={`w-3.5 h-3.5 ${canSend ? "text-white" : "text-[#94A3B8]"}`} />
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
