<div align="center">

# ⚡ SiteCompiler

**Enterprise Multi-Target Website Compilation Platform: Convert any published website into production-ready Next.js 16, Astro 4, SvelteKit 2, Vue 3/Nuxt 3, Remix, or Static HTML codebases.**

[![Next.js 16](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react)](https://react.dev/)
[![Astro 4](https://img.shields.io/badge/Astro-4.0-FF5D01?style=for-the-badge&logo=astro)](https://astro.build/)
[![SvelteKit 2](https://img.shields.io/badge/SvelteKit-2.0-FF3E00?style=for-the-badge&logo=svelte)](https://kit.svelte.dev/)
[![Vue 3](https://img.shields.io/badge/Vue-3.0-4FC08D?style=for-the-badge&logo=vuedotjs)](https://vuejs.org/)
[![Remix](https://img.shields.io/badge/Remix-2.0-000000?style=for-the-badge&logo=remix)](https://remix.run/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

[Live Demo](https://site-compiler.netlify.app) · [Features](#-key-features) · [Quickstart](#-quickstart) · [Architecture](#-architecture) · [SDKs](#-official-client-sdks) · [API Specs](#-api-reference)

---

</div>

## 🌟 Overview

**SiteCompiler** is an enterprise-grade website extraction and multi-target code compilation platform. It crawls published web pages (from Framer, Webflow, Wix, Squarespace, or custom web apps), parses DOM element structures, extracts assets (images, SVGs, custom fonts, stylesheets), and reconstructs them into clean, modular, and idiomatic codebases across modern frontend ecosystems.

Whether you need a full **Next.js 16 App Router project**, **Astro 4.0 static layout**, **SvelteKit 2 reactive app**, **Nuxt 3 composition framework**, or **Remix route bundle**, SiteCompiler builds the complete project structure and packages it into a downloadable `.zip` archive.

---

## ⚡ Key Features

- **🌐 Multi-Target Framework Compilation**:
  - **Next.js 16**: App Router hierarchy (`app/page.tsx`, `components/`, `public/`, `tsconfig.json`).
  - **Astro 4.0**: Static `.astro` component layouts and zero-JS hydration islands.
  - **SvelteKit 2**: Svelte 5 Single-File Components (`.svelte`), `app.html`, and file routing.
  - **Vue 3 / Nuxt 3**: Composition API templates (`.vue`), Pinia stores, and Nuxt 3 configurations.
  - **Remix / Vite**: Route modules with loader functions and meta handlers.
  - **Static HTML5**: Zero-dependency Semantic HTML5, CSS3, and JavaScript bundle.
- **🧩 20+ Accessible UI Component Registry (`lib/registry/`)**:
  - Button, Badge, Card, Input, Accordion, Dialog, Modal, Dropdown Menu, Tabs, Toast, Navbar, Data Table, Carousel, Tooltip, Progress, Pagination, Sidebar, Sheet, Popover, Switch, and Form.
  - Conversion-ready section templates: Hero Section, Pricing Table, Testimonials Grid, FAQ Accordion, Contact Form.
- **📦 Official Client SDKs**:
  - **TypeScript / Node.js SDK** (`@sitecompiler/sdk`): Typed client with polling utilities and error mapping.
  - **Python SDK** (`sitecompiler-py`): PyPI client with Pydantic schemas and synchronous resources.
- **🔐 Dual-Mode Authentication & Security**:
  - Zero-auth open-source mode on `localhost` development servers.
  - Production Google 1-Click Sign-In & Email Authentication via Firebase.
  - Multi-tier SSRF protection (lexical IP blocklist + async DNS resolution guard).
- **🚀 Real-Time Visual Content Editor**:
  - Standalone in-browser AST editor with node-level inline text and media editing.
  - Stable Node ID tagger preserving 100% untouched DOM structures during visual content patches.

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
                   +-------------------+-----------------+-------------------+-------------------+
                   |                   |                 |                   |                   |
                   v                   v                 v                   v                   v
        +--------------------+ +---------------+ +---------------+ +---------------+ +---------------+
        |   Next.js 16 App   | |    Astro 4    | |  SvelteKit 2  | |  Vue 3/Nuxt 3 | |  Remix / Vite |
        |   Router Scaffold  | |   Generator   | |   Generator   | |   Generator   | |   Generator   |
        +--------------------+ +---------------+ +---------------+ +---------------+ +---------------+
                   |                   |                 |                   |                   |
                   +-------------------+-----------------+-------------------+-------------------+
                                                         |
                                                         v
                                    +-----------------------------------------+
                                    |  AdmZip Packaging Engine & Download API  |
                                    +-----------------------------------------+
                                                         |
                                                         v
                                    +-----------------------------------------+
                                    |    Production Export ZIP / Site Model   |
                                    +-----------------------------------------+
```

---

## 📦 Official Client SDKs

### TypeScript / Node.js
```bash
npm install @sitecompiler/sdk
```
```typescript
import { SiteCompilerClient } from '@sitecompiler/sdk';

const client = new SiteCompilerClient({ baseUrl: 'https://site-compiler.onrender.com' });
const job = await client.jobs.create({ url: 'https://example.com', format: 'nextjs' });
const completed = await client.jobs.pollUntilComplete(job.id);
const zipBuffer = await client.exports.downloadZip(job.id);
```

### Python
```bash
pip install sitecompiler-py
```
```python
from sitecompiler import SiteCompilerClient

client = SiteCompilerClient(base_url="https://site-compiler.onrender.com")
job = client.jobs.create(url="https://example.com", format="astro")
completed = client.jobs.poll_until_complete(job.id)
zip_bytes = client.exports.download_zip(job.id)
```

---

## 🚀 Quickstart

### Prerequisites

- **Node.js**: `v20+`
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

3. **Install Playwright browser binaries**:
   ```bash
   npx playwright install chromium
   ```

4. **Start Development Server**:
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
│   ├── (exports)/              # Framework conversion landing pages
│   ├── admin/                  # In-app admin console (approvals, engine health)
│   ├── api/                    # Serverless API: export, job status/cancel/download, model
│   ├── edit/[jobId]/           # Visual AST page editor
│   ├── layout.tsx              # Root layout with AuthProvider & Navigation
│   └── page.tsx                # Main compiler workspace
├── components/                 # Core UI: navbar, footer, auth-modal, paywall-modal
├── lib/                        # Core compilation engine & utilities
│   ├── crawler/                # Playwright capture (screenshots, assets, watchdog)
│   ├── parser/                 # dom-cleaner, css-parser, asset-pipeline
│   ├── generator/              # Next.js, Astro, Svelte, Vue, Remix generator engines
│   ├── registry/               # 20+ accessible UI components & section templates
│   ├── jobs/                   # Job state machine, pipeline orchestrator, validators
│   ├── zip/                    # AdmZip packaging (README, offline assets)
│   └── security/               # Anti-SSRF guards (lexical + DNS-rebind)
├── packages/                   # Official Client SDKs
│   ├── sitecompiler-sdk/       # TypeScript / Node.js SDK
│   └── sitecompiler-py/        # Python SDK (PyPI package)
├── docs/                       # OpenAPI 3.1 & Architecture Documentation
│   ├── api/                    # OpenAPI 3.1 YAML & Postman Collection
│   ├── architecture/           # System design & threat models
│   └── deployment/             # Docker & Kubernetes guides
├── server/                     # Express backend (Render) — engine API
├── scripts/                    # Test harnesses, batch PR runners, smoke tests
├── public/                     # Static assets & brand media
└── package.json                # Dependencies & scripts
```

---

## 🔒 Security & Privacy

- **Protected Secrets**: Service account credentials (`*-firebase-adminsdk-*.json`) and `.env.local` files are explicitly excluded via `.gitignore` and are **never committed to public repositories**.
- **SSRF Mitigation**: Strict RFC-1918 private IP blocking and pre-flight DNS rebinding prevention.
- **PII Redaction**: Public polling endpoints automatically redact financial and user identifiers.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

<div align="center">

Crafted by [Subhankar Roy](https://github.com/subhxroy)

</div>
