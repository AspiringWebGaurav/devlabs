"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { SocialLinkDocument } from "@/types/portfolio";
import {
  createSocialLinkAction,
  updateSocialLinkAction,
  deleteSocialLinkAction,
  reorderSocialLinksAction,
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

export const SocialManager: React.FC<{ initialLinks: SocialLinkDocument[] }> = ({ initialLinks }) => {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const confirm = useAdminConfirm();
  const [links, setLinks] = useState<SocialLinkDocument[]>(initialLinks);
  const [editingItem, setEditingItem] = useState<Partial<SocialLinkDocument> | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);


  // Sync state if server props change
  useEffect(() => {
    setLinks(initialLinks);
  }, [initialLinks]);

  // Real-time broadcast synchronization
  useEffect(() => {
    if (typeof window === "undefined" || !("BroadcastChannel" in window)) return;
    try {
      const channel = new BroadcastChannel("portfolio_cms_sync");
      channel.onmessage = (event) => {
        if (event.data?.domain === "social" || event.data?.domain === "all") {
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
    if (direction === "down" && index === links.length - 1) return;

    const targetIndex = direction === "up" ? index - 1 : index + 1;
    const reordered = [...links];
    const temp = reordered[index];
    reordered[index] = reordered[targetIndex];
    reordered[targetIndex] = temp;

    setLinks(reordered);
    setIsPending(true);

    const orderedIds = reordered.map((l) => l.id);
    const res = await reorderSocialLinksAction(orderedIds);
    setIsPending(false);

    if (res.success) {
      broadcastClientCmsChange("social");
      startTransition(() => {
        router.refresh();
      });
      setStatusMessage({ type: "success", text: "Social links reordered successfully." });
    } else {
      setStatusMessage({ type: "error", text: res.error || "Failed to reorder." });
    }
  };

  const handleDelete = async (id: string, platform: string) => {
    const confirmed = await confirm({
      title: `Delete Social Link "${platform}"?`,
      description: `This will permanently remove the social profile link for "${platform}" from the live portfolio navigation and footer.`,
      variant: "danger",
      confirmLabel: "Delete Social Link",
      cancelLabel: "Cancel",
    });
    if (!confirmed) return;

    setIsPending(true);

    const res = await deleteSocialLinkAction(id);
    setIsPending(false);

    if (res.success) {
      setLinks((prev) => prev.filter((l) => l.id !== id));
      broadcastClientCmsChange("social");
      startTransition(() => {
        router.refresh();
      });
      setStatusMessage({ type: "success", text: `Social link "${platform}" deleted.` });
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
      platform: editingItem.platform || "",
      url: editingItem.url || "",
      iconType: editingItem.iconType || "preset",
      presetName: editingItem.presetName || "github",
      customPathD: editingItem.customPathD || "",
      isPublished: editingItem.isPublished ?? true,
    };

    if (isCreating) {
      const res = await createSocialLinkAction(payload);
      setIsPending(false);
      if (res.success && res.data) {
        setLinks((prev) => [...prev, res.data as SocialLinkDocument]);
        setIsCreating(false);
        setEditingItem(null);
        broadcastClientCmsChange("social");
        startTransition(() => {
          router.refresh();
        });
        setStatusMessage({ type: "success", text: "Social link added." });
      } else {
        setStatusMessage({ type: "error", text: res.error || "Failed to create." });
      }
    } else if (editingItem.id) {
      const res = await updateSocialLinkAction(editingItem.id, payload);
      setIsPending(false);
      if (res.success && res.data) {
        setLinks((prev) =>
          prev.map((l) => (l.id === editingItem.id ? (res.data as SocialLinkDocument) : l))
        );
        setEditingItem(null);
        broadcastClientCmsChange("social");
        startTransition(() => {
          router.refresh();
        });
        setStatusMessage({ type: "success", text: "Social link updated." });
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
          {links.length} Social Profiles Active
        </span>
        <button
          onClick={() => {
            setIsCreating(true);
            setEditingItem({
              platform: "",
              url: "https://",
              iconType: "preset",
              presetName: "github",
              isPublished: true,
            });
          }}
          className="flex items-center gap-2 px-3.5 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-admin-mono font-semibold rounded-sm shadow-sm cursor-pointer"
        >
          <FaPlus className="w-3 h-3" />
          <span>Add Social Link</span>
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
              {isCreating ? "Add Social Profile" : `Edit Profile: ${editingItem.platform}`}
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
                Platform Name
              </label>
              <input
                type="text"
                value={editingItem.platform || ""}
                onChange={(e) => setEditingItem({ ...editingItem, platform: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-sm bg-[#FAFAFA]"
                placeholder="GitHub, Twitter, LinkedIn"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-admin-mono uppercase tracking-wider text-[#64748B] font-semibold">
                Profile URL (Strictly HTTPS)
              </label>
              <input
                type="url"
                value={editingItem.url || ""}
                onChange={(e) => setEditingItem({ ...editingItem, url: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-sm bg-[#FAFAFA]"
                placeholder="https://..."
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-admin-mono uppercase tracking-wider text-[#64748B] font-semibold">
                Icon Representation
              </label>
              <select
                value={editingItem.iconType || "preset"}
                onChange={(e) =>
                  setEditingItem({
                    ...editingItem,
                    iconType: e.target.value as "preset" | "custom_path",
                  })
                }
                className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-sm bg-[#FAFAFA]"
              >
                <option value="preset">Pre-packaged Icon (GitHub, Twitter, LinkedIn)</option>
                <option value="custom_path">Custom SVG Path Coordinate Commands (&apos;d&apos;)</option>
              </select>
            </div>

            {editingItem.iconType === "preset" ? (
              <div className="space-y-1.5">
                <label className="block text-xs font-admin-mono uppercase tracking-wider text-[#64748B] font-semibold">
                  Preset Icon Selection
                </label>
                <select
                  value={editingItem.presetName || "github"}
                  onChange={(e) =>
                    setEditingItem({
                      ...editingItem,
                      presetName: e.target.value as "github" | "twitter" | "linkedin",
                    })
                  }
                  className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-sm bg-[#FAFAFA]"
                >
                  <option value="github">GitHub</option>
                  <option value="twitter">Twitter / X</option>
                  <option value="linkedin">LinkedIn</option>
                </select>
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="block text-xs font-admin-mono uppercase tracking-wider text-[#64748B] font-semibold">
                  SVG Path &apos;d&apos; String (Strictly path commands)
                </label>
                <input
                  type="text"
                  value={editingItem.customPathD || ""}
                  onChange={(e) => setEditingItem({ ...editingItem, customPathD: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-sm bg-[#FAFAFA] font-mono text-xs"
                  placeholder="M12 2C6.477 2 2 6.484..."
                />
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-[#F1F5F9]">
            <label className="flex items-center gap-2 text-xs font-admin-mono cursor-pointer">
              <input
                type="checkbox"
                checked={editingItem.isPublished !== false}
                onChange={(e) => setEditingItem({ ...editingItem, isPublished: e.target.checked })}
                className="w-4 h-4 text-[#7C3AED] rounded"
              />
              <span>Published to Footer</span>
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
                <span>{isCreating ? "Add Link" : "Save Changes"}</span>
                <ButtonHelpBadge text={BUTTON_HELP.SAVE_AND_PUBLISH} />
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Social Links List */}
      <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-sm overflow-hidden shadow-2xs divide-y divide-[#F1F5F9]">
        {links.map((link, index) => (
          <div key={link.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#FAFAFA]">
            <div className="flex items-center gap-4">
              <span className="font-admin-mono text-xs font-bold text-[#94A3B8] w-6">0{index + 1}.</span>
              <div>
                <h3 className="text-sm font-bold font-admin-sans text-black">
                  {link.platform}
                </h3>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#7C3AED] hover:underline font-mono"
                >
                  {link.url}
                </a>
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
                disabled={index === links.length - 1 || isPending}
                className="p-2 border border-[#E2E8F0] rounded-sm text-[#64748B] hover:text-black disabled:opacity-30 cursor-pointer"
                title={BUTTON_HELP.MOVE_DOWN}
              >
                <FaArrowDown className="w-3 h-3" />
              </button>
              <button
                onClick={() => {
                  setIsCreating(false);
                  setEditingItem(link);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-admin-mono text-[#7C3AED] border border-[#DDD6FE] bg-[#F5F3FF] rounded-sm cursor-pointer"
              >
                <FaPenToSquare className="w-3 h-3" />
                <span>Edit</span>
                <ButtonHelpBadge text={BUTTON_HELP.EDIT_ITEM} />
              </button>
              <button
                onClick={() => handleDelete(link.id, link.platform)}
                className="flex items-center gap-1 p-2 text-[#991B1B] bg-[#FEF2F2] border border-[#FCA5A5] rounded-sm cursor-pointer"
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
