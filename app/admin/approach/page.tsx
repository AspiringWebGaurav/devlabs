import React from "react";
import { AdminPageContainer } from "@/components/admin/layout/AdminPageContainer";
import { approachRepository } from "@/lib/dal/repositories/cms/approach.repository";
import { ApproachManager } from "./ApproachManager";

export const dynamic = "force-dynamic";

export default async function AdminApproachPage() {
  const phasesRes = await approachRepository.getPhases();
  const phases = phasesRes.data || [];

  return (
    <AdminPageContainer
      breadcrumb="CONTENT / APPROACH PHASES"
      title="Methodology & Process Phases"
      subtitle="DOMAIN 07 • CANVAS REVEAL EFFECT"
    >
      <ApproachManager initialPhases={phases} />
    </AdminPageContainer>
  );
}
