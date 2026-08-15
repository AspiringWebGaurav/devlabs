# Scroll Synchronization, Navigation & Stability Rules

## 1. Real-Time Scroll-Spy & Automatic URL Syncing
- **Maintain Viewport-Based Trigger Tracking**: When modifying or adding sections to the home page, always preserve the `getBoundingClientRect()` threshold logic in [`components/ui/FloatingNav.tsx`](file:///c:/github/devlabs/components/ui/FloatingNav.tsx).
- **Avoid Fragile `offsetTop` Arithmetic**: Do NOT use `el.offsetTop` because parent containers with `position: relative` or nested flex/grid wrappers distort offset values.
- **Section ID Consistency**:
  - Whenever home navigation links are updated in [`data/index.ts`](file:///c:/github/devlabs/data/index.ts), ensure corresponding elements have matching DOM IDs (e.g., `id="about"`, `id="projects"`, `id="testimonials"`, `id="contact"`).
  - Ensure any new in-page section rewrites are mirrored in `next.config.ts` under `rewrites()` so direct URL visits resolve seamlessly without 404s.
- **Bi-Directional Bounds**:
  - Top of Page (`scrollY < 200`): URL replaces to `/`.
  - In-Page Sections: URL replaces to `/${sectionId}` dynamically as the section's top crosses the 35% viewport trigger.
  - Bottom of Page: Automatically pins to `/contact`.
- **Standalone Route Isolation**: Standalone routes (such as `/blog`, `/blog/[slug]`, `/privacy`, `/terms`) must bypass in-page scroll-spy URL replacement.

## 2. Cross-Route Navigation & Direct Link Resolving
- When navigating from a subpage (e.g. `/blog`) to an in-page anchor (e.g. `/about`), `FloatingNav` must execute `router.push('/#about')` so the home page smoothly scrolls to the target element.
- Maintain the direct URL auto-scrolling `useEffect` in `FloatingNav.tsx` with proper timeout cleanup (`clearTimeout`).

## 3. Dev Server Stability & Windows NTFS Guardrails
- **WebGL & Canvas Isolation**: Always keep WebGL canvas shaders (`CanvasRevealEffect`) and heavy Lottie animations wrapped in `next/dynamic(() => ..., { ssr: false })` to prevent WebGL context destruction crashes during Fast Refresh.
- **Watcher Configuration**: Retain Webpack `watchOptions` (polling + ignore patterns for `.next`, `.git`, `node_modules`) and `transpilePackages: ["three", "three-globe"]` in `next.config.ts` to prevent Windows file-locking cache corruption (`EBUSY` / `ENOENT`).
- **Defensive DOM Access**: Always guard global browser APIs (`window`, `document`) with `typeof window !== "undefined"`.
