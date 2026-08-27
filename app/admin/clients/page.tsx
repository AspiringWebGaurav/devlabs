import React from "react";
import { AdminPageContainer } from "@/components/admin/layout/AdminPageContainer";
import { clientsRepository } from "@/lib/dal/repositories/cms/clients.repository";
import { ClientsManager } from "./ClientsManager";

export const dynamic = "force-dynamic";

export default async function AdminClientsPage() {
  const clientsRes = await clientsRepository.getClients();
  const clients = clientsRes.data || [];

  return (
    <AdminPageContainer
      breadcrumb="CONTENT / CLIENT LOGOS"
      title="Client & Partner Logos"
      subtitle="DOMAIN 05 • BRAND STRIP & PARTNERS"
    >
      <ClientsManager initialClients={clients} />
    </AdminPageContainer>
  );
}
