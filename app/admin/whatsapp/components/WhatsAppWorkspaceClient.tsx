"use client";

import React, { useState, useTransition, useCallback } from "react";
import { FaWhatsapp, FaBriefcase, FaRotate } from "react-icons/fa6";
import { RecruiterConversationsList } from "./RecruiterConversationsList";
import { RecruiterChatViewer } from "./RecruiterChatViewer";
import { OpportunityLeadCards } from "./OpportunityLeadCards";
import { getThreadMessagesAction, refreshThreadsAction, markThreadReadAction } from "../actions";
import type { WhatsAppThread, WhatsAppMessage, WhatsAppOpportunityLead } from "@/lib/whatsapp/types";

interface WhatsAppWorkspaceClientProps {
  initialThreads: WhatsAppThread[];
  initialLeads: WhatsAppOpportunityLead[];
}

export const WhatsAppWorkspaceClient: React.FC<WhatsAppWorkspaceClientProps> = ({
  initialThreads,
  initialLeads,
}) => {
  const [activeTab, setActiveTab] = useState<"chats" | "leads">("chats");
  const [threads, setThreads] = useState<WhatsAppThread[]>(initialThreads);
  const [leads] = useState<WhatsAppOpportunityLead[]>(initialLeads);
  const [selectedThread, setSelectedThread] = useState<WhatsAppThread | null>(
    initialThreads.length > 0 ? initialThreads[0] : null
  );
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isRefreshing, startRefresh] = useTransition();

  // Load messages when selecting a thread
  const handleSelectThread = useCallback(async (thread: WhatsAppThread) => {
    setSelectedThread(thread);
    setLoadingMessages(true);
    try {
      const msgs = await getThreadMessagesAction(thread.id);
      setMessages(msgs);

      if (thread.unreadByAdmin) {
        await markThreadReadAction(thread.id);
        setThreads((prev) =>
          prev.map((t) => (t.id === thread.id ? { ...t, unreadByAdmin: false } : t))
        );
      }
    } catch {
      // Handled gracefully
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  // Initial load of first thread's messages
  React.useEffect(() => {
    if (initialThreads.length > 0) {
      handleSelectThread(initialThreads[0]);
    }
  }, [initialThreads, handleSelectThread]);

  const handleRefresh = () => {
    startRefresh(async () => {
      try {
        const updated = await refreshThreadsAction();
        setThreads(updated);
        if (selectedThread) {
          const current = updated.find((t) => t.id === selectedThread.id);
          if (current) setSelectedThread(current);
          const msgs = await getThreadMessagesAction(selectedThread.id);
          setMessages(msgs);
        }
      } catch {
        // Handled gracefully
      }
    });
  };

  const unreadCount = threads.filter((t) => t.unreadByAdmin).length;

  return (
    <div className="space-y-4 font-admin-sans">
      {/* 1. Workspace Sub-Navigation Tabs & Refresh */}
      <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("chats")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold tracking-tight transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "chats"
                ? "bg-[#7C3AED] text-white shadow-2xs"
                : "bg-white text-neutral-600 hover:bg-neutral-100 border border-[#E2E8F0]"
            }`}
          >
            <FaWhatsapp className="w-3.5 h-3.5" />
            <span>Recruiter Conversations</span>
            {unreadCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-red-500 text-white font-bold">
                {unreadCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("leads")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold tracking-tight transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "leads"
                ? "bg-[#7C3AED] text-white shadow-2xs"
                : "bg-white text-neutral-600 hover:bg-neutral-100 border border-[#E2E8F0]"
            }`}
          >
            <FaBriefcase className="w-3.5 h-3.5" />
            <span>Opportunity Leads</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-neutral-200 text-neutral-700 font-semibold">
              {leads.length}
            </span>
          </button>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="px-3 py-1.5 rounded-lg bg-white border border-[#E2E8F0] hover:bg-neutral-50 text-neutral-600 text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
        >
          <FaRotate className={`w-3 h-3 ${isRefreshing ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* 2. Main Body Content */}
      {activeTab === "chats" ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Column: Thread List */}
          <div className="lg:col-span-4 bg-neutral-50/60 p-2.5 rounded-xl border border-[#E2E8F0] space-y-2 max-h-[640px] overflow-y-auto">
            <div className="px-2 py-1 flex items-center justify-between text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
              <span>Conversations ({threads.length})</span>
            </div>
            <RecruiterConversationsList
              threads={threads}
              selectedThreadId={selectedThread?.id || null}
              onSelectThread={handleSelectThread}
            />
          </div>

          {/* Right Column: Chat Ledger Stream */}
          <div className="lg:col-span-8">
            <RecruiterChatViewer
              thread={selectedThread}
              messages={messages}
              loading={loadingMessages}
            />
          </div>
        </div>
      ) : (
        <OpportunityLeadCards leads={leads} />
      )}
    </div>
  );
};
