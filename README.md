# Gaurav Portfolio &mdash; Enterprise Architecture & Core Documentation

[![Production](https://img.shields.io/badge/Production-gauravpatil.online-6366f1?style=flat-square&logo=vercel)](https://gauravpatil.online)
[![Next.js](https://img.shields.io/badge/Next.js-15.5.24-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2.8-blue?style=flat-square&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-3178c6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4.19-38bdf8?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)
[![Three.js](https://img.shields.io/badge/Three.js-0.176.0-black?style=flat-square&logo=three.js)](https://threejs.org/)
[![Firebase](https://img.shields.io/badge/Firebase-Admin_SDK-ffca28?style=flat-square&logo=firebase)](https://firebase.google.com/)
[![Cloudflare](https://img.shields.io/badge/Cloudflare-Turnstile-f38020?style=flat-square&logo=cloudflare)](https://www.cloudflare.com/products/turnstile/)
[![License](https://img.shields.io/badge/License-MIT-emerald?style=flat-square)](LICENSE)

An enterprise-grade, high-performance developer portfolio platform and unified administrative command console engineered with **Next.js 15 (App Router)**, **React 19**, **Three.js WebGL**, **Tailwind CSS**, and **Firebase Admin SDK**. Designed with dual-subsystem UI/UX isolation, a rigorous 4-Tier Data Access Architecture, and an immutable 11-Article Database Constitution.

> 📬 **Direct Inquiries & Approach**: Want to get in touch or discuss an engagement? Reach out directly via [`hello@gauravservices.eu.cc`](mailto:hello@gauravservices.eu.cc) or submit the live contact form at [gauravpatil.online/contact](https://gauravpatil.online/contact).

---

## 📑 Table of Contents

- [1. Executive Architectural Blueprint](#1-executive-architectural-blueprint)
- [2. Dual-Subsystem UI/UX Isolation](#2-dual-subsystem-uiux-isolation)
- [3. 4-Tier Data Access Layer (DAL)](#3-4-tier-data-access-layer-dal)
- [4. Single-Source Session Security, 2FA & 3-Tier Loaders](#4-single-source-session-security-2fa--3-tier-loaders)
- [5. Communications, Custom Domain Emails & Contact Gateway](#5-communications-custom-domain-emails--contact-gateway)
- [6. Database Constitution (11 Non-Negotiable Articles)](#6-database-constitution-11-non-negotiable-articles)
- [7. Performance Engineering & Zero-CLS Standard](#7-performance-engineering--zero-cls-standard)
- [8. Complete Technology Stack Matrix](#8-complete-technology-stack-matrix)
- [9. Repository Directory & Colocation Map](#9-repository-directory--colocation-map)
- [10. Local Development & Installation](#10-local-development--installation)
- [11. Environment Variable Protocol](#11-environment-variable-protocol)
- [12. Pre-Push Verification & Git Standard](#12-pre-push-verification--git-standard)
- [13. Security Governance & Responsible Disclosure](#13-security-governance--responsible-disclosure)
- [14. Open Source License](#14-open-source-license)

---

## 1. Executive Architectural Blueprint

Gaurav Portfolio is architected to deliver instantaneous edge rendering, fluid 3D WebGL visualizations, and provably consistent administrative data mutations.

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                                CLIENT VIEWPORT                                  │
├────────────────────────────────────────┬─────────────────────────────────────────┤
│        PUBLIC PORTFOLIO SUBSYSTEM      │          ADMIN CONSOLE SUBSYSTEM        │
│   - Dark Luxury Glassmorphism          │   - Minimalist Swiss Light Architecture │
│   - Ambient Spotlights & 3D Globe      │   - Edge-to-Edge Single-Scroll Window   │
│   - Aceternity UI Motion Primitives    │   - Tab-Driven Superadmin Workspace     │
│   - Scroll-Spy URL Hash Sync           │   - Zero Flash Frame-0 Theme Engine     │
└────────────────────────────────────────┴─────────────────────────────────────────┘
                                         │
┌────────────────────────────────────────▼─────────────────────────────────────────┐
│                           NEXT.JS 15 APP ROUTER LAYER                            │
│   - React 19 Server Components (RSC by default)                                  │
│   - Route Grouping & Feature Colocation (/admin/<feature>/)                      │
│   - Static Pre-Rendering (SSG) & On-Demand Revalidation (ISR)                    │
│   - Edge Middleware (Route Protection & Session Verification)                    │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         │
┌────────────────────────────────────────▼─────────────────────────────────────────┐
│                        4-TIER DATA ACCESS LAYER (DAL)                            │
│   ┌──────────────────────────────────────────────────────────────────────────┐   │
│   │ 1. UI Layer (Server & Client Components — 0 SDK Imports)                 │   │
│   ├──────────────────────────────────────────────────────────────────────────┤   │
│   │ 2. Repository Layer (lib/admin/repositories/ — Cursors, Mappings, Envelopes)│
│   ├──────────────────────────────────────────────────────────────────────────┤   │
│   │ 3. DataSource Layer (lib/admin/datasource/ — Sole Firebase SDK Boundary) │   │
│   ├──────────────────────────────────────────────────────────────────────────┤   │
│   │ 4. Infrastructure (Firestore, RTDB, Cloudflare, Brevo Gateway)           │   │
│   └──────────────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Dual-Subsystem UI/UX Isolation

The application strictly separates its visual presentation and layout rules into two non-overlapping design paradigms:

### 2.1 Public Portfolio Subsystem (`/`, `/blog`, `/projects`)
* **Aesthetic Theme**: Dark luxury modern glassmorphism.
* **Palette Tokens**: Deep Space Black (`#000319`), Lavender Accent (`#CBACF9`), Cool Metallic (`#C1C2D3`), and Emerald Glow (`#10B981`).
* **Visual Components**: Ambient 3D spotlights, Aceternity UI dynamic pin cards, infinite horizontal testimonial marquees, and responsive bento grids.
* **3D WebGL Canvas**: Three.js Globe rendering coordinate trajectories, isolated via `next/dynamic(..., { ssr: false })` with dedicated skeleton loaders to guarantee `CLS = 0`.
* **Navigation Synchronizer**: Active section tracking that synchronizes the browser URL hash dynamically as the visitor scrolls.

### 2.2 Administrative Subsystem (`/admin/*`)
* **Aesthetic Theme**: Minimalist Swiss Light design system.
* **Palette Tokens**: Crisp Off-White Background (`#FAFAFA`), Pure White Cards (`#FFFFFF`), Structural Borders (`#E2E8F0` / `#CBD5E1`), Slate Monospace Meta (`#64748B`), and Royal Purple Accents (`#7C3AED`).
* **Typography**: Dedicated admin font scopes (`font-admin-sans`, `font-admin-mono`) encapsulated in `app/admin/layout.tsx` with zero global bleed into the public portfolio.
* **Single-Scroll Window Architecture**: Header (`AdminHeader.tsx`) is locked at `sticky top-0 h-[57px]`, Sidebar (`AdminSidebar.tsx`) is pinned at `md:sticky md:top-[57px] md:h-[calc(100vh-57px)]`, and the page scrolls naturally via the browser window with zero nested scrollbars.
* **Zero Vertical Scrollbars on Clean Canvases**: Empty or clean workspace views use responsive flexbox (`flex-1`, `min-h-0`) so they fit cleanly within the viewport without generating scrollbars.

---

## 3. 4-Tier Data Access Layer (DAL)

All admin and dynamic domain features enforce strict architectural separation across four distinct boundaries:

```
┌─────────────────────────────────────────────────────────────┐
│ 1. UI Layer (Server Components / Client Components)        │
│    - Renders views, handles user interactions               │
│    - NEVER imports Firebase SDKs directly                   │
└──────────────────────────────┬──────────────────────────────┘
                               │ calls
┌──────────────────────────────▼──────────────────────────────┐
│ 2. Repository Layer (lib/admin/repositories/)               │
│    - Domain queries, cursor pagination, entity mappings     │
│    - Returns standardized RepositoryResult<T> envelopes     │
└──────────────────────────────┬──────────────────────────────┘
                               │ calls
┌──────────────────────────────▼──────────────────────────────┐
│ 3. DataSource Layer (lib/admin/datasource/)                 │
│    - SOLE layer authorized to initialize & call Firebase SDK│
│    - Firestore, Real-Time Database, Firebase Storage        │
└──────────────────────────────┬──────────────────────────────┘
                               │ connects
┌──────────────────────────────▼──────────────────────────────┐
│ 4. Cloud Infrastructure (Firestore / RTDB / Storage)       │
└─────────────────────────────────────────────────────────────┘
```

### Feature Colocation Standard
Every admin module is self-contained within `app/admin/<feature>/`:
```text
app/admin/<feature>/
├── page.tsx          # Server Component: coordinates auth & data fetching only
├── components/       # Feature-specific UI components & widgets
├── actions/          # Next.js Server Actions for mutations
├── hooks/            # Client-side React hooks
├── types/            # TypeScript interfaces & domain types
└── validators/       # Zod validation schemas
```

Shared infrastructure belongs strictly in `lib/admin/`:
```text
lib/admin/
├── datasource/       # Firestore & RTDB SDK layer (sole SDK boundary)
├── repositories/     # Domain data access repositories
├── services/         # Cross-cutting business services
├── schemas/          # Shared Zod validation schemas
├── utils/            # Date, string, and error utilities
├── constants.ts      # Single-source constants (ADMIN_SESSION_TTL_HOURS = 5)
└── logger.ts         # Structured system logger
```

---

## 4. Single-Source Session Security, 2FA & 3-Tier Loaders

Administrative security is governed by a single-source configuration with zero client-side privilege escalation and zero trust:

### 4.1 In-Tab Google OAuth 2.0 PKCE & Two-Factor Authentication (2FA)
* **Google OAuth 2.0 PKCE Handshake**: Compliant with RFC 7636. Authentication occurs via direct in-tab browser redirects without intrusive secondary popup windows.
* **Salted HMAC-SHA256 One-Time Passcodes (OTP)**: Following OAuth completion, the system transitions to `/admin/otp` and dispatches a 6-digit code. Passcodes are hashed with unique cryptographic salts (`AdminOtpChallengeRecord`) and verified in constant time.
* **Authoritative 3-Attempt Budget & 5-Minute Ceiling**: A unified global budget of 3 attempts protects against brute-force attacks across both primary OTP and fallback passcodes. Resends generate a fresh HMAC with a 60-second cooldown but **never reset the attempt counter** and **never extend the immutable 5-minute expiration ceiling**.
* **Zero-Lockout Security IP Authorization**: Sign-ins from unrecognized IP locations generate an automated security approval link dispatched via `security@gauravservices.eu.cc` with a 15-minute token TTL. An on-screen fallback passcode pathway (`/api/admin/auth/otp/fallback`) ensures guaranteed access if email authorization links are delayed or inaccessible.

### 4.2 Web Crypto Session Signing & Clean Detach
* **Single-Source Session Security**: Configured via `ADMIN_SESSION_TTL_HOURS = 5` in `lib/admin/constants.ts`. Derived seconds (`18,000s`) and milliseconds (`18,000,000ms`) are computed automatically to prevent configuration drift.
* **Auto-Expiring Cookie Architecture**: Cryptographically signed `admin_session` cookie issued via Edge-compatible Web Crypto API (`HMAC-SHA256`) with `SameSite=Lax`, `Path=/`, and `HttpOnly` in production.
* **Server-Hydrated Read-Only Context**: `AdminSessionContext` hydrates user identity from server cookies during initial layout render, completely eliminating redundant client-side `/api/admin/auth/session` network waterfalls.
* **5-Step Clean Detach**: Signing out executes an awaited server invalidation (`DELETE /api/admin/auth/session`), clears client cookie stores, disposes Firebase SDK instances, purges browser session storage, and executes a clean redirect to `/admin/login?signedOut=true`.

### 4.3 Mandatory 3-Tier Loader Architecture
The administration lifecycle enforces 3 purpose-built, calibrated loading systems that never conflate or bleed:
1. **Tier 1: Signing In Loader (`AdminPanelLoader.tsx`) &mdash; Cadence: "Slow" (~2.7s – 3.0s Deliberate)**:
   - Full-screen Swiss security card exclusively for OAuth, OTP verification, and IP approval.
   - Paced via 32ms ticker with small increments across 4 authoritative stages (*Verifying Authentication &rarr; Connecting Data Layer &rarr; Initializing Canvas &rarr; Workspace Ready*), holding at `100% Ready` for 420ms before navigating.
   - **Solid Holding Invariant**: Never fades to `opacity-0` while on `/admin/otp`, holding a solid neutral background to eliminate blank screen bleed. Protected by a 4.2s fallback safety timer in `AdminOtpForm.tsx`.
2. **Tier 2: Signing Out Loader (`SignOutOverlay.tsx`) &mdash; Cadence: "Neither Slow Nor Fast" (~1.25s Balanced)**:
   - Full-screen session detachment modal triggered from `AdminSidebar.tsx`.
   - Paced via 28ms ticker reaching 100% in ~1.0s, holding 250ms on `"Session Detached"` with green checkmark.
   - Strictly awaits server session deletion (`DELETE /api/admin/auth/session`) before redirecting, eliminating race conditions.
3. **Tier 3: Dashboard Tab Switching Loader (`AdminDashboardTabLoader.tsx`) &mdash; Cadence: "Pure Dynamic Optimised"**:
   - In-canvas concentric dual-ring GPU-accelerated SVG spinner (clockwise `#7C3AED` primary arc + counter-rotating inner arc with center micro-core).
   - Dynamic telemetry cycler (*Synchronizing telemetry... &rarr; Mounting bindings... &rarr; Rendering analytics...*) and active pulsing radar ping chip.
   - Wrapped within `AdminPageContainer` via `app/admin/loading.tsx`: pinned headers and sidebars remain visible and interactive with zero layout shift (`CLS = 0`). Modal bleed is strictly prohibited.

---

## 5. Communications, Custom Domain Emails & Contact Gateway

The platform features an enterprise-grade communications infrastructure supporting direct web submissions and an authenticated custom domain email gateway (`gauravservices.eu.cc`) routed through Brevo REST API v3:

### 5.1 Direct Web Inquiries (`gauravpatil.online/contact`)
Visitors and prospective clients can reach out directly using the production web contact form:
* **Direct Form Submission URL**: [https://gauravpatil.online/contact](https://gauravpatil.online/contact) *(anchor syncs seamlessly to the interactive `#contact` modal)*.
* **Security & Anti-Abuse**: Protected by invisible Cloudflare Turnstile token validation and client-side request throttling.
* **Atomic Processing Pipeline**: Submissions execute server-side Zod payload schema validation, automated profanity scrubbing, atomic Firebase Firestore lead ingestion (`inquiries/`), and immediate dispatch of two distinct transactional emails in `<1.2s`.
* **Lead Tracking**: Visitors receive an immediate confirmation with an official inquiry tracking reference (e.g. `#104`).

### 5.2 Official Custom Domain Email Directory (`gauravservices.eu.cc`)
For direct email correspondence, security disclosures, or support requests, the project operates four dedicated, role-segregated custom domain mailboxes:

| Mailbox / Address | Display Identity | Purpose & Scope | Turnaround & SLA |
| :--- | :--- | :--- | :--- |
| [`hello@gauravservices.eu.cc`](mailto:hello@gauravservices.eu.cc) | **Gaurav Patil** | **Client & Visitor Inquiries**: Project proposals, consulting requests, collaboration inquiries, architectural audits, and public contact form routing. | Instant auto-acknowledgement; personal response typically within 24 hours. |
| [`security@gauravservices.eu.cc`](mailto:security@gauravservices.eu.cc) | **Device Auth & Security** | **Security Operations**: Multi-factor authentication notices, recognized device IP verification alerts, login telemetry, and confidential vulnerability reports (Responsible Disclosure). | 15-minute 1-click IP verification links; urgent security disclosures triaged immediately. |
| [`help@gauravservices.eu.cc`](mailto:help@gauravservices.eu.cc) | **Gaurav Support** | **Technical Support**: Troubleshooting assistance, platform issue reports, client dispute resolution, and operational support workflows. | Prioritized ticket triage; initial response within 12–24 business hours. |
| [`no-reply@gauravservices.eu.cc`](mailto:no-reply@gauravservices.eu.cc) | **Gaurav Services** | **System Notifications (Do Not Reply)**: Ephemeral 2FA One-Time Passcodes (OTP), fallback authorization codes, automated error alerts, and non-monitored system broadcasts. | Instantaneous automated dispatch; inbound replies are unmonitored. |

> 🛡️ **Privacy & Anti-Abuse Guarantee**: All custom domain emails are authenticated with industry-standard SPF, DKIM, and DMARC protocols. Inbound submissions are never enrolled in marketing lists, promotional sequences, or third-party newsletters.

### 5.3 Dynamic Environment Link Resolution in Email Footers
Transactional email footers (`Terms | Privacy`) evaluate runtime request headers and environment variables via `resolveAppUrl()` to dynamically generate links matching the exact active environment:
* **Local Development**: [`http://localhost:3000/admin/terms`](http://localhost:3000/admin/terms) & [`http://localhost:3000/admin/privacy`](http://localhost:3000/admin/privacy)
* **Staging / Preview**: [`https://devlabs.eu.cc/admin/terms`](https://devlabs.eu.cc/admin/terms) & [`https://devlabs.eu.cc/admin/privacy`](https://devlabs.eu.cc/admin/privacy)
* **Canonical Production**: [`https://gauravpatil.online/admin/terms`](https://gauravpatil.online/admin/terms) & [`https://gauravpatil.online/admin/privacy`](https://gauravpatil.online/admin/privacy)
* Eliminates hardcoded external domain redirects and ensures seamless local/staging testing.

---

## 6. Database Constitution (11 Non-Negotiable Articles)

The database is treated as a financial ledger: every mutation must leave the system in a provably consistent state.

### Article 1: Zero Stale Data Invariant
* The database must represent only the single latest truth.
* Outdated fields, deprecated values, duplicate logical entities, and multiple sources of truth are permanently forbidden.
* Every update must synchronize all related references. Reads must always return canonical data.
* **Success Criteria**: `0 stale documents`, `0 stale references`, `0 duplicate records`.

### Article 2: Zero Orphan Invariant & Mandatory Delete Pipeline
* No resource may exist without a verified owner across Firestore documents, subcollections, Firebase Storage files, and image attachments.
* Deletion must always follow the 4-step pipeline:
  $$\text{Dependency Audit} \longrightarrow \text{Ownership Verification} \longrightarrow \text{Atomic Removal} \longrightarrow \text{Integrity Verification}$$
* Blind deletion is permanently forbidden.
* **Success Criteria**: `0 orphan documents`, `0 orphan files`, `0 broken references`.

### Article 3: Atomic Mutation Rule
* Every Create, Update, and Delete is executed as an atomic transaction. Partial success is unacceptable:
  * **CREATE**: Validate with Zod $\rightarrow$ Normalize payload $\rightarrow$ Atomic Write in DataSource $\rightarrow$ Verify references.
  * **UPDATE**: Validate schema $\rightarrow$ Diff existing data $\rightarrow$ Patch only changed fields $\rightarrow$ Verify referential integrity.
  * **DELETE**: Audit dependencies $\rightarrow$ Remove linked assets in Storage $\rightarrow$ Purge document $\rightarrow$ Verify database state.

### Article 4: Referential Integrity
* Every reference (document ID, media asset URL, user ID) must resolve.
* Check inbound and outbound references before mutations. Prevent dangling IDs and broken image links. If validation fails, abort the operation &mdash; never force delete.

### Article 5: Schema Evolution (Append-First)
* Database schemas are append-first and backward-compatible.
* Never rename fields directly or remove fields without a migration.
* Lifecycle: Add new field $\rightarrow$ Migrate existing documents $\rightarrow$ Verify migration $\rightarrow$ Remove deprecated field.

### Article 6: Firestore Cost Protection (Blaze Plan Efficiency)
* Every unnecessary database read is treated as a bug.
* All queries must use cursor pagination (`.startAfter()` / `.limit()`) through repositories.
* Use field projection (`.select()`) on wide documents.
* Maximum of one realtime listener per source, with mandatory `unsubscribe()` disposal on component unmount. No polling without explicit approval.

### Article 7: Storage Integrity
* Every uploaded asset in Firebase Storage must have a verified document owner (1:1 ownership).
* No anonymous or untracked uploads. Delete storage files only after reference validation and verify bucket cleanup.

### Article 8: Cache Consistency & Server Authority
* Server truth always wins.
* All authenticated admin routes and mutation endpoints enforce `no-store` caching (`export const dynamic = "force-dynamic"`).
* Mutations must invalidate affected caches immediately via `revalidatePath()`.

### Article 9: Canonical Identity & Ownership
* Entities are identified exclusively by immutable document IDs.
* Never identify or key records by display name, title, email duplicate, or image URL.

### Article 10: Environment Variable Protocol
* All baseline/legacy environment variables are permanently deployed and active in Vercel production.
* Any newly introduced environment variable **must strictly be placed under `# ADDED`** in `.env.example` and `.env.local` to prevent production drift.

### Article 11: Feature Completion Gate
A feature is **INCOMPLETE** and cannot be merged or pushed until every gate passes:
* [x] **DATABASE**: `0 stale data`, `0 orphan data`, `0 broken references`, `0 duplicate records`.
* [x] **PERFORMANCE**: `0 unnecessary reads`, `0 duplicate listeners`, cursor pagination only, `CLS = 0`.
* [x] **QUALITY**: `0 TypeScript errors` (`npx tsc --noEmit`), `0 ESLint warnings` (`npm run lint`), `0 UI regressions`.
* [x] **BUILD**: Local production build (`npm run build`) generates 100% static/dynamic routes with `0 errors, 0 warnings`.
* [x] **COMMIT**: Clean, non-explosive, professional conventional commit message upon explicit `"push origin"` directive only.

---

## 7. Performance Engineering & Zero-CLS Standard

* **Zero Cumulative Layout Shift (`CLS = 0`)**: Dynamic 3D WebGL modules, remote images, and administrative cards specify exact aspect ratios and skeleton containers to eliminate content reflow during streaming.
* **Calibrated 3-Tier Loaders**: Strict isolation of auth initialization (~2.8s deliberate), session termination (~1.25s balanced), and tab switching (in-canvas pure dynamic GPU-accelerated concentric dual spinner) guarantees zero layout shift (`CLS = 0`) across all user interactions.
* **Anti-Jitter Geometry**: Interactive hover states use GPU-accelerated opacity and background color transitions (`transition-colors`, `transition-opacity`, `duration-150`) without altering margins, padding, or container dimensions.
* **Distraction-Free Static Typography**: Static headers, metadata labels, and policy cards avoid continuous pulse or blink animations (`animate-pulse`).
* **Turbopack Optimized Compiles**: Standalone production build pipeline compiles in `<12s` with zero compiler warnings.

---

## 8. Complete Technology Stack Matrix

| Architectural Layer | Technologies & Libraries | Purpose / Implementation |
| :--- | :--- | :--- |
| **Core Framework** | [Next.js 15.5](https://nextjs.org/) (App Router, Turbopack) | Server Components, Server Actions, Dynamic Streaming |
| **View Layer** | [React 19.2](https://react.dev/) & [TypeScript 5.9](https://www.typescriptlang.org/) | Strict static typing, React hooks, Concurrent Rendering |
| **Styling Architecture** | [Tailwind CSS 3.4](https://tailwindcss.com/), [Tailwind Merge](https://github.com/dcastil/tailwind-merge) | Scoped design systems (Dark Glassmorphism vs Swiss Light) |
| **Motion & Animation** | [Motion (Framer Motion 12)](https://motion.dev/) | Smooth layout transitions, bento grids, modal animations |
| **3D WebGL Graphics** | [Three.js](https://threejs.org/), [@react-three/fiber](https://docs.pmnd.rs/react-three-fiber), [three-globe](https://github.com/vasturiano/three-globe) | Interactive globe visualization with custom coordinates |
| **Backend & Database** | [Firebase 11](https://firebase.google.com/), [Firebase Admin SDK 14](https://firebase.google.com/docs/admin/setup) | Firestore NoSQL, Realtime Database, Cloud Storage |
| **Authentication & 2FA** | Google OAuth 2.0 PKCE, Salted HMAC-SHA256 OTP, Web Crypto API | Multi-factor cryptographic security & session management |
| **Bot Detection** | [Cloudflare Turnstile](https://www.cloudflare.com/products/turnstile/) | Invisible, privacy-preserving CAPTCHA verification |
| **Validation Layer** | [Zod 4](https://zod.dev/) | Strict runtime payload and environment validation schemas |
| **Email Gateway** | [Brevo REST API v3](https://www.brevo.com/) via `@/lib/email` | Multi-sender identity pipeline (`hello@`, `security@`, `no-reply@`) |
| **Typography & Icons** | Inter / Outfit / Geist, [React Icons 5](https://react-icons.github.io/react-icons/) | High-density typography and vector iconography |

---

## 9. Repository Directory & Colocation Map

```text
├── app/
│   ├── (portfolio routes)          # Public portfolio presentation pages
│   │   ├── page.tsx                # Hero, Bento Grid, 3D Globe, Projects, Experience
│   │   ├── privacy/page.tsx        # Public Privacy Policy
│   │   └── terms/page.tsx          # Public Terms of Service
│   ├── admin/                      # Scoped Minimalist Light Admin Subsystem
│   │   ├── layout.tsx              # Admin layout, font scope & session provider
│   │   ├── loading.tsx             # Universal AdminDashboardTabLoader workspace screen
│   │   ├── error.tsx               # Root admin error boundary
│   │   ├── page.tsx                # Portfolio Services Management Workspace
│   │   ├── login/page.tsx          # Google OAuth 2.0 PKCE Gateway
│   │   ├── otp/page.tsx            # Mandatory 2FA OTP Challenge Verification
│   │   ├── authenticating/page.tsx # Transient OAuth Handshake Transition Screen
│   │   ├── profile/page.tsx        # Superadmin Identity & Security Workspace
│   │   ├── inquiries/page.tsx      # Inbound Lead Processing & Communications
│   │   ├── privacy/page.tsx        # Administrative Privacy Policy
│   │   └── terms/page.tsx          # Administrative Terms of Service
│   ├── api/                        # Serverless API routes
│   │   ├── admin/auth/google/      # OAuth authorization handshake initiator
│   │   ├── admin/auth/callback/    # PKCE code exchange & OTP challenge issuer
│   │   ├── admin/auth/otp/         # 2FA OTP Subsystem
│   │   │   ├── verify/route.ts     # Atomic transactional OTP verification
│   │   │   ├── resend/route.ts     # Rate-limited OTP re-dispatch (60s cooldown)
│   │   │   ├── fallback/route.ts   # On-screen passcode fallback pathway
│   │   │   └── status/route.ts     # Non-sensitive challenge status query
│   │   ├── admin/auth/verify-ip/   # 1-click email security IP approval endpoint
│   │   ├── admin/auth/session/     # Read-only session validation & deletion
│   │   ├── admin/auth/login/       # Hardened credential route (403 disabled)
│   │   └── contact/route.ts        # Turnstile-guarded contact submission & Brevo
│   └── layout.tsx                  # Root HTML layout, analytics & dark theme provider
├── components/
│   ├── admin/                      # Scoped Swiss Light admin components
│   │   ├── auth/                   # AdminLoginForm, AdminOtpForm, SignOutOverlay, AdminPanelLoader
│   │   ├── context/                # AdminSessionContext & useAdminSession hook
│   │   ├── error/                  # AdminErrorBoundary widget-level isolation
│   │   ├── layout/                 # AdminPageContainer, AdminDashboardTabLoader, AdminThemeEnforcer
│   │   ├── navigation/             # AdminHeader, AdminSidebar, AdminFooter
│   │   ├── overview/               # OverviewCanvas, AdminPanelLoader
│   │   ├── profile/                # AdminProfileCard, AdminProfileModal
│   │   └── suspense/               # AdminSuspense fallback wrapper
│   ├── contact/                    # ContactModal & dynamic Turnstile container
│   └── ui/                         # Aceternity UI & custom motion primitives
├── lib/
│   ├── admin/                      # Core Admin Infrastructure
│   │   ├── datasource/             # Firestore & RTDB SDK isolation layer (sole SDK boundary)
│   │   ├── repositories/           # BaseRepository, services, inquiries, auth-challenges
│   │   ├── services/               # otp.service, ip-security.service, inquiries.service
│   │   ├── schemas/                # Shared Zod validation schemas
│   │   ├── utils/                  # Date, string, and error utilities
│   │   ├── constants.ts            # Single-source constants (ADMIN_SESSION_TTL_HOURS = 5)
│   │   ├── auth.ts                 # Web Crypto HMAC-SHA256 token signing & verification
│   │   └── logger.ts               # Structured system logger
│   └── email/                      # Centralized Transactional Email Engine
│       ├── identities.ts           # Central sender identities (hello@, security@, no-reply@)
│       ├── templates.ts            # High-deliverability transactional email templates
│       └── brevo.ts                # Brevo REST API dispatcher & resolveAppUrl()
└── middleware.ts                   # Edge middleware for admin route protection
```

---

## 10. Local Development & Installation

### 10.1 Prerequisites
* **Node.js**: `v20.x` or `v22.x` (LTS recommended)
* **Package Manager**: `npm` (v10+)
* **Git**: `2.40+`

### 10.2 Clone & Install Dependencies
```bash
# Clone the repository
git clone https://github.com/AspiringWebGaurav/devlabs.git

# Navigate to project root
cd devlabs

# Install clean dependencies
npm install
```

### 10.3 Configure Environment Variables
Copy the template configuration file:
```bash
cp .env.example .env.local
```
Fill in the verified credentials for Google OAuth, Firebase Service Account, Cloudflare Turnstile, Brevo API, and Session Secret.

### 10.4 Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser. The administrative portal is accessible at [http://localhost:3000/admin](http://localhost:3000/admin).

---

## 11. Environment Variable Protocol

To prevent production deployment drift across Vercel environments:
1. All baseline/legacy variables are permanently active in Vercel production.
2. Any newly introduced environment variable **must strictly be placed under `# ADDED`** in `.env.example` and `.env.local`:

```env
# =============================================================================
# BASELINE ENVIRONMENT CONFIGURATION (ACTIVE IN VERCEL PRODUCTION)
# =============================================================================
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
FIREBASE_PROJECT_ID=your_project_id_here
FIREBASE_CLIENT_EMAIL=your_client_email_here
FIREBASE_PRIVATE_KEY="your_private_key_here"
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://your-project-rtdb.firebaseio.com

# ADDED
ADMIN_SESSION_TTL_HOURS=5
SESSION_SECRET="your_secure_hmac_secret_here"
BREVO_API_KEY=your_brevo_api_key_here
```

---

## 12. Pre-Push Verification & Git Standard

Pushes to remote `origin/main` require 100% verification across all quality gates:

```bash
# 1. Verify TypeScript Compilation (0 errors)
npx tsc --noEmit

# 2. Verify ESLint Code Quality (0 warnings)
npm run lint

# 3. Verify Security Penetration & Session Integrity (14/14 scenarios)
npx tsx --env-file=.env.local scratch/security_final_check.ts

# 4. Verify Local Production Build (0 errors, 0 warnings)
npm run build
```

---

## 13. Security Governance & Responsible Disclosure

* **Zero Hardcoded Secrets**: Secrets and service account keys are stored exclusively in environment variables and are permanently ignored via `.gitignore`.
* **Rate-Limited Endpoints**: API mutation endpoints are protected by Cloudflare Turnstile bot challenges and server-side request throttling.
* **Central Email Integrity**: Automated security alerts and OTP challenges are dispatched exclusively from authenticated senders ([`security@gauravservices.eu.cc`](mailto:security@gauravservices.eu.cc), [`no-reply@gauravservices.eu.cc`](mailto:no-reply@gauravservices.eu.cc)).
* **Responsible Disclosure**: If you discover a security vulnerability, please submit a confidential report to [`security@gauravservices.eu.cc`](mailto:security@gauravservices.eu.cc).

---

## 14. Open Source License

This project is licensed under the terms of the [MIT License](LICENSE) with comprehensive usage conditions, copyright grants, trademark reservations, and architectural liability disclaimers.

&copy; 2026 **Gaurav Patil**. All rights reserved.
