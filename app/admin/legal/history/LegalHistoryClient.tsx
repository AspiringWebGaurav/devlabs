"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FaArrowLeft,
  FaScaleBalanced,
  FaShieldHalved,
  FaClockRotateLeft,
  FaEye,
  FaRotateLeft,
  FaXmark,
  FaCheck,
  FaTriangleExclamation,
} from "react-icons/fa6";
import { useAdminConfirm } from "@/components/admin/context";
import { ButtonHelpBadge } from "@/components/admin/ui/ButtonHelpTooltip";
import { BUTTON_HELP } from "@/lib/admin/constants/button-help";
import { restoreVersionAction } from "@/lib/actions/legal.actions";
import { MarkdownLegalRenderer } from "@/components/legal/MarkdownLegalRenderer";
import type { LegalHistoryDocument } from "@/types/legal";

interface LegalHistoryClientProps {
  termsHistory: LegalHistoryDocument[];
  privacyHistory: LegalHistoryDocument[];
}

export const LegalHistoryClient: React.FC<LegalHistoryClientProps> = ({
  termsHistory,
  privacyHistory,
}) => {
  const router = useRouter();
  const confirm = useAdminConfirm();

  const [docFilter, setDocFilter] = useState<"ALL" | "TERMS" | "PRIVACY">("ALL");
  const [inspectingItem, setInspectingItem] = useState<LegalHistoryDocument | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const combinedHistory = [
    ...termsHistory.map((h) => ({ ...h, docType: "TERMS" as const })),
    ...privacyHistory.map((h) => ({ ...h, docType: "PRIVACY" as const })),
  ].sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

  const filteredHistory = combinedHistory.filter((item) => {
    if (docFilter === "ALL") return true;
    return item.docType === docFilter;
  });

  const handleRestoreVersion = async (item: LegalHistoryDocument) => {
    const ok = await confirm({
      title: `Restore ${item.docType === "TERMS" ? "Terms" : "Privacy"} v${item.version} as Working Draft?`,
      description:
        "This will load all clauses from this historical snapshot into your active working draft. Your live public website will not change until you review and publish the draft.",
      variant: "purple",
      confirmLabel: "Load as Draft",
    });

    if (!ok) return;

    setIsRestoring(true);
    setFeedback(null);

    const res = await restoreVersionAction({
      docType: item.docType,
      historyId: item.id,
    });

    setIsRestoring(false);

    if (res.success) {
      setFeedback({
        type: "success",
        message: `Version v${item.version} restored as working draft. Redirecting to editor...`,
      });
      setTimeout(() => {
        router.push(`/admin/legal/editor?doc=${item.docType}`);
      }, 800);
    } else {
      setFeedback({
        type: "error",
        message: res.error || "Failed to restore version snapshot.",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Back & Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          href="/admin/legal"
          className="inline-flex items-center gap-2 text-xs font-admin-mono font-semibold text-[#64748B] hover:text-[#0F172A] transition-colors"
        >
          <FaArrowLeft className="w-3 h-3" />
          <span>Back to Legal Overview</span>
        </Link>

        {/* Filter Controls */}
        <div className="inline-flex p-1 bg-[#FFFFFF] border border-[#E2E8F0] rounded-sm shadow-2xs">
          <button
            type="button"
            onClick={() => setDocFilter("ALL")}
            className={`px-3 py-1.5 rounded-sm text-xs font-admin-mono font-semibold transition-all cursor-pointer ${
              docFilter === "ALL"
                ? "bg-[#7C3AED] text-[#FFFFFF] shadow-2xs"
                : "text-[#64748B] hover:text-[#0F172A]"
            }`}
          >
            All Revisions ({combinedHistory.length})
          </button>
          <button
            type="button"
            onClick={() => setDocFilter("TERMS")}
            className={`px-3 py-1.5 rounded-sm text-xs font-admin-mono font-semibold transition-all cursor-pointer ${
              docFilter === "TERMS"
                ? "bg-[#7C3AED] text-[#FFFFFF] shadow-2xs"
                : "text-[#64748B] hover:text-[#0F172A]"
            }`}
          >
            Terms ({termsHistory.length})
          </button>
          <button
            type="button"
            onClick={() => setDocFilter("PRIVACY")}
            className={`px-3 py-1.5 rounded-sm text-xs font-admin-mono font-semibold transition-all cursor-pointer ${
              docFilter === "PRIVACY"
                ? "bg-[#7C3AED] text-[#FFFFFF] shadow-2xs"
                : "text-[#64748B] hover:text-[#0F172A]"
            }`}
          >
            Privacy ({privacyHistory.length})
          </button>
        </div>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`p-4 rounded-sm border text-xs font-admin-mono flex items-center justify-between gap-3 ${
            feedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : "bg-rose-50 border-rose-200 text-rose-900"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <FaCheck className="w-4 h-4 text-emerald-600" />
            ) : (
              <FaTriangleExclamation className="w-4 h-4 text-rose-600" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs font-bold hover:underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* History Ledger Table */}
      <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-sm shadow-2xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-[#F1F5F9] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <FaClockRotateLeft className="w-4 h-4 text-[#7C3AED]" />
            <h3 className="text-sm font-semibold text-[#0F172A] font-admin">
              Immutable Historical Version Ledger
            </h3>
          </div>
          <span className="text-xs font-admin-mono text-[#64748B]">
            {filteredHistory.length} Revisions Recorded
          </span>
        </div>

        {filteredHistory.length === 0 ? (
          <div className="p-12 text-center text-xs font-admin-mono text-[#94A3B8]">
            No historical revisions archived yet. When new versions are published, previous active versions are automatically archived here.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-admin-mono">
              <thead>
                <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B] uppercase tracking-wider text-[10px]">
                  <th className="p-3.5">Version</th>
                  <th className="p-3.5">Document</th>
                  <th className="p-3.5">Effective Date</th>
                  <th className="p-3.5">Type</th>
                  <th className="p-3.5">Published At</th>
                  <th className="p-3.5">Admin Actor</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {filteredHistory.map((item) => (
                  <tr key={item.id} className="hover:bg-[#F8FAFC]/60 transition-colors">
                    <td className="p-3.5 font-bold text-[#7C3AED]">
                      v{item.version}
                    </td>
                    <td className="p-3.5">
                      <span className="inline-flex items-center gap-1.5 font-medium text-[#0F172A]">
                        {item.docType === "TERMS" ? (
                          <FaScaleBalanced className="w-3.5 h-3.5 text-[#64748B]" />
                        ) : (
                          <FaShieldHalved className="w-3.5 h-3.5 text-[#64748B]" />
                        )}
                        {item.docType === "TERMS" ? "Terms of Service" : "Privacy Policy"}
                      </span>
                    </td>
                    <td className="p-3.5 text-[#0F172A]">{item.effectiveDate}</td>
                    <td className="p-3.5">
                      {item.isMaterialChange ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          Material
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] text-[#64748B] bg-[#F1F5F9]">
                          Routine
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-[#64748B]">
                      {new Date(item.publishedAt).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="p-3.5 text-[#64748B] font-mono">
                      {item.publishedByAdmin.split("@")[0]}
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setInspectingItem(item)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-admin-mono font-medium text-[#475569] hover:text-black bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#E2E8F0] rounded-sm transition-all cursor-pointer"
                        >
                          <FaEye className="w-3 h-3" />
                          <span>Inspect</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRestoreVersion(item)}
                          disabled={isRestoring}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-admin-mono font-semibold text-[#7C3AED] hover:text-white bg-[#F5F3FF] hover:bg-[#7C3AED] border border-[#DDD6FE] rounded-sm transition-all cursor-pointer disabled:opacity-50"
                        >
                          <FaRotateLeft className="w-3 h-3" />
                          <span>Restore</span>
                          <ButtonHelpBadge text={BUTTON_HELP.LEGAL_RESTORE_VERSION} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Snapshot Inspection Modal */}
      {inspectingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-[#FFFFFF] border border-[#CBD5E1] rounded-sm w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-[#E2E8F0] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-[#0F172A] font-admin">
                  Historical Snapshot: {inspectingItem.docType === "TERMS" ? "Terms of Service" : "Privacy Policy"} v{inspectingItem.version}
                </h3>
                <p className="text-xs text-[#64748B] font-admin-mono">
                  Effective: {inspectingItem.effectiveDate} • Published: {new Date(inspectingItem.publishedAt).toLocaleString()}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInspectingItem(null)}
                className="p-1.5 text-[#64748B] hover:text-[#0F172A] rounded-sm cursor-pointer"
              >
                <FaXmark className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 text-xs font-admin-mono">
              {inspectingItem.changeSummary && (
                <div className="p-3 bg-[#F5F3FF] border border-[#DDD6FE] rounded-sm">
                  <span className="font-bold text-[#7C3AED] block mb-1">
                    Recorded Change Summary
                  </span>
                  <p className="text-[#334155]">{inspectingItem.changeSummary}</p>
                </div>
              )}

              <div className="space-y-4">
                <span className="font-bold text-[#0F172A] uppercase tracking-wider text-[11px] block border-b border-[#F1F5F9] pb-2">
                  Clauses Snapshot ({inspectingItem.sectionsSnapshot.length})
                </span>

                {inspectingItem.sectionsSnapshot.map((sec, idx) => (
                  <div key={sec.id} className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-sm space-y-2">
                    <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
                      <span className="font-bold text-[#0F172A]">
                        {idx + 1}. {sec.heading}
                      </span>
                      <span className="text-[10px] text-[#64748B]">#{sec.id}</span>
                    </div>
                    <div className="p-3 rounded-sm bg-[#000319] text-[#C1C2D3] border border-white/10 overflow-x-auto">
                      <MarkdownLegalRenderer content={sec.contentMarkdown} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between">
              <button
                type="button"
                onClick={() => setInspectingItem(null)}
                className="px-4 py-1.5 text-xs font-admin-mono text-[#64748B] hover:text-[#0F172A] cursor-pointer"
              >
                Close
              </button>

              <button
                type="button"
                onClick={() => {
                  const item = inspectingItem;
                  setInspectingItem(null);
                  handleRestoreVersion(item);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-admin-mono font-bold bg-[#7C3AED] hover:bg-[#6D28D9] text-[#FFFFFF] rounded-sm transition-all shadow-2xs cursor-pointer"
              >
                <FaRotateLeft className="w-3.5 h-3.5" />
                <span>Restore This Version as Draft</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
