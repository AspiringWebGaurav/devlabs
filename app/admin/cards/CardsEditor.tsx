"use client";

import React, { useState } from "react";
import type { BentoCardDocument } from "@/types/portfolio";
import { updateCardAction, resetCardAction } from "@/lib/actions/cms.actions";
import { FaCheck, FaRotateRight, FaFloppyDisk, FaArrowRotateLeft } from "react-icons/fa6";

export const CardsEditor: React.FC<{ initialCards: BentoCardDocument[] }> = ({ initialCards }) => {
  const [cards, setCards] = useState<BentoCardDocument[]>(initialCards);
  const [activeSlot, setActiveSlot] = useState<number>(1);
  const [isPending, setIsPending] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const currentCard = cards.find((c) => c.slotIndex === activeSlot) || cards[0];

  const handleUpdateField = (field: keyof BentoCardDocument, value: unknown) => {
    setCards((prev) =>
      prev.map((c) => (c.slotIndex === activeSlot ? { ...c, [field]: value } : c))
    );
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
      setStatusMessage({ type: "success", text: `Slot ${activeSlot} (${currentCard.cardType}) saved successfully.` });
    } else {
      setStatusMessage({ type: "error", text: res.error || "Failed to update card." });
    }
  };

  const handleResetCard = async () => {
    if (!confirm(`Reset Slot ${activeSlot} to baseline default settings?`)) return;
    setIsPending(true);
    setStatusMessage(null);

    const res = await resetCardAction(activeSlot);
    setIsPending(false);

    if (res.success && res.data) {
      setCards((prev) => prev.map((c) => (c.slotIndex === activeSlot ? (res.data as BentoCardDocument) : c)));
      setStatusMessage({ type: "success", text: `Slot ${activeSlot} reset to defaults.` });
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

      {/* Slot Selector Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 w-full">
        {cards.map((card) => {
          const isSelected = card.slotIndex === activeSlot;
          return (
            <button
              key={card.id}
              onClick={() => {
                setActiveSlot(card.slotIndex);
                setStatusMessage(null);
              }}
              className={`p-3.5 sm:p-4 text-left border rounded-sm transition-all cursor-pointer ${
                isSelected
                  ? "bg-[#F8FAFC] border-[#7C3AED] shadow-xs"
                  : "bg-[#FFFFFF] border-[#E2E8F0] hover:border-[#CBD5E1]"
              }`}
            >
              <span className={`text-xs font-admin-mono block font-bold ${isSelected ? "text-[#7C3AED]" : "text-[#94A3B8]"}`}>
                SLOT 0{card.slotIndex}
              </span>
              <span className="text-sm font-admin-sans font-semibold text-black truncate block mt-1">
                {card.cardType}
              </span>
            </button>
          );
        })}
      </div>

      {/* Card Form */}
      {currentCard && (
        <form onSubmit={handleSaveCard} className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-sm p-6 sm:p-7 space-y-6 shadow-2xs w-full">
          <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3.5">
            <div>
              <span className="text-xs font-admin-mono uppercase tracking-wider text-[#64748B] font-bold">
                SLOT 0{currentCard.slotIndex} CONFIGURATION
              </span>
              <h2 className="text-lg font-bold font-admin-sans text-black mt-0.5">
                Card Type: <span className="text-[#7C3AED]">{currentCard.cardType}</span>
              </h2>
            </div>
            <button
              type="button"
              onClick={handleResetCard}
              disabled={isPending}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-admin-mono text-[#64748B] hover:text-black border border-[#E2E8F0] hover:bg-[#F8FAFC] rounded-sm transition-colors cursor-pointer"
            >
              <FaArrowRotateLeft className="w-3.5 h-3.5" />
              <span>Reset Slot</span>
            </button>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-admin-mono uppercase tracking-wider text-[#475569] font-bold">
              Card Title
            </label>
            <input
              type="text"
              value={currentCard.title}
              onChange={(e) => handleUpdateField("title", e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm border border-[#E2E8F0] rounded-sm bg-[#FAFAFA] focus:bg-[#FFFFFF] focus:outline-hidden focus:ring-1 focus:ring-[#7C3AED] focus:border-[#7C3AED] transition-all"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-admin-mono uppercase tracking-wider text-[#475569] font-bold">
              Card Subtitle / Description
            </label>
            <input
              type="text"
              value={currentCard.description || ""}
              onChange={(e) => handleUpdateField("description", e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm border border-[#E2E8F0] rounded-sm bg-[#FAFAFA] focus:bg-[#FFFFFF] focus:outline-hidden focus:ring-1 focus:ring-[#7C3AED] focus:border-[#7C3AED] transition-all"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-xs font-admin-mono uppercase tracking-wider text-[#475569] font-bold">
                Primary Image URL / Path
              </label>
              <input
                type="text"
                value={currentCard.img || ""}
                onChange={(e) => handleUpdateField("img", e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-[#E2E8F0] rounded-sm bg-[#FAFAFA] focus:bg-[#FFFFFF] focus:outline-hidden focus:ring-1 focus:ring-[#7C3AED] focus:border-[#7C3AED] transition-all"
                placeholder="/b1.svg or CDN URL"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-admin-mono uppercase tracking-wider text-[#475569] font-bold">
                Secondary / Spare Image URL
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

          {/* Slot 3 Tech Stack Specific Fields */}
          {currentCard.cardType === "tech_stack" && (
            <div className="p-5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-sm space-y-4">
              <span className="text-sm font-admin-mono font-bold text-black block">
                Tech Stack Pills Configuration
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-admin-mono text-[#475569] font-semibold">Left Column (comma-separated)</label>
                  <input
                    type="text"
                    value={(currentCard.techStackLeft || []).join(", ")}
                    onChange={(e) =>
                      handleUpdateField(
                        "techStackLeft",
                        e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
                      )
                    }
                    className="w-full px-3.5 py-2 text-sm border border-[#CBD5E1] rounded-sm bg-[#FFFFFF]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-admin-mono text-[#475569] font-semibold">Right Column (comma-separated)</label>
                  <input
                    type="text"
                    value={(currentCard.techStackRight || []).join(", ")}
                    onChange={(e) =>
                      handleUpdateField(
                        "techStackRight",
                        e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
                      )
                    }
                    className="w-full px-3.5 py-2 text-sm border border-[#CBD5E1] rounded-sm bg-[#FFFFFF]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Slot 6 Contact CTA Specific Field */}
          {currentCard.cardType === "contact_cta" && (
            <div className="p-5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-sm space-y-2">
              <label className="text-sm font-admin-mono font-bold text-black block">
                Copyable Contact Email
              </label>
              <input
                type="email"
                value={currentCard.ctaEmail || ""}
                onChange={(e) => handleUpdateField("ctaEmail", e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-[#CBD5E1] rounded-sm bg-[#FFFFFF]"
                placeholder="hello@gauravservices.eu.cc"
              />
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-[#F1F5F9]">
            <div className="flex items-center gap-2.5">
              <input
                type="checkbox"
                id={`card-pub-${currentCard.id}`}
                checked={currentCard.isPublished !== false}
                onChange={(e) => handleUpdateField("isPublished", e.target.checked)}
                className="w-4.5 h-4.5 text-[#7C3AED] rounded border-[#E2E8F0]"
              />
              <label htmlFor={`card-pub-${currentCard.id}`} className="text-xs sm:text-sm font-admin-mono text-[#0F172A] font-semibold cursor-pointer">
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
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
