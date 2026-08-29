"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AssistantDocument, AssistantPositionMode } from "@/types/portfolio";
import { updateAssistantAction } from "@/lib/actions/cms.actions";
import { broadcastClientCmsChange } from "@/lib/public-data/client-broadcast";
import { ButtonHelpBadge } from "@/components/admin/ui/ButtonHelpTooltip";
import { BUTTON_HELP } from "@/lib/admin/constants/button-help";
import { FaCheck, FaRotateRight, FaFloppyDisk, FaCommentDots, FaLocationDot, FaHandPointer } from "react-icons/fa6";

export const AssistantEditor: React.FC<{ initialData: AssistantDocument | null }> = ({ initialData }) => {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [formData, setFormData] = useState({
    isEnabled: initialData?.isEnabled !== false,
    positionMode: (initialData?.positionMode as AssistantPositionMode) || "fixed",
  });

  const [isPending, setIsPending] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Sync state if server props change
  useEffect(() => {
    if (initialData) {
      setFormData({
        isEnabled: initialData.isEnabled !== false,
        positionMode: (initialData.positionMode as AssistantPositionMode) || "fixed",
      });
    }
  }, [initialData]);

  // Real-time broadcast synchronization
  useEffect(() => {
    if (typeof window === "undefined" || !("BroadcastChannel" in window)) return;
    try {
      const channel = new BroadcastChannel("portfolio_cms_sync");
      channel.onmessage = (event) => {
        if (event.data?.domain === "assistant" || event.data?.domain === "all") {
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
      isEnabled: formData.isEnabled,
      assistantName: initialData?.assistantName || "Gaurav Personal Assistant",
      avatarUrl: initialData?.avatarUrl || "",
      positionMode: formData.positionMode,
      expectedVersion: initialData?.version,
    };

    const res = await updateAssistantAction(payload);
    setIsPending(false);

    if (res.success) {
      broadcastClientCmsChange("assistant", (res.data as AssistantDocument | undefined)?.version);
      startTransition(() => {
        router.refresh();
      });
      setStatusMessage({ type: "success", text: "Assistant bubble settings updated and live cache revalidated." });
    } else {
      setStatusMessage({ type: "error", text: res.error || "Failed to update Assistant settings." });
    }
  };

  const handleReset = () => {
    if (initialData) {
      setFormData({
        isEnabled: initialData.isEnabled !== false,
        positionMode: (initialData.positionMode as AssistantPositionMode) || "fixed",
      });
      setStatusMessage(null);
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

      {/* Unified Assistant Bubble Settings Card */}
      <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-sm p-6 sm:p-7 space-y-6 shadow-2xs w-full">
        <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-sm bg-[#F5F3FF] border border-[#DDD6FE] flex items-center justify-center text-[#7C3AED]">
              <FaCommentDots className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold font-admin-sans text-black">
                Personal Assistant Bubble
              </h2>
              <p className="text-xs font-admin-mono text-[#64748B]">
                Manage floating assistant bubble visibility and visitor positioning mode
              </p>
            </div>
          </div>
        </div>

        {/* 1. Master Enable / Disable Toggle */}
        <div className="flex items-center justify-between p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-sm">
          <div className="space-y-0.5">
            <label htmlFor="assistant-toggle" className="text-sm font-bold font-admin-sans text-black cursor-pointer">
              Enable Personal Assistant Bubble
            </label>
            <p className="text-xs font-admin-mono text-[#64748B]">
              When enabled, the floating assistant bubble is rendered on the public portfolio.
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer select-none">
            <input
              id="assistant-toggle"
              type="checkbox"
              checked={formData.isEnabled}
              onChange={(e) => setFormData({ ...formData, isEnabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-[#CBD5E1] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#CBD5E1] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#7C3AED]" />
          </label>
        </div>

        {/* 2. Positioning Mode */}
        <div className="space-y-3 pt-2">
          <div>
            <span className="block text-xs font-bold font-admin-mono text-[#334155] uppercase tracking-wider">
              Bubble Positioning Mode
            </span>
            <p className="text-xs font-admin-mono text-[#64748B] mt-0.5">
              Choose how the floating launcher bubble behaves on the visitor&apos;s screen
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Fixed Mode Option */}
            <label
              className={`p-4 rounded-sm border cursor-pointer transition-all flex items-start gap-3.5 ${
                formData.positionMode === "fixed"
                  ? "bg-[#F5F3FF] border-[#7C3AED] shadow-2xs"
                  : "bg-[#FFFFFF] border-[#E2E8F0] hover:border-[#CBD5E1] hover:bg-[#F8FAFC]"
              }`}
            >
              <input
                type="radio"
                name="positionMode"
                value="fixed"
                checked={formData.positionMode === "fixed"}
                onChange={() => setFormData({ ...formData, positionMode: "fixed" })}
                className="mt-0.5 text-[#7C3AED] focus:ring-[#7C3AED]"
              />
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <FaLocationDot className="w-3.5 h-3.5 text-[#7C3AED]" />
                  <span className="text-xs font-bold font-admin-mono text-black uppercase tracking-wider">
                    Fixed Anchor (Default)
                  </span>
                </div>
                <p className="text-xs font-admin-sans text-[#64748B] leading-relaxed">
                  Locks the bubble to the standard safe-area-aware bottom-right corner.
                </p>
              </div>
            </label>

            {/* Draggable Mode Option */}
            <label
              className={`p-4 rounded-sm border cursor-pointer transition-all flex items-start gap-3.5 ${
                formData.positionMode === "draggable"
                  ? "bg-[#F5F3FF] border-[#7C3AED] shadow-2xs"
                  : "bg-[#FFFFFF] border-[#E2E8F0] hover:border-[#CBD5E1] hover:bg-[#F8FAFC]"
              }`}
            >
              <input
                type="radio"
                name="positionMode"
                value="draggable"
                checked={formData.positionMode === "draggable"}
                onChange={() => setFormData({ ...formData, positionMode: "draggable" })}
                className="mt-0.5 text-[#7C3AED] focus:ring-[#7C3AED]"
              />
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <FaHandPointer className="w-3.5 h-3.5 text-[#7C3AED]" />
                  <span className="text-xs font-bold font-admin-mono text-black uppercase tracking-wider">
                    Draggable Launcher
                  </span>
                </div>
                <p className="text-xs font-admin-sans text-[#64748B] leading-relaxed">
                  Allows visitors to drag and reposition the launcher anywhere within safe viewport bounds.
                </p>
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={handleReset}
          disabled={isPending}
          className="px-4 py-2.5 text-xs font-admin-mono font-semibold text-[#475569] hover:text-black bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#E2E8F0] rounded-sm transition-colors cursor-pointer flex items-center gap-2 disabled:opacity-50 shadow-2xs"
        >
          <FaRotateRight className="w-3.5 h-3.5" />
          <span>Reset Changes</span>
          <ButtonHelpBadge text={BUTTON_HELP.RESET_CHANGES} position="top" />
        </button>

        <button
          type="submit"
          disabled={isPending}
          className="px-6 py-2.5 text-xs font-admin-mono font-bold text-white bg-[#7C3AED] hover:bg-[#6D28D9] border border-[#7C3AED] rounded-sm transition-all duration-150 cursor-pointer flex items-center gap-2 disabled:opacity-50 shadow-2xs active:scale-[0.99]"
        >
          {isPending ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <FaFloppyDisk className="w-3.5 h-3.5" />
              <span>Save Assistant Settings</span>
              <ButtonHelpBadge text={BUTTON_HELP.SAVE_AND_PUBLISH} position="top" />
            </>
          )}
        </button>
      </div>
    </form>
  );
};
