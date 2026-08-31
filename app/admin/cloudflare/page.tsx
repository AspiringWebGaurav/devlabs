import React from "react";
import { AdminPageContainer } from "@/components/admin/layout/AdminPageContainer";
import { cloudflareRepository } from "@/lib/dal/repositories/cms/cloudflare.repository";
import { CloudflareEditor } from "./CloudflareEditor";

export const dynamic = "force-dynamic";

export default async function AdminCloudflarePage() {
  const cloudflareRes = await cloudflareRepository.getCloudflareSettings();
  const cloudflareDoc = cloudflareRes.data;

  return (
    <AdminPageContainer
      breadcrumb="SECURITY & OPERATIONS / CLOUDFLARE TURNSTILE"
      title="Cloudflare Security & Downtime Controls"
      subtitle="DOMAIN 17 • SECURITY FIREWALL, DOWNTIME SIMULATION & RESILIENT FALLBACK GATEWAYS"
    >
      <CloudflareEditor initialData={cloudflareDoc} />
    </AdminPageContainer>
  );
}
