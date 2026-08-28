"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ClientDocument } from "@/types/portfolio";
import {
  createClientAction,
  updateClientAction,
  deleteClientAction,
  reorderClientsAction,
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

export const ClientsManager: React.FC<{ initialClients: ClientDocument[] }> = ({ initialClients }) => {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [clients, setClients] = useState<ClientDocument[]>(initialClients);
  const [editingItem, setEditingItem] = useState<Partial<ClientDocument> | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Sync state if server props change
  useEffect(() => {
    setClients(initialClients);
  }, [initialClients]);

  // Real-time broadcast synchronization
  useEffect(() => {
    if (typeof window === "undefined" || !("BroadcastChannel" in window)) return;
    try {
      const channel = new BroadcastChannel("portfolio_cms_sync");
      channel.onmessage = (event) => {
        if (event.data?.domain === "clients" || event.data?.domain === "all") {
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
    if (direction === "down" && index === clients.length - 1) return;

    const targetIndex = direction === "up" ? index - 1 : index + 1;
    const reordered = [...clients];
    const temp = reordered[index];
    reordered[index] = reordered[targetIndex];
    reordered[targetIndex] = temp;

    setClients(reordered);
    setIsPending(true);

    const orderedIds = reordered.map((c) => c.id);
    const res = await reorderClientsAction(orderedIds);
    setIsPending(false);

    if (res.success) {
      broadcastClientCmsChange("clients");
      startTransition(() => {
        router.refresh();
      });
      setStatusMessage({ type: "success", text: "Client logos reordered successfully." });
    } else {
      setStatusMessage({ type: "error", text: res.error || "Failed to reorder." });
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete client logo "${name}"?`)) return;
    setIsPending(true);

    const res = await deleteClientAction(id);
    setIsPending(false);

    if (res.success) {
      setClients((prev) => prev.filter((c) => c.id !== id));
      broadcastClientCmsChange("clients");
      startTransition(() => {
        router.refresh();
      });
      setStatusMessage({ type: "success", text: `Client "${name}" deleted.` });
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
      iconUrl: editingItem.iconUrl || "/cloud.svg",
      iconStoragePath: editingItem.iconStoragePath || "",
      nameImgUrl: editingItem.nameImgUrl || "/cloudName.svg",
      nameImgStoragePath: editingItem.nameImgStoragePath || "",
      websiteUrl: editingItem.websiteUrl || "",
      logoWidth: editingItem.logoWidth || 50,
      isPublished: editingItem.isPublished ?? true,
    };

    if (isCreating) {
      const res = await createClientAction(payload);
      setIsPending(false);
      if (res.success && res.data) {
        setClients((prev) => [...prev, res.data as ClientDocument]);
        setIsCreating(false);
        setEditingItem(null);
        broadcastClientCmsChange("clients");
        startTransition(() => {
          router.refresh();
        });
        setStatusMessage({ type: "success", text: "Client logo added." });
      } else {
        setStatusMessage({ type: "error", text: res.error || "Failed to add client." });
      }
    } else if (editingItem.id) {
      const res = await updateClientAction(editingItem.id, payload);
      setIsPending(false);
      if (res.success && res.data) {
        setClients((prev) =>
          prev.map((c) => (c.id === editingItem.id ? (res.data as ClientDocument) : c))
        );
        setEditingItem(null);
        broadcastClientCmsChange("clients");
        startTransition(() => {
          router.refresh();
        });
        setStatusMessage({ type: "success", text: "Client logo updated." });
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
          {clients.length} Partner Logos Configured
        </span>
        <button
          onClick={() => {
            setIsCreating(true);
            setEditingItem({
              name: "",
              iconUrl: "/cloud.svg",
              nameImgUrl: "/cloudName.svg",
              websiteUrl: "https://",
              logoWidth: 50,
              isPublished: true,
            });
          }}
          className="flex items-center gap-2 px-3.5 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-admin-mono font-semibold rounded-sm shadow-sm cursor-pointer"
        >
          <FaPlus className="w-3 h-3" />
          <span>Add Client Logo</span>
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
              {isCreating ? "Add Partner Logo" : `Edit Logo: ${editingItem.name}`}
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
                Client / Brand Name
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
                Official Website URL
              </label>
              <input
                type="url"
                value={editingItem.websiteUrl || ""}
                onChange={(e) => setEditingItem({ ...editingItem, websiteUrl: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-sm bg-[#FAFAFA]"
                placeholder="https://..."
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="space-y-1.5">
              <label className="block text-xs font-admin-mono uppercase tracking-wider text-[#64748B] font-semibold">
                Icon Image URL / Path
              </label>
              <input
                type="text"
                value={editingItem.iconUrl || ""}
                onChange={(e) => setEditingItem({ ...editingItem, iconUrl: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-sm bg-[#FAFAFA]"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-admin-mono uppercase tracking-wider text-[#64748B] font-semibold">
                Name/Wordmark Image URL
              </label>
              <input
                type="text"
                value={editingItem.nameImgUrl || ""}
                onChange={(e) => setEditingItem({ ...editingItem, nameImgUrl: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-sm bg-[#FAFAFA]"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-admin-mono uppercase tracking-wider text-[#64748B] font-semibold">
                Logo Display Width (px)
              </label>
              <input
                type="number"
                min={20}
                max={200}
                value={editingItem.logoWidth || 50}
                onChange={(e) => setEditingItem({ ...editingItem, logoWidth: Number(e.target.value) })}
                className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-sm bg-[#FAFAFA]"
                required
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
              <span>Published to Partner Strip</span>
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
                <span>{isCreating ? "Add Logo" : "Save Changes"}</span>
                <ButtonHelpBadge text={BUTTON_HELP.SAVE_AND_PUBLISH} />
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Clients List */}
      <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-sm overflow-hidden shadow-2xs divide-y divide-[#F1F5F9]">
        {clients.map((c, index) => (
          <div key={c.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#FAFAFA]">
            <div className="flex items-center gap-4">
              <span className="font-admin-mono text-xs font-bold text-[#94A3B8] w-6">0{index + 1}.</span>
              <div className="flex items-center gap-3 p-2 bg-[#04071D] rounded border border-[#E2E8F0]">
                <img src={c.iconUrl} alt={c.name} className="h-6 w-auto object-contain" />
                <img src={c.nameImgUrl} alt={c.name} className="h-6 w-auto object-contain" />
              </div>
              <span className="text-sm font-bold font-admin-sans text-black">{c.name}</span>
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
                disabled={index === clients.length - 1 || isPending}
                className="p-2 border border-[#E2E8F0] rounded-sm text-[#64748B] hover:text-black disabled:opacity-30 cursor-pointer"
                title={BUTTON_HELP.MOVE_DOWN}
              >
                <FaArrowDown className="w-3 h-3" />
              </button>
              <button
                onClick={() => {
                  setIsCreating(false);
                  setEditingItem(c);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-admin-mono text-[#7C3AED] border border-[#DDD6FE] bg-[#F5F3FF] rounded-sm cursor-pointer"
              >
                <FaPenToSquare className="w-3 h-3" />
                <span>Edit</span>
                <ButtonHelpBadge text={BUTTON_HELP.EDIT_ITEM} />
              </button>
              <button
                onClick={() => handleDelete(c.id, c.name)}
                className="flex items-center gap-1 p-2 text-[#991B1B] bg-[#FEF2F2] border border-[#FCA5A5] rounded-sm cursor-pointer"
                title="Delete Client Logo"
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
