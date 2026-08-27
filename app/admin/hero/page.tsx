import React from "react";
import { AdminPageContainer } from "@/components/admin/layout/AdminPageContainer";
import { heroRepository } from "@/lib/dal/repositories/cms/hero.repository";
import { HeroEditor } from "./HeroEditor";

export const dynamic = "force-dynamic";

export default async function AdminHeroPage() {
  const heroRes = await heroRepository.getHero();
  const heroData = heroRes.data;

  return (
    <AdminPageContainer
      breadcrumb="CONTENT / HERO & BIO"
      title="Hero Section & Identity"
      subtitle="DOMAIN 01 • PUBLIC SHOWCASE"
    >
      <HeroEditor initialData={heroData} />
    </AdminPageContainer>
  );
}
