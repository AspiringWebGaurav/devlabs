import React from "react";
import { AdminPageContainer } from "@/components/admin/layout/AdminPageContainer";
import { socialRepository } from "@/lib/dal/repositories/cms/social.repository";
import { SocialManager } from "./SocialManager";

export const dynamic = "force-dynamic";

export default async function AdminSocialPage() {
  const socialRes = await socialRepository.getSocialLinks();
  const socialLinks = socialRes.data || [];

  return (
    <AdminPageContainer
      breadcrumb="CONTENT / SOCIAL LINKS"
      title="Social Media Profiles"
      subtitle="DOMAIN 09 • SOCIAL ICONS & PROFILES"
    >
      <SocialManager initialLinks={socialLinks} />
    </AdminPageContainer>
  );
}
