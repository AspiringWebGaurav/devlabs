import React from "react";
import { AdminPageContainer } from "@/components/admin/layout/AdminPageContainer";
import { assertSuperadminSession } from "@/lib/admin/session";
import { legalDocumentsRepository } from "@/lib/dal/repositories/legal-documents.repository";
import { LegalOverviewClient } from "./LegalOverviewClient";

export const dynamic = "force-dynamic";

export default async function AdminLegalPage() {
  await assertSuperadminSession();

  const [termsRes, privacyRes, jobsRes, termsHistRes, privacyHistRes] =
    await Promise.all([
      legalDocumentsRepository.getAdminDocument("TERMS"),
      legalDocumentsRepository.getAdminDocument("PRIVACY"),
      legalDocumentsRepository.getRecentNotificationJobs(15),
      legalDocumentsRepository.getVersionHistory("TERMS"),
      legalDocumentsRepository.getVersionHistory("PRIVACY"),
    ]);

  return (
    <AdminPageContainer
      breadcrumb="CONTENT / LEGAL CENTER"
      title="Legal Center & Operating Standards"
      subtitle="MODULE 14 • TERMS OF SERVICE & PRIVACY POLICY MANAGEMENT"
    >
      <LegalOverviewClient
        termsDoc={termsRes.data || null}
        privacyDoc={privacyRes.data || null}
        recentJobs={jobsRes.data || []}
        termsHistoryCount={termsHistRes.data?.length || 0}
        privacyHistoryCount={privacyHistRes.data?.length || 0}
      />
    </AdminPageContainer>
  );
}
