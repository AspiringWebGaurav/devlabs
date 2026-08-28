"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { PhaseDocument } from "@/types/portfolio";
import {
  createPhaseAction,
  updatePhaseAction,
  deletePhaseAction,
  reorderPhasesAction,
} from "@/lib/actions/cms.actions";
import { broadcastClientCmsChange } from "@/lib/public-data/client-broadcast";
import { ButtonHelpBadge } from "@/components/admin/ui/ButtonHelpTooltip";
import { BUTTON_HELP } from "@/lib/admin/constants/button-help";
import { useAdminConfirm } from "@/components/admin/context";


import {
  FaPlus,
  FaPenToSquare,
  FaTrash,
  FaArrowUp,
  FaArrowDown,
  FaFloppyDisk,
  FaRotateRight,
  FaCheck,
  FaXmark,
} from "react-icons/fa6";

export const ApproachManager: React.FC<{ initialPhases: PhaseDocument[] }> = ({ initialPhases }) => {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const confirm = useAdminConfirm();
  const [phases, setPhases] = useState<PhaseDocument[]>(initialPhases);
  const [editingItem, setEditingItem] = useState<Partial<PhaseDocument> | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);


  // Sync state if server props change
  useEffect(() => {
    setPhases(initialPhases);
  }, [initialPhases]);

  // Real-time broadcast synchronization
  useEffect(() => {
    if (typeof window === "undefined" || !("BroadcastChannel" in window)) return;
    try {
      const channel = new BroadcastChannel("portfolio_cms_sync");
      channel.onmessage = (event) => {
        if (event.data?.domain === "approach" || event.data?.domain === "all") {
          startTransition(() => {
            router.refresh();
          });
        }
      };
      return () => channel.close();
    } catch {}
  }, [router]);

  const handleMove = async (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === phases.length - 1) return;

    const targetIndex = direction === "up" ? index - 1 : index + 1;
    const reordered = [...phases];
    const temp = reordered[index];
    reordered[index] = reordered[targetIndex];
    reordered[targetIndex] = temp;

    setPhases(reordered);
    setIsPending(true);

    const orderedIds = reordered.map((p) => p.id);
    const res = await reorderPhasesAction(orderedIds);
    setIsPending(false);

    if (res.success) {
      broadcastClientCmsChange("approach");
      startTransition(() => {
        router.refresh();
      });
      setStatusMessage({ type: "success", text: "Phases reordered successfully." });
    } else {
      setStatusMessage({ type: "error", text: res.error || "Failed to reorder." });
    }
  };

  const handleDelete = async (id: string, title: string) => {
    const confirmed = await confirm({
      title: `Delete Approach Phase "${title}"?`,
      description: `This will permanently remove "${title}" from the development methodology section on the live portfolio.`,
      variant: "danger",
      confirmLabel: "Delete Phase",
      cancelLabel: "Cancel",
    });
    if (!confirmed) return;

    setIsPending(true);

    const res = await deletePhaseAction(id);
    setIsPending(false);

    if (res.success) {
      setPhases((prev) => prev.filter((p) => p.id !== id));
      broadcastClientCmsChange("approach");
      startTransition(() => {
        router.refresh();
      });
      setStatusMessage({ type: "success", text: `Phase "${title}" deleted.` });
    } else {
      setStatusMessage({ type: "error", text: res.error || "Failed to delete." });
    }
  };


  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    setIsPending(true);
    setStatusMessage(null);

    const payload = {
      phaseBadge: editingItem.phaseBadge || `Phase ${phases.length + 1}`,
      title: editingItem.title || "",
      description: editingItem.description || "",
      themeColor: editingItem.themeColor || "emerald",
      animationSpeed: Math.max(0.1, Math.min(10.0, Number(editingItem.animationSpeed) || 3.0)),
      isPublished: editingItem.isPublished ?? true,
    };

    if (isCreating) {
      const res = await createPhaseAction(payload);
      setIsPending(false);
      if (res.success && res.data) {
        setPhases((prev) => [...prev, res.data as PhaseDocument]);
        setIsCreating(false);
        setEditingItem(null);
        broadcastClientCmsChange("approach");
        startTransition(() => {
          router.refresh();
        });
        setStatusMessage({ type: "success", text: "Phase created." });
      } else {
        setStatusMessage({ type: "error", text: res.error || "Failed to create." });
      }
    } else if (editingItem.id) {
      const res = await updatePhaseAction(editingItem.id, payload);
      setIsPending(false);
      if (res.success && res.data) {
        setPhases((prev) =>
          prev.map((p) => (p.id === editingItem.id ? (res.data as PhaseDocument) : p))
        );
        setEditingItem(null);
        broadcastClientCmsChange("approach");
        startTransition(() => {
          router.refresh();
        });
        setStatusMessage({ type: "success", text: "Phase updated." });
      } else {
        setStatusMessage({ type: "error", text: res.error || "Failed to update." });
      }
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

      <div className="flex items-center justify-between">
        <span className="text-xs font-admin-mono text-[#64748B]">
          {phases.length} Process Phases Configured
        </span>
        <button
          onClick={() => {
            setIsCreating(true);
            setEditingItem({
              title: "",
              phaseBadge: `Phase 0${phases.length + 1}`,
              description: "",
              themeColor: "emerald",
              animationSpeed: 3.0,
              isPublished: true,
            });
          }}
          className="flex items-center gap-2 px-3.5 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-admin-mono font-semibold rounded-sm shadow-sm cursor-pointer"
        >
          <FaPlus className="w-3 h-3" />
          <span>Add Process Phase</span>
          <ButtonHelpBadge text={BUTTON_HELP.CREATE_ITEM} />
        </button>
      </div>

      {editingItem && (
        <form
          onSubmit={handleSave}
          className="bg-[#FFFFFF] border-2 border-[#7C3AED] rounded-sm p-6 space-y-5 shadow-md animate-in fade-in duration-150"
        >
          <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
            <h2 className="text-base font-bold font-admin-sans text-black">
              {isCreating ? "Add Process Phase" : `Edit Phase: ${editingItem.title}`}
            </h2>
            <button
              type="button"
              onClick={() => {
                setEditingItem(null);
                setIsCreating(false);
              }}
              className="text-[#64748B] hover:text-black p-1"
            >
              <FaXmark className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-admin-mono uppercase tracking-wider text-[#64748B] font-semibold">
                Badge Label (Aceternity Icon)
              </label>
              <input
                type="text"
                value={editingItem.phaseBadge || ""}
                onChange={(e) => setEditingItem({ ...editingItem, phaseBadge: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-sm bg-[#FAFAFA]"
                placeholder="Phase 01"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-admin-mono uppercase tracking-wider text-[#64748B] font-semibold">
                Phase Title / Methodology
              </label>
              <input
                type="text"
                value={editingItem.title || ""}
                onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-sm bg-[#FAFAFA]"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-admin-mono uppercase tracking-wider text-[#64748B] font-semibold">
              Description & Strategy Execution
            </label>
            <textarea
              rows={3}
              value={editingItem.description || ""}
              onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-sm bg-[#FAFAFA]"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-admin-mono uppercase tracking-wider text-[#64748B] font-semibold">
                Theme Color Variant
              </label>
              <select
                value={editingItem.themeColor || "emerald"}
                onChange={(e) => setEditingItem({ ...editingItem, themeColor: e.target.value as PhaseDocument["themeColor"] })}
                className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-sm bg-[#FAFAFA]"
              >
                <option value="emerald">Emerald (Green Canvas)</option>
                <option value="violet">Violet (Purple Canvas)</option>
                <option value="cyan">Cyan (Sky Canvas)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-admin-mono uppercase tracking-wider text-[#64748B] font-semibold">
                Canvas Animation Speed
              </label>
              <input
                type="number"
                step="0.1"
                min="1.0"
                max="10.0"
                value={editingItem.animationSpeed || 3.0}
                onChange={(e) => setEditingItem({ ...editingItem, animationSpeed: Number(e.target.value) })}
                className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-sm bg-[#FAFAFA]"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-[#F1F5F9]">
            <label className="flex items-center gap-2 text-xs font-admin-mono cursor-pointer">
              <input
                type="checkbox"
                checked={editingItem.isPublished !== false}
                onChange={(e) => setEditingItem({ ...editingItem, isPublished: e.target.checked })}
                className="w-4 h-4 text-[#7C3AED] rounded"
              />
              <span>Published to Methodology Section</span>
            </label>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditingItem(null);
                  setIsCreating(false);
                }}
                className="px-4 py-2 border border-[#E2E8F0] text-xs font-admin-mono text-[#64748B] hover:text-black rounded-sm cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="flex items-center gap-2 px-5 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-admin-mono font-semibold rounded-sm shadow-sm cursor-pointer disabled:opacity-60"
              >
                {isPending ? <FaRotateRight className="w-3.5 h-3.5 animate-spin" /> : <FaFloppyDisk className="w-3.5 h-3.5" />}
                <span>{isCreating ? "Add Phase" : "Save Changes"}</span>
                <ButtonHelpBadge text={BUTTON_HELP.SAVE_AND_PUBLISH} />
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Phases List */}
      <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-sm overflow-hidden shadow-2xs divide-y divide-[#F1F5F9]">
        {phases.map((phase, index) => (
          <div key={phase.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#FAFAFA]">
            <div className="flex items-center gap-4">
              <span className="font-admin-mono text-xs font-bold text-[#94A3B8] w-6">0{index + 1}.</span>
              <span className="px-2.5 py-1 text-xs font-bold font-admin-mono bg-[#0F172A] text-[#CBACF9] rounded-full border border-white/20">
                {phase.phaseBadge}
              </span>
              <div>
                <h3 className="text-sm font-bold font-admin-sans text-black">
                  {phase.title}
                </h3>
                <p className="text-xs text-[#64748B] line-clamp-1 mt-0.5 max-w-xl">
                  {phase.description}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
              <button
                onClick={() => handleMove(index, "up")}
                disabled={index === 0 || isPending}
                className="p-2 border border-[#E2E8F0] rounded-sm text-[#64748B] hover:text-black disabled:opacity-30 cursor-pointer"
                title={BUTTON_HELP.MOVE_UP}
              >
                <FaArrowUp className="w-3 h-3" />
              </button>
              <button
                onClick={() => handleMove(index, "down")}
                disabled={index === phases.length - 1 || isPending}
                className="p-2 border border-[#E2E8F0] rounded-sm text-[#64748B] hover:text-black disabled:opacity-30 cursor-pointer"
                title={BUTTON_HELP.MOVE_DOWN}
              >
                <FaArrowDown className="w-3 h-3" />
              </button>
              <button
                onClick={() => {
                  setIsCreating(false);
                  setEditingItem(phase);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-admin-mono text-[#7C3AED] border border-[#DDD6FE] bg-[#F5F3FF] rounded-sm cursor-pointer"
              >
                <FaPenToSquare className="w-3 h-3" />
                <span>Edit</span>
                <ButtonHelpBadge text={BUTTON_HELP.EDIT_ITEM} />
              </button>
              <button
                onClick={() => handleDelete(phase.id, phase.title)}
                className="flex items-center gap-1 p-2 text-[#991B1B] bg-[#FEF2F2] border border-[#FCA5A5] rounded-sm cursor-pointer"
                title="Delete Process Phase"
              >
                <FaTrash className="w-3 h-3" />
                <ButtonHelpBadge text={BUTTON_HELP.DELETE_ITEM} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
