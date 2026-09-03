import React from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE_NAME } from "@/lib/admin/constants";
import { verifyAdminSession } from "@/lib/admin/auth";
import { AdminPageContainer, AdminSuspense } from "@/components/admin";
import { conversationRepository } from "@/lib/whatsapp/persistence/conversation.repo";
import { WhatsAppWorkspaceClient } from "./components/WhatsAppWorkspaceClient";
import type { WhatsAppThread } from "@/lib/whatsapp/types";

export const dynamic = "force-dynamic";

export default async function AdminWhatsAppPage() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  const session = await verifyAdminSession(sessionToken);
  if (!session) {
    redirect("/admin/login");
  }

  const [conversations, leads] = await Promise.all([
    conversationRepository.listConversations().catch(() => []),
    conversationRepository.listLeads().catch(() => []),
  ]);

  const initialThreads: WhatsAppThread[] = conversations.map((conv) => ({
    id: conv.conversationId,
    recruiterPhone: conv.waPhoneNumber,
    recruiterName: conv.contactName || "Recruiter",
    status: conv.optedOut ? "opted_out" : conv.archived ? "closed" : "active",
    currentFlowStep: "idle",
    leadSubmitted: Boolean(conv.leadSubmitted),
    lastInboundMessageAt: conv.lastInboundAt || conv.lastActivityAt || 0,
    lastOutboundMessageAt: conv.lastOutboundAt || 0,
    customerServiceWindowExpiresAt: conv.customerServiceWindowExpiresAt || 0,
    optedOut: Boolean(conv.optedOut),
    unreadByAdmin: Boolean(conv.unreadByAdmin),
    currentState: conv.currentState,
  }));

  return (
    <AdminPageContainer
      breadcrumb="OPERATIONS"
      subtitle="Recruiter Communication"
      title="WhatsApp Recruiter Hub"
    >
      <AdminSuspense fallbackTitle="WhatsApp Workspace">
        <WhatsAppWorkspaceClient initialThreads={initialThreads} initialLeads={leads} />
      </AdminSuspense>
    </AdminPageContainer>
  );
}
