"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  FaScaleBalanced,
  FaShieldHalved,
  FaPenToSquare,
  FaArrowUpRightFromSquare,
  FaClockRotateLeft,
  FaRotate,
  FaEnvelope,
  FaCheck,
  FaTriangleExclamation,
  FaCircleInfo,
} from "react-icons/fa6";
import { useAdminConfirm } from "@/components/admin/context";
import { ButtonHelpBadge } from "@/components/admin/ui/ButtonHelpTooltip";
import { BUTTON_HELP } from "@/lib/admin/constants/button-help";
import {
  retryJobAction,
  getJobRecipientsAction,
  getEligibleRecipientsPreviewAction,
} from "@/lib/actions/legal.actions";
import {
  FaUsers,
  FaXmark,
  FaMagnifyingGlass,
  FaCircleCheck,
  FaClock,
  FaCircleXmark,
} from "react-icons/fa6";
import type {
  LegalDocument,
  LegalNotificationJobDocument,
  LegalNotificationRecipientRecord,
} from "@/types/legal";

interface LegalOverviewClientProps {
  termsDoc: LegalDocument | null;
  privacyDoc: LegalDocument | null;
  recentJobs: LegalNotificationJobDocument[];
  termsHistoryCount: number;
  privacyHistoryCount: number;
}

