"use client";

import dynamic from "next/dynamic";
import { HeroSection } from "@/components/portfolio/HeroSection";
import { FloatingNav } from "@/components/ui/FloatingNav";
import { navItems } from "@/data";
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
  () => import("@/components/portfolio/GridSection").then((m) => m.GridSection),
  { ssr: false, loading: () => <GridSectionSkeleton /> }
);
const ProjectsSection = dynamic(
  () => import("@/components/portfolio/ProjectsSection").then((m) => m.ProjectsSection),
  { ssr: false, loading: () => <ProjectsSectionSkeleton /> }
);
const TestimonialsSection = dynamic(
  () => import("@/components/portfolio/TestimonialsSection").then((m) => m.TestimonialsSection),
  { ssr: false, loading: () => <TestimonialsSectionSkeleton /> }
);
const ExperienceSection = dynamic(
  () => import("@/components/portfolio/ExperienceSection").then((m) => m.ExperienceSection),
  { ssr: false, loading: () => <ExperienceSectionSkeleton /> }
);
const ApproachSection = dynamic(
  () => import("@/components/portfolio/ApproachSection").then((m) => m.ApproachSection),
  { ssr: false, loading: () => <ApproachSectionSkeleton /> }
);
const FooterSection = dynamic(
  () => import("@/components/portfolio/FooterSection").then((m) => m.FooterSection),
  { ssr: false, loading: () => <FooterSectionSkeleton /> }
);

export default function Home() {
  return (
    <main className="relative bg-black-100 flex justify-center items-center flex-col mx-auto sm:px-10 px-5 overflow-clip">
      <div className="max-w-7xl w-full">
        <FloatingNav navItems={navItems} />
        {/* Critical first fold: hydrates synchronously */}
        <HeroSection />

        {/* Below-the-fold modules with instant frame-0 high-contrast skeleton fallbacks */}
        <div id="about" className="w-full">
          <GridSection />
        </div>

        <div id="projects" className="w-full">
          <ProjectsSection />
        </div>

        <div id="testimonials" className="w-full">
          <TestimonialsSection />
        </div>

        <div id="experience" className="w-full">
          <ExperienceSection />
        </div>

        <div id="approach" className="w-full">
          <ApproachSection />
        </div>

        <div id="contact" className="w-full">
          <FooterSection />
        </div>

        <ScrollToTop />
      </div>
    </main>
  );
}
