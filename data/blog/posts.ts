import { BlogPost } from "@/types/blog";
import { authors } from "./authors";
import { categories } from "./categories";

export const posts: BlogPost[] = [
  {
    id: "1",
    slug: "building-high-performance-nextjs-15-applications",
    title: "Building High-Performance Web Apps with Next.js 15 & React 19",
    subtitle: "A deep dive into App Router optimizations, Server Components, and seamless HMR stability.",
    excerpt: "Explore architectural strategies to build lightning-fast web applications with Next.js 15, mastering code splitting, streaming hydration, and edge caching.",
    coverImage: "/b1.svg",
    galleryImages: ["/b1.svg", "/p3.svg", "/b5.svg"],
    category: categories.find((c) => c.slug === "nextjs") || categories[1],
    tags: ["Next.js 15", "React 19", "App Router", "Performance", "TypeScript"],
    author: authors.gaurav,
    publishedAt: "Aug 14, 2025",
    readingTime: "6 min read",
    featured: true,
    content: {
      intro: "Next.js 15 paired with React 19 marks a monumental leap forward in frontend engineering. By fundamentally rethinking how data flows between server and client boundaries, we can construct interactive web applications that maintain sub-100ms First Contentful Paint times while preserving rich client-side interactivity.",
      sections: [
        {
          id: "server-client-boundaries",
          heading: "1. Mastering Server and Client Boundaries",
          paragraphs: [
            "The quintessential pitfall in Next.js App Router applications is indiscriminately marking component files with 'use client'. When a component is converted to a Client Component, every imported dependency becomes part of the client bundle payload.",
            "Instead, architecture should follow the 'Leaf Node Strategy'. Keep layouts, data fetchers, and heavy structural containers as Server Components. Only push 'use client' down to isolated interactive widgets like custom buttons, animated hover pills, or dynamic search inputs."
          ],
          codeSnippet: {
            language: "tsx",
            filename: "components/BlogFilter.tsx",
            code: `// Leaf node client component keeping parent server rendered
"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function BlogFilter({ category }: { category: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleSelect = (cat: string) => {
    startTransition(() => {
      router.push(\`/blog?category=\${cat}\`, { scroll: false });
    });
  };

  return (
    <button 
      onClick={() => handleSelect(category)}
      className="px-4 py-2 rounded-full border border-white/10"
    >
      {category}
    </button>
  );
}`
          },
          quote: {
            text: "Performance is not a final optimization pass; it is an architectural decision made at the very first line of code.",
            caption: "Next.js Performance Handbook"
          }
        },
        {
          id: "streaming-suspense",
          heading: "2. Streaming Hydration & Dynamic Code Splitting",
          paragraphs: [
            "Heavy 3D canvases, Lottie animations, and complex shader materials shouldn't block the initial page render. By utilizing React Suspense combined with Next.js dynamic imports, we can stream core UI elements immediately while asynchronously deferring heavyweight modules.",
            "By setting ssr: false on GPU-intensive components, we avoid server-side WebGL context stubs and eliminate hydration mismatches entirely."
          ],
          gallery: ["/p2.svg", "/p3.svg"]
        },
        {
          id: "caching-and-stability",
          heading: "3. Robust Caching & File Watcher Stability",
          paragraphs: [
            "When developing on Windows workstations with complex npm monorepos, file lock contention between Turbopack, Webpack cache, and Fast Refresh can disrupt developer velocity.",
            "Configuring explicit watchOptions with polling intervals and transpilePackages guarantees that HMR reloads in milliseconds without corrupted cache state."
          ],
          codeSnippet: {
            language: "typescript",
            filename: "next.config.ts",
            code: `const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["three", "three-globe"],
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
        ignored: ["**/node_modules", "**/.next"],
      };
    }
    return config;
  },
};`
          }
        }
      ],
      conclusion: "Adopting strict component boundary separation, strategic lazy loading, and modern caching transforms Next.js 15 applications into blazingly fast, production-grade powerhouses. Focus on clean data contracts, and your frontend will effortlessly scale as traffic surges."
    },
    comments: [
      {
        id: "c1",
        postId: "1",
        author: {
          name: "Alex Rivera",
          avatar: "/profile.svg",
          role: "Senior Full-Stack Engineer"
        },
        createdAt: "2 days ago",
        content: "The Leaf Node strategy completely transformed our bundle size. We saw an immediate 40% reduction in First Load JS across our marketing routes!",
        likesCount: 14,
        isLiked: true,
        replies: [
          {
            id: "c1-r1",
            postId: "1",
            author: {
              name: "Gaurav Patil",
              avatar: "/profile.svg",
              role: "Author"
            },
            createdAt: "1 day ago",
            content: "Awesome to hear, Alex! Keeping data-heavy containers as Server Components is definitely the highest ROI pattern in App Router.",
            likesCount: 5,
            parentId: "c1"
          }
        ]
      },
      {
        id: "c2",
        postId: "1",
        author: {
          name: "Sophia Chen",
          avatar: "/profile.svg",
          role: "UI Engineer"
        },
        createdAt: "3 days ago",
        content: "Great breakdown of the Windows HMR cache locking issue. The polling watchOptions configuration solved our dev server crashes.",
        likesCount: 8
      }
    ]
  },
  {
    id: "2",
    slug: "mastering-threejs-shaders-in-react",
    title: "Mastering Three.js & GLSL Shaders in React Applications",
    subtitle: "From custom vertex deformations to silky smooth WebGL post-processing effects.",
    excerpt: "Learn how to integrate custom GLSL fragment shaders and 3D geometries inside React Three Fiber without draining mobile batteries or crashing memory.",
    coverImage: "/p1.svg",
    galleryImages: ["/p1.svg", "/b5.svg"],
    category: categories.find((c) => c.slug === "threejs") || categories[2],
    tags: ["Three.js", "WebGL", "GLSL", "React Three Fiber", "3D Graphics"],
    author: authors.gaurav,
    publishedAt: "Aug 10, 2025",
    readingTime: "8 min read",
    featured: false,
    content: {
      intro: "Web-based 3D experiences have evolved from gimmicky demos into foundational elements of modern, high-tier developer portfolios and interactive product showcases. However, running WebGL smoothly across diverse hardware requires deep respect for GPU pipelines and memory lifecycle management.",
      sections: [
        {
          id: "glsl-custom-shaders",
          heading: "1. Authoring Custom GLSL Fragment Shaders",
          paragraphs: [
            "Rather than relying strictly on standard MeshStandardMaterial, custom ShaderMaterials allow you to compute pixel mathematics directly on the graphics card at 60 frames per second.",
            "By feeding screen coordinates, normalized time uniforms, and resolution vectors into GLSL fragment shaders, we can synthesize dot matrix glows, flowing fluid backgrounds, and chromatic aberrations."
          ],
          codeSnippet: {
            language: "glsl",
            filename: "shaders/revealFragment.glsl",
            code: `precision mediump float;
in vec2 fragCoord;
uniform float u_time;
uniform vec3 u_color;
uniform vec2 u_resolution;
out vec4 fragColor;

void main() {
  vec2 st = fragCoord.xy / u_resolution.xy;
  float wave = sin(st.x * 10.0 + u_time * 2.0) * 0.5 + 0.5;
  vec3 finalColor = mix(u_color, vec3(0.8, 0.7, 1.0), wave);
  fragColor = vec4(finalColor, 0.85);
}`
          }
        },
        {
          id: "gpu-memory-disposal",
          heading: "2. The Critical Role of GPU Resource Disposal",
          paragraphs: [
            "One of the most frequent causes of browser tab crashes in Single Page Applications is WebGL memory leakage. When a component unmounts, JavaScript garbage collection does NOT automatically release GPU textures, geometry vertex buffers, or shader programs.",
            "Every Three.js mesh, geometry, and material MUST be explicitly disposed of in the React useEffect cleanup return callback."
          ],
          quote: {
            text: "If you do not dispose of your Three.js geometries and materials, the GPU will silently hoard memory until the browser kills the WebGL context.",
            caption: "WebGL Best Practices"
          }
        }
      ],
      conclusion: "Three.js and R3F empower us to build unforgettable digital spaces. Pair custom shaders with disciplined memory disposal, and your interactive 3D interfaces will remain silky smooth on everything from high-end GPUs to budget smartphones."
    },
    comments: [
      {
        id: "c3",
        postId: "2",
        author: {
          name: "Marcus Brody",
          avatar: "/profile.svg",
          role: "Creative Technologist"
        },
        createdAt: "5 days ago",
        content: "The disposal recursion snippet is pure gold. Solved our memory leak when toggling routes!",
        likesCount: 11
      }
    ]
  },
  {
    id: "3",
    slug: "crafting-fluid-micro-animations-framer-motion",
    title: "Crafting Fluid Micro-Animations with Framer Motion",
    subtitle: "Elevate your web interfaces with physics-based springs, scroll-driven transforms, and gesture feedback.",
    excerpt: "Discover the secrets of organic UI animations: damping ratios, spring stiffness, scroll-linked parallax, and layout morphing.",
    coverImage: "/b5.svg",
    galleryImages: ["/b5.svg", "/p4.svg"],
    category: categories.find((c) => c.slug === "ui-ux") || categories[3],
    tags: ["Framer Motion", "UI/UX", "Animation", "CSS", "Micro-Interactions"],
    author: authors.gaurav,
    publishedAt: "Aug 05, 2025",
    readingTime: "5 min read",
    featured: false,
    content: {
      intro: "Great animations don't announce themselves; they feel as natural and intuitive as physical objects in the real world. By tuning spring physics parameters and choreographing stagger sequences, we bridge the gap between static wireframes and living, breathing digital products.",
      sections: [
        {
          id: "spring-physics",
          heading: "1. Replacing Linear Easing with Spring Physics",
          paragraphs: [
            "Traditional CSS ease-in-out transitions often feel robotic because human movement in reality never accelerates and decelerates uniformly. Spring physics simulate real mass, stiffness, and damping.",
            "A stiffness of 280 and damping of 20 gives button taps and modal entrances an energetic, snappy response without unwanted oscillation."
          ],
          codeSnippet: {
            language: "tsx",
            filename: "components/PillButton.tsx",
            code: `<motion.button
  whileHover={{ scale: 1.08, y: -2 }}
  whileTap={{ scale: 0.94 }}
  transition={{
    type: "spring",
    stiffness: 300,
    damping: 18,
    mass: 0.7,
  }}
  className="bg-purple text-black font-semibold px-6 py-2.5 rounded-full"
>
  Explore More
</motion.button>`
          }
        },
        {
          id: "scroll-linked-transforms",
          heading: "2. Scroll-Linked Values Without Layout Reflows",
          paragraphs: [
            "Avoid binding window scroll event listeners directly to React state. Doing so causes dozens of re-renders per second, ruining frame rates.",
            "Instead, use Motion's useScroll and useTransform hooks. These update CSS transform properties directly on GPU layers, completely bypassing the React reconciliation tree."
          ]
        }
      ],
      conclusion: "Micro-animations transform good interfaces into unforgettable products. Keep durations crisp (under 300ms for UI actions) and let spring physics handle the delightful tactile feedback."
    },
    comments: [
      {
        id: "c4",
        postId: "3",
        author: {
          name: "Elena Rostova",
          avatar: "/profile.svg",
          role: "Product Designer"
        },
        createdAt: "1 week ago",
        content: "Love the emphasis on not over-animating. The spring values provided here feel just right.",
        likesCount: 9
      }
    ]
  },
  {
    id: "4",
    slug: "architecting-scalable-enterprise-frontends",
    title: "Architecting Scalable Frontends: The Data Access Layer Pattern",
    subtitle: "How to decouple your UI components from backend dependencies for seamless CMS and database migrations.",
    excerpt: "Learn how the Data Access Layer (DAL) pattern shields your React components from vendor lock-in, enabling frictionless transitions from static fixtures to Firestore or Supabase.",
    coverImage: "/p3.svg",
    galleryImages: ["/p3.svg", "/p1.svg"],
    category: categories.find((c) => c.slug === "engineering") || categories[4],
    tags: ["Architecture", "TypeScript", "Clean Code", "Design Patterns", "DAL"],
    author: authors.gaurav,
    publishedAt: "Jul 28, 2025",
    readingTime: "7 min read",
    featured: false,
    content: {
      intro: "In modern software development, databases and headless CMS solutions evolve constantly. If your UI components directly call specific SDK endpoints or query APIs with scattered URLs, changing your backend architecture becomes an expensive, error-prone rewrite. The Data Access Layer pattern provides the ideal buffer.",
      sections: [
        {
          id: "dal-structure",
          heading: "1. Constructing the Data Access Layer",
          paragraphs: [
            "A DAL provides an abstraction layer between presentation components and raw data sources. All fetching, filtering, parsing, and caching logic resides in dedicated service modules that export strictly typed async functions.",
            "The rest of your application only imports these standardized DAL methods, remaining completely oblivious to whether the data comes from a local TypeScript file, Firestore, or a GraphQL endpoint."
          ],
          codeSnippet: {
            language: "typescript",
            filename: "lib/blog.ts",
            code: `import { BlogPost } from "@/types/blog";
import { posts as staticPosts } from "@/data/blog/posts";

export async function getAllPosts(): Promise<BlogPost[]> {
  // Today: return static mock data
  // Tomorrow: const snapshot = await getDocs(collection(db, "posts"));
  return staticPosts;
}

export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  const posts = await getAllPosts();
  return posts.find((p) => p.slug === slug) || null;
}`
          }
        },
        {
          id: "type-contracts",
          heading: "2. Rigid Type Contracts as the Source of Truth",
          paragraphs: [
            "By declaring TypeScript interfaces for entities before writing database schemas, your domain models dictate the backend structure rather than the other way around.",
            "This guarantees total type safety across your entire component hierarchy from Day 1."
          ]
        }
      ],
      conclusion: "Investing in a clean Data Access Layer today saves hundreds of engineering hours when scaling tomorrow. Decoupled code is maintainable code."
    },
    comments: [
      {
        id: "c5",
        postId: "4",
        author: {
          name: "Daniel Kim",
          avatar: "/profile.svg",
          role: "Tech Lead"
        },
        createdAt: "2 weeks ago",
        content: "This DAL strategy is exactly how we transitioned our platform from Sanity to self-hosted Supabase without touching a single React component.",
        likesCount: 16
      }
    ]
  },
  {
    id: "5",
    slug: "dark-mode-glassmorphism-design-systems",
    title: "Mastering Dark-Mode Glassmorphism Design Systems",
    subtitle: "Balancing glowing neon accents, deep obsidian tones, and accessible contrast ratios.",
    excerpt: "A comprehensive guide to crafting sleek, futuristic dark-mode user interfaces with glassmorphism, gradient borders, and crisp typography.",
    coverImage: "/p4.svg",
    galleryImages: ["/p4.svg", "/b1.svg"],
    category: categories.find((c) => c.slug === "ui-ux") || categories[3],
    tags: ["Design System", "Glassmorphism", "Dark Mode", "Tailwind CSS", "Aesthetics"],
    author: authors.gaurav,
    publishedAt: "Jul 20, 2025",
    readingTime: "5 min read",
    featured: false,
    content: {
      intro: "Dark mode has transitioned from an optional aesthetic toggle to the default aesthetic of premium developer tools, crypto platforms, and creative portfolio sites. Crafting a sophisticated dark theme requires more than swapping #ffffff for #000000; it demands careful layering of depth, luminescence, and tactile borders.",
      sections: [
        {
          id: "depth-and-elevation",
          heading: "1. Elevation Through Luminescence Rather Than Shadows",
          paragraphs: [
            "In light mode, depth is represented through drop shadows. In dark mode, drop shadows are virtually invisible against deep backgrounds.",
            "Instead, we create hierarchy and elevation through lightness: higher surface layers use slightly lighter obsidian tones (e.g. #04071D) accented by subtle 1px translucent borders (border-white/[0.1]) and soft backdrop blurs (backdrop-blur-xl)."
          ],
          quote: {
            text: "In dark interfaces, light is your paintbrush. Borders and highlights create the contours that shadows create in the light.",
            caption: "Modern UI Design Principles"
          }
        },
        {
          id: "accessible-typography",
          heading: "2. High Contrast and Subdued Secondary Text",
          paragraphs: [
            "Pure white (#FFFFFF) body text on pure black (#000000) causes eye fatigue due to severe contrast halation.",
            "Use muted off-white tones like #C1C2D3 for body copy, reserving vibrant lilac/purple (#CBACF9) and pure white for headings and interactive focus states."
          ]
        }
      ],
      conclusion: "A well-executed glassmorphic dark theme radiates modern elegance and craftsmanship. Keep your borders delicate, your blur values high, and let neon accents guide the user's focus."
    },
    comments: [
      {
        id: "c6",
        postId: "5",
        author: {
          name: "Chloe Vance",
          avatar: "/profile.svg",
          role: "Design System Lead"
        },
        createdAt: "3 weeks ago",
        content: "The tip on avoiding pure #FFFFFF for body text in dark mode is so crucial. The off-white #C1C2D3 token looks incredible in Gaurav Portfolio.",
        likesCount: 12
      }
    ]
  }
];
