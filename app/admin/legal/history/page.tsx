import React from "react";
import { AdminPageContainer } from "@/components/admin/layout/AdminPageContainer";
import { assertSuperadminSession } from "@/lib/admin/session";
import { legalDocumentsRepository } from "@/lib/dal/repositories/legal-documents.repository";
import { LegalHistoryClient } from "./LegalHistoryClient";

export const dynamic = "force-dynamic";

export default async function AdminLegalHistoryPage() {
  await assertSuperadminSession();

  const [termsHistRes, privacyHistRes] = await Promise.all([
    legalDocumentsRepository.getVersionHistory("TERMS"),
    legalDocumentsRepository.getVersionHistory("PRIVACY"),
  ]);

  return (
    <AdminPageContainer
      breadcrumb="CONTENT / LEGAL CENTER / HISTORY"
      title="Immutable Legal History Ledger"
      subtitle="MODULE 14 • AUDIT ARCHIVE & VERSION REVERSION"
    >
      <LegalHistoryClient
        termsHistory={termsHistRes.data || []}
        privacyHistory={privacyHistRes.data || []}
      />
    </AdminPageContainer>
  );
}
