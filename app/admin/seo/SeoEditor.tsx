"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { SeoDocument } from "@/types/portfolio";
import { updateSeoAction } from "@/lib/actions/cms.actions";
import { broadcastClientCmsChange } from "@/lib/public-data/client-broadcast";
import { ButtonHelpBadge } from "@/components/admin/ui/ButtonHelpTooltip";
import { BUTTON_HELP } from "@/lib/admin/constants/button-help";

import { FaCheck, FaRotateRight, FaFloppyDisk } from "react-icons/fa6";

export const SeoEditor: React.FC<{ initialData: SeoDocument | null }> = ({ initialData }) => {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [formData, setFormData] = useState({
    title: initialData?.title || "Gaurav's Portfolio",
    description: initialData?.description || "Modern, Slick and Minimalist Developer Portfolio",
    canonicalUrl: initialData?.canonicalUrl || "https://gauravpatil.site",
    ogImageUrl: initialData?.ogImageUrl || "",
    keywords: (initialData?.keywords || ["Developer", "Portfolio", "Frontend", "Next.js"]).join(", "),
    author: initialData?.author || "Gaurav Patil",
    twitterHandle: initialData?.twitterHandle || "@gauravpatil",
  });

  const [isPending, setIsPending] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Sync state if server props change
  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title || "Gaurav's Portfolio",
        description: initialData.description || "Modern, Slick and Minimalist Developer Portfolio",
        canonicalUrl: initialData.canonicalUrl || "https://gauravpatil.site",
        ogImageUrl: initialData.ogImageUrl || "",
        keywords: (initialData.keywords || ["Developer", "Portfolio", "Frontend", "Next.js"]).join(", "),
        author: initialData.author || "Gaurav Patil",
        twitterHandle: initialData.twitterHandle || "@gauravpatil",
      });
    }
  }, [initialData]);

  // Real-time broadcast synchronization
  useEffect(() => {
    if (typeof window === "undefined" || !("BroadcastChannel" in window)) return;
    try {
      const channel = new BroadcastChannel("portfolio_cms_sync");
      channel.onmessage = (event) => {
        if (event.data?.domain === "seo" || event.data?.domain === "all") {
          startTransition(() => {
            router.refresh();
          });
        }
      };
      return () => channel.close();
    } catch {}
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPending(true);
    setStatusMessage(null);

    const payload = {
      title: formData.title,
      description: formData.description,
      canonicalUrl: formData.canonicalUrl,
      ogImageUrl: formData.ogImageUrl,
      keywords: formData.keywords.split(",").map((s) => s.trim()).filter(Boolean),
      author: formData.author,
      twitterHandle: formData.twitterHandle,
    };

    const res = await updateSeoAction(payload);
    setIsPending(false);

    if (res.success) {
      broadcastClientCmsChange("seo");
      startTransition(() => {
        router.refresh();
      });
      setStatusMessage({ type: "success", text: "SEO metadata saved and live tags revalidated." });
    } else {
      setStatusMessage({ type: "error", text: res.error || "Failed to update SEO." });
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
          Meta Titles & Canonical URL
        </h2>

        <div className="space-y-2">
          <label className="block text-xs font-admin-mono uppercase tracking-wider text-[#475569] font-bold">
            Meta Page Title Tag
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-3.5 py-2.5 text-sm border border-[#E2E8F0] rounded-sm bg-[#FAFAFA] focus:bg-[#FFFFFF] focus:ring-1 focus:ring-[#7C3AED] focus:border-[#7C3AED] transition-all"
            placeholder="Gaurav's Portfolio"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-admin-mono uppercase tracking-wider text-[#475569] font-bold">
            Meta Description (Search Snippet)
          </label>
          <textarea
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-3.5 py-2.5 text-sm border border-[#E2E8F0] rounded-sm bg-[#FAFAFA] focus:bg-[#FFFFFF] focus:ring-1 focus:ring-[#7C3AED] focus:border-[#7C3AED] transition-all"
            placeholder="Modern, Slick and Minimalist Developer Portfolio"
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="block text-xs font-admin-mono uppercase tracking-wider text-[#475569] font-bold">
              Canonical Domain Base URL (Strictly HTTPS)
            </label>
            <input
              type="url"
              value={formData.canonicalUrl}
              onChange={(e) => setFormData({ ...formData, canonicalUrl: e.target.value })}
              className="w-full px-3.5 py-2.5 text-sm border border-[#E2E8F0] rounded-sm bg-[#FAFAFA] focus:bg-[#FFFFFF] focus:ring-1 focus:ring-[#7C3AED] focus:border-[#7C3AED] transition-all"
              placeholder="https://gauravpatil.site"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-admin-mono uppercase tracking-wider text-[#475569] font-bold">
              Author Name
            </label>
            <input
              type="text"
              value={formData.author}
              onChange={(e) => setFormData({ ...formData, author: e.target.value })}
              className="w-full px-3.5 py-2.5 text-sm border border-[#E2E8F0] rounded-sm bg-[#FAFAFA] focus:bg-[#FFFFFF] focus:ring-1 focus:ring-[#7C3AED] focus:border-[#7C3AED] transition-all"
              placeholder="Gaurav Patil"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-admin-mono uppercase tracking-wider text-[#475569] font-bold">
            Meta Keywords (comma-separated)
          </label>
          <input
            type="text"
            value={formData.keywords}
            onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
            className="w-full px-3.5 py-2.5 text-sm border border-[#E2E8F0] rounded-sm bg-[#FAFAFA] focus:bg-[#FFFFFF] focus:ring-1 focus:ring-[#7C3AED] focus:border-[#7C3AED] transition-all"
            placeholder="Developer, Portfolio, Next.js, Frontend"
          />
        </div>
      </div>

      <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-sm p-6 sm:p-7 space-y-6 shadow-2xs w-full">
        <h2 className="text-lg font-bold font-admin-sans text-black border-b border-[#F1F5F9] pb-3.5">
          Social Sharing (Open Graph & Twitter Cards)
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="block text-xs font-admin-mono uppercase tracking-wider text-[#475569] font-bold">
              Open Graph OG Image URL
            </label>
            <input
              type="text"
              value={formData.ogImageUrl}
              onChange={(e) => setFormData({ ...formData, ogImageUrl: e.target.value })}
              className="w-full px-3.5 py-2.5 text-sm border border-[#E2E8F0] rounded-sm bg-[#FAFAFA] focus:bg-[#FFFFFF] focus:ring-1 focus:ring-[#7C3AED] focus:border-[#7C3AED] transition-all"
              placeholder="https://.../og-banner.png"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-admin-mono uppercase tracking-wider text-[#475569] font-bold">
              Twitter / X Creator Handle
            </label>
            <input
              type="text"
              value={formData.twitterHandle}
              onChange={(e) => setFormData({ ...formData, twitterHandle: e.target.value })}
              className="w-full px-3.5 py-2.5 text-sm border border-[#E2E8F0] rounded-sm bg-[#FAFAFA] focus:bg-[#FFFFFF] focus:ring-1 focus:ring-[#7C3AED] focus:border-[#7C3AED] transition-all"
              placeholder="@gauravpatil"
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
          {isPending ? (
            <>
              <FaRotateRight className="w-4 h-4 animate-spin" />
              <span>Saving Changes...</span>
            </>
          ) : (
            <>
              <FaFloppyDisk className="w-4 h-4" />
              <span>Save SEO Configuration</span>
              <ButtonHelpBadge text={BUTTON_HELP.SAVE_AND_PUBLISH} />
            </>
          )}
        </button>
      </div>

    </form>
  );
};
