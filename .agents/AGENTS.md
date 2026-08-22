# Gaurav Portfolio Repository Guidelines & Custom Rules

## Core Principles
1. **Official Project Name**: The official project name is strictly **Gaurav Portfolio**. Do not use terms like "devlab", "devlabs", "shiro", or "kuro" anywhere in code, comments, documentation, or rules.
2. **Preserve Main Portfolio UI/UX**: Dark modern glassmorphism design tokens (`#000319`, `#CBACF9`, `#C1C2D3`), ambient spotlights, 3D WebGL canvases, and original portfolio typography must remain 100% consistent and untouched across all portfolio routes (`/`, `/blog`, `/projects`).
3. **Scroll-Spy & URL Synchronization**: Follow the rules defined in [scroll_sync_and_navigation.md](file:///c:/github/devlabs/.agents/rules/scroll_sync_and_navigation.md). Always ensure `FloatingNav.tsx` URL synchronization stays in sync with section IDs and route changes.
4. **Dev Server Stability**: Always isolate Canvas/WebGL in `next/dynamic(..., { ssr: false })` and maintain Webpack polling and transpilation settings in `next.config.ts`.
5. **Data Access Layer (DAL) Architecture**: All blog, project, or dynamic data fetching must be mediated through `lib/` modules (e.g. `lib/blog.ts`) to allow seamless backend/database swaps without altering UI components.
6. **Strict Admin Subsystem Design Isolation**: Follow the rules defined in [admin_panel_design_system.md](file:///c:/github/devlabs/.agents/rules/admin_panel_design_system.md). All `/admin/*` views strictly follow the minimalist light system and reside in dedicated `admin/` directories (`app/admin/`, `components/admin/`, `lib/admin/`). Fonts (`font-admin-sans`, `font-admin-mono`) and styling must be scoped strictly to `app/admin/layout.tsx` with ZERO global bleed into the main portfolio.
7. **No Commit/Push Rule**: NEVER execute `git commit` or `git push` without explicit user permission.
8. **No Routine Production Build Checks (Dev Server Stability)**: NEVER execute `npm run build` or `next build` automatically after routine code edits. Running production builds mutates `.next` build caches and corrupts the active `npm run dev` local server, causing local crashes and missing module errors. ONLY run `npm run build` when the user explicitly instructs to run a production build or prepare for a git push, at which point all warnings and errors must be thoroughly and robustly resolved.
9. **No Unsanctioned Background Schedulers or Cron Jobs**: NEVER create, configure, or deploy any automated background cron jobs, Cloud Schedulers, Cloud Functions, background worker tasks, periodic pollers, or visitor ban/unban logic without explicit, exclusive permission from the user.
10. **Isolated Component Skeleton Loaders & Progressive Streaming**: Every dynamic or below-the-fold component/section must declare its own dedicated skeleton loader in `next/dynamic` (`loading: () => <SectionSkeleton />`) and `AdaptiveLazySection` (`placeholder={<SectionSkeleton />}`). If a single heavy module or 3D canvas is delayed over the network, it must stream and load independently without blocking, freezing, or delaying the rest of the portfolio, ensuring zero Cumulative Layout Shift (CLS = 0).


---

## Architectural Documentation & Change Log
- Full study notes and domain architecture blueprint are documented in [architecture_and_changes_summary.md](file:///c:/github/devlabs/.agents/notes/architecture_and_changes_summary.md).

