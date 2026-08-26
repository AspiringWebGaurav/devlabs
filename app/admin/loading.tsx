import React from "react";
import { AdminPageContainer, AdminDashboardTabLoader } from "@/components/admin/layout";

export default function AdminLoading() {
  return (
    <AdminPageContainer breadcrumb="WORKSPACE">
      <AdminDashboardTabLoader />
    </AdminPageContainer>
  );
}
