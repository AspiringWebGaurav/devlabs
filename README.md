# Gaurav Portfolio &mdash; Modern Web Engineering Platform

[![Production](https://img.shields.io/badge/Production-gauravpatil.online-6366f1?style=flat-square&logo=vercel)](https://gauravpatil.online)
[![Next.js](https://img.shields.io/badge/Next.js-15.5-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2-blue?style=flat-square&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38bdf8?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)
[![Three.js](https://img.shields.io/badge/Three.js-WebGL-black?style=flat-square&logo=three.js)](https://threejs.org/)
[![Cloudflare](https://img.shields.io/badge/Cloudflare-Turnstile-f38020?style=flat-square&logo=cloudflare)](https://www.cloudflare.com/products/turnstile/)
[![License](https://img.shields.io/badge/License-MIT-emerald?style=flat-square)](LICENSE)

An enterprise-grade, high-performance web engineering portfolio designed and built by **Gaurav Patil**. Engineered with **Next.js 15 (App Router)**, **React 19**, **Three.js WebGL**, and modern cloud infrastructure. Architected with isolated presentation layers, touch ergonomics, privacy-first communication channels, and zero cumulative layout shift (`CLS = 0`).

> 📬 **Direct Inquiries & Collaboration**: To discuss project proposals, consulting engagements, or engineering opportunities, reach out directly via [`hello@gauravpatil.online`](mailto:hello@gauravpatil.online) or launch the interactive contact form at [gauravpatil.online/contact](https://gauravpatil.online/contact).

---

## 📑 Table of Contents

- [1. Platform Overview & Highlights](#1-platform-overview--highlights)
- [2. Architectural Highlights](#2-architectural-highlights)
- [3. Interactive Communication Channels](#3-interactive-communication-channels)
- [4. Visual Design & User Experience](#4-visual-design--user-experience)
- [5. Performance & Reliability Standards](#5-performance--reliability-standards)
- [6. Legal Governance & Transparency (v0.0.1)](#6-legal-governance--transparency-v001)
- [7. Official Communication Directory](#7-official-communication-directory)
- [8. Technology Stack](#8-technology-stack)
- [9. Local Development & Setup](#9-local-development--setup)
- [10. Security & Responsible Disclosure](#10-security--responsible-disclosure)
- [11. License & Copyright](#11-license--copyright)

---

## 1. Platform Overview & Highlights

Gaurav Portfolio serves as an active, production-grade showcase of modern full-stack web engineering, resilient system architecture, and interactive design:

* **Interactive 3D WebGL Canvas**: Three.js Globe rendering smooth coordinate trajectories, loaded asynchronously with zero layout reflow.
* **Shareable Contact Route (`/contact`)**: Dynamic interactive contact modal with bidirectional URL synchronization, native browser Back/Forward navigation, and direct shareable link resolution.
* **Intelligent Personal Assistant & Live Chat**: Contextual portfolio navigator providing real-time technical project breakdowns, verified 1-to-1 communication, and automated inbox notification routing.
* **Meta WhatsApp Cloud Integration**: Production WhatsApp channel for recruiters with two-bubble delivery sequence, 1-click email response triggers, and self-service GDPR Article 20 data exports.
* **Zero Layout Shift Standard (`CLS = 0`)**: Fixed skeleton bounds and GPU-accelerated opacity/transform transitions eliminating visual jitter across all devices.
* **Privacy-First Data Architecture**: Anonymous inquiry support, ephemeral bot verification, and zero third-party behavioral tracking cookies.

---

## 2. Architectural Highlights

The platform follows clean separation of concerns, ensuring high maintainability and testability:

```text
┌─────────────────────────────────────────────────────────────┐
│                    Presentation Layer                       │
│  (Next.js App Router, React 19 Components, Tailwind CSS)   │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                  Data Access Layer (DAL)                    │
│   (Domain Repositories, Business Logic & Validation)        │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                    Data Source Adapters                     │
│    (Cloud Firestore, Realtime Database, Redis & Storage)    │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                  External Infrastructure                    │
│   (Brevo Email API, Meta WhatsApp Cloud, Cloudflare Edge)   │
└─────────────────────────────────────────────────────────────┘
```

* **Clean Layer Isolation**: UI components interact strictly with domain repositories, preventing SDK leakage into client presentation components.
* **Runtime Schema Validation**: Inbound and outbound payloads are validated using strict Zod schemas to ensure type-safe data pipelines.
* **Transactional Reliability**: Idempotent email delivery keys and atomic database operations ensure robust message dispatch without duplicates.

---

## 3. Interactive Communication Channels

### 3.1 Shareable Dynamic Contact Form (`/contact`)
* **Dynamic Route Launch**: Direct navigation to `/contact` loads the portfolio and automatically launches the interactive contact modal with centered focus.
* **Address Bar Synchronization**: Opening the contact modal anywhere on the page dynamically updates the browser URL to `/contact` using the History API without page reload.
* **Native History Support**: Pressing the browser **Back** button dismisses the modal, while pressing **Forward** re-opens it.
* **Confidential & Anonymous Support**: Visitors have the right to submit inquiries anonymously or under pseudonyms without mandatory identity disclosure.
* **Bot Defense**: Protected by invisible Cloudflare Turnstile verification without tracking cookies.

### 3.2 Personal Assistant & Live Chat Ecosystem
* **Navigation Companion**: Floating interactive assistant providing instant guidance across project architectures, tech stacks, and case studies.
* **Verified Live Communication**: Access to live chat sessions requires a single-use 6-digit email passcode (OTP) dispatched exclusively from `no-reply@gauravpatil.online`.
* **Session Security**: Verified sessions utilize encrypted 4-hour `httpOnly` session tokens with 1-click sign-out and detachment.
* **Hybrid Routing Pipeline**: Messages stream in real-time when Gaurav is online, or trigger automated lead alerts directly to private inbox with 1-click reply routing.

### 3.3 Meta WhatsApp Business Cloud Integration
* **Direct Recruiter Channel**: Official WhatsApp Business Cloud API integration enabling recruiters and prospective clients to connect directly with Gaurav Patil.
* **Two-Bubble Sequenced Delivery**: Clean delivery acknowledgment followed sequentially (with a 350ms natural pause) by an eye-catchy email prompt formatted with WhatsApp typography.
* **1-Click Reply Notification Token**: Webhook alerts dispatch instant visitor email updates via Brevo with atomic transaction deduplication.
* **Self-Service GDPR Portability (`/exportmydata`)**: Sending `/exportmydata` in WhatsApp compiles an encrypted in-memory ZIP package containing complete visual HTML transcripts, machine-readable JSON records, and a signed GDPR compliance certificate (links expire in 10 minutes).
* **Instant Opt-Out (`STOP`)**: Sending `STOP` immediately unsubscribes the number and atomically erases conversation history from the database (GDPR Article 17).

---

## 4. Visual Design & User Experience

The application incorporates a tailored design language optimized for clarity, engagement, and accessibility:

* **Aesthetic System**: Dark luxury glassmorphism.
* **Color Palette**: Deep Space Black (`#000319`), Royal Purple (`#CBACF9`), Cool Metallic Slate (`#C1C2D3`), and Emerald Accent (`#10B981`).
* **Visual Primitives**: Ambient 3D spotlights, bento grid layout variants, infinite marquee scrolls, and touch-optimized action cards.
* **Accessibility (WCAG 2.1 AA)**: Keyboard-navigable interactive controls, 44px minimum touch targets, accessible ARIA dialog roles, and full `prefers-reduced-motion` fallbacks.
* **Scroll Synchronization**: Dominant-viewport tracking that reflects active sections in the URL hash smoothly without layout jumps.

---

## 5. Performance & Reliability Standards

* **Turbopack Build Pipeline**: Optimized Next.js 15 compilations with zero warnings and strict TypeScript checks (`npx tsc --noEmit`).
* **Layout Shift Elimination**: Calibrated skeleton boundaries for all dynamic and below-the-fold modules guaranteeing `CLS = 0`.
* **Micro-Animation Engineering**: Hardware-accelerated transitions operating at consistent 60fps across modern viewports.
* **Graceful Degradation**: Client-side error boundaries ensure platform stability even if external services encounter temporary interruptions.

---

## 6. Legal Governance & Transparency (v0.0.1)

The platform includes comprehensive transparency documentation accessible directly via dedicated routes:

| Route | Document Title | Active Version | Scope & Responsibility |
| :--- | :--- | :--- | :--- |
| [`/terms`](https://gauravpatil.online/terms) | **Terms of Service** | `v0.0.1` | Operating terms, intellectual property, acceptable use, and communication standards. |
| [`/privacy`](https://gauravpatil.online/privacy) | **Privacy Policy** | `v0.0.1` | Data minimization principles, anonymity rights, encryption standards, and GDPR compliance. |
| [`/security`](https://gauravpatil.online/security) | **Security Policy** | `v0.0.1` | Infrastructure defenses, authentication standards, and vulnerability disclosure policies. |
| [`/accessibility`](https://gauravpatil.online/accessibility) | **Accessibility Statement** | `v0.0.1` | Mobile-first 10/10 standards, touch ergonomics, and WCAG 2.1 AA conformance details. |
| [`/chat`](https://gauravpatil.online/chat) | **Assistant & Chat Guide** | `v0.0.1` | Complete technical breakdown of the personal assistant and live chat architecture. |

### Mandatory Legal Update Dispatches (Strict Non-Marketing Standard)
Submitting an email address through any feature of this portfolio &mdash; including Contact Form submissions, Assistant/Live Chat OTP authentication, support requests, or direct messaging &mdash; registers that address to receive mandatory policy, legal, and security announcements in accordance with the user's acceptance of use.
* **Strict Non-Marketing Guarantee**: All dispatches are 100% transactional legal disclosures with zero marketing or promotional sequences.
* **No-Unsubscribe Standard**: Because these notices represent vital contractual disclosures required to maintain transparency for all users who have interacted with the platform, no opt-out or unsubscribe mechanism is provided. Users will continue to receive mandatory notices even if automated email client features (such as Google/Gmail automatic 1-click unsubscribe headers) are triggered at the client level.
* **Single-Entity Invariant**: All communications preserve the personal developer standard (*"Gaurav"*, *"my services"*, *"The automated system"*), avoiding corporate plurals (*"we", "our", "us"*).

---

## 7. Official Communication Directory

Official electronic communications, receipts, security notices, and legal updates originate strictly from verified email addresses under the authenticated primary domain `gauravpatil.online`:

| Mailbox / Sender | Display Identity | Purpose & Scope | Expected Response |
| :--- | :--- | :--- | :--- |
| [`hello@gauravpatil.online`](mailto:hello@gauravpatil.online) | **Gaurav Patil** | **Client & Inquiries**: Project proposals, collaboration inquiries, consulting requests, and public contact routing. | Auto-acknowledgement; personal response typically within 24 hours. |
| [`security@gauravpatil.online`](mailto:security@gauravpatil.online) | **Security & Auth** | **Security Operations**: Multi-factor authentication notices, login alerts, git push audit logs, and vulnerability reports. | Urgent security disclosures triaged immediately. |
| [`help@gauravpatil.online`](mailto:help@gauravpatil.online) | **Gaurav Support** | **Technical Support**: Assistant inquiries, bug reports, user feedback, and portfolio navigation guidance. | Initial response within 12–24 business hours. |
| [`no-reply@gauravpatil.online`](mailto:no-reply@gauravpatil.online) | **System Notifications** | **Automated Alerts (Do Not Reply)**: One-Time Passcodes (OTP), Live Chat verification, and mandatory legal announcements. | Automated dispatch; inbound replies are unmonitored. |

> 🛡️ **Email Security & Authenticity**: Outgoing emails are authenticated with SPF, DKIM, and DMARC cryptographic signatures. Inbound email addresses are never enrolled in marketing lists or commercial campaigns.

---

## 8. Technology Stack

| Layer | Technologies | Key Responsibilities |
| :--- | :--- | :--- |
| **Framework** | [Next.js 15](https://nextjs.org/) (App Router, Turbopack) | Server Components, Server Actions, Dynamic Streaming |
| **Core View** | [React 19](https://react.dev/) & [TypeScript 5](https://www.typescriptlang.org/) | Concurrent rendering, typed state, custom hooks |
| **Styling** | [Tailwind CSS 3.4](https://tailwindcss.com/) & Tailwind Merge | Modern utility-first design system |
| **3D Graphics** | [Three.js](https://threejs.org/) & [Three-Globe](https://github.com/vasturiano/three-globe) | Interactive WebGL globe visualization |
| **Motion** | [Motion (Framer Motion)](https://motion.dev/) | Fluid layout animations, transitions, bento grids |
| **Messaging** | [Meta WhatsApp Cloud API](https://developers.facebook.com/docs/whatsapp/cloud-api) | Direct messaging, automated notification triggers, GDPR export |
| **Bot Mitigation** | [Cloudflare Turnstile](https://www.cloudflare.com/products/turnstile/) | Privacy-preserving, non-interactive challenge verification |
| **Email Delivery** | [Brevo REST API](https://www.brevo.com/) | Verified transactional email infrastructure |
| **Validation** | [Zod](https://zod.dev/) | Strict runtime data validation schemas |

---

## 9. Local Development & Setup

### Prerequisites
* **Node.js**: `v20.x` or `v22.x` (LTS recommended)
* **Package Manager**: `npm` (v10+)
* **Git**: `2.40+`

### Installation & Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/AspiringWebGaurav/devlabs.git

# 2. Navigate to project root
cd devlabs

# 3. Install dependencies
npm install

# 4. Configure local environment variables
cp .env.example .env.local

# 5. Start the local development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to explore the portfolio, or [http://localhost:3000/contact](http://localhost:3000/contact) to test the dynamic contact modal.

### Code Quality Verification

```bash
# Run full static TypeScript type-checking (zero mutations)
npx tsc --noEmit

# Run ESLint validation
npm run lint
```

---

## 10. Security & Responsible Disclosure

* **Zero Hardcoded Secrets**: Credentials, service accounts, and API tokens are managed via encrypted environment configurations and are never committed to version control.
* **Edge Rate Limiting**: Public endpoints are protected by bot challenges, request throttling, and payload sanitization.
* **Responsible Vulnerability Disclosure**: If you discover a potential security issue, please send a confidential report with reproduction steps to [`security@gauravpatil.online`](mailto:security@gauravpatil.online).

---

## 11. License & Copyright

This project is licensed under the terms of the [MIT License](LICENSE).

&copy; 2026 **Gaurav Patil**. All rights reserved.
