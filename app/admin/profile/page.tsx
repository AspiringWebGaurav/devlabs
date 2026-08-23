import React from "react";
import { AdminPageContainer, AdminSuspense } from "@/components/admin";
import { AdminProfileWorkspace } from "./components";

export const dynamic = "force-dynamic";

export default function AdminProfilePage() {
  return (
    <AdminPageContainer breadcrumb="SUPERADMIN PROFILE">
      <AdminSuspense fallbackTitle="Admin Profile Workspace">
        <AdminProfileWorkspace />
      </AdminSuspense>
    </AdminPageContainer>
  );
}
