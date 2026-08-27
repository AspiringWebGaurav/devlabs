"use client";

import React, { useState } from "react";
import type { FooterDocument } from "@/types/portfolio";
import { updateFooterAction } from "@/lib/actions/cms.actions";
import { FaCheck, FaRotateRight, FaFloppyDisk } from "react-icons/fa6";

export const FooterEditor: React.FC<{ initialData: FooterDocument | null }> = ({ initialData }) => {
  const [formData, setFormData] = useState({
    copyrightName: initialData?.copyrightName || "Gaurav Patil",
    termsUrl: initialData?.termsUrl || "/terms",
    privacyUrl: initialData?.privacyUrl || "/privacy",
  });

  const [isPending, setIsPending] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPending(true);
    setStatusMessage(null);

    const res = await updateFooterAction(formData);
    setIsPending(false);

    if (res.success) {
      setStatusMessage({ type: "success", text: "Footer configuration saved and cache revalidated." });
    } else {
      setStatusMessage({ type: "error", text: res.error || "Failed to update footer." });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 w-full">
      {statusMessage && (
        <div
          className={`p-4 rounded-sm border text-sm font-admin-mono flex items-center gap-2.5 ${
            statusMessage.type === "success"
              ? "bg-[#F0FDF4] border-[#86EFAC] text-[#166534]"
              : "bg-[#FEF2F2] border-[#FCA5A5] text-[#991B1B]"
          }`}
        >
          {statusMessage.type === "success" ? <FaCheck className="w-4 h-4" /> : null}
          <span>{statusMessage.text}</span>
        </div>
      )}

      <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-sm p-6 sm:p-7 space-y-6 shadow-2xs w-full">
        <h2 className="text-lg font-bold font-admin-sans text-black border-b border-[#F1F5F9] pb-3.5">
          Copyright Identity & Legal Links
        </h2>

        <div className="space-y-2">
          <label className="block text-xs font-admin-mono uppercase tracking-wider text-[#475569] font-bold">
            Copyright Holder Name
          </label>
          <input
            type="text"
            value={formData.copyrightName}
            onChange={(e) => setFormData({ ...formData, copyrightName: e.target.value })}
            className="w-full px-3.5 py-2.5 text-sm border border-[#E2E8F0] rounded-sm bg-[#FAFAFA] focus:bg-[#FFFFFF] focus:ring-1 focus:ring-[#7C3AED] focus:border-[#7C3AED] transition-all"
            placeholder="Gaurav Patil"
            required
          />
          <p className="text-xs font-admin-mono text-[#64748B] mt-1">
            Renders dynamically on public footer as: © {new Date().getFullYear()} {formData.copyrightName}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="block text-xs font-admin-mono uppercase tracking-wider text-[#475569] font-bold">
              Terms of Service URL / Path
            </label>
            <input
              type="text"
              value={formData.termsUrl}
              onChange={(e) => setFormData({ ...formData, termsUrl: e.target.value })}
              className="w-full px-3.5 py-2.5 text-sm border border-[#E2E8F0] rounded-sm bg-[#FAFAFA] focus:bg-[#FFFFFF] focus:ring-1 focus:ring-[#7C3AED] focus:border-[#7C3AED] transition-all"
              placeholder="/terms or https://..."
              required
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-admin-mono uppercase tracking-wider text-[#475569] font-bold">
              Privacy Policy URL / Path
            </label>
            <input
              type="text"
              value={formData.privacyUrl}
              onChange={(e) => setFormData({ ...formData, privacyUrl: e.target.value })}
              className="w-full px-3.5 py-2.5 text-sm border border-[#E2E8F0] rounded-sm bg-[#FAFAFA] focus:bg-[#FFFFFF] focus:ring-1 focus:ring-[#7C3AED] focus:border-[#7C3AED] transition-all"
              placeholder="/privacy or https://..."
              required
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-2.5 px-6 py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs sm:text-sm font-admin-mono font-semibold rounded-sm shadow-sm cursor-pointer disabled:opacity-60 transition-all"
        >
          {isPending ? <FaRotateRight className="w-4 h-4 animate-spin" /> : <FaFloppyDisk className="w-4 h-4" />}
          <span>Save Footer Settings</span>
        </button>
      </div>
    </form>
  );
};
