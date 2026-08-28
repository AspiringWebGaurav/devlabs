"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ExperienceDocument } from "@/types/portfolio";
import {
  createExperienceAction,
  updateExperienceAction,
  deleteExperienceAction,
  reorderExperienceAction,
} from "@/lib/actions/cms.actions";
import { broadcastClientCmsChange } from "@/lib/public-data/client-broadcast";
import { ButtonHelpBadge } from "@/components/admin/ui/ButtonHelpTooltip";
import { BUTTON_HELP } from "@/lib/admin/constants/button-help";

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

export const ExperienceManager: React.FC<{ initialExperience: ExperienceDocument[] }> = ({ initialExperience }) => {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [experience, setExperience] = useState<ExperienceDocument[]>(initialExperience);
  const [editingItem, setEditingItem] = useState<Partial<ExperienceDocument> | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Sync state if server props change
  useEffect(() => {
    setExperience(initialExperience);
  }, [initialExperience]);

  // Real-time broadcast synchronization
  useEffect(() => {
    if (typeof window === "undefined" || !("BroadcastChannel" in window)) return;
    try {
      const channel = new BroadcastChannel("portfolio_cms_sync");
      channel.onmessage = (event) => {
        if (event.data?.domain === "experience" || event.data?.domain === "all") {
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
    if (direction === "down" && index === experience.length - 1) return;

    const targetIndex = direction === "up" ? index - 1 : index + 1;
    const reordered = [...experience];
    const temp = reordered[index];
    reordered[index] = reordered[targetIndex];
    reordered[targetIndex] = temp;

    setExperience(reordered);
    setIsPending(true);

    const orderedIds = reordered.map((e) => e.id);
    const res = await reorderExperienceAction(orderedIds);
    setIsPending(false);

    if (res.success) {
      broadcastClientCmsChange("experience");
      startTransition(() => {
        router.refresh();
      });
      setStatusMessage({ type: "success", text: "Experience reordered successfully." });
    } else {
      setStatusMessage({ type: "error", text: res.error || "Failed to reorder." });
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Delete experience item "${title}"?`)) return;
    setIsPending(true);

    const res = await deleteExperienceAction(id);
    setIsPending(false);

    if (res.success) {
      setExperience((prev) => prev.filter((e) => e.id !== id));
      broadcastClientCmsChange("experience");
      startTransition(() => {
        router.refresh();
      });
      setStatusMessage({ type: "success", text: `Experience "${title}" deleted.` });
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
      title: editingItem.title || "",
      description: editingItem.description || "",
      company: editingItem.company || "",
      period: editingItem.period || "",
      thumbnailUrl: editingItem.thumbnailUrl || "/exp1.svg",
      thumbnailStoragePath: editingItem.thumbnailStoragePath || "",
      isPublished: editingItem.isPublished ?? true,
    };

    if (isCreating) {
      const res = await createExperienceAction(payload);
      setIsPending(false);
      if (res.success && res.data) {
        setExperience((prev) => [...prev, res.data as ExperienceDocument]);
        setIsCreating(false);
        setEditingItem(null);
        broadcastClientCmsChange("experience");
        startTransition(() => {
          router.refresh();
        });
        setStatusMessage({ type: "success", text: "Experience item created." });
      } else {
        setStatusMessage({ type: "error", text: res.error || "Failed to create." });
      }
    } else if (editingItem.id) {
      const res = await updateExperienceAction(editingItem.id, payload);
      setIsPending(false);
      if (res.success && res.data) {
        setExperience((prev) =>
          prev.map((e) => (e.id === editingItem.id ? (res.data as ExperienceDocument) : e))
        );
        setEditingItem(null);
        broadcastClientCmsChange("experience");
        startTransition(() => {
          router.refresh();
        });
        setStatusMessage({ type: "success", text: "Experience item updated." });
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
          {experience.length} Experience Cards Configured
        </span>
        <button
          onClick={() => {
            setIsCreating(true);
            setEditingItem({
              title: "",
              description: "",
              company: "Tech Labs",
              period: "2024 - Present",
              thumbnailUrl: "/exp1.svg",
              isPublished: true,
            });
          }}
          className="flex items-center gap-2 px-3.5 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-admin-mono font-semibold rounded-sm shadow-sm cursor-pointer"
        >
          <FaPlus className="w-3 h-3" />
          <span>Add Experience Card</span>
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
              {isCreating ? "Add Experience Card" : `Edit Experience: ${editingItem.title}`}
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
                Position Title
              </label>
              <input
                type="text"
                value={editingItem.title || ""}
                onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-sm bg-[#FAFAFA]"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-admin-mono uppercase tracking-wider text-[#64748B] font-semibold">
                Company / Organization
              </label>
              <input
                type="text"
                value={editingItem.company || ""}
                onChange={(e) => setEditingItem({ ...editingItem, company: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-sm bg-[#FAFAFA]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-admin-mono uppercase tracking-wider text-[#64748B] font-semibold">
                Time Period (e.g. 2023 - Present)
              </label>
              <input
                type="text"
                value={editingItem.period || ""}
                onChange={(e) => setEditingItem({ ...editingItem, period: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-sm bg-[#FAFAFA]"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-admin-mono uppercase tracking-wider text-[#64748B] font-semibold">
              Description / Responsibilities
            </label>
            <textarea
              rows={3}
              value={editingItem.description || ""}
              onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-sm bg-[#FAFAFA]"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-admin-mono uppercase tracking-wider text-[#64748B] font-semibold">
              Thumbnail Icon URL / Path
            </label>
            <input
              type="text"
              value={editingItem.thumbnailUrl || ""}
              onChange={(e) => setEditingItem({ ...editingItem, thumbnailUrl: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-sm bg-[#FAFAFA]"
              required
            />
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-[#F1F5F9]">
            <label className="flex items-center gap-2 text-xs font-admin-mono cursor-pointer">
              <input
                type="checkbox"
                checked={editingItem.isPublished !== false}
                onChange={(e) => setEditingItem({ ...editingItem, isPublished: e.target.checked })}
                className="w-4 h-4 text-[#7C3AED] rounded"
              />
              <span>Published to Experience Grid</span>
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
                <span>{isCreating ? "Add Experience" : "Save Changes"}</span>
                <ButtonHelpBadge text={BUTTON_HELP.SAVE_AND_PUBLISH} />
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Experience List */}
      <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-sm overflow-hidden shadow-2xs divide-y divide-[#F1F5F9]">
        {experience.map((exp, index) => (
          <div key={exp.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#FAFAFA]">
            <div className="flex items-center gap-4">
              <span className="font-admin-mono text-xs font-bold text-[#94A3B8] w-6">0{index + 1}.</span>
              <div className="w-10 h-10 rounded bg-[#04071D] border border-[#E2E8F0] p-1.5 flex items-center justify-center shrink-0">
                <img src={exp.thumbnailUrl} alt={exp.title} className="w-full h-full object-contain" />
              </div>
              <div>
                <h3 className="text-sm font-bold font-admin-sans text-black">
                  {exp.title} {exp.company && <span className="text-xs font-normal text-[#64748B]">@ {exp.company}</span>}
                </h3>
                <p className="text-xs text-[#64748B] line-clamp-1 mt-0.5 max-w-xl">
                  {exp.description}
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
                disabled={index === experience.length - 1 || isPending}
                className="p-2 border border-[#E2E8F0] rounded-sm text-[#64748B] hover:text-black disabled:opacity-30 cursor-pointer"
                title={BUTTON_HELP.MOVE_DOWN}
              >
                <FaArrowDown className="w-3 h-3" />
              </button>
              <button
                onClick={() => {
                  setIsCreating(false);
                  setEditingItem(exp);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-admin-mono text-[#7C3AED] border border-[#DDD6FE] bg-[#F5F3FF] rounded-sm cursor-pointer"
              >
                <FaPenToSquare className="w-3 h-3" />
                <span>Edit</span>
                <ButtonHelpBadge text={BUTTON_HELP.EDIT_ITEM} />
              </button>
              <button
                onClick={() => handleDelete(exp.id, exp.title)}
                className="flex items-center gap-1 p-2 text-[#991B1B] bg-[#FEF2F2] border border-[#FCA5A5] rounded-sm cursor-pointer"
                title="Delete Experience Item"
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
