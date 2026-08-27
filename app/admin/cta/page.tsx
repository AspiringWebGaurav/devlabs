import React from "react";
import { AdminPageContainer } from "@/components/admin/layout/AdminPageContainer";
import { ctaRepository } from "@/lib/dal/repositories/cms/cta.repository";
import { CtaEditor } from "./CtaEditor";

export const dynamic = "force-dynamic";

export default async function AdminCtaPage() {
  const ctaRes = await ctaRepository.getCta();
  const ctaDoc = ctaRes.data;

  return (
    <AdminPageContainer
      breadcrumb="CONTENT / CALL TO ACTION"
      title="Call to Action Banner"
      subtitle="DOMAIN 10 • CONVERSION HIGHLIGHT & MODAL"
    >
      <CtaEditor initialData={ctaDoc} />
    </AdminPageContainer>
  );
}
