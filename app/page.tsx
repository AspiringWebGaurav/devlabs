"use client";

import dynamic from "next/dynamic";
import { HeroSection } from "@/components/portfolio";
import { FloatingNav } from "@/components/ui/FloatingNav";
import { navItems } from "@/data";
import { AdaptiveLazySection } from "@/components/ui/AdaptiveLazySection";
import ScrollToTop from "@/components/ui/ScrollToTop";

import {
  GridSectionSkeleton,
  ProjectsSectionSkeleton,
  TestimonialsSectionSkeleton,
  ExperienceSectionSkeleton,
  ApproachSectionSkeleton,
  FooterSectionSkeleton,
} from "@/components/portfolio/skeletons";

// Dynamically chunk and defer below-the-fold modules with dedicated skeletons
const GridSection = dynamic(
  () => import("@/components/portfolio").then((m) => m.GridSection),
  { ssr: false, loading: () => <GridSectionSkeleton /> }
);
const ProjectsSection = dynamic(
  () => import("@/components/portfolio").then((m) => m.ProjectsSection),
  { ssr: false, loading: () => <ProjectsSectionSkeleton /> }
);
const TestimonialsSection = dynamic(
  () => import("@/components/portfolio").then((m) => m.TestimonialsSection),
  { ssr: false, loading: () => <TestimonialsSectionSkeleton /> }
);
const ExperienceSection = dynamic(
  () => import("@/components/portfolio").then((m) => m.ExperienceSection),
  { ssr: false, loading: () => <ExperienceSectionSkeleton /> }
);
const ApproachSection = dynamic(
  () => import("@/components/portfolio").then((m) => m.ApproachSection),
  { ssr: false, loading: () => <ApproachSectionSkeleton /> }
);
const FooterSection = dynamic(
  () => import("@/components/portfolio").then((m) => m.FooterSection),
  { ssr: false, loading: () => <FooterSectionSkeleton /> }
);

export default function Home() {
  return (
    <main className="relative bg-black-100 flex justify-center items-center flex-col mx-auto sm:px-10 px-5 overflow-clip">
      <div className="max-w-7xl w-full">
        <FloatingNav navItems={navItems} />
        {/* Critical first fold: hydrates synchronously */}
        <HeroSection />

        {/* Screen-Adaptive lazy-loaded sections with dedicated skeleton fallbacks */}
        <AdaptiveLazySection id="about" minHeight="600px" placeholder={<GridSectionSkeleton />}>
          <GridSection />
        </AdaptiveLazySection>

        <AdaptiveLazySection id="projects" minHeight="700px" placeholder={<ProjectsSectionSkeleton />}>
          <ProjectsSection />
        </AdaptiveLazySection>

        <AdaptiveLazySection id="testimonials" minHeight="500px" placeholder={<TestimonialsSectionSkeleton />}>
          <TestimonialsSection />
        </AdaptiveLazySection>

        <AdaptiveLazySection minHeight="450px" placeholder={<ExperienceSectionSkeleton />}>
          <ExperienceSection />
        </AdaptiveLazySection>

        <AdaptiveLazySection minHeight="600px" placeholder={<ApproachSectionSkeleton />}>
          <ApproachSection />
        </AdaptiveLazySection>

        <AdaptiveLazySection id="contact" minHeight="400px" placeholder={<FooterSectionSkeleton />}>
          <FooterSection />
        </AdaptiveLazySection>

        <ScrollToTop />
      </div>
    </main>
  );
}
