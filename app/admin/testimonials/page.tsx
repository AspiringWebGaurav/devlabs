import React from "react";
import { AdminPageContainer } from "@/components/admin/layout/AdminPageContainer";
import { testimonialsRepository } from "@/lib/dal/repositories/cms/testimonials.repository";
import { TestimonialsManager } from "./TestimonialsManager";

export const dynamic = "force-dynamic";

export default async function AdminTestimonialsPage() {
  const testimonialsRes = await testimonialsRepository.getTestimonials();
  const testimonials = testimonialsRes.data || [];

  return (
    <AdminPageContainer
      breadcrumb="CONTENT / TESTIMONIALS"
      title="Client Testimonials & Feedback"
      subtitle="DOMAIN 04 • INFINITE MOVING CARDS"
    >
      <TestimonialsManager initialTestimonials={testimonials} />
    </AdminPageContainer>
  );
}
