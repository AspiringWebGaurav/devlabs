"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { BentoCardDocument } from "@/types/portfolio";
import { updateCardAction, resetCardAction } from "@/lib/actions/cms.actions";
import { broadcastClientCmsChange } from "@/lib/public-data/client-broadcast";
import { ButtonHelpBadge } from "@/components/admin/ui/ButtonHelpTooltip";
import { BUTTON_HELP } from "@/lib/admin/constants/button-help";
import { useAdminConfirm } from "@/components/admin/context";


import {
  FaCheck,
  FaRotateRight,
  FaFloppyDisk,
  FaArrowRotateLeft,
  FaPlus,
  FaXmark,
  FaGlobe,
  FaLayerGroup,
  FaCode,
  FaEnvelope,
  FaRocket,
} from "react-icons/fa6";

const SLOT_METADATA: Record<number, { label: string; description: string; icon: React.ComponentType<{ className?: string }> }> = {
  1: { label: "Client Collaboration", description: "Hero bento quadrant featuring partnership commitment and live client feedback copy.", icon: FaLayerGroup },
  2: { label: "Global Communications", description: "Interactive Three.js 3D WebGL globe with dynamic timezone tracking and worldwide client reach.", icon: FaGlobe },
  3: { label: "Tech Stack Arrays", description: "Dual marquee arrays showcasing primary development frameworks and backend infrastructure.", icon: FaCode },
  4: { label: "Engineering Passion", description: "Core technological focus, code quality philosophy, and enthusiast identity.", icon: FaRocket },
  5: { label: "Architecture Roadmap", description: "Currently building a high-performance JavaScript Animation Engine with live telemetry.", icon: FaLayerGroup },
  6: { label: "Direct Email CTA", description: "Quick-copy Superadmin email trigger with confetti celebratory feedback.", icon: FaEnvelope },
};

const SUGGESTED_TECH_SKILLS = [
  "React.js",
  "Next.js",
  "TypeScript",
  "TailwindCSS",
  "Node.js",
  "Firebase",
  "GraphQL",
  "Docker",
  "Three.js",
  "Python",
  "Redux",
  "Framer Motion",
];


