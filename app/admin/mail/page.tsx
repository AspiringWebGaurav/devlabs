import React from "react";
import { AdminPageContainer, AdminSuspense } from "@/components/admin";
import { assertSuperadminSession } from "@/lib/admin/session";
import { mailRepository } from "@/lib/dal/repositories/mail.repository";
import { MailWorkspace } from "./components";

export const dynamic = "force-dynamic";

export default async function AdminMailPage() {
  const session = await assertSuperadminSession();

  const [sentResult, draftsResult] = await Promise.all([
    mailRepository.getSentMails({ pageSize: 20 }),
    mailRepository.getDrafts(session.email),
  ]);

  const initialSentData = sentResult.data || {
    items: [],
    total: 0,
    page: 1,
    pageSize: 20,
    hasMore: false,
  };

  const initialDrafts = draftsResult.data || [];

  return (
    <AdminPageContainer breadcrumb="MAIL CENTER">
      <AdminSuspense fallbackTitle="Mail Center">

        <MailWorkspace
          initialSentData={initialSentData}
          initialDrafts={initialDrafts}
        />
      </AdminSuspense>
    </AdminPageContainer>
  );
}
