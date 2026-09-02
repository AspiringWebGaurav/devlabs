import React from "react";
import { AdminPageContainer, AdminSuspense } from "@/components/admin";
import { whatsappRepository } from "@/lib/whatsapp/persistence/whatsapp.repository";
import { WhatsAppWorkspaceClient } from "./components/WhatsAppWorkspaceClient";

export const dynamic = "force-dynamic";

export default async function AdminWhatsAppPage() {
  const [threads, leads] = await Promise.all([
    whatsappRepository.listThreads().catch(() => []),
    whatsappRepository.listOpportunityLeads().catch(() => []),
  ]);

  return (
    <AdminPageContainer
      breadcrumb="OPERATIONS"
      subtitle="Recruiter Communication"
      title="WhatsApp Recruiter Hub"
    >
      <AdminSuspense fallbackTitle="WhatsApp Workspace">
        <WhatsAppWorkspaceClient initialThreads={threads} initialLeads={leads} />
      </AdminSuspense>
    </AdminPageContainer>
  );
}