export const CardsEditor: React.FC<{ initialCards: BentoCardDocument[] }> = ({ initialCards }) => {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const confirm = useAdminConfirm();
  const [cards, setCards] = useState<BentoCardDocument[]>(initialCards);
  const [activeSlot, setActiveSlot] = useState<number>(1);
  const [isPending, setIsPending] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);


  // Sync state if server props change
  useEffect(() => {
    setCards(initialCards);
  }, [initialCards]);

  // Real-time broadcast synchronization
  useEffect(() => {
    if (typeof window === "undefined" || !("BroadcastChannel" in window)) return;
    try {
      const channel = new BroadcastChannel("portfolio_cms_sync");
      channel.onmessage = (event) => {
        if (event.data?.domain === "cards" || event.data?.domain === "all") {
          startTransition(() => {
            router.refresh();
          });
        }
      };
      return () => channel.close();
    } catch {}
  }, [router]);

  // New skill input states for Slot 3
  const [newLeftSkill, setNewLeftSkill] = useState("");
  const [newRightSkill, setNewRightSkill] = useState("");

  const currentCard = cards.find((c) => c.slotIndex === activeSlot) || cards[0];

  const handleUpdateField = (field: keyof BentoCardDocument, value: unknown) => {
    setCards((prev) =>
      prev.map((c) => (c.slotIndex === activeSlot ? { ...c, [field]: value } : c))
    );
  };

  // Tech stack pill manipulations for Slot 3
  const handleAddLeftSkill = (skillToAdd?: string) => {
    const val = (skillToAdd || newLeftSkill).trim();
    if (!val) return;
    const currentList = currentCard.techStackLeft || [];
    if (!currentList.includes(val)) {
      handleUpdateField("techStackLeft", [...currentList, val]);
    }
    setNewLeftSkill("");
  };

  const handleRemoveLeftSkill = (index: number) => {
    const currentList = currentCard.techStackLeft || [];
    handleUpdateField("techStackLeft", currentList.filter((_, i) => i !== index));
  };

  const handleAddRightSkill = (skillToAdd?: string) => {
    const val = (skillToAdd || newRightSkill).trim();
    if (!val) return;
    const currentList = currentCard.techStackRight || [];
    if (!currentList.includes(val)) {
      handleUpdateField("techStackRight", [...currentList, val]);
    }
    setNewRightSkill("");
  };

  const handleRemoveRightSkill = (index: number) => {
    const currentList = currentCard.techStackRight || [];
    handleUpdateField("techStackRight", currentList.filter((_, i) => i !== index));
  };

  const handleSaveCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCard) return;
    setIsPending(true);
    setStatusMessage(null);

    const payload = {
      title: currentCard.title,
      description: currentCard.description || "",
      img: currentCard.img || "",
      spareImg: currentCard.spareImg || "",
      techStackLeft: currentCard.techStackLeft || [],
      techStackRight: currentCard.techStackRight || [],
      ctaEmail: currentCard.ctaEmail || "",
      isPublished: currentCard.isPublished !== false,
    };

    const res = await updateCardAction(currentCard.id, payload);
    setIsPending(false);

    if (res.success) {
      broadcastClientCmsChange("cards");
      startTransition(() => {
        router.refresh();
      });
      setStatusMessage({
        type: "success",
        text: `Slot 0${activeSlot} (${SLOT_METADATA[activeSlot]?.label || currentCard.cardType}) saved and published live.`,
      });
    } else {
      setStatusMessage({ type: "error", text: res.error || "Failed to update card." });
    }
  };

  const handleResetCard = async () => {
    const slotLabel = SLOT_METADATA[activeSlot]?.label || currentCard.cardType;
    const confirmed = await confirm({
      title: `Reset Slot 0${activeSlot} to Defaults?`,
      description: `Are you sure you want to reset Slot 0${activeSlot} (${slotLabel}) to its baseline default configuration? All custom settings and skills for this slot will be restored.`,
      variant: "warning",
      confirmLabel: "Reset to Defaults",
      cancelLabel: "Cancel",
    });
    if (!confirmed) return;

    setIsPending(true);
    setStatusMessage(null);

    const res = await resetCardAction(activeSlot);
    setIsPending(false);

    if (res.success && res.data) {
      setCards((prev) => prev.map((c) => (c.slotIndex === activeSlot ? (res.data as BentoCardDocument) : c)));
      broadcastClientCmsChange("cards");
      startTransition(() => {
        router.refresh();
      });
      setStatusMessage({ type: "success", text: `Slot 0${activeSlot} reset to defaults.` });
    } else {
      setStatusMessage({ type: "error", text: res.error || "Failed to reset card." });
    }
  };


  return (
    <div className="space-y-6 w-full">
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

      {/* Slot Selector Grid Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 w-full">
        {cards.map((card) => {
          const isSelected = card.slotIndex === activeSlot;
          const meta = SLOT_METADATA[card.slotIndex] || {
            label: card.cardType,
            icon: FaLayerGroup,
            description: "",
          };
          const Icon = meta.icon;

          return (
            <button
              key={card.id}
              onClick={() => {
                setActiveSlot(card.slotIndex);
                setStatusMessage(null);
              }}
              className={`p-3.5 sm:p-4 text-left border rounded-sm transition-all cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? "bg-[#F8FAFC] border-[#7C3AED] ring-1 ring-[#7C3AED] shadow-xs"
                  : "bg-[#FFFFFF] border-[#E2E8F0] hover:border-[#CBD5E1] hover:bg-[#FAFAFA]"
              }`}
            >
              <div className="flex items-center justify-between w-full mb-2">
                <span
                  className={`text-xs font-admin-mono font-bold ${
                    isSelected ? "text-[#7C3AED]" : "text-[#94A3B8]"
                  }`}
                >
                  SLOT 0{card.slotIndex}
                </span>
                <Icon
                  className={`w-3.5 h-3.5 ${
                    isSelected ? "text-[#7C3AED]" : "text-[#94A3B8]"
                  }`}
                />
              </div>
              <span className="text-xs sm:text-sm font-admin-sans font-bold text-black truncate block">
                {meta.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Card Form */}
      {currentCard && (
        <form
          onSubmit={handleSaveCard}
          className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-sm p-6 sm:p-7 space-y-6 shadow-2xs w-full"
        >
          {/* Header Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#F1F5F9] pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-admin-mono uppercase tracking-wider text-[#64748B] font-bold">
                  SLOT 0{currentCard.slotIndex} EDITOR
                </span>
                <span className="text-[#CBD5E1] font-admin-mono">•</span>
                <span className="text-xs font-admin-mono text-[#7C3AED] font-semibold">
                  {currentCard.cardType}
                </span>
              </div>
              <h2 className="text-xl font-bold font-admin-sans text-black mt-1">
                {SLOT_METADATA[currentCard.slotIndex]?.label || currentCard.title}
              </h2>
              <p className="text-xs text-[#64748B] font-admin-sans mt-0.5">
                {SLOT_METADATA[currentCard.slotIndex]?.description}
              </p>
            </div>

            <button
              type="button"
              onClick={handleResetCard}
              disabled={isPending}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-admin-mono text-[#64748B] hover:text-black border border-[#E2E8F0] hover:bg-[#F8FAFC] rounded-sm transition-colors cursor-pointer self-start sm:self-auto"
            >
              <FaArrowRotateLeft className="w-3.5 h-3.5" />
              <span>Reset to Defaults</span>
              <ButtonHelpBadge text={BUTTON_HELP.RESET_CARD_DEFAULTS} />
            </button>

          </div>

          {/* Title and Subtitle */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-admin-mono uppercase tracking-wider text-[#475569] font-bold">
                Card Title / Heading
              </label>
              <input
                type="text"
                value={currentCard.title}
                onChange={(e) => handleUpdateField("title", e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-[#E2E8F0] rounded-sm bg-[#FAFAFA] focus:bg-[#FFFFFF] focus:outline-hidden focus:ring-1 focus:ring-[#7C3AED] focus:border-[#7C3AED] transition-all"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-admin-mono uppercase tracking-wider text-[#475569] font-bold">
                Card Subtitle / Description (Optional)
              </label>
              <input
                type="text"
                value={currentCard.description || ""}
                onChange={(e) => handleUpdateField("description", e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-[#E2E8F0] rounded-sm bg-[#FAFAFA] focus:bg-[#FFFFFF] focus:outline-hidden focus:ring-1 focus:ring-[#7C3AED] focus:border-[#7C3AED] transition-all"
                placeholder={currentCard.slotIndex === 3 ? "I constantly try to improve" : ""}
              />
            </div>
          </div>

          {/* ========================================================================= */}
          {/* SLOT 2: EARTH & 3D GLOBE SPECIFIC CONTROLS */}
          {/* ========================================================================= */}
          {currentCard.slotIndex === 2 && (
            <div className="p-5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-sm space-y-4">
              <div className="flex items-center gap-2.5">
                <FaGlobe className="w-4 h-4 text-[#7C3AED]" />
                <span className="text-sm font-admin-mono font-bold text-black">
                  Earth & Three.js 3D Globe Features
                </span>
              </div>
              <p className="text-xs text-[#64748B] font-admin-sans">
                Slot 02 renders the interactive Three.js Earth Globe with real-time rotation, arc connections, and timezone indicators in the Bento Grid.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-3 bg-[#FFFFFF] border border-[#E2E8F0] rounded-sm">
                  <span className="text-xs font-admin-mono font-semibold text-[#475569] block">
                    Visual Layout Mode
                  </span>
                  <span className="text-sm font-admin-mono font-bold text-[#7C3AED] mt-1 block">
                    globe_canvas (3D WebGL)
                  </span>
                </div>
                <div className="p-3 bg-[#FFFFFF] border border-[#E2E8F0] rounded-sm">
                  <span className="text-xs font-admin-mono font-semibold text-[#475569] block">
                    Rendering Component
                  </span>
                  <span className="text-sm font-admin-mono font-bold text-[#0F172A] mt-1 block">
                    GridGlobe &bull; Three.js Canvas
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SLOT 3: TECH STACK SPECIFIC RICH CRUD EDITOR */}
          {/* ========================================================================= */}
          {currentCard.slotIndex === 3 && (
            <div className="p-5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-sm space-y-6">
              <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
                <div className="flex items-center gap-2.5">
                  <FaLayerGroup className="w-4 h-4 text-[#7C3AED]" />
                  <span className="text-sm font-admin-mono font-bold text-black">
                    Interactive Tech Stack Pills Editor
                  </span>
                </div>
                <span className="text-xs font-admin-mono text-[#64748B]">
                  Dual-Column Vertical Floating Badges
                </span>
              </div>

              {/* Quick Skill Suggestions */}
              <div>
                <span className="text-xs font-admin-mono uppercase tracking-wider text-[#64748B] font-bold block mb-2">
                  Quick Add Suggestions
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {SUGGESTED_TECH_SKILLS.map((skill) => (
                    <button
                      key={skill}
                      type="button"
                      onClick={() => {
                        // Automatically assign to left or right based on list length
                        const leftLen = (currentCard.techStackLeft || []).length;
                        const rightLen = (currentCard.techStackRight || []).length;
                        if (leftLen <= rightLen) {
                          handleAddLeftSkill(skill);
                        } else {
                          handleAddRightSkill(skill);
                        }
                      }}
                      className="px-2.5 py-1 text-xs font-admin-mono bg-[#FFFFFF] hover:bg-[#F1F5F9] border border-[#CBD5E1] hover:border-[#7C3AED] text-[#334155] rounded-xs transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <FaPlus className="w-2.5 h-2.5 text-[#7C3AED]" />
                      <span>{skill}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Dual Column Editors */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column Skills */}
                <div className="space-y-3 p-4 bg-[#FFFFFF] border border-[#E2E8F0] rounded-sm">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-admin-mono uppercase tracking-wider text-[#0F172A] font-bold">
                      Left Column Skills ({ (currentCard.techStackLeft || []).length })
                    </label>
                  </div>

                  {/* Add Input */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newLeftSkill}
                      onChange={(e) => setNewLeftSkill(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddLeftSkill();
                        }
                      }}
                      placeholder="Type skill & press Enter..."
                      className="flex-1 px-3 py-1.5 text-xs border border-[#CBD5E1] rounded-sm bg-[#FAFAFA] focus:bg-[#FFFFFF] focus:outline-hidden focus:ring-1 focus:ring-[#7C3AED]"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddLeftSkill()}
                      className="px-3 py-1.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-admin-mono font-semibold rounded-sm transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <FaPlus className="w-2.5 h-2.5" />
                      <span>Add</span>
                    </button>
                  </div>

                  {/* Pill Chips */}
                  <div className="flex flex-wrap gap-2 pt-2 min-h-[60px] p-2 bg-[#F8FAFC] border border-[#F1F5F9] rounded-sm">
                    {(currentCard.techStackLeft || []).map((skill, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#10132E] text-white text-xs font-admin-mono font-medium rounded-md border border-white/[0.1] shadow-2xs"
                      >
                        <span>{skill}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveLeftSkill(idx)}
                          className="text-[#94A3B8] hover:text-[#EF4444] transition-colors cursor-pointer"
                          title={`Remove ${skill}`}
                        >
                          <FaXmark className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                    {(currentCard.techStackLeft || []).length === 0 && (
                      <span className="text-xs text-[#94A3B8] font-admin-mono italic self-center">
                        No left column skills added yet.
                      </span>
                    )}
                  </div>
                </div>

                {/* Right Column Skills */}
                <div className="space-y-3 p-4 bg-[#FFFFFF] border border-[#E2E8F0] rounded-sm">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-admin-mono uppercase tracking-wider text-[#0F172A] font-bold">
                      Right Column Skills ({ (currentCard.techStackRight || []).length })
                    </label>
                  </div>

                  {/* Add Input */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newRightSkill}
                      onChange={(e) => setNewRightSkill(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddRightSkill();
                        }
                      }}
                      placeholder="Type skill & press Enter..."
                      className="flex-1 px-3 py-1.5 text-xs border border-[#CBD5E1] rounded-sm bg-[#FAFAFA] focus:bg-[#FFFFFF] focus:outline-hidden focus:ring-1 focus:ring-[#7C3AED]"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddRightSkill()}
                      className="px-3 py-1.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-admin-mono font-semibold rounded-sm transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <FaPlus className="w-2.5 h-2.5" />
                      <span>Add</span>
                    </button>
                  </div>

                  {/* Pill Chips */}
                  <div className="flex flex-wrap gap-2 pt-2 min-h-[60px] p-2 bg-[#F8FAFC] border border-[#F1F5F9] rounded-sm">
                    {(currentCard.techStackRight || []).map((skill, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#10132E] text-white text-xs font-admin-mono font-medium rounded-md border border-white/[0.1] shadow-2xs"
                      >
                        <span>{skill}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveRightSkill(idx)}
                          className="text-[#94A3B8] hover:text-[#EF4444] transition-colors cursor-pointer"
                          title={`Remove ${skill}`}
                        >
                          <FaXmark className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                    {(currentCard.techStackRight || []).length === 0 && (
                      <span className="text-xs text-[#94A3B8] font-admin-mono italic self-center">
                        No right column skills added yet.
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* IMAGE URLS & SECONDARY GRAPHICS */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="block text-xs font-admin-mono uppercase tracking-wider text-[#475569] font-bold">
                Primary Image URL / SVG Path
              </label>
              <input
                type="text"
                value={currentCard.img || ""}
                onChange={(e) => handleUpdateField("img", e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-[#E2E8F0] rounded-sm bg-[#FAFAFA] focus:bg-[#FFFFFF] focus:outline-hidden focus:ring-1 focus:ring-[#7C3AED] focus:border-[#7C3AED] transition-all"
                placeholder="/b1.svg, /b4.svg, /b5.svg"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-admin-mono uppercase tracking-wider text-[#475569] font-bold">
                Secondary Background Graphic / Grid
              </label>
              <input
                type="text"
                value={currentCard.spareImg || ""}
                onChange={(e) => handleUpdateField("spareImg", e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-[#E2E8F0] rounded-sm bg-[#FAFAFA] focus:bg-[#FFFFFF] focus:outline-hidden focus:ring-1 focus:ring-[#7C3AED] focus:border-[#7C3AED] transition-all"
                placeholder="/grid.svg"
              />
            </div>
          </div>

          {/* ========================================================================= */}
          {/* SLOT 6: CONTACT CTA SPECIFIC FIELD */}
          {/* ========================================================================= */}
          {currentCard.slotIndex === 6 && (
            <div className="p-5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-sm space-y-2">
              <label className="text-sm font-admin-mono font-bold text-black block">
                Copyable Contact Email Address
              </label>
              <input
                type="email"
                value={currentCard.ctaEmail || ""}
                onChange={(e) => handleUpdateField("ctaEmail", e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-[#CBD5E1] rounded-sm bg-[#FFFFFF]"
                placeholder="hello@gauravpatil.site"
              />
            </div>
          )}

          {/* Footer Save Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-[#F1F5F9]">
            <div className="flex items-center gap-2.5">
              <input
                type="checkbox"
                id={`card-pub-${currentCard.id}`}
                checked={currentCard.isPublished !== false}
                onChange={(e) => handleUpdateField("isPublished", e.target.checked)}
                className="w-4.5 h-4.5 text-[#7C3AED] rounded border-[#E2E8F0] cursor-pointer"
              />
              <label
                htmlFor={`card-pub-${currentCard.id}`}
                className="text-xs sm:text-sm font-admin-mono text-[#0F172A] font-semibold cursor-pointer select-none"
              >
                Slot Active & Published
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
                  <span>Saving Slot...</span>
                </>
              ) : (
                <>
                  <FaFloppyDisk className="w-4 h-4" />
                  <span>Save Slot 0{currentCard.slotIndex}</span>
                  <ButtonHelpBadge text={BUTTON_HELP.SAVE_AND_PUBLISH} />
                </>
              )}
            </button>

          </div>
        </form>
      )}
    </div>
  );
};
