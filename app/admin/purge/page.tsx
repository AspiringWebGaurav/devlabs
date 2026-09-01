import React from "react";
import { AdminPageContainer } from "@/components/admin/layout/AdminPageContainer";
import { purgeRepository } from "@/lib/dal/repositories/purge.repository";
import { DatabasePurgeCanvas } from "./components/DatabasePurgeCanvas";

export const dynamic = "force-dynamic";

export default async function AdminPurgePage() {
  const auditRes = await purgeRepository.auditDatabase();
  const initialAudit = auditRes.data || null;

  return (
    <AdminPageContainer
      breadcrumb="OPERATIONS / DATABASE RESET"
      title="Database Reset"
      subtitle="Clean your development data or start fresh with test data."
    >
      <DatabasePurgeCanvas initialAudit={initialAudit} />
    </AdminPageContainer>
  );
}
