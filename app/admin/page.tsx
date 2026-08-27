import React from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE_NAME } from "@/lib/admin/constants";
import { verifyAdminSession } from "@/lib/admin/auth";
import { AdminPageContainer, AdminSuspense, OverviewCanvas } from "@/components/admin";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  const verifiedSession = sessionCookie ? await verifyAdminSession(sessionCookie) : null;

  if (!verifiedSession) {
    redirect("/admin/login");
  }

  return (
    <AdminPageContainer breadcrumb="PORTFOLIO SERVICES">
      <AdminSuspense fallbackTitle="Portfolio Services Workspace">
        <OverviewCanvas />
      </AdminSuspense>
    </AdminPageContainer>
  );
}