export const LegalOverviewClient: React.FC<LegalOverviewClientProps> = ({
  termsDoc,
  privacyDoc,
  recentJobs: initialJobs,
  termsHistoryCount,
  privacyHistoryCount,
}) => {
  const confirm = useAdminConfirm();
  const [jobs, setJobs] = useState<LegalNotificationJobDocument[]>(initialJobs);
  const [retryingJobId, setRetryingJobId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Recipient Inspection Modal State
  const [inspectingJob, setInspectingJob] = useState<LegalNotificationJobDocument | null>(null);
  const [jobRecipients, setJobRecipients] = useState<LegalNotificationRecipientRecord[] | null>(null);
  const [isLoadingRecipients, setIsLoadingRecipients] = useState(false);
  const [recipientSearch, setRecipientSearch] = useState("");

  // Audience Preview Modal State
  const [isPreviewingAudience, setIsPreviewingAudience] = useState(false);
  const [audienceList, setAudienceList] = useState<{ email: string; name?: string; type: string }[] | null>(null);
  const [isLoadingAudience, setIsLoadingAudience] = useState(false);

  const handleInspectRecipients = async (job: LegalNotificationJobDocument) => {
    setInspectingJob(job);
    setIsLoadingRecipients(true);
    setJobRecipients(null);
    setRecipientSearch("");

    const res = await getJobRecipientsAction(job.id);
    setIsLoadingRecipients(false);
    if (res.success && res.data) {
      setJobRecipients(res.data);
    } else {
      setJobRecipients([]);
    }
  };

  const handlePreviewAudience = async () => {
    setIsPreviewingAudience(true);
    setIsLoadingAudience(true);
    setAudienceList(null);

    const res = await getEligibleRecipientsPreviewAction();
    setIsLoadingAudience(false);
    if (res.success && res.data) {
      setAudienceList(res.data);
    } else {
      setAudienceList([]);
    }
  };

  const handleRetryJob = async (jobId: string) => {
    const ok = await confirm({
      title: "Retry Failed Notifications",
      description:
        "This will reset all failed recipient attempts for this job and immediately re-trigger the background dispatch engine.",
      variant: "purple",
      confirmLabel: "Retry Now",
    });

    if (!ok) return;

    setRetryingJobId(jobId);
    setActionMessage(null);

    const res = await retryJobAction({ jobId });
    setRetryingJobId(null);

    if (res.success) {
      setActionMessage(`Job ${jobId} re-queued successfully.`);
      setJobs((prev) =>
        prev.map((j) =>
          j.id === jobId ? { ...j, status: "RETRYING", failedCount: 0 } : j
        )
      );
    } else {
      setActionMessage(`Error: ${res.error || "Failed to retry job"}`);
    }
  };

  const renderStatusBadge = (status: LegalNotificationJobDocument["status"]) => {
    switch (status) {
      case "COMPLETED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-admin-mono font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <FaCheck className="w-2.5 h-2.5" /> Completed
          </span>
        );
      case "PROCESSING":
      case "RETRYING":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-admin-mono font-medium bg-purple-50 text-purple-700 border border-purple-200">
            <FaRotate className="w-2.5 h-2.5 animate-spin text-[#7C3AED]" /> Processing
          </span>
        );
      case "QUEUED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-admin-mono font-medium bg-blue-50 text-blue-700 border border-blue-200">
            Queued
          </span>
        );
      case "PARTIAL_FAILURE":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-admin-mono font-medium bg-amber-50 text-amber-700 border border-amber-200">
            <FaTriangleExclamation className="w-2.5 h-2.5 text-amber-600" /> Partial Fail
          </span>
        );
      case "FAILED":
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-admin-mono font-medium bg-rose-50 text-rose-700 border border-rose-200">
            Failed
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Notice */}
      {actionMessage && (
        <div className="p-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-sm flex items-center justify-between text-xs font-admin-mono text-[#0F172A]">
          <div className="flex items-center gap-2">
            <FaCircleInfo className="w-3.5 h-3.5 text-[#7C3AED]" />
            <span>{actionMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionMessage(null)}
            className="text-xs text-[#64748B] hover:text-black cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Primary Document Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Card 1: Terms of Service */}
        <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-sm p-5 shadow-2xs space-y-4">
          <div className="flex items-start justify-between gap-3 border-b border-[#F1F5F9] pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-sm bg-[#F5F3FF] border border-[#DDD6FE] flex items-center justify-center text-[#7C3AED]">
                <FaScaleBalanced className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-[#0F172A] font-admin">
                  Terms of Service
                </h2>
                <p className="text-xs text-[#64748B] font-admin-mono">
                  Document ID: terms_active • {termsDoc?.sections.length || 0} Clauses
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 bg-[#F8FAFC] border border-[#E2E8F0] rounded-sm text-xs font-admin-mono font-bold text-[#0F172A]">
              v{termsDoc?.publishedVersion || "1.0.0"}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs font-admin-mono">
            <div>
              <span className="text-[#64748B] block">Effective Date</span>
              <span className="font-semibold text-[#0F172A]">
                {termsDoc?.effectiveDate || "January 1, 2026"}
              </span>
            </div>
            <div>
              <span className="text-[#64748B] block">Last Updated</span>
              <span className="font-semibold text-[#0F172A]">
                {termsDoc?.lastUpdatedDate || "August 29, 2026"}
              </span>
            </div>
          </div>

          {/* Draft Status Indicator */}
          <div className="pt-2 border-t border-[#F8FAFC]">
            {termsDoc?.draft ? (
              <div className="p-2.5 rounded-sm bg-amber-50/80 border border-amber-200 text-xs font-admin-mono text-amber-900 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <span>
                    Unsaved Draft: v{termsDoc.draft.version} ({termsDoc.draft.sections.length} clauses)
                  </span>
                </div>
                <span className="text-[10px] text-amber-700">
                  by {termsDoc.draft.savedByAdmin.split("@")[0]}
                </span>
              </div>
            ) : (
              <div className="p-2.5 rounded-sm bg-emerald-50/60 border border-emerald-100 text-xs font-admin-mono text-emerald-800 flex items-center gap-2">
                <FaCheck className="w-3 h-3 text-emerald-600" />
                <span>Published and in sync with live website</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between gap-2 pt-2">
            <Link
              href="/admin/legal/editor?doc=TERMS"
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-admin-mono font-semibold bg-[#7C3AED] hover:bg-[#6D28D9] text-[#FFFFFF] rounded-sm transition-all shadow-2xs"
            >
              <FaPenToSquare className="w-3.5 h-3.5" />
              <span>Open Terms Editor</span>
            </Link>

            <div className="flex items-center gap-2">
              <Link
                href="/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-admin-mono text-[#475569] hover:text-black hover:bg-[#F8FAFC] border border-[#E2E8F0] rounded-sm transition-all"
              >
                <span>Live View</span>
                <FaArrowUpRightFromSquare className="w-3 h-3" />
                <ButtonHelpBadge text={BUTTON_HELP.VIEW_LIVE_SITE} />
              </Link>
            </div>
          </div>
        </div>

        {/* Card 2: Privacy Policy */}
        <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-sm p-5 shadow-2xs space-y-4">
          <div className="flex items-start justify-between gap-3 border-b border-[#F1F5F9] pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-sm bg-[#F5F3FF] border border-[#DDD6FE] flex items-center justify-center text-[#7C3AED]">
                <FaShieldHalved className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-[#0F172A] font-admin">
                  Privacy Policy
                </h2>
                <p className="text-xs text-[#64748B] font-admin-mono">
                  Document ID: privacy_active • {privacyDoc?.sections.length || 0} Clauses
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 bg-[#F8FAFC] border border-[#E2E8F0] rounded-sm text-xs font-admin-mono font-bold text-[#0F172A]">
              v{privacyDoc?.publishedVersion || "1.0.0"}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs font-admin-mono">
            <div>
              <span className="text-[#64748B] block">Effective Date</span>
              <span className="font-semibold text-[#0F172A]">
                {privacyDoc?.effectiveDate || "January 1, 2026"}
              </span>
            </div>
            <div>
              <span className="text-[#64748B] block">Last Updated</span>
              <span className="font-semibold text-[#0F172A]">
                {privacyDoc?.lastUpdatedDate || "August 29, 2026"}
              </span>
            </div>
          </div>

          {/* Draft Status Indicator */}
          <div className="pt-2 border-t border-[#F8FAFC]">
            {privacyDoc?.draft ? (
              <div className="p-2.5 rounded-sm bg-amber-50/80 border border-amber-200 text-xs font-admin-mono text-amber-900 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <span>
                    Unsaved Draft: v{privacyDoc.draft.version} ({privacyDoc.draft.sections.length} clauses)
                  </span>
                </div>
                <span className="text-[10px] text-amber-700">
                  by {privacyDoc.draft.savedByAdmin.split("@")[0]}
                </span>
              </div>
            ) : (
              <div className="p-2.5 rounded-sm bg-emerald-50/60 border border-emerald-100 text-xs font-admin-mono text-emerald-800 flex items-center gap-2">
                <FaCheck className="w-3 h-3 text-emerald-600" />
                <span>Published and in sync with live website</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between gap-2 pt-2">
            <Link
              href="/admin/legal/editor?doc=PRIVACY"
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-admin-mono font-semibold bg-[#7C3AED] hover:bg-[#6D28D9] text-[#FFFFFF] rounded-sm transition-all shadow-2xs"
            >
              <FaPenToSquare className="w-3.5 h-3.5" />
              <span>Open Privacy Editor</span>
            </Link>

            <div className="flex items-center gap-2">
              <Link
                href="/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-admin-mono text-[#475569] hover:text-black hover:bg-[#F8FAFC] border border-[#E2E8F0] rounded-sm transition-all"
              >
                <span>Live View</span>
                <FaArrowUpRightFromSquare className="w-3 h-3" />
                <ButtonHelpBadge text={BUTTON_HELP.VIEW_LIVE_SITE} />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Access to History */}
      <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-sm p-4 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-3">
          <FaClockRotateLeft className="w-4 h-4 text-[#64748B]" />
          <div>
            <h3 className="text-xs font-semibold text-[#0F172A] font-admin">
              Immutable Version History &amp; Reversion Ledger
            </h3>
            <p className="text-[11px] text-[#64748B] font-admin-mono">
              {termsHistoryCount} Terms revisions archived • {privacyHistoryCount} Privacy revisions archived
            </p>
          </div>
        </div>
        <Link
          href="/admin/legal/history"
          className="px-3 py-1.5 bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#E2E8F0] text-xs font-admin-mono font-semibold text-[#0F172A] rounded-sm transition-all"
        >
          Inspect Audit Ledger &rarr;
        </Link>
      </div>

      {/* Recent Legal Broadcast Notification Jobs */}
      <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-sm shadow-2xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-[#F1F5F9] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <FaEnvelope className="w-4 h-4 text-[#7C3AED]" />
            <div>
              <h3 className="text-sm font-semibold text-[#0F172A] font-admin">
                Broadcast Email History
              </h3>
              <p className="text-[11px] text-[#64748B] font-admin-mono">
                Emails sent to visitors and admin whenever policies are updated
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handlePreviewAudience}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-admin-mono font-semibold bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#475569] hover:text-[#0F172A] border border-[#E2E8F0] rounded-sm transition-all cursor-pointer"
            >
              <FaUsers className="w-3.5 h-3.5 text-[#7C3AED]" />
              <span>Preview Next Audience</span>
            </button>
            <span className="text-xs font-admin-mono text-[#64748B]">
              {jobs.length} Broadcasts
            </span>
          </div>
        </div>

        {jobs.length === 0 ? (
          <div className="p-8 text-center text-xs font-admin-mono text-[#94A3B8]">
            No legal notification broadcast jobs recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-admin-mono">
              <thead>
                <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B] uppercase tracking-wider text-[10px]">
                  <th className="p-3">Job ID</th>
                  <th className="p-3">Document</th>
                  <th className="p-3">Version</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Delivered</th>
                  <th className="p-3">Date</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {jobs.map((job) => {
                  const isRetrying = retryingJobId === job.id;
                  const canRetry =
                    job.status === "FAILED" ||
                    job.status === "PARTIAL_FAILURE" ||
                    (job.status === "PROCESSING" && (job.leaseExpiresAt ?? 0) < Date.now());

                  return (
                    <tr key={job.id} className="hover:bg-[#F8FAFC]/60 transition-colors">
                      <td className="p-3 font-mono font-medium text-[#0F172A]">
                        {job.id}
                      </td>
                      <td className="p-3">
                        <span className="font-semibold text-[#0F172A]">
                          {job.docType === "TERMS" ? "Terms of Service" : "Privacy Policy"}
                        </span>
                      </td>
                      <td className="p-3 font-semibold text-[#7C3AED]">
                        v{job.version}
                      </td>
                      <td className="p-3">{renderStatusBadge(job.status)}</td>
                      <td className="p-3 text-[#0F172A]">
                        {job.sentCount} / {job.totalRecipients}{" "}
                        <span className="text-[#64748B] text-[10px]">
                          ({job.failedCount} failed)
                        </span>
                      </td>
                      <td className="p-3 text-[#64748B]">
                        {new Date(job.createdAt).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="p-3 text-right">
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          <button
                            type="button"
                            onClick={() => handleInspectRecipients(job)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-admin-mono font-semibold bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#334155] hover:text-[#0F172A] border border-[#E2E8F0] rounded-sm transition-all cursor-pointer"
                            title="View list of recipient emails"
                          >
                            <FaUsers className="w-3 h-3 text-[#7C3AED]" />
                            <span>Emails ({job.totalRecipients})</span>
                          </button>

                          {canRetry && (
                            <button
                              type="button"
                              onClick={() => handleRetryJob(job.id)}
                              disabled={isRetrying}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-admin-mono font-semibold bg-[#F5F3FF] hover:bg-[#7C3AED] text-[#7C3AED] hover:text-[#FFFFFF] border border-[#DDD6FE] rounded-sm transition-all cursor-pointer disabled:opacity-50"
                            >
                              <FaRotate className={`w-2.5 h-2.5 ${isRetrying ? "animate-spin" : ""}`} />
                              <span>Retry</span>
                              <ButtonHelpBadge text={BUTTON_HELP.LEGAL_RETRY_JOB} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recipient Email Inspection Modal */}
      {inspectingJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-sm shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-[#F1F5F9] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-[#0F172A] font-admin flex items-center gap-2">
                  <FaUsers className="w-4 h-4 text-[#7C3AED]" />
                  <span>
                    Recipient Emails &bull; {inspectingJob.docType === "TERMS" ? "Terms of Service" : "Privacy Policy"} v{inspectingJob.version}
                  </span>
                </h3>
                <p className="text-[11px] text-[#64748B] font-admin-mono mt-0.5">
                  Job ID: {inspectingJob.id} &bull; Created {new Date(inspectingJob.createdAt).toLocaleDateString()}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInspectingJob(null)}
                className="p-1.5 text-[#94A3B8] hover:text-[#0F172A] hover:bg-[#F8FAFC] rounded transition-colors cursor-pointer"
              >
                <FaXmark className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Stats Banner */}
            <div className="grid grid-cols-4 border-b border-[#F1F5F9] bg-[#F8FAFC] p-3 text-center text-xs font-admin-mono">
              <div>
                <span className="text-[10px] text-[#64748B] block uppercase tracking-wider">Total</span>
                <strong className="text-sm text-[#0F172A]">{inspectingJob.totalRecipients}</strong>
              </div>
              <div>
                <span className="text-[10px] text-emerald-700 block uppercase tracking-wider">Sent</span>
                <strong className="text-sm text-emerald-700">{inspectingJob.sentCount}</strong>
              </div>
              <div>
                <span className="text-[10px] text-blue-700 block uppercase tracking-wider">Pending</span>
                <strong className="text-sm text-blue-700">{inspectingJob.pendingCount}</strong>
              </div>
              <div>
                <span className="text-[10px] text-rose-700 block uppercase tracking-wider">Failed</span>
                <strong className="text-sm text-rose-700">{inspectingJob.failedCount}</strong>
              </div>
            </div>

            {/* Search Filter */}
            <div className="p-3 border-b border-[#F1F5F9]">
              <div className="relative">
                <FaMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-[#94A3B8]" />
                <input
                  type="text"
                  placeholder="Filter recipient email or name..."
                  value={recipientSearch}
                  onChange={(e) => setRecipientSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs font-admin-mono border border-[#E2E8F0] rounded-sm focus:outline-none focus:border-[#7C3AED]"
                />
              </div>
            </div>

            {/* Recipients List Table */}
            <div className="overflow-y-auto flex-1 p-3">
              {isLoadingRecipients ? (
                <div className="p-8 text-center text-xs font-admin-mono text-[#64748B] flex items-center justify-center gap-2">
                  <FaRotate className="w-3.5 h-3.5 animate-spin text-[#7C3AED]" />
                  <span>Loading recipient records from database...</span>
                </div>
              ) : !jobRecipients || jobRecipients.length === 0 ? (
                <div className="p-8 text-center text-xs font-admin-mono text-[#94A3B8]">
                  No recipient records found for this job.
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs font-admin-mono">
                  <thead>
                    <tr className="border-b border-[#E2E8F0] text-[#64748B] uppercase tracking-wider text-[10px]">
                      <th className="pb-2">Recipient Email</th>
                      <th className="pb-2">Name</th>
                      <th className="pb-2">Status</th>
                      <th className="pb-2 text-right">Delivered At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F8FAFC]">
                    {jobRecipients
                      .filter(
                        (r) =>
                          r.email.toLowerCase().includes(recipientSearch.toLowerCase()) ||
                          (r.name && r.name.toLowerCase().includes(recipientSearch.toLowerCase()))
                      )
                      .map((r) => (
                        <tr key={r.id} className="hover:bg-[#F8FAFC]/80">
                          <td className="py-2.5 pr-2 font-mono font-medium text-[#0F172A]">
                            <div className="flex items-center gap-1.5">
                              <span>{r.email}</span>
                              {r.type === "ADMIN_AUDIT" && (
                                <span className="text-[9px] px-1.5 py-0.2 bg-purple-50 text-purple-700 border border-purple-200 rounded font-semibold">
                                  ADMIN
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 pr-2 text-[#64748B]">
                            {r.name || "—"}
                          </td>
                          <td className="py-2.5 pr-2">
                            {r.status === "SENT" ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <FaCircleCheck className="w-2.5 h-2.5" /> Sent
                              </span>
                            ) : r.status === "PENDING" ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                <FaClock className="w-2.5 h-2.5" /> Pending
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
                                <FaCircleXmark className="w-2.5 h-2.5" /> Failed
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 text-right text-[#64748B] text-[11px]">
                            {r.sentAt
                              ? new Date(r.sentAt).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  second: "2-digit",
                                })
                              : "—"}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-[#F1F5F9] bg-[#F8FAFC] flex justify-end">
              <button
                type="button"
                onClick={() => setInspectingJob(null)}
                className="px-4 py-1.5 text-xs font-admin-mono font-semibold bg-[#FFFFFF] hover:bg-[#F1F5F9] border border-[#CBD5E1] text-[#0F172A] rounded-sm transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Audience Preview Modal */}
      {isPreviewingAudience && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-sm shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-4 sm:p-5 border-b border-[#F1F5F9] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-[#0F172A] font-admin flex items-center gap-2">
                  <FaUsers className="w-4 h-4 text-[#7C3AED]" />
                  <span>Next Broadcast Audience Preview</span>
                </h3>
                <p className="text-[11px] text-[#64748B] font-admin-mono mt-0.5">
                  Eligible recipients from active visitor sessions (30d) + Admin
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPreviewingAudience(false)}
                className="p-1.5 text-[#94A3B8] hover:text-[#0F172A] hover:bg-[#F8FAFC] rounded transition-colors cursor-pointer"
              >
                <FaXmark className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1">
              {isLoadingAudience ? (
                <div className="p-8 text-center text-xs font-admin-mono text-[#64748B] flex items-center justify-center gap-2">
                  <FaRotate className="w-3.5 h-3.5 animate-spin text-[#7C3AED]" />
                  <span>Scanning active sessions...</span>
                </div>
              ) : !audienceList || audienceList.length === 0 ? (
                <div className="p-8 text-center text-xs font-admin-mono text-[#94A3B8]">
                  No eligible recipients found.
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-xs font-admin-mono text-[#475569] mb-3">
                    <strong>{audienceList.length}</strong> recipients will receive an email notice when an important update is published:
                  </div>
                  <div className="divide-y divide-[#F1F5F9] border border-[#E2E8F0] rounded-sm bg-[#F8FAFC]">
                    {audienceList.map((item, idx) => (
                      <div key={idx} className="p-2.5 flex items-center justify-between text-xs font-admin-mono">
                        <div>
                          <span className="font-semibold text-[#0F172A]">{item.email}</span>
                          {item.name && <span className="text-[#64748B] ml-2">({item.name})</span>}
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                          item.type === "ADMIN" ? "bg-purple-50 text-purple-700 border border-purple-200" : "bg-blue-50 text-blue-700 border border-blue-200"
                        }`}>
                          {item.type}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-3 border-t border-[#F1F5F9] bg-[#F8FAFC] flex justify-end">
              <button
                type="button"
                onClick={() => setIsPreviewingAudience(false)}
                className="px-4 py-1.5 text-xs font-admin-mono font-semibold bg-[#FFFFFF] hover:bg-[#F1F5F9] border border-[#CBD5E1] text-[#0F172A] rounded-sm transition-all cursor-pointer"
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
