import React from "react";
import { AdminPageContainer } from "@/components/admin/layout/AdminPageContainer";
import { projectsRepository } from "@/lib/dal/repositories/cms/projects.repository";
import { ProjectsManager } from "./ProjectsManager";

export const dynamic = "force-dynamic";

export default async function AdminProjectsPage() {
  const projectsRes = await projectsRepository.getProjects();
  const projects = projectsRes.data || [];

  return (
    <AdminPageContainer
      breadcrumb="CONTENT / PROJECTS"
      title="Project Showcase Portfolio"
      subtitle="DOMAIN 03 • 3D PIN CARDS & SHOWCASE"
    >
      <ProjectsManager initialProjects={projects} />
    </AdminPageContainer>
  );
}
