import React from "react";
import { AdminPageContainer, AdminDashboardTabLoader } from "@/components/admin/layout";

export default function AdminLoading() {
  return (
    <AdminPageContainer breadcrumb="LOADING WORKSPACE">
      <AdminDashboardTabLoader />
    </AdminPageContainer>
  );
}


