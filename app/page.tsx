import dynamic from "next/dynamic";
import { HeroSection } from "@/components/portfolio/HeroSection";
import { FloatingNav } from "@/components/ui/FloatingNav";
import ScrollToTop from "@/components/ui/ScrollToTop";
import { LivePortfolioSync } from "@/components/portfolio/LivePortfolioSync";
import { getPortfolioData } from "@/lib/public-data/getPortfolioData";

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
  { loading: () => <GridSectionSkeleton /> }
);
const ProjectsSection = dynamic(
  () => import("@/components/portfolio/ProjectsSection").then((m) => m.ProjectsSection),
  { loading: () => <ProjectsSectionSkeleton /> }
);
const TestimonialsSection = dynamic(
  () => import("@/components/portfolio/TestimonialsSection").then((m) => m.TestimonialsSection),
  { loading: () => <TestimonialsSectionSkeleton /> }
);
const ExperienceSection = dynamic(
  () => import("@/components/portfolio/ExperienceSection").then((m) => m.ExperienceSection),
  { loading: () => <ExperienceSectionSkeleton /> }
);
const ApproachSection = dynamic(
  () => import("@/components/portfolio/ApproachSection").then((m) => m.ApproachSection),
  { loading: () => <ApproachSectionSkeleton /> }
);
const FooterSection = dynamic(
  () => import("@/components/portfolio/FooterSection").then((m) => m.FooterSection),
  { loading: () => <FooterSectionSkeleton /> }
);

export default async function Home() {
  const data = await getPortfolioData();

  const formattedNav = (data.navigation || []).map((item) => ({
    name: item.name,
    link: item.link,
  }));

  return (
    <main className="relative bg-black-100 flex justify-center items-center flex-col mx-auto sm:px-10 px-5 overflow-clip">
      <LivePortfolioSync />
      <div className="max-w-7xl w-full">
        <FloatingNav navItems={formattedNav} />

        {/* Critical first fold */}
        <HeroSection data={data.hero} />

        {/* Below-the-fold modules */}
        <div id="about" className="w-full">
          <GridSection cards={data.cards} />
        </div>

        <div id="projects" className="w-full">
          <ProjectsSection projects={data.projects} />
        </div>

        <div id="testimonials" className="w-full">
          <TestimonialsSection
            testimonials={data.testimonials}
            clients={data.clients}
          />
        </div>

        <div id="experience" className="w-full">
          <ExperienceSection experience={data.experience} />
        </div>

        <div id="approach" className="w-full">
          <ApproachSection phases={data.phases} />
        </div>

        <div id="contact" className="w-full">
          <FooterSection
            cta={data.cta}
            footer={data.footer}
            socialLinks={data.socialLinks}
          />
        </div>

        <ScrollToTop />
      </div>
    </main>
  );
}
