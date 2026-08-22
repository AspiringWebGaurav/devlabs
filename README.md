# Gaurav Portfolio

[![Production](https://img.shields.io/badge/Production-gauravpatil.online-6366f1?style=flat-square&logo=vercel)](https://gauravpatil.online)
[![Next.js](https://img.shields.io/badge/Next.js-15.5.23-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2.8-blue?style=flat-square&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-3178c6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4.19-38bdf8?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)
[![Three.js](https://img.shields.io/badge/Three.js-0.176.0-black?style=flat-square&logo=three.js)](https://threejs.org/)
[![Firebase](https://img.shields.io/badge/Firebase-Admin_SDK-ffca28?style=flat-square&logo=firebase)](https://firebase.google.com/)
[![Cloudflare](https://img.shields.io/badge/Cloudflare-Turnstile-f38020?style=flat-square&logo=cloudflare)](https://www.cloudflare.com/products/turnstile/)
[![License](https://img.shields.io/badge/License-MIT-emerald?style=flat-square)](LICENSE)

A state-of-the-art, high-performance developer portfolio and enterprise administrative command platform built with **Next.js 15 (App Router)**, **React 19**, **Three.js WebGL**, **Tailwind CSS**, and **Firebase Admin SDK**.

---

## 🌟 Key Features

### 1. 🎨 Modern Portfolio Experience
- **Interactive 3D WebGL Globe**: Built with `Three.js`, `@react-three/fiber`, and `three-globe` with custom pinpoint coordinate rendering.
- **Dark Luxury Glassmorphism**: Tailored design tokens (`#000319`, `#CBACF9`, `#C1C2D3`), ambient spotlights, and backdrop blur matrices.
- **Aceternity UI Components**: Dynamic text generation, 3D pin perspective cards, infinite horizontal testimonial marquee, and moving border cards.
- **Scroll-Spy URL Synchronization**: Real-time hash and section tracking with dynamic floating navigation.
- **Full-Spectrum Responsive Layout**: Mobile-first touch ergonomic optimizations across all viewport breakpoints.

### 2. 🛡️ 3-Factor Multi-Tier Admin Security Subsystem
- **Tier 1 (Google OAuth Identity Verification)**: Restricts administrative access exclusively to authorized Google Workspace master principal.
- **Tier 2 (Stateless HMAC Email OTP)**: Cryptographically signed 6-digit challenge codes dispatched via dedicated transactional email relay with 10-minute expiry and rate-limit shields.
- **Tier 3 (RFC 6238 TOTP Google Authenticator)**: Multi-factor authenticator enrollment, QR provisioning, and window-skew validation via `otplib`.
- **Strict Admin Subsystem Isolation**: Scoped strictly inside `/admin` with Swiss minimalist styling and zero bleed into the portfolio.
- **Dynamic Route Gatekeeper**: Unauthenticated `/admin` requests automatically redirect to `/admin/login`.
- **Single Administrator Identity**: Locked exclusively to `gauravpatil9262`.

### 3. 🚀 Dynamic Turnstile Contact & Dual Email Pipeline
- **Zero-Gap Cloudflare Turnstile Verification**: Dynamic challenge elements rendered on demand.
- **Non-Blocking Dual EmailJS Pipeline**: Real-time dispatching of **Admin Lead Briefs** (`contact_form`) and **Visitor Confirmations** (`user_confirmation`).
- **Anti-Spam & DMARC Deliverability**: Domain-aligned envelope headers, invisible inbox preheaders, and pre-wrap executive message layout.
- **Profanity & Abuse Sanitization**: Automatic multi-tier dictionary scanning and text cleaning before persistence.
- **Realtime Database Persistence**: Instant synchronous recording to Firebase Realtime Database `messages`.

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Framework** | [Next.js 15](https://nextjs.org/) (App Router, Turbopack, Standalone Compilation) |
| **Frontend Core** | [React 19](https://react.dev/) & [TypeScript 5.9](https://www.typescriptlang.org/) |
| **Styling & Design System** | [Tailwind CSS 3.4](https://tailwindcss.com/), [Tailwind Merge](https://github.com/dcastil/tailwind-merge), [Tailwindcss Animate](https://github.com/jamiebuilds/tailwindcss-animate) |
| **Animations & Motion** | [Motion (Framer Motion 12)](https://motion.dev/) |
| **3D Graphics & WebGL** | [Three.js](https://threejs.org/), [@react-three/fiber](https://docs.pmnd.rs/react-three-fiber), [three-globe](https://github.com/vasturiano/three-globe) |
| **Database & Auth Backend** | [Firebase 11](https://firebase.google.com/), [Firebase Admin SDK 14](https://firebase.google.com/docs/admin/setup) |
| **Security & 2FA** | [Cloudflare Turnstile](https://www.cloudflare.com/products/turnstile/), [OTPLib 13](https://github.com/yeojinj/otplib), [QRCode](https://github.com/soldair/node-qrcode), [Zod 4](https://zod.dev/) |
| **Email Delivery** | [EmailJS REST API](https://www.emailjs.com/) (Dual Sequential Relay) |
| **Data Packaging** | [JSZip 3.10](https://stuk.github.io/jszip/) |
| **Analytics & Telemetry** | [@vercel/analytics](https://vercel.com/docs/analytics), [@vercel/speed-insights](https://vercel.com/docs/speed-insights) |
| **Typography & Icons** | Inter / Outfit / Geist, [React Icons 5](https://react-icons.github.io/react-icons/) |

---

## 📁 Architecture & Directory Structure

```text
├── .agents/                    # Repository guidelines, customization rules & workflows
├── app/
│   ├── (portfolio routes)      # Main portfolio presentation pages
│   │   ├── page.tsx            # Main hero, bento grid, 3D globe, projects, testimonials
│   │   ├── privacy/page.tsx    # Privacy Policy (August 2026 compliance)
│   │   └── terms/page.tsx      # Terms of Service (August 2026 compliance)
│   ├── admin/                  # Scoped Minimalist Light Admin Subsystem
│   │   ├── layout.tsx          # Dedicated admin theme provider & navigation header
│   │   ├── page.tsx            # Administrator command overview & telemetry charts
│   │   ├── login/page.tsx      # Multi-factor authentication gateway
│   │   ├── visitors/page.tsx   # Live visitor telemetry & session intelligence
│   │   ├── blocked/page.tsx    # IP ban management & unban controls
│   │   ├── export/page.tsx     # JSON, CSV, and ZIP multi-format export center
│   │   └── settings/page.tsx   # Security controls, TOTP 2FA setup & database sweeper
│   ├── api/                    # Serverless API routes
│   │   ├── admin/              # Admin session, auth, export, visitors, and cleanup endpoints
│   │   ├── contact/route.ts    # Turnstile-guarded contact processing & EmailJS relay
│   │   └── visitors/route.ts   # High-throughput visitor telemetry collector
│   ├── banned/page.tsx         # Edge middleware banned visitor gate
│   └── layout.tsx              # Root HTML layout, font injection, analytics providers
├── components/
│   ├── admin/                  # Admin UI components (Header, Sidebar, Legal, SignOut)
│   ├── contact/                # ContactModal & dynamic Turnstile container
│   ├── ui/                     # Aceternity UI & custom motion primitives
│   └── visitor/                # Visitor telemetry widgets & banner components
├── lib/
│   ├── admin/                  # Firebase Admin, session cookies, TOTP, export & sweeper
│   ├── contact/                # EmailJS REST dispatcher, profanity sanitizer
│   ├── security/               # Cloudflare Turnstile token validation
│   └── visitors/               # Telemetry extraction, GeoIP parsing & storage
└── middleware.ts               # Edge middleware for IP banning & admin route protection
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: `v20.x` or higher (Node 20+ recommended)
- **Package Manager**: `npm` or `pnpm`

### 1. Clone & Install
```bash
git clone https://github.com/AspiringWebGaurav/devlabs.git
cd devlabs
npm install
```

### 2. Configure Environment Variables
Create `.env.local` in the root directory:

```env
# Production App URL
NEXT_PUBLIC_APP_URL=https://gauravpatil.online

# Firebase Client SDK
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://your_project-default-rtdb.firebaseio.com/
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Firebase Admin SDK (Server-Only)
FIREBASE_ADMIN_PROJECT_ID=your_project_id
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk@your_project.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Cloudflare Turnstile
NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY=your_site_key
CLOUDFLARE_TURNSTILE_SECRET_KEY=your_secret_key

# EmailJS Contact Relay
NEXT_PUBLIC_EMAILJS_SERVICE_ID=contact_service
NEXT_PUBLIC_EMAILJS_ADMIN_TEMPLATE_ID=contact_form
NEXT_PUBLIC_EMAILJS_VISITOR_TEMPLATE_ID=user_confirmation
NEXT_PUBLIC_EMAILJS_PUBLIC_KEY=your_public_key

# EmailJS Dedicated 2FA OTP Relay
NEXT_PUBLIC_EMAILJS_OTP_SERVICE_ID=service_535l4zv
NEXT_PUBLIC_EMAILJS_OTP_TEMPLATE_ID=template_c4ssi9h
NEXT_PUBLIC_EMAILJS_OTP_PUBLIC_KEY=your_otp_public_key
EMAILJS_OTP_PRIVATE_KEY=your_otp_private_key
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the live portfolio.

### 4. Build for Production
```bash
npm run build
npm run start
```

---

## 🌐 Production Deployment

This repository is optimized for zero-configuration, high-performance edge deployment on **[Vercel](https://vercel.com)**:
- **Canonical Domain**: [https://gauravpatil.online](https://gauravpatil.online)
- **Automatic SSL & Edge Headers**: Content-Security-Policy, HSTS, X-Frame-Options, and Referrer-Policy configured via Next.js headers.
- **Edge Analytics**: Integrated `@vercel/analytics` and `@vercel/speed-insights`.

---

## 📄 License & Legal

- **License**: [MIT](LICENSE)
- **Privacy Policy**: [gauravpatil.online/privacy](https://gauravpatil.online/privacy)
- **Terms of Service**: [gauravpatil.online/terms](https://gauravpatil.online/terms)
- **Author**: **Gaurav Patil** &bull; Full-Stack Software Developer
