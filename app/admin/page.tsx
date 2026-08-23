import React from "react";
import { AdminPageContainer, AdminSuspense, OverviewCanvas } from "@/components/admin";

export const dynamic = "force-dynamic";

export default function AdminDashboardPage() {
  return (
    <AdminPageContainer breadcrumb="PORTFOLIO SERVICES">
      <AdminSuspense fallbackTitle="Portfolio Services Workspace">
        <OverviewCanvas />
      </AdminSuspense>
    </AdminPageContainer>
  );
}
