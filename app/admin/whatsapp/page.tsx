import React from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE_NAME } from "@/lib/admin/constants";
import { verifyAdminSession } from "@/lib/admin/auth";
import { AdminPageContainer, AdminSuspense } from "@/components/admin";
import { WhatsAppWorkspaceClient } from "./components/WhatsAppWorkspaceClient";

export const dynamic = "force-dynamic";

export default async function AdminWhatsAppPage() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  const session = await verifyAdminSession(sessionToken);
  if (!session) {
    redirect("/admin/login");
  }

  return (
    <AdminPageContainer
      breadcrumb="OPERATIONS"
      subtitle="Recruiter Communication"
      title="WhatsApp Recruiter Hub"
    >
      <AdminSuspense fallbackTitle="WhatsApp Workspace">
        <WhatsAppWorkspaceClient initialThreads={[]} initialLeads={[]} />
      </AdminSuspense>
    </AdminPageContainer>
  );
}
