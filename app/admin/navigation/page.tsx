import React from "react";
import { AdminPageContainer } from "@/components/admin/layout/AdminPageContainer";
import { navigationRepository } from "@/lib/dal/repositories/cms/navigation.repository";
import { NavigationEditor } from "./NavigationEditor";

export const dynamic = "force-dynamic";

export default async function AdminNavigationPage() {
  const navRes = await navigationRepository.getNavigation();
  const navDoc = navRes.data;

  return (
    <AdminPageContainer
      breadcrumb="CONTENT / NAVIGATION"
      title="Floating Navigation Bar"
      subtitle="DOMAIN 08 • SECTION GLIDE ANCHORS"
    >
      <NavigationEditor initialData={navDoc} />
    </AdminPageContainer>
  );
}
