import React from "react";
import { AdminPageContainer } from "@/components/admin/layout/AdminPageContainer";
import { assertSuperadminSession } from "@/lib/admin/session";
import { legalDocumentsRepository } from "@/lib/dal/repositories/legal-documents.repository";
import { LegalEditorClient } from "./LegalEditorClient";

export const dynamic = "force-dynamic";

export default async function AdminLegalEditorPage() {
  await assertSuperadminSession();

  const [termsRes, privacyRes] = await Promise.all([
    legalDocumentsRepository.getAdminDocument("TERMS"),
    legalDocumentsRepository.getAdminDocument("PRIVACY"),
  ]);

  return (
    <AdminPageContainer
      breadcrumb="CONTENT / LEGAL CENTER / EDITOR"
      title="Legal Document & Policy Editor"
      subtitle="MODULE 14 • CLAUSE MANAGEMENT & DRAFT REVISIONS"
    >
      <LegalEditorClient
        termsDoc={termsRes.data || null}
        privacyDoc={privacyRes.data || null}
      />
    </AdminPageContainer>
  );
}
