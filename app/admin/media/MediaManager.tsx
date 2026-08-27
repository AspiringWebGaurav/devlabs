"use client";

import React, { useState } from "react";
import type { StorageAssetLedgerDocument } from "@/types/portfolio";
import type { MediaAuditReport } from "@/lib/dal/repositories/media.repository";
import { uploadMediaAction, sweepOrphansAction } from "@/lib/actions/cms.actions";
import {
  FaCloudArrowUp,
  FaBroom,
  FaFileLines,
  FaCheck,
  FaRotateRight,
} from "react-icons/fa6";

export const MediaManager: React.FC<{
  initialAssets: StorageAssetLedgerDocument[];
  initialAudit: MediaAuditReport | null;
}> = ({ initialAssets, initialAudit }) => {
  const [assets, setAssets] = useState<StorageAssetLedgerDocument[]>(initialAssets);
  const [audit] = useState<MediaAuditReport | null>(initialAudit);
  const [isUploading, setIsUploading] = useState(false);
  const [isSweeping, setIsSweeping] = useState(false);
  const [folder, setFolder] = useState("uploads");
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setStatusMessage(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", folder);

    const res = await uploadMediaAction(formData);
    setIsUploading(false);

    if (res.success && res.data) {
      setAssets((prev) => [res.data as StorageAssetLedgerDocument, ...prev]);
      setStatusMessage({ type: "success", text: `File "${file.name}" uploaded and recorded in ledger.` });
    } else {
      setStatusMessage({ type: "error", text: res.error || "Failed to upload file." });
    }

    // Reset input
    e.target.value = "";
  };

  const handleSweepOrphans = async () => {
    if (!confirm("Run safe orphan sweeper? This permanently deletes unmanaged objects and unattached assets older than 24 hours.")) return;
    setIsSweeping(true);
    setStatusMessage(null);

    const res = await sweepOrphansAction(24);
    setIsSweeping(false);

    if (res.success && res.data) {
      const { deletedCount } = res.data as { deletedCount: number };
      setStatusMessage({ type: "success", text: `Orphan sweeper completed. Purged ${deletedCount} unmanaged/aged assets.` });
    } else {
      setStatusMessage({ type: "error", text: res.error || "Failed to sweep orphans." });
    }
  };

  return (
    <div className="space-y-6 w-full">
      {statusMessage && (
        <div
          className={`p-4 rounded-sm border text-xs font-admin-mono flex items-center gap-2 ${
            statusMessage.type === "success"
              ? "bg-[#F0FDF4] border-[#86EFAC] text-[#166534]"
              : "bg-[#FEF2F2] border-[#FCA5A5] text-[#991B1B]"
          }`}
        >
          {statusMessage.type === "success" ? <FaCheck className="w-3.5 h-3.5" /> : null}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Audit Stats Matrix */}
      {audit && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-sm p-4 shadow-2xs">
            <span className="text-[10px] font-admin-mono uppercase tracking-wider text-[#64748B] block font-bold">
              Ledger Assets
            </span>
            <span className="text-xl font-bold font-admin-mono text-black mt-1 block">
              {audit.totalLedgerRecords}
            </span>
          </div>

          <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-sm p-4 shadow-2xs">
            <span className="text-[10px] font-admin-mono uppercase tracking-wider text-[#64748B] block font-bold">
              Bucket Objects
            </span>
            <span className="text-xl font-bold font-admin-mono text-black mt-1 block">
              {audit.totalPhysicalObjects}
            </span>
          </div>

          <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-sm p-4 shadow-2xs">
            <span className="text-[10px] font-admin-mono uppercase tracking-wider text-[#64748B] block font-bold">
              Unmanaged Files
            </span>
            <span className={`text-xl font-bold font-admin-mono mt-1 block ${audit.unmanagedObjects.length > 0 ? "text-[#D97706]" : "text-[#16A34A]"}`}>
              {audit.unmanagedObjects.length}
            </span>
          </div>

          <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-sm p-4 shadow-2xs">
            <span className="text-[10px] font-admin-mono uppercase tracking-wider text-[#64748B] block font-bold">
              Broken References
            </span>
            <span className={`text-xl font-bold font-admin-mono mt-1 block ${audit.brokenReferences.length > 0 ? "text-[#DC2626]" : "text-[#16A34A]"}`}>
              {audit.brokenReferences.length}
            </span>
          </div>
        </div>
      )}

      {/* Upload & Sweeper Operations Bar */}
      <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-sm p-5 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={folder}
            onChange={(e) => setFolder(e.target.value)}
            className="px-3 py-2 text-xs font-admin-mono border border-[#E2E8F0] rounded-sm bg-[#FAFAFA]"
          >
            <option value="uploads">uploads/</option>
            <option value="projects">projects/</option>
            <option value="testimonials">testimonials/</option>
            <option value="experience">experience/</option>
            <option value="clients">clients/</option>
          </select>

          <label className="flex items-center gap-2 px-4 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-admin-mono font-semibold rounded-sm shadow-sm cursor-pointer transition-all">
            {isUploading ? (
              <FaRotateRight className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FaCloudArrowUp className="w-3.5 h-3.5" />
            )}
            <span>{isUploading ? "Uploading File..." : "Upload Asset"}</span>
            <input
              type="file"
              accept="image/*,.svg,.pdf"
              onChange={handleFileUpload}
              disabled={isUploading}
              className="hidden"
            />
          </label>
        </div>

        <button
          onClick={handleSweepOrphans}
          disabled={isSweeping}
          className="flex items-center gap-2 px-4 py-2 border border-[#E2E8F0] hover:border-[#CBD5E1] bg-[#FAFAFA] hover:bg-[#F1F5F9] text-[#0F172A] text-xs font-admin-mono font-semibold rounded-sm transition-all cursor-pointer disabled:opacity-60"
        >
          {isSweeping ? (
            <FaRotateRight className="w-3.5 h-3.5 animate-spin text-[#7C3AED]" />
          ) : (
            <FaBroom className="w-3.5 h-3.5 text-[#7C3AED]" />
          )}
          <span>Sweep Orphans (&gt;24h)</span>
        </button>
      </div>

      {/* Asset Ledger Table */}
      <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-sm overflow-hidden shadow-2xs">
        <div className="p-4 border-b border-[#F1F5F9] flex items-center justify-between">
          <h3 className="text-xs font-bold font-admin-mono uppercase tracking-wider text-black">
            Registered Storage Asset Ledger ({assets.length})
          </h3>
        </div>

        {assets.length === 0 ? (
          <div className="p-8 text-center text-xs font-admin-mono text-[#94A3B8]">
            No storage assets registered in ledger yet.
          </div>
        ) : (
          <div className="divide-y divide-[#F1F5F9]">
            {assets.map((asset) => (
              <div key={asset.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#FAFAFA]">
                <div className="flex items-center gap-3">
                  <FaFileLines className="w-4 h-4 text-[#7C3AED] shrink-0" />
                  <div>
                    <span className="text-xs font-bold font-admin-mono text-black block truncate max-w-md">
                      {asset.fileName}
                    </span>
                    <span className="text-[11px] font-admin-mono text-[#64748B] block truncate max-w-lg">
                      {asset.storagePath}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                  <span
                    className={`px-2 py-0.5 text-[10px] font-admin-mono rounded-xs uppercase font-semibold ${
                      asset.status === "ATTACHED"
                        ? "bg-[#F0FDF4] text-[#166534] border border-[#BBF7D0]"
                        : "bg-[#FEF9C3] text-[#854D0E] border border-[#FEF08A]"
                    }`}
                  >
                    {asset.status}
                  </span>
                  <a
                    href={asset.publicUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-admin-mono text-[#7C3AED] hover:underline"
                  >
                    View
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
