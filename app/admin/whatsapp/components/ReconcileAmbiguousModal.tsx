"use client";

import React, { useState, useTransition } from "react";
import { FaShieldHalved, FaTriangleExclamation, FaCheck, FaRotate, FaXmark } from "react-icons/fa6";
import { reconcileOutboxMessageAction, type ReconcileOutboxInput } from "../actions";

interface ReconcileAmbiguousModalProps {
  isOpen: boolean;
  operationId: string;
  destinationPhone: string;
  lastError?: string;
  onClose: () => void;
  onSuccess: (newStatus: string) => void;
}

export const ReconcileAmbiguousModal: React.FC<ReconcileAmbiguousModalProps> = ({
  isOpen,
  operationId,
  destinationPhone,
  lastError,
  onClose,
  onSuccess,
}) => {
  const [proofType, setProofType] = useState<"META_WAMID_VERIFIED" | "META_GATEWAY_REJECTED" | "INCONCLUSIVE">(
    "META_WAMID_VERIFIED"
  );
  const [metaMessageId, setMetaMessageId] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [auditNote, setAuditNote] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    startTransition(async () => {
      const evidence: ReconcileOutboxInput = {
        proofType,
        metaMessageId: proofType === "META_WAMID_VERIFIED" ? metaMessageId.trim() : undefined,
        rejectionReason: proofType === "META_GATEWAY_REJECTED" ? rejectionReason.trim() : undefined,
        auditNote: auditNote.trim() || "Admin manual reconciliation",
      };

      try {
        const result = await reconcileOutboxMessageAction(operationId, evidence);
        if (!result.success) {
          setErrorMessage(result.error || "Reconciliation rejected by policy guard");
          return;
        }

        onSuccess(result.status || "RECONCILED");
        onClose();
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : String(err));
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-xs font-admin-sans">
      <div className="w-full max-w-lg bg-white border border-[#E2E8F0] rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 border-b border-[#E2E8F0] bg-[#FAFAFA] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <FaShieldHalved className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900">Reconcile Ambiguous Outbound</h3>
              <p className="text-[11px] text-neutral-500 font-admin-mono">{destinationPhone}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
          >
            <FaXmark className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {lastError && (
            <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] flex items-start gap-2">
              <FaTriangleExclamation className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Ambiguity Cause: </span>
                <span>{lastError}</span>
              </div>
            </div>
          )}

          {/* Decision Selector */}
          <div>
            <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
              Reconciliation Evidence Path
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => { setProofType("META_WAMID_VERIFIED"); setErrorMessage(""); }}
                className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                  proofType === "META_WAMID_VERIFIED"
                    ? "bg-[#7C3AED]/10 border-[#7C3AED] text-[#7C3AED] font-bold shadow-2xs"
                    : "bg-white border-[#E2E8F0] text-neutral-600 hover:bg-neutral-50"
                }`}
              >
                <span className="block text-xs">Verified wamid</span>
                <span className="block text-[10px] text-neutral-400 mt-0.5 font-normal">Accepted by Meta</span>
              </button>

              <button
                type="button"
                onClick={() => { setProofType("META_GATEWAY_REJECTED"); setErrorMessage(""); }}
                className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                  proofType === "META_GATEWAY_REJECTED"
                    ? "bg-amber-50 border-amber-500 text-amber-800 font-bold shadow-2xs"
                    : "bg-white border-[#E2E8F0] text-neutral-600 hover:bg-neutral-50"
                }`}
              >
                <span className="block text-xs">Gateway Error</span>
                <span className="block text-[10px] text-neutral-400 mt-0.5 font-normal">Rejected &amp; Retry</span>
              </button>

              <button
                type="button"
                onClick={() => { setProofType("INCONCLUSIVE"); setErrorMessage(""); }}
                className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                  proofType === "INCONCLUSIVE"
                    ? "bg-purple-50 border-purple-500 text-purple-800 font-bold shadow-2xs"
                    : "bg-white border-[#E2E8F0] text-neutral-600 hover:bg-neutral-50"
                }`}
              >
                <span className="block text-xs">Inconclusive</span>
                <span className="block text-[10px] text-neutral-400 mt-0.5 font-normal">Quarantine in DLQ</span>
              </button>
            </div>
          </div>

          {/* Conditional Inputs */}
          {proofType === "META_WAMID_VERIFIED" && (
            <div className="space-y-1">
              <label className="block text-[11px] font-semibold text-neutral-700">
                Meta Message ID (<span className="font-admin-mono">wamid</span>)
              </label>
              <input
                type="text"
                required
                placeholder="wamid.HBgL..."
                value={metaMessageId}
                onChange={(e) => setMetaMessageId(e.target.value)}
                className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-xs font-admin-mono focus:border-[#7C3AED] focus:outline-hidden"
              />
              <p className="text-[10px] text-neutral-400">
                Obtain from Meta Business Suite / WhatsApp Logs. Transitions record to CONFIRMED_ACCEPTED (no resend).
              </p>
            </div>
          )}

          {proofType === "META_GATEWAY_REJECTED" && (
            <div className="space-y-1">
              <label className="block text-[11px] font-semibold text-neutral-700">
                Verifiable Meta Gateway Rejection Reason
              </label>
              <textarea
                required
                rows={2}
                placeholder="e.g. Meta Graph API error code 131030: Phone not registered"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-xs font-admin-sans focus:border-[#7C3AED] focus:outline-hidden"
              />
              <p className="text-[10px] text-amber-700 font-medium">
                Rule 3: Phone observation (&quot;not seen on phone&quot;) is strictly rejected. Must be verifiable Meta API gateway error.
              </p>
            </div>
          )}

          {proofType === "INCONCLUSIVE" && (
            <div className="p-3 rounded-lg bg-neutral-50 border border-neutral-200 text-[11px] text-neutral-600">
              This record will be quarantined to <strong>UNRESOLVED</strong> with resend strictly blocked to guarantee zero duplicate messages.
            </div>
          )}

          {/* Audit Note */}
          <div className="space-y-1">
            <label className="block text-[11px] font-semibold text-neutral-700">
              Audit Note
            </label>
            <input
              type="text"
              placeholder="Verified via WhatsApp Business Manager"
              value={auditNote}
              onChange={(e) => setAuditNote(e.target.value)}
              className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-xs focus:border-[#7C3AED] focus:outline-hidden"
            />
          </div>

          {/* Error Display */}
          {errorMessage && (
            <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-[11px] flex items-center gap-1.5">
              <FaTriangleExclamation className="w-3.5 h-3.5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#F1F5F9]">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-3.5 py-1.5 rounded-lg border border-[#E2E8F0] text-neutral-600 hover:bg-neutral-50 font-semibold text-xs cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-1.5 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <FaRotate className="w-3 h-3 animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <FaCheck className="w-3 h-3" />
                  <span>Confirm Reconciliation</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
