import { BlogCategory } from "@/types/blog";

export const categories: BlogCategory[] = [
  {
    id: "all",
    slug: "all",
    name: "All Articles",
    description: "Browse all tutorials, case studies, and engineering deep-dives.",
    color: "purple",
  },
  {
    id: "nextjs",
    slug: "nextjs",
    name: "Next.js & React",
    description: "Modern web architecture, App Router, SSR, and performance optimizations.",
    color: "cyan",
  },
  {
    id: "threejs",
    slug: "threejs",
    name: "3D & WebGL",
    description: "Interactive 3D graphics, Three.js shaders, and React Three Fiber animations.",
    color: "emerald",
  },
  {
    id: "ui-ux",
    slug: "ui-ux",
    name: "UI/UX & Animation",
    description: "Micro-interactions, glassmorphism, Framer Motion, and design systems.",
    color: "rose",
  },
  {
    id: "engineering",
    slug: "engineering",
    name: "Engineering & Architecture",
    description: "TypeScript patterns, scalable folder structures, and developer workflows.",
    color: "amber",
  },
];
