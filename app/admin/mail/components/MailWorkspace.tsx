"use client";

import React, { useState, useEffect, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
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
import { getSentMailsAction, getMailDraftsAction } from "../actions";
import { broadcastClientCmsChange } from "@/lib/public-data/client-broadcast";
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
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<MailWorkspaceTab>("compose");
  const [activeDraft, setActiveDraft] = useState<MailDraftDocument | null>(null);
  const [sentData, setSentData] = useState<PaginatedResult<MailDocument>>(initialSentData);
  const [drafts, setDrafts] = useState<MailDraftDocument[]>(initialDrafts);

  // Sync state if initial server props update
  useEffect(() => {
    setSentData(initialSentData);
  }, [initialSentData]);

  useEffect(() => {
    setDrafts(initialDrafts);
  }, [initialDrafts]);

  // Synchronous background fetchers
  const refreshSentMails = useCallback(async (page = 1) => {
    try {
      const res = await getSentMailsAction(page, 20);
      if (res.success && res.data) {
        setSentData(res.data);
      }
    } catch {}
  }, []);

  const refreshDrafts = useCallback(async () => {
    try {
      const res = await getMailDraftsAction();
      if (res.success && res.data) {
        setDrafts(res.data);
      }
    } catch {}
  }, []);

  // Real-time local cross-tab broadcast listener
  useEffect(() => {
    if (typeof window === "undefined" || !("BroadcastChannel" in window)) return;
    try {
      const channel = new BroadcastChannel("portfolio_cms_sync");
      channel.onmessage = (event) => {
        if (event.data?.domain === "mail" || event.data?.domain === "all") {
          refreshSentMails(sentData.page || 1);
          refreshDrafts();
        }
      };
      return () => channel.close();
    } catch {}
  }, [refreshSentMails, refreshDrafts, sentData.page]);

  const handleResumeDraft = (draft: MailDraftDocument) => {
    setActiveDraft(draft);
    setActiveTab("compose");
  };

  const handleSendSuccess = async () => {
    setActiveDraft(null);
    // 1. Immediately refresh sent ledger and drafts in background
    await Promise.all([refreshSentMails(1), refreshDrafts()]);
    // 2. Broadcast to other open tabs
    broadcastClientCmsChange("mail");
    // 3. Revalidate server component tree
    startTransition(() => {
      router.refresh();
    });
  };

  const handlePageChange = async (newPage: number) => {
    await refreshSentMails(newPage);
  };

  const handleTabChange = (tabId: MailWorkspaceTab) => {
    setActiveTab(tabId);
    if (tabId !== "compose") {
      setActiveDraft(null);
    }
    // Auto-fetch latest data on tab switch for zero stale data
    if (tabId === "sent") {
      refreshSentMails(sentData.page || 1);
    } else if (tabId === "drafts") {
      refreshDrafts();
    }
  };

  const tabs = [
    { id: "compose", label: "Compose", icon: FaPenToSquare },
    { id: "sent", label: `Sent History (${sentData.total || sentData.items.length})`, icon: FaPaperPlane },
    { id: "drafts", label: `Drafts (${drafts.length})`, icon: FaFloppyDisk },
    { id: "senders", label: "Sender Identities", icon: FaShieldHalved },
  ] as const;

  return (
    <div className="space-y-3 font-admin-sans">
      {/* Tab Navigation Toolbar */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#FFFFFF] border border-[#E2E8F0] rounded-none sm:rounded-sm shadow-2xs">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabChange(tab.id as MailWorkspaceTab)}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-admin-mono rounded-sm transition-all duration-150 cursor-pointer border ${
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
              broadcastClientCmsChange("mail");
            }}
            onDiscard={() => {
              if (activeDraft) {
                setDrafts((prev) => prev.filter((d) => d.id !== activeDraft.id));
                broadcastClientCmsChange("mail");
              }
              setActiveDraft(null);
            }}
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
              if (activeDraft?.id === id) {
                setActiveDraft(null);
              }
              broadcastClientCmsChange("mail");
            }}
          />
        )}

        {activeTab === "senders" && <SenderIdentitiesView />}
      </div>
    </div>
  );
};

