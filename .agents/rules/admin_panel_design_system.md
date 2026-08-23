# Admin Panel Subsystem Isolation & Design System Rules

## 1. Strict Boundary: Portfolio vs. Admin Panel Subsystem

The codebase consists of two strictly isolated visual and architectural subsystems:

### A. Main Portfolio (`/`, `/blog`, `/projects`, etc.)
* **Visual Identity**: Signature dark modern glassmorphism (`#000319`, `#CBACF9`, `#C1C2D3`), ambient spotlights, 3D WebGL canvases, and deep night theme.
* **Typography**: Root portfolio font hierarchy.
* **Rule**: Global `tailwind.config.ts` or `app/globals.css` MUST NEVER be modified with admin-specific font overrides or global styling that alters the main portfolio.

### B. Admin Subsystem (`/admin/*`)
* **Visual Identity**: Minimalist Swiss light system (`#FFFFFF` pure white canvas, stark `#000000`, slate `#475569`, muted `#64748B`, hairline `#CBD5E1` / `#E2E8F0` dashed guides, and accent purple `#7C3AED`).
* **Typography Isolation**: Scoped exclusively to `app/admin/layout.tsx` via `font-admin-sans` (`Geist` / `Plus Jakarta Sans` / `Inter`) and `font-admin-mono` (`Geist Mono` / `JetBrains Mono`).
* **Codebase Directory Isolation**:
  - `app/admin/*`: Route pages (`/admin`, `/admin/login`, `/admin/terms`, `/admin/privacy`).
  - `components/admin/*`: Dedicated admin UI modules (`navigation/`, `profile/`, `overview/`, `auth/`, `skeletons/`).
  - `lib/admin/*`: Admin data access layer, Firebase SDKs, and Google Identity Services (GIS).
  - `types/admin.ts`: TypeScript contracts for admin sessions and metrics.

---

## 2. Admin UI/UX Color Scheme Tokens & Geometry

* **Canvas Background**: Pure `#FFFFFF` (solid pure white) across all admin views.
* **Architectural Grid Guides**:
  - Horizontal Dividers: `border-dashed border-[#CBD5E1]` on top navbar bottom and footer top.
  - Vertical Framing Columns: `border-x border-dashed border-[#CBD5E1]` framing a centered `max-w-5xl` container, with center guideline `border-r border-dashed border-[#E2E8F0]`.
* **Top Navigation Bar**: True edge-to-edge layout (`px-6 sm:px-12`) with brand `admin panel.` (`font-admin-mono font-black text-black`) and accent dot (`text-[#7C3AED]`).
* **Card Geometry**: Crisp, high-precision rectangle with thin hairline border (`border border-[#E2E8F0] bg-white rounded-none sm:rounded-[2px] shadow-2xs`).
* **Typography Hierarchy**:
  - Headings: `font-admin-sans font-bold text-2xl tracking-[-0.035em] text-black`.
  - Subtitles & Body: `font-admin-sans font-normal text-xs sm:text-sm text-[#475569] leading-relaxed`.
  - Muted Text / Agreement: `font-admin-sans text-[11px] text-[#64748B]`.
  - Action Buttons: `font-admin-mono text-xs font-bold uppercase tracking-[0.16em] bg-black text-white hover:bg-[#18181B] active:scale-[0.99]`.
  - Links: `text-[#64748B] hover:text-black underline decoration-[#CBD5E1] hover:decoration-black underline-offset-3 transition-colors duration-150`.
* **Footer Color Synchronization**:
  - Icon: Shield icon strictly synchronized to brand accent purple (`<FaShieldHalved className="w-3.5 h-3.5 text-[#7C3AED]" />`).
  - Text: `font-admin-sans text-[11px] font-medium text-[#64748B] tracking-tight`.
  - Divider: Edge-to-edge `border-t border-dashed border-[#CBD5E1] py-5 px-6 sm:px-12`.

---

## 3. Direct OAuth 2.0 PKCE Authentication & Zero Residual State

* **Direct Google OAuth 2.0 PKCE**: Standard RFC 7636 PKCE code exchange flow via `/api/admin/auth/google` and `/api/admin/auth/callback`. Eliminates all secondary popup windows with 100% in-tab navigation across all environments (`localhost:3000`, `devlabs.eu.cc`, `gauravpatil.online`).
* **Strict Superadmin Authorization**: Validates incoming Google accounts against `isAuthorizedAdminEmail(email)` (`gauravpatil9262@gmail.com`). Non-superadmin accounts receive clean, non-leaking `[!] Unauthorized account. Access is restricted.` notifications.
* **Separation of Loaders**:
  - Full-card multi-stage progress loader (`AdminPanelLoader.tsx`) for login transitions.
  - Dedicated zero-residual sign-out overlay (`SignOutOverlay.tsx`) for logout transitions.
  - Non-blocking 2px neon top progress line + glass sync indicator in `AdminHeader.tsx` during live telemetry sync without blocking the dashboard.
* **Zero-Residual Sign-Out**: 5-step clean detach (server cookie deletion, client cookie clearing, Firebase SDK sign-out, storage purge, clean redirect to `/admin/login?signedOut=true`).

---

## 4. No-Bleed Rule Summary

1. Any changes made to `/admin/*` must remain contained inside `app/admin/`, `components/admin/`, and `lib/admin/`.
2. Any font or theme variables for admin must use the `font-admin-*` prefix and be scoped inside `app/admin/layout.tsx`.
3. The main portfolio and its dark glassmorphism system must remain untouched by any admin panel modifications.
