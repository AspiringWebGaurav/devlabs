import React from "react";
import { AdminPageContainer, AdminSuspense } from "@/components/admin";
import { inquiriesRepository } from "@/lib/admin/repositories";
import { InquiriesList } from "./components";

export const dynamic = "force-dynamic";

export default async function AdminInquiriesPage() {
  const result = await inquiriesRepository.getInquiries({ pageSize: 20 });
  const inquiries = result.data?.items || [];

  return (
    <AdminPageContainer
      breadcrumb="INQUIRIES"
      subtitle="Portfolio Inbox"
      title="Contact Form Submissions"
    >
      <AdminSuspense fallbackTitle="Inquiries Feed">
        <InquiriesList inquiries={inquiries} />
      </AdminSuspense>
    </AdminPageContainer>
  );
}
