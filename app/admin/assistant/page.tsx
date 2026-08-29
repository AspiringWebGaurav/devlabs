import React from "react";
import { AdminPageContainer } from "@/components/admin/layout/AdminPageContainer";
import { assistantRepository } from "@/lib/dal/repositories/cms/assistant.repository";
import { AssistantEditor } from "./AssistantEditor";

export const dynamic = "force-dynamic";

export default async function AdminAssistantPage() {
  const assistantRes = await assistantRepository.getAssistant();
  const assistantDoc = assistantRes.data;

  return (
    <AdminPageContainer
      breadcrumb="CONTENT / PERSONAL ASSISTANT"
      title="Personal Assistant Bubble"
      subtitle="DOMAIN 13 • FLOATING LAUNCHER CONTROLS"
    >
      <AssistantEditor initialData={assistantDoc} />
    </AdminPageContainer>
  );
}
