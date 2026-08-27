import React from "react";
import { AdminPageContainer } from "@/components/admin/layout/AdminPageContainer";
import { seoRepository } from "@/lib/dal/repositories/cms/seo.repository";
import { SeoEditor } from "./SeoEditor";

export const dynamic = "force-dynamic";

export default async function AdminSeoPage() {
  const seoRes = await seoRepository.getSeo();
  const seoDoc = seoRes.data;

  return (
    <AdminPageContainer
      breadcrumb="CONTENT / SEO & METADATA"
      title="Search Engine & Social Metadata"
      subtitle="DOMAIN 12 • OPEN GRAPH & TWITTER CARDS"
    >
      <SeoEditor initialData={seoDoc} />
    </AdminPageContainer>
  );
}
