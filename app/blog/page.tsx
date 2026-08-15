import type { Metadata } from "next";
import { FloatingNav } from "@/components/ui/FloatingNav";
import { Spotlight } from "@/components/ui/Spotlight";
import { navItems } from "@/data";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ui/ScrollToTop";
import { getAllPosts, getCategories, getFeaturedPost } from "@/lib/blog";
import { BlogListingClient } from "./BlogListingClient";

export const metadata: Metadata = {
  title: "Blog | Insights, Tutorials & Engineering by Gaurav Patil",
  description:
    "Explore in-depth articles on Next.js 15, React 19, Three.js WebGL shaders, Framer Motion animations, and modern frontend architecture.",
  openGraph: {
    title: "Blog | Gaurav Patil - Front-End & UI/UX Engineer",
    description:
      "Deep-dives into modern web engineering, 3D graphics with Three.js, and fluid UI/UX design patterns.",
    type: "website",
  },
};

export default async function BlogPage() {
  const [allPosts, categories, featuredPost] = await Promise.all([
    getAllPosts(),
    getCategories(),
    getFeaturedPost(),
  ]);

  return (
    <main className="relative bg-black-100 flex justify-center items-center flex-col mx-auto sm:px-10 px-5 overflow-clip min-h-screen">
      {/* Background Spotlights */}
      <div>
        <Spotlight
          className="-top-40 -left-10 md:-left-32 md:-top-20 h-screen"
          fill="white"
        />
        <Spotlight
          className="h-[80vh] w-[50vw] top-10 left-full"
          fill="purple"
        />
        <Spotlight className="left-80 top-28 h-[80vh] w-[50vw]" fill="blue" />
      </div>

      {/* Full-width Grid Background with Radial Mask */}
      <div
        className="h-screen w-full dark:bg-black-100 bg-white dark:bg-grid-white/[0.03] bg-grid-black-100/[0.2]
       absolute top-0 left-0 flex items-center justify-center pointer-events-none"
      >
        <div
          className="absolute pointer-events-none inset-0 flex items-center justify-center dark:bg-black-100
         bg-white [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]"
        />
      </div>

      <div className="max-w-7xl w-full relative z-10 flex flex-col justify-between min-h-screen">
        {/* Navigation Pill */}
        <FloatingNav navItems={navItems} />

        <div className="pb-16 flex-grow">
          <BlogListingClient
            initialPosts={allPosts}
            categories={categories}
            featuredPost={featuredPost}
          />
        </div>

        {/* Shared Footer */}
        <Footer />
      </div>

      <ScrollToTop />
    </main>
  );
}
