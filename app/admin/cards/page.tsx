import React from "react";
import { AdminPageContainer } from "@/components/admin/layout/AdminPageContainer";
import { cardsRepository } from "@/lib/dal/repositories/cms/cards.repository";
import { CardsEditor } from "./CardsEditor";

export const dynamic = "force-dynamic";

export default async function AdminCardsPage() {
  const cardsRes = await cardsRepository.getCards();
  const cards = cardsRes.data || [];

  return (
    <AdminPageContainer
      breadcrumb="CONTENT / BENTO CARDS"
      title="Bento Grid & About Cards"
      subtitle="DOMAIN 02 • 6-SLOT INTERACTIVE GRID"
    >
      <CardsEditor initialCards={cards} />
    </AdminPageContainer>
  );
}
