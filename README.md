<div align="center">

# ⚡ SiteCompiler

**Convert any published website into production-ready Static HTML, React TSX, or Next.js 16 + Tailwind CSS codebases.**

[![Next.js 16](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![Firebase](https://img.shields.io/badge/Firebase-12-FFCA28?style=for-the-badge&logo=firebase)](https://firebase.google.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

[Demo](https://site-compiler.netlify.app) · [Features](#-key-features) · [Quickstart](#-quickstart) · [Architecture](#-architecture) · [API Documentation](#-api-reference)

---

</div>

## 🌟 Overview

**SiteCompiler** is an enterprise-grade website extraction and code compilation platform. It crawls published web pages (from Framer, Webflow, Wix, Squarespace, or custom static sites), parses DOM element structures, extracts assets (images, SVGs, custom fonts, stylesheets), and reconstructs them into clean, modular codebases.

Whether you need a lightweight **Static HTML bundle**, modular **React TSX components**, or a full **Next.js 16 App Router project**, SiteCompiler builds the complete project structure and packages it into a downloadable `.zip` archive.

---

## ⚡ Key Features

- **🌐 Multi-Engine Code Generator**:
  - **Static HTML5**: Zero-dependency Semantic HTML5, CSS3, and JavaScript bundle.
  - **React TSX**: Modular React components styled with utility-first Tailwind CSS.
  - **Next.js 16**: Fully scaffolded App Router project (`app/page.tsx`, `components/`, `public/`, `package.json`, `tsconfig.json`).
- **🔐 Firebase Authentication & Firestore Cockpit**:
  - Google 1-Click Sign-In & Email/Password Authentication.
  - Automatic export history persistence in Firebase Firestore (`users/{uid}/exports`).
  - Seamless dual-mode fallback using Firebase Admin SDK (`site-compiler-firebase-adminsdk-*.json`).
- **🎨 Raycast-Inspired Cyberpunk Interface**:
  - Live progress logs streaming directly to a dark-mode terminal console.
  - Responsive multi-viewport preview switcher (Desktop, Tablet, Mobile).
  - State preservation across page reloads via URL `?jobId=` and `localStorage`.
- **🚀 Job Lifecycle & Watchdogs**:
  - 24h job retention with lazy cleanup (stale crawl dirs + ZIPs purged on every new job); 5-min per-job watchdog force-fails hung phases; 2.5-min crawl budget so a slow site can't hang the queue.

---

## 🏗 Architecture

```
                                    +-----------------------------------------+
                                    |         User Target URL Input           |
                                    +-----------------------------------------+
                                                         |
                                                         v
                                    +-----------------------------------------+
                                    |     Playwright Headless Web Crawler     |
                                    |  (DOM Extraction, Screenshots, Assets)  |
                                    +-----------------------------------------+
                                                         |
                                                         v
                                    +-----------------------------------------+
                                    |   HTML Parser & AST AST Transformer     |
                                    |  (CSS Extraction, Fonts, Media, SVGs)   |
                                    +-----------------------------------------+
                                                         |
                                 +-----------------------+-----------------------+
                                 |                       |                       |
                                 v                       v                       v
                      +--------------------+   +--------------------+   +--------------------+
                      |   Static HTML5     |   |     React TSX      |   |   Next.js 16 App   |
                      |    Generator       |   |     Generator      |   |   Router Scaffold  |
                      +--------------------+   +--------------------+   +--------------------+
                                 |                       |                       |
                                 +-----------------------+-----------------------+
                                                         |
                                                         v
                                    +-----------------------------------------+
                                    |  AdmZip Packaging Engine & Download API  |
                                    +-----------------------------------------+
                                                         |
                                                         v
                                    +-----------------------------------------+
                                    |   Firebase Admin SDK & User History     |
                                    +-----------------------------------------+
```

---

## 🚀 Quickstart

### Prerequisites

- **Node.js**: `v20+` (Render and Netlify both pin Node 20)
- **npm** or **pnpm** / **yarn**

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/subhxroy/site-compiler.git
   cd site-compiler
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Install Playwright browsers**:
   ```bash
   npx playwright install chromium
   ```

4. **Configure Environment Variables**:
   Create a `.env.local` file in the root directory (see `.env.example`):
   ```env
   PORT=3000
   NEXT_PUBLIC_API_URL=http://localhost:3001      # Backend engine base (dev → Express on :3001)
   RENDER_BACKEND_URL=http://localhost:3001       # Direct browser→backend calls (bypasses the Netlify proxy)
   FRONTEND_URL=http://localhost:3000             # Origin the backend's CORS allowlist accepts

   # Firebase Admin (optional in dev — required for payment approvals, admin sync, history)
   FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account", ...}
   ```

   Firebase *client* keys (`NEXT_PUBLIC_FIREBASE_API_KEY`, authDomain, projectId, etc.) are **optional**: `lib/firebase/config.ts` ships hardcoded dev fallbacks and skips Firebase init entirely when the API key is unset.

5. **Start Development Server**:
   ```bash
   npm run dev        # frontend only (:3000)
   # or
   npm run dev:all    # Next :3000 + Express engine :3001 + admin portal :3002
   ```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📁 Repository Structure

```
site-compiler/
├── app/                        # Next.js 16 App Router routes
│   ├── (exports)/              # 15 SEO landing pages (Framer/Webflow/Wix → Next.js 16, …)
│   ├── admin/                  # In-app admin console (users, approvals, engine health)
│   ├── api/                    # Serverless API: export, payment, job status/cancel/restart/download, admin, user, health, og
│   ├── blog/ docs/ changelog/ features/ pricing/ roadmap/ status/
│   ├── about/ contact/ privacy/ terms/ history/
│   ├── layout.tsx              # Root layout with AuthProvider & Navigation
│   └── page.tsx                # Main interactive compiler workspace (client-page)
├── components/                 # UI: navbar, footer, auth-modal, paywall-modal, export-page-template
├── lib/                        # Core compilation engine & utilities
│   ├── crawler/                # Playwright capture (screenshots, assets, crawl watchdog)
│   ├── parser/                 # dom-cleaner, css-parser, asset-pipeline
│   ├── detector/               # Anthropic section detection (+ heuristic fallback)
│   ├── generator/              # HTML + Next.js/React generators, JSX builder, Tailwind mapper, animation shim
│   ├── jobs/                   # Job state machine, pipeline orchestrator, validators
│   ├── zip/                    # AdmZip packaging (README, offline assets)
│   ├── firebase/               # Client + Admin SDK, auth-context, verify-admin, approval-status
│   ├── security/               # SSRF guards (lexical + DNS-rebind), rate limiter
│   ├── seo/                    # JSON-LD schema builders + metadata + OG route
│   └── content/                # MDX loaders + RSS/Atom/JSON feeds
├── server/                     # Express backend (Render) — engine API + payment mirror
├── scripts/                    # keep-alive + test harness (phase1–4, smoke, e2e, mock-job)
├── content/                    # MDX sources (blog, docs)
├── admin-portal/               # Standalone static admin app (admin.sitecompiler.app)
├── public/                     # Brand assets + .well-known/security.txt
├── exports/                    # Temp job output (git-ignored)
├── firestore.rules             # Firebase Firestore security rules
├── firebase.json               # Firebase CLI deployment spec
├── render.yaml                 # Render blueprint (sitecompiler-backend, Node 20, chromium)
├── netlify.toml                # Netlify frontend config (Node 20)
└── package.json                # Dependencies & project metadata
```

---

## 🔒 Security & Privacy

- **Protected Secrets**: Service account credentials (`*-firebase-adminsdk-*.json`) and `.env.local` files are explicitly excluded via `.gitignore` and are **never committed to public repositories**.
- **Admin SDK Isolation**: Firebase Admin operations use isolated server endpoints to bypass client-side security rule restrictions securely.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

<div align="center">

Crafted with ❤️ by [Subhankar Roy](https://github.com/subhxroy)

</div>
