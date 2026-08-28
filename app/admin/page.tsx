import React from "react";
import { cookies } from "next/headers";
import { ADMIN_COOKIE_NAME } from "@/lib/admin/constants";
import { verifyAdminSession } from "@/lib/admin/auth";
import { AdminEntryGate } from "@/components/admin";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  const verifiedSession = sessionCookie ? await verifyAdminSession(sessionCookie) : null;

  return <AdminEntryGate initialSession={verifiedSession} />;
}

