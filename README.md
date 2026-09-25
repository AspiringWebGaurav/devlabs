# DevLabs &mdash; Prototype & Sandbox Environment

[![Vercel Deployment](https://img.shields.io/badge/Deployment-Vercel_Hobby-black?style=flat-square&logo=vercel)](https://vercel.com)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?style=flat-square&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178c6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-emerald?style=flat-square)](LICENSE)

A clean, lean, high-performance sandbox and prototyping environment engineered for modern web experimentation and edge deployment.

---

## ⚡ Architecture Highlights

* **Vercel Hobby Plan Optimized**: Configured with static edge pre-rendering (`force-static`) to eliminate serverless execution timeouts and stay well within Hobby plan quotas.
* **Zero Polling Overhead**: Stripped of continuous background interval checks, dumb polling loops, and memory-heavy watchers. Fully event-driven.
* **Rapid Prototyping Foundation**: Minimal dependency footprint powered by Next.js 15 App Router, React 19, and vanilla CSS tokens for instant compilation and zero overhead.
* **Secure by Default**: Standardized security headers (`X-Frame-Options`, `X-Content-Type-Options`, `X-XSS-Protection`) configured via `vercel.json`.

---

## 🚀 Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Run Local Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to view the sandbox.

### 3. Production Build

```bash
npm run build
```

---

## 📄 License

This project is licensed under the terms of the [MIT License](LICENSE).
