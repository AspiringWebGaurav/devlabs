import React from "react";
import { AdminPageContainer } from "@/components/admin/layout";
import { AdminOverviewSkeleton } from "@/components/admin/skeletons";

export default function AdminLoading() {
  return (
    <AdminPageContainer breadcrumb="PORTFOLIO SERVICES">
      <AdminOverviewSkeleton />
    </AdminPageContainer>
  );
}
