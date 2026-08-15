# Admin Panel Subsystem Isolation & Design System Rules

## 1. Strict Boundary: Portfolio vs. Admin Panel Subsystem

The codebase consists of two strictly isolated visual and architectural subsystems:

### A. Main Portfolio (`/`, `/blog`, `/projects`, etc.)
* **Visual Identity**: Signature dark modern glassmorphism (`#000319`, `#CBACF9`, `#C1C2D3`), ambient spotlights, 3D WebGL canvases, and deep night theme.
* **Typography**: Root portfolio font hierarchy.
* **Rule**: Global `tailwind.config.ts` or `app/globals.css` MUST NEVER be modified with admin-specific font overrides or global styling that alters the main portfolio.

### B. Admin Subsystem (`/admin/*`)
* **Visual Identity**: Minimalist Swiss light system (`#FFFFFF`, `#FAFAFA`, stark `#000000`, muted `#64748B`, hairline `#E5E7EB` grid).
* **Typography Isolation**: Scoped exclusively to `app/admin/layout.tsx` via `font-admin-sans` (`var(--font-admin-sans)`) and `font-admin-mono` (`var(--font-admin-mono)`).
* **Codebase Directory Isolation**:
  - `app/admin/*`: Route pages (`/admin`, `/admin/login`, `/admin/posts`, `/admin/posts/new`, `/admin/projects`, `/admin/settings`, `/admin/messages`, `/admin/subscribers`).
  - `components/admin/*`: Dedicated admin UI components (`AdminHeader`, `AdminSidebar`, `AdminMetricsCard`, `AdminAnalyticsChart`, `AdminTable`, `AdminPostEditor`).
  - `lib/admin/*`: Admin data access layer and cryptographic auth helpers.
  - `types/admin.ts`: TypeScript contracts for admin sessions and metrics.

---

## 2. Admin UI/UX Tokens & Geometry

* **Background**: Pure `#FFFFFF` and `#FAFAFA` with subtle 4rem hairline grid lines (`#F0F0F0`).
* **Card Geometry**: Crisp, high-precision rectangle with thin 1px hairline border (`border border-[#E5E7EB] rounded-none sm:rounded-[2px]`).
* **Section Dividers**: Hairline horizontal dividers (`border-t border-[#E5E7EB]`) bisecting card sections.
* **Headings**: `font-admin-sans font-semibold text-black tracking-[-0.035em]`.
* **Eyebrow Tags**: `font-admin-mono text-[11px] tracking-[0.2em] text-[#64748B] uppercase font-normal`.
* **Buttons**:
  - Primary: Solid Stark Black (`bg-black text-white py-3.5 px-4 rounded-sm font-admin-mono text-xs font-bold uppercase tracking-wider hover:bg-[#18181B] active:scale-[0.99] transition-all duration-200`).
  - Secondary: White background with 1px border (`bg-white border border-[#E5E7EB] text-black hover:bg-[#F9FAFB] rounded-sm text-xs font-admin-mono`).
* **Analytics Curves**: Purple gradient (`#A855F7` to `#CBACF9`) for area charts and metric highlights.

---

## 3. Encrypted Authentication & Zero Plaintext Credentials

* **Google Authentication**: Single-click **`CONTINUE WITH GOOGLE`** button.
* **3-Factor Multi-Layer Verification**: Google OAuth + Live Email OTP + Google Authenticator (RFC 6238 TOTP).
* **Zero Hardcoded Secrets**: No plaintext passwords or sensitive credentials committed to code.
* **Access Control**: Unauthorized Google accounts are strictly rejected (`"Access Denied: Admin Google account required."`).

---

## 4. No-Bleed Rule Summary

1. Any changes made to `/admin/*` must remain contained inside `app/admin/`, `components/admin/`, and `lib/admin/`.
2. Any font or theme variables for admin must use the `font-admin-*` prefix and be scoped inside `app/admin/layout.tsx`.
3. The main portfolio and its dark glassmorphism system must remain untouched by any admin panel modifications.
