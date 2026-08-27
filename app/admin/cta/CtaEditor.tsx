"use client";

import React, { useState } from "react";
import type { CtaDocument } from "@/types/portfolio";
import { updateCtaAction } from "@/lib/actions/cms.actions";
import { FaCheck, FaRotateRight, FaFloppyDisk } from "react-icons/fa6";

export const CtaEditor: React.FC<{ initialData: CtaDocument | null }> = ({ initialData }) => {
  const [formData, setFormData] = useState({
    headingPrefix: initialData?.headingPrefix || "Ready to take ",
    headingHighlight: initialData?.headingHighlight || "your",
    headingSuffix: initialData?.headingSuffix || " digital presence to the next level?",
    description:
      initialData?.description ||
      "Reach out to me today and let's discuss how I can help you achieve your goals.",
    buttonText: initialData?.buttonText || "Let's get in touch",
    isEnabled: initialData?.isEnabled !== false,
  });

  const [isPending, setIsPending] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPending(true);
    setStatusMessage(null);

    const res = await updateCtaAction(formData);
    setIsPending(false);

    if (res.success) {
      setStatusMessage({ type: "success", text: "CTA banner updated and live cache revalidated." });
    } else {
      setStatusMessage({ type: "error", text: res.error || "Failed to update CTA banner." });
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
          Headline Composition & Highlight
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="space-y-2">
            <label className="block text-xs font-admin-mono uppercase tracking-wider text-[#475569] font-bold">
              Prefix Words
            </label>
            <input
              type="text"
              value={formData.headingPrefix}
              onChange={(e) => setFormData({ ...formData, headingPrefix: e.target.value })}
              className="w-full px-3.5 py-2.5 text-sm border border-[#E2E8F0] rounded-sm bg-[#FAFAFA] focus:bg-[#FFFFFF] focus:ring-1 focus:ring-[#7C3AED] focus:border-[#7C3AED] transition-all"
              placeholder="Ready to take "
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-admin-mono uppercase tracking-wider text-[#7C3AED] font-bold">
              Purple Highlight Word(s)
            </label>
            <input
              type="text"
              value={formData.headingHighlight}
              onChange={(e) => setFormData({ ...formData, headingHighlight: e.target.value })}
              className="w-full px-3.5 py-2.5 text-sm border border-[#7C3AED]/30 rounded-sm bg-[#F5F3FF] focus:bg-[#FFFFFF] focus:ring-1 focus:ring-[#7C3AED] focus:border-[#7C3AED] transition-all font-semibold"
              placeholder="your"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-admin-mono uppercase tracking-wider text-[#475569] font-bold">
              Suffix Words
            </label>
            <input
              type="text"
              value={formData.headingSuffix}
              onChange={(e) => setFormData({ ...formData, headingSuffix: e.target.value })}
              className="w-full px-3.5 py-2.5 text-sm border border-[#E2E8F0] rounded-sm bg-[#FAFAFA] focus:bg-[#FFFFFF] focus:ring-1 focus:ring-[#7C3AED] focus:border-[#7C3AED] transition-all"
              placeholder=" digital presence to the next level?"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-admin-mono uppercase tracking-wider text-[#475569] font-bold">
            Subtext / Description
          </label>
          <textarea
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-3.5 py-2.5 text-sm border border-[#E2E8F0] rounded-sm bg-[#FAFAFA] focus:bg-[#FFFFFF] focus:ring-1 focus:ring-[#7C3AED] focus:border-[#7C3AED] transition-all"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-admin-mono uppercase tracking-wider text-[#475569] font-bold">
            Action Button Label (Triggers Contact Modal)
          </label>
          <input
            type="text"
            value={formData.buttonText}
            onChange={(e) => setFormData({ ...formData, buttonText: e.target.value })}
            className="w-full px-3.5 py-2.5 text-sm border border-[#E2E8F0] rounded-sm bg-[#FAFAFA] focus:bg-[#FFFFFF] focus:ring-1 focus:ring-[#7C3AED] focus:border-[#7C3AED] transition-all"
            placeholder="Let's get in touch"
            required
          />
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
        <label className="flex items-center gap-2.5 text-xs sm:text-sm font-admin-mono cursor-pointer">
          <input
            type="checkbox"
            checked={formData.isEnabled}
            onChange={(e) => setFormData({ ...formData, isEnabled: e.target.checked })}
            className="w-4.5 h-4.5 text-[#7C3AED] rounded border-[#E2E8F0]"
          />
          <span className="text-[#0F172A] font-semibold">CTA Banner Active and Displayed on Homepage</span>
        </label>

        <button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-2.5 px-6 py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs sm:text-sm font-admin-mono font-semibold rounded-sm shadow-sm cursor-pointer disabled:opacity-60 transition-all"
        >
          {isPending ? <FaRotateRight className="w-4 h-4 animate-spin" /> : <FaFloppyDisk className="w-4 h-4" />}
          <span>Save CTA Settings</span>
        </button>
      </div>
    </form>
  );
};
