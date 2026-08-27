"use client";

import React, { useState } from "react";
import {
  FaPenToSquare,
  FaPaperPlane,
  FaFloppyDisk,
  FaShieldHalved,
} from "react-icons/fa6";
import type {
  MailDocument,
  MailDraftDocument,
  PaginatedResult,
} from "@/lib/dal/repositories/types";
import { ComposeMailForm } from "./ComposeMailForm";
import { SentMailLedger } from "./SentMailLedger";
import { DraftsList } from "./DraftsList";
import { SenderIdentitiesView } from "./SenderIdentitiesView";

interface MailWorkspaceProps {
  initialSentData: PaginatedResult<MailDocument>;
  initialDrafts: MailDraftDocument[];
}

export type MailWorkspaceTab = "compose" | "sent" | "drafts" | "senders";

export const MailWorkspace: React.FC<MailWorkspaceProps> = ({
  initialSentData,
  initialDrafts,
}) => {
  const [activeTab, setActiveTab] = useState<MailWorkspaceTab>("compose");
  const [activeDraft, setActiveDraft] = useState<MailDraftDocument | null>(null);
  const [sentData, setSentData] = useState<PaginatedResult<MailDocument>>(initialSentData);
  const [drafts, setDrafts] = useState<MailDraftDocument[]>(initialDrafts);

  const handleResumeDraft = (draft: MailDraftDocument) => {
    setActiveDraft(draft);
    setActiveTab("compose");
  };

  const handleSendSuccess = () => {
    setActiveDraft(null);
  };


  const handlePageChange = async (newPage: number) => {
    const { getSentMailsAction } = await import("../actions");
    const res = await getSentMailsAction(newPage, 20);
    if (res.success && res.data) {
      setSentData(res.data);
    }
  };


  const tabs = [
    { id: "compose", label: "Compose", icon: FaPenToSquare },
    { id: "sent", label: `Sent History (${sentData.total || sentData.items.length})`, icon: FaPaperPlane },
    { id: "drafts", label: `Drafts (${drafts.length})`, icon: FaFloppyDisk },
    { id: "senders", label: "Sender Identities", icon: FaShieldHalved },
  ] as const;

  return (
    <div className="space-y-5 font-admin-sans">
      {/* Tab Navigation Toolbar */}
      <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-[#FFFFFF] border border-[#E2E8F0] rounded-none sm:rounded-sm shadow-2xs">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id as MailWorkspaceTab);
                if (tab.id !== "compose") {
                  setActiveDraft(null);
                }
              }}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-admin-mono rounded-sm transition-all duration-150 cursor-pointer border ${
                isActive
                  ? "bg-[#7C3AED] text-white border-[#6D28D9] font-bold shadow-2xs"
                  : "bg-transparent text-[#64748B] border-transparent hover:text-black hover:bg-[#F8FAFC]"
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content Canvas */}
      <div className="animate-in fade-in duration-150">
        {activeTab === "compose" && (
          <ComposeMailForm
            initialDraft={activeDraft}
            onSendSuccess={handleSendSuccess}
            onDraftSaved={(newDraft) => {
              setDrafts((prev) => {
                const idx = prev.findIndex((d) => d.id === newDraft.id);
                if (idx >= 0) {
                  const copy = [...prev];
                  copy[idx] = newDraft;
                  return copy;
                }
                return [newDraft, ...prev];
              });
            }}
            onDiscard={() => setActiveDraft(null)}
          />
        )}

        {activeTab === "sent" && (
          <SentMailLedger initialData={sentData} onPageChange={handlePageChange} />
        )}


        {activeTab === "drafts" && (
          <DraftsList
            drafts={drafts}
            onResumeDraft={handleResumeDraft}
            onDraftDeleted={(id) => {
              setDrafts((prev) => prev.filter((d) => d.id !== id));
            }}
          />
        )}

        {activeTab === "senders" && <SenderIdentitiesView />}
      </div>
    </div>
  );
};
