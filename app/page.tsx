"use client";

import dynamic from "next/dynamic";
import Hero from "@/components/Hero";
import { FloatingNav } from "@/components/ui/FloatingNav";
import { navItems } from "@/data";
import { AdaptiveLazySection } from "@/components/ui/AdaptiveLazySection";
import ScrollToTop from "@/components/ui/ScrollToTop";

// Dynamically chunk and defer below-the-fold modules
const Grid = dynamic(() => import("@/components/Grid"), { ssr: false });
const RecentProjects = dynamic(() => import("@/components/RecentProjects"), { ssr: false });
const Clients = dynamic(() => import("@/components/Clients"), { ssr: false });
const Experience = dynamic(() => import("@/components/Experience"), { ssr: false });
const Approach = dynamic(() => import("@/components/Approach"), { ssr: false });
const Footer = dynamic(() => import("@/components/Footer"), { ssr: false });

export default function Home() {
  return (
    <main className="relative bg-black-100 flex justify-center items-center flex-col mx-auto sm:px-10 px-5 overflow-clip">
      <div className="max-w-7xl w-full">
        <FloatingNav navItems={navItems} />
        {/* Critical first fold: hydrates synchronously */}
        <Hero />

        {/* Screen-Adaptive lazy-loaded sections with anticipatory margins */}
        <AdaptiveLazySection id="about" minHeight="600px">
          <Grid />
        </AdaptiveLazySection>

        <AdaptiveLazySection id="projects" minHeight="700px">
          <RecentProjects />
        </AdaptiveLazySection>

        <AdaptiveLazySection id="testimonials" minHeight="500px">
          <Clients />
        </AdaptiveLazySection>

        <AdaptiveLazySection minHeight="450px">
          <Experience />
        </AdaptiveLazySection>

        <AdaptiveLazySection minHeight="600px">
          <Approach />
        </AdaptiveLazySection>

        <AdaptiveLazySection id="contact" minHeight="400px">
          <Footer />
        </AdaptiveLazySection>

        <ScrollToTop />
      </div>
    </main>
  );
}
