import React from "react";
import { AdminPageContainer } from "@/components/admin/layout/AdminPageContainer";
import { footerRepository } from "@/lib/dal/repositories/cms/footer.repository";
import { FooterEditor } from "./FooterEditor";

export const dynamic = "force-dynamic";

export default async function AdminFooterPage() {
  const footerRes = await footerRepository.getFooter();
  const footerDoc = footerRes.data;

  return (
    <AdminPageContainer
      breadcrumb="CONTENT / FOOTER"
      title="Footer & Legal Compliance"
      subtitle="DOMAIN 11 • COPYRIGHT & LEGAL LINKS"
    >
      <FooterEditor initialData={footerDoc} />
    </AdminPageContainer>
  );
}
