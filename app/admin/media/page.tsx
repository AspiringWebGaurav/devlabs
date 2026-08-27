import React from "react";
import { AdminPageContainer } from "@/components/admin/layout/AdminPageContainer";
import { mediaRepository } from "@/lib/dal/repositories/media.repository";
import { MediaManager } from "./MediaManager";

export const dynamic = "force-dynamic";

export default async function AdminMediaPage() {
  const [assetsRes, auditRes] = await Promise.all([
    mediaRepository.getAssets(),
    mediaRepository.auditLedger(),
  ]);

  const assets = assetsRes.data || [];
  const audit = auditRes.data || null;

  return (
    <AdminPageContainer
      breadcrumb="OPERATIONS / MEDIA ASSETS"
      title="Media Asset Ledger & Storage"
      subtitle="SUPPORTING INFRASTRUCTURE • 1:1 OWNERSHIP & ORPHAN RECONCILIATION"
    >
      <MediaManager initialAssets={assets} initialAudit={audit} />
    </AdminPageContainer>
  );
}
