import React from "react";
import { AdminPageContainer } from "@/components/admin/layout/AdminPageContainer";
import { purgeRepository } from "@/lib/dal/repositories/purge.repository";
import { DatabasePurgeCanvas } from "./components/DatabasePurgeCanvas";

export const dynamic = "force-dynamic";

export default async function AdminPurgePage() {
  const [auditRes, historyRes] = await Promise.all([
    purgeRepository.auditDatabase(),
    purgeRepository.getRecentExecutions(10),
  ]);

  const initialAudit = auditRes.data || null;
  const initialHistory = historyRes.data?.receipts || [];
  const initialNextCursor = historyRes.data?.nextCursor;

  return (
    <AdminPageContainer
      breadcrumb="OPERATIONS / DATABASE RESET"
      title="Database Lifecycle Control Center"
      subtitle="Multi-store sanitation, canonical static seeding, and full-system reconciliation."
    >
      <DatabasePurgeCanvas
        initialAudit={initialAudit}
        initialHistory={initialHistory}
        initialNextCursor={initialNextCursor}
      />
    </AdminPageContainer>
  );
}
