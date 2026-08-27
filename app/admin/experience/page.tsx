import React from "react";
import { AdminPageContainer } from "@/components/admin/layout/AdminPageContainer";
import { experienceRepository } from "@/lib/dal/repositories/cms/experience.repository";
import { ExperienceManager } from "./ExperienceManager";

export const dynamic = "force-dynamic";

export default async function AdminExperiencePage() {
  const expRes = await experienceRepository.getExperience();
  const experience = expRes.data || [];

  return (
    <AdminPageContainer
      breadcrumb="CONTENT / EXPERIENCE"
      title="Work Experience Timeline"
      subtitle="DOMAIN 06 • MOVING BORDER CARDS"
    >
      <ExperienceManager initialExperience={experience} />
    </AdminPageContainer>
  );
}
