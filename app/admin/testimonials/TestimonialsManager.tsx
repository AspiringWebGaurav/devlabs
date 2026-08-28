"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { TestimonialDocument } from "@/types/portfolio";
import {
  createTestimonialAction,
  updateTestimonialAction,
  deleteTestimonialAction,
  reorderTestimonialsAction,
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

export const TestimonialsManager: React.FC<{ initialTestimonials: TestimonialDocument[] }> = ({ initialTestimonials }) => {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [testimonials, setTestimonials] = useState<TestimonialDocument[]>(initialTestimonials);
  const [editingItem, setEditingItem] = useState<Partial<TestimonialDocument> | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Sync state if server props change
  useEffect(() => {
    setTestimonials(initialTestimonials);
  }, [initialTestimonials]);

  // Real-time broadcast synchronization
  useEffect(() => {
    if (typeof window === "undefined" || !("BroadcastChannel" in window)) return;
    try {
      const channel = new BroadcastChannel("portfolio_cms_sync");
      channel.onmessage = (event) => {
        if (event.data?.domain === "testimonials" || event.data?.domain === "all") {
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
    if (direction === "down" && index === testimonials.length - 1) return;

    const targetIndex = direction === "up" ? index - 1 : index + 1;
    const reordered = [...testimonials];
    const temp = reordered[index];
    reordered[index] = reordered[targetIndex];
    reordered[targetIndex] = temp;

    setTestimonials(reordered);
    setIsPending(true);

    const orderedIds = reordered.map((t) => t.id);
    const res = await reorderTestimonialsAction(orderedIds);
    setIsPending(false);

    if (res.success) {
      broadcastClientCmsChange("testimonials");
      startTransition(() => {
        router.refresh();
      });
      setStatusMessage({ type: "success", text: "Testimonials reordered successfully." });
    } else {
      setStatusMessage({ type: "error", text: res.error || "Failed to reorder." });
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete testimonial from "${name}"?`)) return;
    setIsPending(true);

    const res = await deleteTestimonialAction(id);
    setIsPending(false);

    if (res.success) {
      setTestimonials((prev) => prev.filter((t) => t.id !== id));
      broadcastClientCmsChange("testimonials");
      startTransition(() => {
        router.refresh();
      });
      setStatusMessage({ type: "success", text: `Testimonial from "${name}" deleted.` });
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
      name: editingItem.name || "",
      role: editingItem.role || "",
      company: editingItem.company || "",
      quote: editingItem.quote || "",
      avatarUrl: editingItem.avatarUrl || "/profile.svg",
      avatarStoragePath: editingItem.avatarStoragePath || "",
      isPublished: editingItem.isPublished ?? true,
    };

    if (isCreating) {
      const res = await createTestimonialAction(payload);
      setIsPending(false);
      if (res.success && res.data) {
        setTestimonials((prev) => [...prev, res.data as TestimonialDocument]);
        setIsCreating(false);
        setEditingItem(null);
        broadcastClientCmsChange("testimonials");
        startTransition(() => {
          router.refresh();
        });
        setStatusMessage({ type: "success", text: "Testimonial created." });
      } else {
        setStatusMessage({ type: "error", text: res.error || "Failed to create." });
      }
    } else if (editingItem.id) {
      const res = await updateTestimonialAction(editingItem.id, payload);
      setIsPending(false);
      if (res.success && res.data) {
        setTestimonials((prev) =>
          prev.map((t) => (t.id === editingItem.id ? (res.data as TestimonialDocument) : t))
        );
        setEditingItem(null);
        broadcastClientCmsChange("testimonials");
        startTransition(() => {
          router.refresh();
        });
        setStatusMessage({ type: "success", text: "Testimonial updated." });
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
          {testimonials.length} Testimonials in Rotation
        </span>
        <button
          onClick={() => {
            setIsCreating(true);
            setEditingItem({
              name: "",
              role: "Director of Technology",
              company: "Company Inc",
              quote: "",
              avatarUrl: "/profile.svg",
              isPublished: true,
            });
          }}
          className="flex items-center gap-2 px-3.5 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-admin-mono font-semibold rounded-sm shadow-sm cursor-pointer"
        >
          <FaPlus className="w-3 h-3" />
          <span>Add Testimonial</span>
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
              {isCreating ? "Add New Testimonial" : `Edit Testimonial: ${editingItem.name}`}
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="block text-xs font-admin-mono uppercase tracking-wider text-[#64748B] font-semibold">
                Client / Author Name
              </label>
              <input
                type="text"
                value={editingItem.name || ""}
                onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-sm bg-[#FAFAFA]"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-admin-mono uppercase tracking-wider text-[#64748B] font-semibold">
                Professional Role / Title
              </label>
              <input
                type="text"
                value={editingItem.role || ""}
                onChange={(e) => setEditingItem({ ...editingItem, role: e.target.value })}
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
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-admin-mono uppercase tracking-wider text-[#64748B] font-semibold">
                Avatar Image URL / Path
              </label>
              <input
                type="text"
                value={editingItem.avatarUrl || ""}
                onChange={(e) => setEditingItem({ ...editingItem, avatarUrl: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-sm bg-[#FAFAFA]"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-admin-mono uppercase tracking-wider text-[#64748B] font-semibold">
              Testimonial Quote / Recommendation
            </label>
            <textarea
              rows={4}
              value={editingItem.quote || ""}
              onChange={(e) => setEditingItem({ ...editingItem, quote: e.target.value })}
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
              <span>Published to Carousel</span>
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
                <span>{isCreating ? "Create Testimonial" : "Save Changes"}</span>
                <ButtonHelpBadge text={BUTTON_HELP.SAVE_AND_PUBLISH} />
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Testimonials List */}
      <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-sm overflow-hidden shadow-2xs divide-y divide-[#F1F5F9]">
        {testimonials.map((t, index) => (
          <div key={t.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#FAFAFA]">
            <div>
              <h3 className="text-sm font-bold font-admin-sans text-black flex items-center gap-2">
                {t.name}
                <span className="text-xs font-normal text-[#64748B] font-admin-mono">({t.role})</span>
              </h3>
              <p className="text-xs text-[#64748B] line-clamp-2 mt-1 max-w-2xl italic">
                &ldquo;{t.quote}&rdquo;
              </p>
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
                disabled={index === testimonials.length - 1 || isPending}
                className="p-2 border border-[#E2E8F0] rounded-sm text-[#64748B] hover:text-black disabled:opacity-30 cursor-pointer"
                title={BUTTON_HELP.MOVE_DOWN}
              >
                <FaArrowDown className="w-3 h-3" />
              </button>
              <button
                onClick={() => {
                  setIsCreating(false);
                  setEditingItem(t);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-admin-mono text-[#7C3AED] border border-[#DDD6FE] bg-[#F5F3FF] rounded-sm cursor-pointer"
              >
                <FaPenToSquare className="w-3 h-3" />
                <span>Edit</span>
                <ButtonHelpBadge text={BUTTON_HELP.EDIT_ITEM} />
              </button>
              <button
                onClick={() => handleDelete(t.id, t.name)}
                className="flex items-center gap-1 p-2 text-[#991B1B] bg-[#FEF2F2] border border-[#FCA5A5] rounded-sm cursor-pointer"
                title="Delete Testimonial"
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
