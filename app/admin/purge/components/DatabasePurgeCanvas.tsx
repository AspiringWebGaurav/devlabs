"use client";

import React, { useState, useTransition } from "react";
import {
  FaShieldHalved,
  FaTrashCan,
  FaRotateRight,
  FaEye,
  FaTriangleExclamation,
  FaCheck,
  FaXmark,
  FaSeedling,
  FaChevronDown,
  FaChevronRight,
  FaCircleCheck,
} from "react-icons/fa6";
import {
  auditDatabaseAction,
  dryRunAction,
  executePurgeOnlyAction,
  executeResetAndReseedAction,
} from "@/lib/actions/purge.actions";
import type {
  DatabaseAuditReport,
  LifecycleExecutionReceipt,
} from "@/lib/dal/lifecycle/orchestrator";
import type { SeedDatasetPreset, SeedMode } from "@/lib/dal/lifecycle/seed-generator";
import { ButtonHelpBadge } from "@/components/admin/ui/ButtonHelpTooltip";
import { BUTTON_HELP } from "@/lib/admin/constants/button-help";

interface DatabasePurgeCanvasProps {
  initialAudit: DatabaseAuditReport | null;
}

export const DatabasePurgeCanvas: React.FC<DatabasePurgeCanvasProps> = ({ initialAudit }) => {
  const [audit, setAudit] = useState<DatabaseAuditReport | null>(initialAudit);
  const [receipt, setReceipt] = useState<LifecycleExecutionReceipt | null>(null);
  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);

  // Success view state
  const [lastCompletedOp, setLastCompletedOp] = useState<"CLEAN" | "RESEED" | null>(null);

  // Advanced accordion state
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Seeding Configuration State (defaults: medium, random/fresh each time)
  const [seedPreset, setSeedPreset] = useState<SeedDatasetPreset>("medium");
  const [seedMode, setSeedMode] = useState<SeedMode>("random");
  const [seedString, setSeedString] = useState("portfolio-dev");

  // Modal State
  const [activeModal, setActiveModal] = useState<"CLEAN_DATABASE" | "CLEAN_AND_RESEED" | null>(null);
  const [reseedStep, setReseedStep] = useState<"CONFIG" | "CONFIRM">("CONFIG");
  const [confirmUnderstood, setConfirmUnderstood] = useState(false);
  const [typedPhrase, setTypedPhrase] = useState("");

  const expectedPhrase =
    activeModal === "CLEAN_AND_RESEED" ? "CLEAN AND RESEED" : "CLEAN DATABASE";
  const isPhraseValid = typedPhrase.trim().toUpperCase() === expectedPhrase;
  const isSubmitDisabled = !confirmUnderstood || !isPhraseValid || isPending;

  // Refresh Audit
  const handleRefreshAudit = () => {
    setActionError(null);
    startTransition(async () => {
      const res = await auditDatabaseAction();
      if (res.success && res.data) {
        setAudit(res.data);
      } else {
        setActionError(res.error || "Failed to refresh database audit.");
      }
    });
  };

  // Execute Dry Run
  const handleDryRun = () => {
    setActionError(null);
    startTransition(async () => {
      const res = await dryRunAction();
      if (res.success && res.data) {
        setReceipt(res.data);
        setShowAdvanced(true);
      } else {
        setActionError(res.error || "Failed to execute dry run.");
      }
    });
  };

  // Open Clean Modal
  const openCleanModal = () => {
    setActionError(null);
    setLastCompletedOp(null);
    setActiveModal("CLEAN_DATABASE");
    setTypedPhrase("");
    setConfirmUnderstood(false);
  };

  // Open Reseed Modal
  const openReseedModal = () => {
    setActionError(null);
    setLastCompletedOp(null);
    setActiveModal("CLEAN_AND_RESEED");
    setReseedStep("CONFIG");
    setTypedPhrase("");
    setConfirmUnderstood(false);
  };

  // Close Modals
  const closeModal = () => {
    if (isPending) return;
    setActiveModal(null);
    setTypedPhrase("");
    setConfirmUnderstood(false);
  };

  // Execute Clean or Reseed
  const handleExecuteOperation = () => {
    if (!audit || isSubmitDisabled) return;
    setActionError(null);

    const targetOp = activeModal;
    const fingerprint = audit.auditFingerprint;

    startTransition(async () => {
      if (targetOp === "CLEAN_DATABASE") {
        const res = await executePurgeOnlyAction(typedPhrase, fingerprint);
        if (res.success && res.data) {
          setReceipt(res.data);
          setActiveModal(null);
          setLastCompletedOp("CLEAN");
          // Refresh audit
          const refreshedAudit = await auditDatabaseAction();
          if (refreshedAudit.data) setAudit(refreshedAudit.data);
        } else {
          setActionError(res.error || "Database cleanup failed.");
        }
      } else if (targetOp === "CLEAN_AND_RESEED") {
        const res = await executeResetAndReseedAction(typedPhrase, fingerprint, {
          preset: seedPreset,
          mode: seedMode,
          seedString: seedMode === "deterministic" ? seedString : undefined,
        });
        if (res.success && res.data) {
          setReceipt(res.data);
          setActiveModal(null);
          setLastCompletedOp("RESEED");
          // Refresh audit
          const refreshedAudit = await auditDatabaseAction();
          if (refreshedAudit.data) setAudit(refreshedAudit.data);
        } else {
          setActionError(res.error || "Clean and reseed failed.");
        }
      }
    });
  };

  return (
    <div className="space-y-6 w-full">
      {/* 1. Top Bar: Environment & Secondary Refresh */}
      <div className="flex items-center justify-between p-3.5 bg-white border border-[#E2E8F0] rounded-sm">
        <div className="flex items-center gap-2.5">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              audit?.isDestructiveAllowed ? "bg-[#16A34A]" : "bg-[#DC2626]"
            }`}
          />
          <span className="text-xs font-bold font-admin-sans text-black">
            {audit?.environment.toUpperCase() || "DEVELOPMENT"}
          </span>
          <span className="text-xs text-[#64748B] font-admin-mono">
            ({audit?.projectId || "gaurav-portfolio-improved"})
          </span>
          <span className="text-[11px] px-2 py-0.5 bg-[#F1F5F9] text-[#475569] font-admin-mono rounded-xs font-semibold">
            {audit?.isDestructiveAllowed ? "Reset enabled" : "Reset disabled"}
          </span>
        </div>

        <button
          type="button"
          onClick={handleRefreshAudit}
          disabled={isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-admin-sans font-medium text-[#475569] hover:text-black bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#E2E8F0] rounded-sm transition-colors cursor-pointer disabled:opacity-50"
          title="Check the latest database status"
        >
          <FaRotateRight className={`w-3 h-3 ${isPending ? "animate-spin" : ""}`} />
          <span>Refresh</span>
          <ButtonHelpBadge text={BUTTON_HELP.DATABASE_AUDIT} position="bottom" />
        </button>
      </div>

      {/* 2. Global Error Banner */}
      {actionError && (
        <div className="p-4 bg-[#FEF2F2] border border-[#FCA5A5] rounded-sm flex items-start gap-3 text-[#991B1B]">
          <FaTriangleExclamation className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="text-xs font-admin-sans space-y-1">
            <span className="font-bold uppercase tracking-wider block">Operation Notice</span>
            <p>{actionError}</p>
          </div>
        </div>
      )}

      {/* 3. Prominent Protection Banner */}
      <div className="p-4 bg-[#F0FDF4] border border-[#BBF7D0] rounded-sm flex items-start gap-3.5 text-[#166534]">
        <div className="p-2 bg-white border border-[#86EFAC] rounded-sm shrink-0">
          <FaShieldHalved className="w-5 h-5 text-[#16A34A]" />
        </div>
        <div className="space-y-1">
          <h2 className="text-sm font-bold font-admin-sans text-[#14532D]">
            Portfolio is protected
          </h2>
          <p className="text-xs font-admin-sans text-[#166534] leading-relaxed">
            Your portfolio content will not be deleted during cleanup. Projects, experience,
            testimonials, SEO, and other static content pillars are verified before and after every reset.
          </p>
          <div className="flex items-center gap-1.5 pt-1 text-[11px] font-admin-mono font-semibold text-[#15803D]">
            <FaCheck className="w-3 h-3" />
            <span>Protected by cryptographic integrity verification</span>
          </div>
        </div>
      </div>

      {/* 4. Four Human-Readable Status Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card A: Environment */}
        <div className="p-3.5 bg-white border border-[#E2E8F0] rounded-sm space-y-1">
          <span className="text-[10px] font-admin-mono font-bold uppercase tracking-wider text-[#64748B] block">
            Environment
          </span>
          <div className="text-sm font-bold font-admin-sans text-black">Development</div>
          <span className="text-[11px] text-[#64748B] font-admin-mono block truncate">
            {audit?.projectId || "gaurav-portfolio-improved"}
          </span>
        </div>

        {/* Card B: Portfolio */}
        <div className="p-3.5 bg-white border border-[#E2E8F0] rounded-sm space-y-1">
          <span className="text-[10px] font-admin-mono font-bold uppercase tracking-wider text-[#64748B] block">
            Portfolio
          </span>
          <div className="text-sm font-bold font-admin-sans text-[#16A34A] flex items-center gap-1">
            <FaCheck className="w-3 h-3" />
            <span>Protected</span>
          </div>
          <span className="text-[11px] text-[#64748B] font-admin-mono block">
            {audit?.totalProtectedDocuments ?? 30} documents • Safe
          </span>
        </div>

        {/* Card C: Development Data */}
        <div className="p-3.5 bg-white border border-[#E2E8F0] rounded-sm space-y-1">
          <span className="text-[10px] font-admin-mono font-bold uppercase tracking-wider text-[#64748B] block">
            Development Data
          </span>
          <div className="text-sm font-bold font-admin-sans text-black">
            {audit?.totalDynamicDocuments ?? 0} records
          </div>
          <span className="text-[11px] text-[#64748B] font-admin-mono block">
            {(audit?.totalDynamicDocuments ?? 0) > 0 ? "Ready to clean" : "Database clean"}
          </span>
        </div>

        {/* Card D: Redis */}
        <div className="p-3.5 bg-white border border-[#E2E8F0] rounded-sm space-y-1">
          <span className="text-[10px] font-admin-mono font-bold uppercase tracking-wider text-[#64748B] block">
            Redis
          </span>
          <div className="text-sm font-bold font-admin-sans text-black">
            {audit?.redisHealth.dbsize ?? 0} keys
          </div>
          <span className="text-[11px] text-[#64748B] font-admin-mono block">
            Will be cleared
          </span>
        </div>
      </div>

      {/* 5. Success Banner (If last operation completed) */}
      {lastCompletedOp && (
        <div className="p-4 bg-[#F0FDF4] border-2 border-[#86EFAC] rounded-sm space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FaCircleCheck className="w-5 h-5 text-[#16A34A]" />
              <h3 className="text-sm font-bold font-admin-sans text-[#14532D]">
                {lastCompletedOp === "CLEAN" ? "Database Clean" : "Database Ready"}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setLastCompletedOp(null)}
              className="text-xs font-admin-sans font-semibold text-[#15803D] hover:text-[#14532D] cursor-pointer"
            >
              Dismiss
            </button>
          </div>
          <p className="text-xs font-admin-sans text-[#166534]">
            {lastCompletedOp === "CLEAN"
              ? "Your disposable development data has been removed. Portfolio content remains safe and untouched."
              : "Your old test data was removed and fresh realistic development data was created."}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-[#BBF7D0] text-xs font-admin-mono">
            <div>
              <span className="text-[#15803D] block text-[10px]">PORTFOLIO</span>
              <span className="font-bold text-[#14532D]">✓ Protected</span>
            </div>
            <div>
              <span className="text-[#15803D] block text-[10px]">TEST DATA</span>
              <span className="font-bold text-[#14532D]">
                {lastCompletedOp === "CLEAN" ? "✓ Clean" : "✓ Fresh"}
              </span>
            </div>
            <div>
              <span className="text-[#15803D] block text-[10px]">REDIS</span>
              <span className="font-bold text-[#14532D]">✓ Cleared</span>
            </div>
            <div>
              <span className="text-[#15803D] block text-[10px]">APPLICATION</span>
              <span className="font-bold text-[#14532D]">✓ Healthy</span>
            </div>
          </div>
        </div>
      )}

      {/* 6. Primary Action Cards: Exactly TWO */}
      <div className="space-y-3">
        <h3 className="text-xs font-admin-mono font-bold uppercase tracking-wider text-[#64748B]">
          What do you want to do?
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Action 1: Clean Database */}
          <div className="p-5 bg-white border border-[#E2E8F0] hover:border-[#CBD5E1] rounded-sm flex flex-col justify-between space-y-4 transition-colors">
            <div className="space-y-2">
              <div className="w-9 h-9 rounded-sm bg-[#FEF2F2] border border-[#FECACA] flex items-center justify-center text-[#DC2626]">
                <FaTrashCan className="w-4 h-4" />
              </div>
              <h4 className="text-base font-bold font-admin-sans text-black">
                Clean Database
              </h4>
              <p className="text-xs font-admin-sans text-[#64748B] leading-relaxed">
                Delete all disposable development and test data. Your portfolio content stays 100% untouched.
              </p>
            </div>

            <button
              type="button"
              onClick={openCleanModal}
              disabled={isPending}
              className="w-full py-2.5 px-4 text-xs font-admin-sans font-semibold text-[#DC2626] hover:text-white bg-[#FEF2F2] hover:bg-[#DC2626] border border-[#FECACA] hover:border-[#DC2626] rounded-sm transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <FaTrashCan className="w-3.5 h-3.5" />
              <span>Clean Database</span>
              <ButtonHelpBadge text={BUTTON_HELP.PURGE_DATABASE} position="top" />
            </button>
          </div>

          {/* Action 2: Clean & Reseed (Recommended) */}
          <div className="p-5 bg-white border-2 border-[#7C3AED]/40 hover:border-[#7C3AED] rounded-sm flex flex-col justify-between space-y-4 relative transition-colors shadow-2xs">
            <div className="absolute top-3.5 right-3.5">
              <span className="px-2 py-0.5 bg-[#F5F3FF] border border-[#DDD6FE] text-[#7C3AED] text-[10px] font-admin-mono font-bold uppercase rounded-xs">
                Recommended
              </span>
            </div>

            <div className="space-y-2 pr-20">
              <div className="w-9 h-9 rounded-sm bg-[#F5F3FF] border border-[#DDD6FE] flex items-center justify-center text-[#7C3AED]">
                <FaSeedling className="w-4 h-4" />
              </div>
              <h4 className="text-base font-bold font-admin-sans text-black">
                Clean & Reseed
              </h4>
              <p className="text-xs font-admin-sans text-[#64748B] leading-relaxed">
                Delete existing test data and create fresh realistic inquiries, chats, and emails for development.
              </p>
            </div>

            <button
              type="button"
              onClick={openReseedModal}
              disabled={isPending}
              className="w-full py-2.5 px-4 text-xs font-admin-sans font-semibold text-white bg-[#7C3AED] hover:bg-[#6D28D9] border border-[#6D28D9] rounded-sm shadow-2xs transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <FaSeedling className="w-3.5 h-3.5" />
              <span>Clean & Reseed</span>
              <ButtonHelpBadge text={BUTTON_HELP.RESET_AND_RESEED} position="top" />
            </button>
          </div>
        </div>
      </div>

      {/* 7. Summary: What gets cleaned vs What stays */}
      <div className="p-4 bg-white border border-[#E2E8F0] rounded-sm grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-admin-sans">
        <div className="space-y-1.5">
          <span className="font-bold text-[#DC2626] uppercase tracking-wider text-[11px] block">
            What gets cleaned?
          </span>
          <ul className="space-y-1 text-[#475569]">
            <li className="flex items-center gap-1.5">
              <span className="text-[#DC2626]">✓</span> Test inquiries & client messages
            </li>
            <li className="flex items-center gap-1.5">
              <span className="text-[#DC2626]">✓</span> Live chat test sessions & messages
            </li>
            <li className="flex items-center gap-1.5">
              <span className="text-[#DC2626]">✓</span> Mail center sent history & drafts
            </li>
            <li className="flex items-center gap-1.5">
              <span className="text-[#DC2626]">✓</span> Temporary Redis rate limits & state
            </li>
            <li className="flex items-center gap-1.5">
              <span className="text-[#DC2626]">✓</span> Other disposable development data
            </li>
          </ul>
        </div>

        <div className="space-y-1.5">
          <span className="font-bold text-[#16A34A] uppercase tracking-wider text-[11px] block">
            What stays?
          </span>
          <ul className="space-y-1 text-[#475569]">
            <li className="flex items-center gap-1.5">
              <span className="text-[#16A34A]">🔒</span> Portfolio hero & bio copy
            </li>
            <li className="flex items-center gap-1.5">
              <span className="text-[#16A34A]">🔒</span> Bento grid cards & 3D projects
            </li>
            <li className="flex items-center gap-1.5">
              <span className="text-[#16A34A]">🔒</span> Work experience & client testimonials
            </li>
            <li className="flex items-center gap-1.5">
              <span className="text-[#16A34A]">🔒</span> SEO metadata & social links
            </li>
            <li className="flex items-center gap-1.5">
              <span className="text-[#16A34A]">🔒</span> All other protected content
            </li>
          </ul>
        </div>
      </div>

      {/* 8. Advanced Details (Collapsed by default) */}
      <div className="border border-[#E2E8F0] rounded-sm bg-white overflow-hidden">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full p-3.5 flex items-center justify-between text-left hover:bg-[#F8FAFC] transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            {showAdvanced ? (
              <FaChevronDown className="w-3 h-3 text-[#64748B]" />
            ) : (
              <FaChevronRight className="w-3 h-3 text-[#64748B]" />
            )}
            <span className="text-xs font-bold font-admin-sans text-[#475569]">
              Advanced Details & Diagnostics
            </span>
          </div>
          <span className="text-[11px] font-admin-mono text-[#94A3B8]">
            Dry run, collection lists & receipts
          </span>
        </button>

        {showAdvanced && (
          <div className="p-4 border-t border-[#E2E8F0] space-y-5 bg-[#FAFAFA] text-xs font-admin-sans">
            {/* Dry Run Trigger */}
            <div className="flex items-center justify-between p-3 bg-white border border-[#E2E8F0] rounded-xs">
              <div>
                <span className="font-bold text-black block">Dry Run Simulation</span>
                <span className="text-[11px] text-[#64748B]">
                  Simulates discovery, classification, and calculations with zero writes.
                </span>
              </div>
              <button
                type="button"
                onClick={handleDryRun}
                disabled={isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#2563EB] bg-[#EFF6FF] hover:bg-[#DBEAFE] border border-[#BFDBFE] rounded-xs cursor-pointer disabled:opacity-50"
              >
                <FaEye className="w-3.5 h-3.5" />
                <span>Preview (Dry Run)</span>
                <ButtonHelpBadge text={BUTTON_HELP.DRY_RUN} position="bottom" />
              </button>
            </div>

            {/* Last Execution Receipt */}
            {receipt && (
              <div className="p-4 bg-white border border-[#7C3AED]/40 rounded-xs space-y-3">
                <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-2">
                  <span className="font-bold font-admin-mono text-xs text-black">
                    Receipt: {receipt.operation} ({receipt.status})
                  </span>
                  <span className="font-admin-mono text-[11px] text-[#64748B]">
                    {receipt.durationMs}ms
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-admin-mono">
                  <div>
                    <span className="text-[#64748B] block">Execution ID:</span>
                    <span className="font-bold text-black">{receipt.executionId}</span>
                  </div>
                  <div>
                    <span className="text-[#64748B] block">Audit ID:</span>
                    <span className="font-bold text-black">{receipt.auditId}</span>
                  </div>
                  <div>
                    <span className="text-[#64748B] block">Protected Status:</span>
                    <span className="font-bold text-[#16A34A]">
                      {receipt.integrityVerification.isMatch ? "Unchanged" : "Drift"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#64748B] block">Signal Sync:</span>
                    <span className="font-bold text-[#16A34A]">
                      {receipt.systemSignalSync?.success ? "PASS" : "N/A"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Detailed Collection Tables */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Protected Collections */}
              <div className="p-3 bg-white border border-[#E2E8F0] rounded-xs space-y-2">
                <span className="font-bold font-admin-mono text-[11px] text-[#16A34A] block uppercase">
                  Protected Collections ({audit?.protectedFirestoreCollections.length || 0})
                </span>
                <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                  {audit?.protectedFirestoreCollections.map((col) => (
                    <div
                      key={col.name}
                      className="flex items-center justify-between py-1 px-2 bg-[#F8FAFC] rounded-xs text-[11px] font-admin-mono"
                    >
                      <span className="text-black">{col.name}</span>
                      <span className="text-[#64748B]">{col.count} docs</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dynamic Collections */}
              <div className="p-3 bg-white border border-[#E2E8F0] rounded-xs space-y-2">
                <span className="font-bold font-admin-mono text-[11px] text-[#DC2626] block uppercase">
                  Development Data ({audit?.dynamicFirestoreCollections.length || 0})
                </span>
                <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                  {audit?.dynamicFirestoreCollections.length === 0 ? (
                    <div className="text-center py-4 text-[11px] text-[#64748B]">0 records found.</div>
                  ) : (
                    audit?.dynamicFirestoreCollections.map((col) => (
                      <div
                        key={col.name}
                        className="flex items-center justify-between py-1 px-2 bg-[#FEF2F2] rounded-xs text-[11px] font-admin-mono"
                      >
                        <span className="text-[#991B1B]">{col.name}</span>
                        <span className="text-[#DC2626]">{col.count} docs</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 9. MODAL A: CLEAN DATABASE CONFIRMATION */}
      {/* ========================================================================= */}
      {activeModal === "CLEAN_DATABASE" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white border border-[#E2E8F0] w-full max-w-lg rounded-sm shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-150 relative text-black">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-sm bg-[#FEF2F2] border border-[#FECACA] flex items-center justify-center text-[#DC2626]">
                  <FaTrashCan className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold font-admin-sans text-black">
                    Clean Database?
                  </h3>
                  <span className="text-[10px] font-admin-mono text-[#DC2626] font-semibold uppercase">
                    Permanent Cleanup
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={closeModal}
                disabled={isPending}
                className="w-7 h-7 flex items-center justify-center rounded-sm hover:bg-[#F1F5F9] text-[#64748B] hover:text-black cursor-pointer"
              >
                <FaXmark className="w-4 h-4" />
              </button>
            </div>

            {/* Content Summary */}
            <div className="p-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xs space-y-2 text-xs font-admin-sans">
              <span className="font-bold text-[#475569] uppercase tracking-wider block text-[10px]">
                Summary
              </span>
              <div className="space-y-1 text-[#334155]">
                <div>• <span className="font-bold text-[#DC2626]">{audit?.totalDynamicDocuments ?? 0} development records</span> will be removed</div>
                <div>• <span className="font-bold text-[#DC2626]">{audit?.redisHealth.dbsize ?? 0} Redis keys</span> will be cleared</div>
                <div>• <span className="font-bold text-[#16A34A]">Your portfolio ({audit?.totalProtectedDocuments ?? 30} docs)</span> will remain safe</div>
              </div>
            </div>

            {/* Acknowledgment */}
            <label className="flex items-start gap-3 p-3 bg-[#FEF2F2]/50 border border-[#FECACA] rounded-xs cursor-pointer select-none">
              <input
                type="checkbox"
                checked={confirmUnderstood}
                onChange={(e) => setConfirmUnderstood(e.target.checked)}
                className="mt-0.5 rounded-xs text-[#DC2626] focus:ring-[#DC2626]"
              />
              <span className="text-xs font-admin-sans text-[#991B1B] leading-relaxed">
                I understand that development and test data will be permanently removed.
              </span>
            </label>

            {/* Typing Challenge */}
            <div className="space-y-2 text-xs font-admin-sans">
              <label className="font-semibold text-[#475569] block">
                Type <span className="font-mono font-bold text-[#DC2626] select-all">CLEAN DATABASE</span> to confirm:
              </label>
              <input
                type="text"
                value={typedPhrase}
                onChange={(e) => setTypedPhrase(e.target.value)}
                placeholder="CLEAN DATABASE"
                className="w-full px-3 py-2 border border-[#CBD5E1] focus:border-[#DC2626] focus:ring-1 focus:ring-[#DC2626] rounded-xs text-xs font-admin-mono text-black uppercase"
              />
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-[#F1F5F9] flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={closeModal}
                disabled={isPending}
                className="px-4 py-2 text-xs font-admin-sans font-medium text-[#475569] hover:text-black hover:bg-[#F1F5F9] border border-[#E2E8F0] rounded-sm transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleExecuteOperation}
                disabled={isSubmitDisabled}
                className="px-4 py-2 text-xs font-admin-sans font-semibold text-white bg-[#DC2626] hover:bg-[#B91C1C] border border-[#B91C1C] rounded-sm shadow-2xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                {isPending ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Cleaning...</span>
                  </>
                ) : (
                  <>
                    <FaTrashCan className="w-3.5 h-3.5" />
                    <span>Confirm & Clean</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 10. MODAL B: CLEAN & RESEED (STEP 1: CONFIG & STEP 2: CONFIRM) */}
      {/* ========================================================================= */}
      {activeModal === "CLEAN_AND_RESEED" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white border border-[#E2E8F0] w-full max-w-lg rounded-sm shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-150 relative text-black">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-sm bg-[#F5F3FF] border border-[#DDD6FE] flex items-center justify-center text-[#7C3AED]">
                  <FaSeedling className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold font-admin-sans text-black">
                    Clean & Reseed
                  </h3>
                  <span className="text-[10px] font-admin-mono text-[#7C3AED] font-semibold uppercase">
                    Fresh Development Data
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={closeModal}
                disabled={isPending}
                className="w-7 h-7 flex items-center justify-center rounded-sm hover:bg-[#F1F5F9] text-[#64748B] hover:text-black cursor-pointer"
              >
                <FaXmark className="w-4 h-4" />
              </button>
            </div>

            {reseedStep === "CONFIG" ? (
              /* Step 1: Configurator */
              <div className="space-y-4">
                {/* Dataset Size */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#475569] uppercase tracking-wider block">
                    How much test data?
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { key: "small", label: "Small", sub: "Quick testing (5 leads)" },
                      { key: "medium", label: "Medium", sub: "Normal dev (25 leads)" },
                      { key: "large", label: "Large", sub: "Stress testing (100 leads)" },
                    ].map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setSeedPreset(item.key as SeedDatasetPreset)}
                        className={`p-2.5 text-left rounded-sm border transition-colors cursor-pointer ${
                          seedPreset === item.key
                            ? "bg-[#F5F3FF] border-[#7C3AED] text-[#7C3AED]"
                            : "bg-white border-[#E2E8F0] text-[#64748B] hover:border-[#CBD5E1]"
                        }`}
                      >
                        <span className="text-xs font-bold font-admin-sans block text-black">
                          {item.label}
                        </span>
                        <span className="text-[10px] text-[#64748B] block mt-0.5">{item.sub}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Data Style */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#475569] uppercase tracking-wider block">
                    How should it be generated?
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { key: "random", label: "Fresh each time", sub: "Random synthetic data" },
                      { key: "deterministic", label: "Repeatable", sub: "Same dataset with seed" },
                    ].map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setSeedMode(item.key as SeedMode)}
                        className={`p-2.5 text-left rounded-sm border transition-colors cursor-pointer ${
                          seedMode === item.key
                            ? "bg-[#F5F3FF] border-[#7C3AED] text-[#7C3AED]"
                            : "bg-white border-[#E2E8F0] text-[#64748B] hover:border-[#CBD5E1]"
                        }`}
                      >
                        <span className="text-xs font-bold font-admin-sans block text-black">
                          {item.label}
                        </span>
                        <span className="text-[10px] text-[#64748B] block mt-0.5">{item.sub}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Seed string if repeatable */}
                {seedMode === "deterministic" && (
                  <div className="space-y-1.5 p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xs">
                    <label className="text-[11px] font-semibold text-[#475569] block">
                      Test Data Seed
                    </label>
                    <input
                      type="text"
                      value={seedString}
                      onChange={(e) => setSeedString(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-[#CBD5E1] rounded-xs text-xs font-admin-mono text-black bg-white"
                      placeholder="portfolio-dev"
                    />
                  </div>
                )}

                {/* Step 1 Actions */}
                <div className="pt-3 border-t border-[#F1F5F9] flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 text-xs font-admin-sans font-medium text-[#475569] hover:text-black hover:bg-[#F1F5F9] border border-[#E2E8F0] rounded-sm transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={() => setReseedStep("CONFIRM")}
                    className="px-4 py-2 text-xs font-admin-sans font-semibold text-white bg-[#7C3AED] hover:bg-[#6D28D9] border border-[#6D28D9] rounded-sm shadow-2xs transition-colors cursor-pointer"
                  >
                    Continue
                  </button>
                </div>
              </div>
            ) : (
              /* Step 2: Final Confirmation */
              <div className="space-y-4">
                <div className="p-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xs space-y-2 text-xs font-admin-sans">
                  <span className="font-bold text-[#475569] uppercase tracking-wider block text-[10px]">
                    This will:
                  </span>
                  <div className="space-y-1 text-[#334155]">
                    <div>1. Remove current test data ({audit?.totalDynamicDocuments ?? 0} records)</div>
                    <div>2. Clear Redis temporary state ({audit?.redisHealth.dbsize ?? 0} keys)</div>
                    <div>3. Verify portfolio is 100% untouched</div>
                    <div>4. Create fresh <span className="font-bold text-[#7C3AED] uppercase">{seedPreset}</span> test dataset</div>
                  </div>
                </div>

                {/* Acknowledgment */}
                <label className="flex items-start gap-3 p-3 bg-[#F5F3FF]/60 border border-[#DDD6FE] rounded-xs cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={confirmUnderstood}
                    onChange={(e) => setConfirmUnderstood(e.target.checked)}
                    className="mt-0.5 rounded-xs text-[#7C3AED] focus:ring-[#7C3AED]"
                  />
                  <span className="text-xs font-admin-sans text-[#5B21B6] leading-relaxed">
                    I understand that existing test data will be replaced with a fresh dataset.
                  </span>
                </label>

                {/* Typing Challenge */}
                <div className="space-y-2 text-xs font-admin-sans">
                  <label className="font-semibold text-[#475569] block">
                    Type <span className="font-mono font-bold text-[#7C3AED] select-all">CLEAN AND RESEED</span> to confirm:
                  </label>
                  <input
                    type="text"
                    value={typedPhrase}
                    onChange={(e) => setTypedPhrase(e.target.value)}
                    placeholder="CLEAN AND RESEED"
                    className="w-full px-3 py-2 border border-[#CBD5E1] focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED] rounded-xs text-xs font-admin-mono text-black uppercase"
                  />
                </div>

                {/* Step 2 Actions */}
                <div className="pt-3 border-t border-[#F1F5F9] flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setReseedStep("CONFIG")}
                    disabled={isPending}
                    className="px-3 py-2 text-xs font-admin-sans font-medium text-[#64748B] hover:text-black cursor-pointer"
                  >
                    Back
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={closeModal}
                      disabled={isPending}
                      className="px-4 py-2 text-xs font-admin-sans font-medium text-[#475569] hover:text-black hover:bg-[#F1F5F9] border border-[#E2E8F0] rounded-sm transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      onClick={handleExecuteOperation}
                      disabled={isSubmitDisabled}
                      className="px-4 py-2 text-xs font-admin-sans font-semibold text-white bg-[#7C3AED] hover:bg-[#6D28D9] border border-[#6D28D9] rounded-sm shadow-2xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                    >
                      {isPending ? (
                        <>
                          <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Resetting & Seeding...</span>
                        </>
                      ) : (
                        <>
                          <FaSeedling className="w-3.5 h-3.5" />
                          <span>Confirm & Reseed</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
