"use client";

import React, { useState } from "react";
import {
  FaFloppyDisk,
  FaTrash,
  FaPenToSquare,
  FaClock,
  FaInbox,
  FaSpinner,
} from "react-icons/fa6";
import type { MailDraftDocument } from "@/lib/dal/repositories/types";
import { formatRelativeTime } from "@/lib/admin/utils";
import { deleteMailDraftAction } from "../actions";
import { ButtonHelpBadge } from "@/components/admin/ui/ButtonHelpTooltip";
import { BUTTON_HELP } from "@/lib/admin/constants/button-help";

interface DraftsListProps {
  drafts: MailDraftDocument[];
  onResumeDraft: (draft: MailDraftDocument) => void;
  onDraftDeleted?: (draftId: string) => void;
}

export const DraftsList: React.FC<DraftsListProps> = ({
  drafts: initialDrafts,
  onResumeDraft,
  onDraftDeleted,
}) => {
  const [drafts, setDrafts] = useState<MailDraftDocument[]>(initialDrafts);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  React.useEffect(() => {
    setDrafts(initialDrafts);
  }, [initialDrafts]);

  const handleDelete = async (id: string) => {
    if (deletingId) return;
    setDeletingId(id);

    try {
      const res = await deleteMailDraftAction(id);
      if (res.success) {
        setDrafts((prev) => prev.filter((d) => d.id !== id));
        if (onDraftDeleted) onDraftDeleted(id);
      }
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4 font-admin-sans">
      {/* Drafts Header Bar */}
      <div className="flex items-center justify-between p-3.5 bg-[#FFFFFF] border border-[#E2E8F0] rounded-none sm:rounded-sm shadow-2xs">
        <div className="flex items-center gap-2">
          <FaFloppyDisk className="w-3.5 h-3.5 text-[#7C3AED]" />
          <span className="font-admin-sans font-bold text-xs uppercase tracking-wider text-black">
            Saved Email Drafts ({drafts.length})
          </span>
        </div>

        <span className="font-admin-mono text-[11px] text-[#64748B]">
          Auto-purged after 30 days
        </span>
      </div>

      {drafts.length === 0 ? (
        <div className="w-full p-8 sm:p-12 bg-[#FFFFFF] border border-[#E2E8F0] rounded-none sm:rounded-sm flex flex-col items-center justify-center text-center space-y-3 shadow-2xs">
          <div className="w-10 h-10 rounded-sm bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-center">
            <FaInbox className="w-4 h-4 text-[#94A3B8]" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-black">No Active Drafts</h3>
            <p className="font-admin-mono text-xs text-[#64748B] mt-0.5 max-w-sm">
              In-progress drafts saved from the Compose tab will appear here.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          {drafts.map((draft) => (
            <div
              key={draft.id}
              className="p-4 bg-[#FFFFFF] border border-[#E2E8F0] hover:border-[#CBD5E1] rounded-none sm:rounded-sm transition-colors shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 bg-[#F5F3FF] border border-[#DDD6FE] text-[#7C3AED] font-admin-mono text-[10px] rounded-xs font-bold">
                    {draft.senderKey}
                  </span>
                  <span className="font-semibold text-xs text-black truncate">
                    {draft.subject || "(No Subject)"}
                  </span>
                </div>

                <p className="font-admin-mono text-[11px] text-[#64748B] truncate">
                  To: {draft.to.length > 0 ? draft.to.map((r) => r.email).join(", ") : "(No Recipients Specified)"}
                </p>

                <div className="flex items-center gap-1 font-admin-mono text-[10px] text-[#94A3B8]">
                  <FaClock className="w-2.5 h-2.5" />
                  <span>Saved {formatRelativeTime(draft.updatedAt)}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => onResumeDraft(draft)}
                  className="px-3 py-1.5 text-xs font-admin-sans font-medium text-white bg-[#7C3AED] hover:bg-[#6D28D9] rounded-sm transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <FaPenToSquare className="w-3 h-3" />
                  <span>Resume</span>
                  <ButtonHelpBadge text={BUTTON_HELP.RESUME_DRAFT} />
                </button>

                <button
                  type="button"
                  onClick={() => handleDelete(draft.id)}
                  disabled={deletingId === draft.id}
                  className="p-1.5 px-2.5 text-xs font-admin-mono text-[#DC2626] hover:text-white bg-[#FEF2F2] hover:bg-[#DC2626] border border-[#FECACA] hover:border-[#DC2626] rounded-sm transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  {deletingId === draft.id ? (
                    <FaSpinner className="w-3 h-3 animate-spin" />
                  ) : (
                    <FaTrash className="w-3 h-3" />
                  )}
                  <span>Delete</span>
                  <ButtonHelpBadge text={BUTTON_HELP.DELETE_DRAFT} />
                </button>
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
};
