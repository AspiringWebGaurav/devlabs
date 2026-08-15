# Devlabs Repository Guidelines & Custom Rules

## Core Principles
1. **Preserve UI/UX & Visual Identity**: Dark modern glassmorphism design tokens (`#000319`, `#CBACF9`, `#C1C2D3`), ambient spotlights, and responsive layouts must remain consistent across all routes.
2. **Scroll-Spy & URL Synchronization**: Follow the rules defined in [scroll_sync_and_navigation.md](file:///c:/github/devlabs/.agents/rules/scroll_sync_and_navigation.md). Always ensure `FloatingNav.tsx` URL synchronization stays in sync with section IDs and route changes.
3. **Dev Server Stability**: Always isolate Canvas/WebGL in `next/dynamic(..., { ssr: false })` and maintain Webpack polling and transpilation settings in `next.config.ts`.
4. **Data Access Layer (DAL) Architecture**: All blog, project, or dynamic data fetching must be mediated through `lib/` modules (e.g. `lib/blog.ts`) to allow seamless backend/database swaps without altering UI components.
