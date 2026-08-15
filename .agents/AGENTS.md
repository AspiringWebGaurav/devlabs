# Devlabs Repository Guidelines & Custom Rules

## Core Principles
1. **Preserve Main Portfolio UI/UX**: Dark modern glassmorphism design tokens (`#000319`, `#CBACF9`, `#C1C2D3`), ambient spotlights, 3D WebGL canvases, and original portfolio typography must remain 100% consistent and untouched across all portfolio routes (`/`, `/blog`, `/projects`).
2. **Scroll-Spy & URL Synchronization**: Follow the rules defined in [scroll_sync_and_navigation.md](file:///c:/github/devlabs/.agents/rules/scroll_sync_and_navigation.md). Always ensure `FloatingNav.tsx` URL synchronization stays in sync with section IDs and route changes.
3. **Dev Server Stability**: Always isolate Canvas/WebGL in `next/dynamic(..., { ssr: false })` and maintain Webpack polling and transpilation settings in `next.config.ts`.
4. **Data Access Layer (DAL) Architecture**: All blog, project, or dynamic data fetching must be mediated through `lib/` modules (e.g. `lib/blog.ts`) to allow seamless backend/database swaps without altering UI components.
5. **Strict Admin Subsystem & Shiro Design Isolation**: Follow the rules defined in [admin_panel_design_system.md](file:///c:/github/devlabs/.agents/rules/admin_panel_design_system.md). All `/admin/*` views strictly follow the Shiro minimalist light system and reside in dedicated `admin/` directories (`app/admin/`, `components/admin/`, `lib/admin/`). Fonts (`font-admin-sans`, `font-admin-mono`) and styling must be scoped strictly to `app/admin/layout.tsx` with ZERO global bleed into the main portfolio.
6. **No Commit/Push Rule**: NEVER execute `git commit` or `git push` without explicit user permission.
