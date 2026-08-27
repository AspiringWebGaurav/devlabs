"use client";

import React, { useState } from "react";
import type { HeroDocument } from "@/types/portfolio";
import { updateHeroAction } from "@/lib/actions/cms.actions";
import { FaCheck, FaRotateRight, FaFloppyDisk } from "react-icons/fa6";

import { broadcastClientCmsChange } from "@/lib/public-data/client-broadcast";

export const HeroEditor: React.FC<{ initialData: HeroDocument | null }> = ({ initialData }) => {
  const [formData, setFormData] = useState({
    eyebrow: initialData?.eyebrow || "",
    headingWords: initialData?.headingWords || "",
    description: initialData?.description || "",
    ctaTitle: initialData?.ctaTitle || "",
    ctaLink: initialData?.ctaLink || "",
    scrollText: initialData?.scrollText || "",
    isPublished: initialData?.isPublished !== false,
  });

  const [isPending, setIsPending] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPending(true);
    setStatusMessage(null);

    const res = await updateHeroAction(formData);
    setIsPending(false);

    if (res.success) {
      broadcastClientCmsChange("hero", (res.data as HeroDocument | undefined)?.version);
      setStatusMessage({ type: "success", text: "Hero section published and live cache revalidated successfully." });
    } else {
      setStatusMessage({ type: "error", text: res.error || "Failed to update Hero section." });
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
          Headline & Introduction Copy
        </h2>

        <div className="space-y-2">
          <label className="block text-xs font-admin-mono uppercase tracking-wider text-[#475569] font-bold">
            Eyebrow / Badge Text
          </label>
          <input
            type="text"
            value={formData.eyebrow}
            onChange={(e) => setFormData({ ...formData, eyebrow: e.target.value })}
            className="w-full px-3.5 py-2.5 text-sm border border-[#E2E8F0] rounded-sm bg-[#FAFAFA] focus:bg-[#FFFFFF] focus:outline-hidden focus:ring-1 focus:ring-[#7C3AED] focus:border-[#7C3AED] transition-all"
            placeholder="Dynamic Web Magic with Next.js"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-admin-mono uppercase tracking-wider text-[#475569] font-bold">
            Main Heading Words (Aceternity Animated Text)
          </label>
          <textarea
            rows={2}
            value={formData.headingWords}
            onChange={(e) => setFormData({ ...formData, headingWords: e.target.value })}
            className="w-full px-3.5 py-2.5 text-sm border border-[#E2E8F0] rounded-sm bg-[#FAFAFA] focus:bg-[#FFFFFF] focus:outline-hidden focus:ring-1 focus:ring-[#7C3AED] focus:border-[#7C3AED] transition-all"
            placeholder="Transforming Concepts into Seamless User Experiences"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-admin-mono uppercase tracking-wider text-[#475569] font-bold">
            Bio Subtitle / Description
          </label>
          <textarea
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-3.5 py-2.5 text-sm border border-[#E2E8F0] rounded-sm bg-[#FAFAFA] focus:bg-[#FFFFFF] focus:outline-hidden focus:ring-1 focus:ring-[#7C3AED] focus:border-[#7C3AED] transition-all"
            placeholder="Hi! I'm Gaurav, a Front-End Developer based in India."
            required
          />
        </div>
      </div>

      <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-sm p-6 sm:p-7 space-y-6 shadow-2xs w-full">
        <h2 className="text-lg font-bold font-admin-sans text-black border-b border-[#F1F5F9] pb-3.5">
          Hero Call-to-Action & Micro-Interactions
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="block text-xs font-admin-mono uppercase tracking-wider text-[#475569] font-bold">
              CTA Button Label
            </label>
            <input
              type="text"
              value={formData.ctaTitle}
              onChange={(e) => setFormData({ ...formData, ctaTitle: e.target.value })}
              className="w-full px-3.5 py-2.5 text-sm border border-[#E2E8F0] rounded-sm bg-[#FAFAFA] focus:bg-[#FFFFFF] focus:outline-hidden focus:ring-1 focus:ring-[#7C3AED] focus:border-[#7C3AED] transition-all"
              placeholder="Show my work"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-admin-mono uppercase tracking-wider text-[#475569] font-bold">
              CTA Target Link
            </label>
            <input
              type="text"
              value={formData.ctaLink}
              onChange={(e) => setFormData({ ...formData, ctaLink: e.target.value })}
              className="w-full px-3.5 py-2.5 text-sm border border-[#E2E8F0] rounded-sm bg-[#FAFAFA] focus:bg-[#FFFFFF] focus:outline-hidden focus:ring-1 focus:ring-[#7C3AED] focus:border-[#7C3AED] transition-all"
              placeholder="#about or /about"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-admin-mono uppercase tracking-wider text-[#475569] font-bold">
            Scroll Indicator Label
          </label>
          <input
            type="text"
            value={formData.scrollText}
            onChange={(e) => setFormData({ ...formData, scrollText: e.target.value })}
            className="w-full px-3.5 py-2.5 text-sm border border-[#E2E8F0] rounded-sm bg-[#FAFAFA] focus:bg-[#FFFFFF] focus:outline-hidden focus:ring-1 focus:ring-[#7C3AED] focus:border-[#7C3AED] transition-all"
            placeholder="Scroll Down"
            required
          />
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-2.5">
          <input
            type="checkbox"
            id="hero-is-published"
            checked={formData.isPublished}
            onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
            className="w-4.5 h-4.5 text-[#7C3AED] rounded border-[#E2E8F0]"
          />
          <label htmlFor="hero-is-published" className="text-xs sm:text-sm font-admin-mono text-[#0F172A] font-semibold cursor-pointer">
            Published to Live Public Homepage
          </label>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-2.5 px-6 py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs sm:text-sm font-admin-mono font-semibold rounded-sm shadow-sm transition-all cursor-pointer disabled:opacity-60"
        >
          {isPending ? (
            <>
              <FaRotateRight className="w-4 h-4 animate-spin" />
              <span>Saving Changes...</span>
            </>
          ) : (
            <>
              <FaFloppyDisk className="w-4 h-4" />
              <span>Save Hero Changes</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
};
