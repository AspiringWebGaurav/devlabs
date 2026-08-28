"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { NavigationDocument, NavItemConfig } from "@/types/portfolio";
import { updateNavigationAction } from "@/lib/actions/cms.actions";
import { broadcastClientCmsChange } from "@/lib/public-data/client-broadcast";
import { ButtonHelpBadge } from "@/components/admin/ui/ButtonHelpTooltip";
import { BUTTON_HELP } from "@/lib/admin/constants/button-help";

import {
  FaPlus,
  FaTrash,
  FaArrowUp,
  FaArrowDown,
  FaFloppyDisk,
  FaRotateRight,
  FaCheck,
} from "react-icons/fa6";

export const NavigationEditor: React.FC<{ initialData: NavigationDocument | null }> = ({ initialData }) => {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [items, setItems] = useState<NavItemConfig[]>(initialData?.items || []);
  const [isPending, setIsPending] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Sync state if server props change
  useEffect(() => {
    if (initialData?.items) {
      setItems(initialData.items);
    }
  }, [initialData]);

  // Real-time broadcast synchronization
  useEffect(() => {
    if (typeof window === "undefined" || !("BroadcastChannel" in window)) return;
    try {
      const channel = new BroadcastChannel("portfolio_cms_sync");
      channel.onmessage = (event) => {
        if (event.data?.domain === "navigation" || event.data?.domain === "all") {
          startTransition(() => {
            router.refresh();
          });
        }
      };
      return () => channel.close();
    } catch {}
  }, [router]);

  const handleMove = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === items.length - 1) return;

    const targetIndex = direction === "up" ? index - 1 : index + 1;
    const reordered = [...items];
    const temp = reordered[index];
    reordered[index] = reordered[targetIndex];
    reordered[targetIndex] = temp;

    setItems(reordered.map((item, idx) => ({ ...item, order: idx + 1 })));
  };

  const handleAddItem = () => {
    const newId = `nav_${Date.now()}`;
    setItems([
      ...items,
      {
        id: newId,
        name: "New Section",
        link: "#section",
        order: items.length + 1,
        isVisible: true,
      },
    ]);
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPending(true);
    setStatusMessage(null);

    const res = await updateNavigationAction({ items });
    setIsPending(false);

    if (res.success) {
      broadcastClientCmsChange("navigation");
      startTransition(() => {
        router.refresh();
      });
      setStatusMessage({ type: "success", text: "Navigation bar updated and live cache revalidated." });
    } else {
      setStatusMessage({ type: "error", text: res.error || "Failed to update navigation." });
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6 w-full">
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

      <div className="flex items-center justify-between">
        <span className="text-xs sm:text-sm font-admin-mono font-semibold text-[#475569]">
          {items.length} Floating Navigation Links
        </span>
        <button
          type="button"
          onClick={handleAddItem}
          className="flex items-center gap-2.5 px-4 py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs sm:text-sm font-admin-mono font-semibold rounded-sm shadow-sm cursor-pointer transition-all"
        >
          <FaPlus className="w-3.5 h-3.5" />
          <span>Add Nav Item</span>
          <ButtonHelpBadge text={BUTTON_HELP.CREATE_ITEM} />
        </button>
      </div>

      <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-sm p-6 sm:p-7 divide-y divide-[#F1F5F9] shadow-2xs space-y-4 w-full">
        {items.map((item, index) => (
          <div key={item.id} className="pt-4 first:pt-0 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <span className="font-admin-mono text-sm font-bold text-[#64748B] w-8">
              0{index + 1}.
            </span>

            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
              <input
                type="text"
                value={item.name}
                onChange={(e) => {
                  const val = e.target.value;
                  setItems(items.map((it) => (it.id === item.id ? { ...it, name: val } : it)));
                }}
                className="px-3.5 py-2.5 text-sm border border-[#E2E8F0] rounded-sm bg-[#FAFAFA] focus:bg-[#FFFFFF] focus:ring-1 focus:ring-[#7C3AED] focus:border-[#7C3AED] transition-all"
                placeholder="Link Label (e.g. About)"
                required
              />
              <input
                type="text"
                value={item.link}
                onChange={(e) => {
                  const val = e.target.value;
                  setItems(items.map((it) => (it.id === item.id ? { ...it, link: val } : it)));
                }}
                className="px-3.5 py-2.5 text-sm border border-[#E2E8F0] rounded-sm bg-[#FAFAFA] focus:bg-[#FFFFFF] focus:ring-1 focus:ring-[#7C3AED] focus:border-[#7C3AED] transition-all"
                placeholder="Target (#about, /projects)"
                required
              />
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <label className="flex items-center gap-2 text-xs sm:text-sm font-admin-mono text-[#0F172A] font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={item.isVisible !== false}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setItems(items.map((it) => (it.id === item.id ? { ...it, isVisible: checked } : it)));
                  }}
                  className="w-4.5 h-4.5 text-[#7C3AED] rounded"
                />
                <span>Visible</span>
              </label>

              <button
                type="button"
                onClick={() => handleMove(index, "up")}
                disabled={index === 0}
                className="p-2 border border-[#E2E8F0] rounded-sm text-[#64748B] hover:text-black disabled:opacity-30 cursor-pointer"
                title={BUTTON_HELP.MOVE_UP}
              >
                <FaArrowUp className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleMove(index, "down")}
                disabled={index === items.length - 1}
                className="p-2 border border-[#E2E8F0] rounded-sm text-[#64748B] hover:text-black disabled:opacity-30 cursor-pointer"
                title={BUTTON_HELP.MOVE_DOWN}
              >
                <FaArrowDown className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleRemoveItem(item.id)}
                className="flex items-center gap-1 p-2 text-[#991B1B] bg-[#FEF2F2] border border-[#FCA5A5] rounded-sm cursor-pointer hover:bg-[#FEE2E2]"
                title="Delete Navigation Item"
              >
                <FaTrash className="w-3.5 h-3.5" />
                <ButtonHelpBadge text={BUTTON_HELP.DELETE_ITEM} />
              </button>
            </div>
          </div>
        ))}
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
              <span>Save Navigation Config</span>
              <ButtonHelpBadge text={BUTTON_HELP.SAVE_AND_PUBLISH} />
            </>
          )}
        </button>
      </div>

    </form>
  );
};
