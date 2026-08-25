# Gaurav Portfolio &mdash; Enterprise Architecture & Core Documentation

[![Production](https://img.shields.io/badge/Production-gauravpatil.online-6366f1?style=flat-square&logo=vercel)](https://gauravpatil.online)
[![Next.js](https://img.shields.io/badge/Next.js-15.5.23-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2.8-blue?style=flat-square&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-3178c6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4.19-38bdf8?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)
[![Three.js](https://img.shields.io/badge/Three.js-0.176.0-black?style=flat-square&logo=three.js)](https://threejs.org/)
[![Firebase](https://img.shields.io/badge/Firebase-Admin_SDK-ffca28?style=flat-square&logo=firebase)](https://firebase.google.com/)
[![Cloudflare](https://img.shields.io/badge/Cloudflare-Turnstile-f38020?style=flat-square&logo=cloudflare)](https://www.cloudflare.com/products/turnstile/)
[![License](https://img.shields.io/badge/License-MIT-emerald?style=flat-square)](LICENSE)

An enterprise-grade, high-performance developer portfolio platform and unified administrative command console engineered with **Next.js 15 (App Router)**, **React 19**, **Three.js WebGL**, **Tailwind CSS**, and **Firebase Admin SDK**. Designed with dual-subsystem UI/UX isolation, a rigorous 4-Tier Data Access Architecture, and an immutable 11-Article Database Constitution.

---

## 📑 Table of Contents

- [1. Executive Architectural Blueprint](#1-executive-architectural-blueprint)
- [2. Dual-Subsystem UI/UX Isolation](#2-dual-subsystem-uiux-isolation)
- [3. 4-Tier Data Access Layer (DAL)](#3-4-tier-data-access-layer-dal)
- [4. Single-Source Session Security & Governance](#4-single-source-session-security--governance)
- [5. Database Constitution (11 Non-Negotiable Articles)](#5-database-constitution-11-non-negotiable-articles)
- [6. Performance Engineering & Zero-CLS Standard](#6-performance-engineering--zero-cls-standard)
- [7. Complete Technology Stack Matrix](#7-complete-technology-stack-matrix)
- [8. Repository Directory & Colocation Map](#8-repository-directory--colocation-map)
- [9. Local Development & Installation](#9-local-development--installation)
- [10. Environment Variable Protocol](#10-environment-variable-protocol)
- [11. Pre-Push Verification & Git Standard](#11-pre-push-verification--git-standard)
- [12. Security Governance & Responsible Disclosure](#12-security-governance--responsible-disclosure)
- [13. Open Source License](#13-open-source-license)

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
│   │ 4. Infrastructure (Firestore, RTDB, Cloudflare, EmailJS Relay)           │   │
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

## 4. Single-Source Session Security & Governance

Administrative security is governed by a single-source configuration with zero client-side privilege escalation:

* **Google OAuth 2.0 PKCE Handshake**: Compliant with RFC 7636. Authentication occurs via direct in-tab browser redirects without intrusive popup windows.
* **Single-Source Session Security**: Configured via `ADMIN_SESSION_TTL_HOURS = 5` in `lib/admin/constants.ts`. Derived seconds (`18,000s`) and milliseconds (`18,000,000ms`) are computed automatically to prevent configuration drift.
* **Auto-Expiring Cookie Architecture**: Cryptographically signed `admin_session` cookie issued with `SameSite=Lax`, `Path=/`, and `HttpOnly` in production.
* **Server-Hydrated Read-Only Context**: `AdminSessionContext` hydrates user identity from server cookies during initial layout render, completely eliminating redundant client-side `/api/admin/auth/session` network waterfalls.
* **Interactive Sign-In & Sign-Out Overlays**: Full-screen Swiss authorization overlays provide immediate visual feedback during login and 5-step clean state detachment on logout.

---

## 5. Database Constitution (11 Non-Negotiable Articles)

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

## 6. Performance Engineering & Zero-CLS Standard

* **Zero Cumulative Layout Shift (`CLS = 0`)**: Dynamic 3D WebGL modules, remote images, and administrative cards specify exact aspect ratios and skeleton containers to eliminate content reflow during streaming.
* **Anti-Jitter Geometry**: Interactive hover states use GPU-accelerated opacity and background color transitions (`transition-colors`, `transition-opacity`, `duration-150`) without altering margins, padding, or container dimensions.
* **Distraction-Free Static Typography**: Static headers, metadata labels, and policy cards avoid continuous pulse or blink animations (`animate-pulse`).
* **Turbopack Optimized Compiles**: Standalone production build pipeline compiles in `<12s` with zero compiler warnings.

---

## 7. Complete Technology Stack Matrix

| Architectural Layer | Technologies & Libraries | Purpose / Implementation |
| :--- | :--- | :--- |
| **Core Framework** | [Next.js 15.5](https://nextjs.org/) (App Router, Turbopack) | Server Components, Server Actions, Dynamic Streaming |
| **View Layer** | [React 19.2](https://react.dev/) & [TypeScript 5.9](https://www.typescriptlang.org/) | Strict static typing, React hooks, Concurrent Rendering |
| **Styling Architecture** | [Tailwind CSS 3.4](https://tailwindcss.com/), [Tailwind Merge](https://github.com/dcastil/tailwind-merge) | Scoped design systems (Dark Glassmorphism vs Swiss Light) |
| **Motion & Animation** | [Motion (Framer Motion 12)](https://motion.dev/) | Smooth layout transitions, bento grids, modal animations |
| **3D WebGL Graphics** | [Three.js](https://threejs.org/), [@react-three/fiber](https://docs.pmnd.rs/react-three-fiber), [three-globe](https://github.com/vasturiano/three-globe) | Interactive globe visualization with custom coordinates |
| **Backend & Database** | [Firebase 11](https://firebase.google.com/), [Firebase Admin SDK 14](https://firebase.google.com/docs/admin/setup) | Firestore NoSQL, Realtime Database, Cloud Storage |
| **Authentication & 2FA** | Google OAuth 2.0 PKCE, [OTPLib 13](https://github.com/yeojinj/otplib), [QRCode](https://github.com/soldair/node-qrcode) | Multi-factor cryptographic security & session management |
| **Bot Detection** | [Cloudflare Turnstile](https://www.cloudflare.com/products/turnstile/) | Invisible, privacy-preserving CAPTCHA verification |
| **Validation Layer** | [Zod 4](https://zod.dev/) | Strict runtime payload and environment validation schemas |
| **Email Delivery** | [Brevo REST API v3](https://www.brevo.com/) | Dual transactional email dispatch (Inbound Lead + Auto-Reply) |
| **Typography & Icons** | Inter / Outfit / Geist, [React Icons 5](https://react-icons.github.io/react-icons/) | High-density typography and vector iconography |

---

## 8. Repository Directory & Colocation Map

```text
├── app/
│   ├── (portfolio routes)          # Public portfolio presentation pages
│   │   ├── page.tsx                # Hero, Bento Grid, 3D Globe, Projects, Experience
│   │   ├── privacy/page.tsx        # Public Privacy Policy
│   │   └── terms/page.tsx          # Public Terms of Service
│   ├── admin/                      # Scoped Minimalist Light Admin Subsystem
│   │   ├── layout.tsx              # Admin layout, font scope & session provider
│   │   ├── loading.tsx             # Universal AdminPanelLoader hydration screen
│   │   ├── error.tsx               # Root admin error boundary
│   │   ├── page.tsx                # Portfolio Services Management Workspace
│   │   ├── login/page.tsx          # Google OAuth 2.0 PKCE Gateway
│   │   ├── profile/page.tsx        # Superadmin Identity & Security Workspace
│   │   ├── inquiries/page.tsx      # Inbound Lead Processing & Communications
│   │   ├── privacy/page.tsx        # Administrative Privacy Policy
│   │   └── terms/page.tsx          # Administrative Terms of Service
│   ├── api/                        # Serverless API routes
│   │   ├── admin/auth/google/      # OAuth authorization handshake initiator
│   │   ├── admin/auth/callback/    # PKCE code exchange & session issuer
│   │   ├── admin/auth/session/     # Read-only session validation endpoint
│   │   ├── admin/auth/login/       # Session minting route
│   │   └── contact/route.ts        # Turnstile-guarded contact submission & Brevo
│   └── layout.tsx                  # Root HTML layout, analytics & dark theme provider
├── components/
│   ├── admin/                      # Scoped Swiss Light admin components
│   │   ├── auth/                   # AdminLoginForm, GoogleAuthButton, SignInOverlay, SignOutOverlay
│   │   ├── context/                # AdminSessionContext & useAdminSession hook
│   │   ├── error/                  # AdminErrorBoundary widget-level isolation
│   │   ├── layout/                 # AdminPageContainer, AdminThemeEnforcer
│   │   ├── navigation/             # AdminHeader, AdminSidebar, AdminFooter
│   │   ├── overview/               # OverviewCanvas, AdminPanelLoader
│   │   ├── profile/                # AdminProfileCard, AdminProfileModal
│   │   └── suspense/               # AdminSuspense fallback wrapper
│   ├── contact/                    # ContactModal & dynamic Turnstile container
│   └── ui/                         # Aceternity UI & custom motion primitives
├── lib/
│   ├── admin/                      # Core Admin Infrastructure
│   │   ├── datasource/             # Firestore & RTDB SDK isolation layer
│   │   ├── repositories/           # BaseRepository, services.repository, inquiries.repository
│   │   ├── services/               # Cross-cutting administrative services
│   │   ├── schemas/                # Shared Zod validation schemas
│   │   ├── utils/                  # Date, string, and error utilities
│   │   ├── constants.ts            # Single-source constants (ADMIN_SESSION_TTL_HOURS = 5)
│   │   ├── auth.ts                 # Server-side token signing & verification
│   │   └── logger.ts               # Structured system logger
│   └── contact/                    # Brevo REST dispatcher, profanity sanitizer
└── middleware.ts                   # Edge middleware for admin route protection
```

---

## 9. Local Development & Installation

### 9.1 Prerequisites
* **Node.js**: `v20.x` or `v22.x` (LTS recommended)
* **Package Manager**: `npm` (v10+)
* **Git**: `2.40+`

### 9.2 Clone & Install Dependencies
```bash
# Clone the repository
git clone https://github.com/AspiringWebGaurav/devlabs.git

# Navigate to project root
cd devlabs

# Install clean dependencies
npm install
```

### 9.3 Configure Environment Variables
Copy the template configuration file:
```bash
cp .env.example .env.local
```
Fill in the verified credentials for Google OAuth, Firebase Service Account, Cloudflare Turnstile, and EmailJS.

### 9.4 Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser. The administrative portal is accessible at [http://localhost:3000/admin](http://localhost:3000/admin).

---

## 10. Environment Variable Protocol

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
```

---

## 11. Pre-Push Verification & Git Standard

Pushes to remote `origin/main` require 100% verification across all quality gates:

```bash
# 1. Verify TypeScript Compilation (0 errors)
npx tsc --noEmit

# 2. Verify ESLint Code Quality (0 warnings)
npm run lint

# 3. Verify Local Production Build (0 errors, 0 warnings)
npm run build
```

---

## 12. Security Governance & Responsible Disclosure

* **Zero Hardcoded Secrets**: Secrets and service account keys are stored exclusively in environment variables and are permanently ignored via `.gitignore`.
* **Rate-Limited Endpoints**: API mutation endpoints are protected by Cloudflare Turnstile bot challenges and server-side request throttling.
* **Responsible Disclosure**: If you discover a security vulnerability, please submit a confidential report to `security@gauravservices.eu.cc`.

---

## 13. Open Source License

This project is licensed under the terms of the [MIT License](LICENSE) with comprehensive usage conditions, copyright grants, trademark reservations, and architectural liability disclaimers.

&copy; 2026 **Gaurav Patil**. All rights reserved.
