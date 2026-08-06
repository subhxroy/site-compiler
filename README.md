<div align="center">

# ⚡ SiteCompiler

**Convert any published website into production-ready Static HTML, React TSX, or Next.js 15 + Tailwind CSS codebases.**

[![Next.js 15](https://img.shields.io/badge/Next.js-15.1-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![Firebase](https://img.shields.io/badge/Firebase-11.0-FFCA28?style=for-the-badge&logo=firebase)](https://firebase.google.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

[Demo](https://site-compiler.netlify.app) · [Features](#-key-features) · [Quickstart](#-quickstart) · [Architecture](#-architecture) · [API Documentation](#-api-reference)

---

</div>

## 🌟 Overview

**SiteCompiler** is an enterprise-grade website extraction and code compilation platform. It crawls published web pages (from Framer, Webflow, Wix, Squarespace, or custom static sites), parses DOM element structures, extracts assets (images, SVGs, custom fonts, stylesheets), and reconstructs them into clean, modular codebases.

Whether you need a lightweight **Static HTML bundle**, modular **React TSX components**, or a full **Next.js 15 App Router project**, SiteCompiler builds the complete project structure and packages it into a downloadable `.zip` archive.

---

## ⚡ Key Features

- **🌐 Multi-Engine Code Generator**:
  - **Static HTML5**: Zero-dependency Semantic HTML5, CSS3, and JavaScript bundle.
  - **React TSX**: Modular React components styled with utility-first Tailwind CSS.
  - **Next.js 15**: Fully scaffolded App Router project (`app/page.tsx`, `components/`, `public/`, `package.json`, `tsconfig.json`).
- **🔐 Firebase Authentication & Firestore Cockpit**:
  - Google 1-Click Sign-In & Email/Password Authentication.
  - Automatic export history persistence in Firebase Firestore (`users/{uid}/exports`).
  - Seamless dual-mode fallback using Firebase Admin SDK (`site-compiler-firebase-adminsdk-*.json`).
- **🎨 Raycast-Inspired Cyberpunk Interface**:
  - Live progress logs streaming directly to a dark-mode terminal console.
  - Responsive multi-viewport preview switcher (Desktop, Tablet, Mobile).
  - State preservation across page reloads via URL `?jobId=` and `localStorage`.
- **🚀 Automated Garbage Collection**:
  - Built-in background queue cleanup to purge stale temporary crawl files and ZIP archives.

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
                      |   Static HTML5     |   |     React TSX      |   |   Next.js 15 App   |
                      |    Generator       |   |     Generator      |   |   Router Scaffold  |
                      +--------------------+   +--------------------+   +--------------------+
                                 |                       |                       |
                                 +-----------------------+-----------------------+
                                                         |
                                                         v
                                    +-----------------------------------------+
                                    |  JSZip Packaging Engine & Download API  |
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

- **Node.js**: `v18.17.0` or higher
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
   Create a `.env.local` file in the root directory:
   ```env
   NEXT_PUBLIC_SITE_URL=http://localhost:3000

   # Firebase Client Config (Optional - Defaults preconfigured for site-compiler)
   NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyDNiWJk2XFi0Q5IKv_1QLlyoMeYI8k9EEs
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=site-compiler.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=site-compiler
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=site-compiler.firebasestorage.app
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=160987480027
   NEXT_PUBLIC_FIREBASE_APP_ID=1:160987480027:web:079416ca098a8354fd31fe
   ```

5. **Start Development Server**:
   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📁 Repository Structure

```
site-compiler/
├── app/                        # Next.js 15 App Router Routes
│   ├── api/                    # API Endpoints (crawling, jobs, user sync, downloads)
│   ├── blog/                   # Blog & SEO Articles
│   ├── docs/                   # Developer Documentation Pages
│   ├── features/               # Platform Features Page
│   ├── history/                # User Saved Export Cockpit
│   ├── pricing/                # Plan & Pricing Options
│   ├── status/                 # System Status Page
│   ├── layout.tsx              # Root Layout with AuthProvider & Navigation
│   └── page.tsx                # Main Interactive SiteCompiler Workspace
├── components/                 # UI Component Library
│   ├── auth-modal.tsx          # Firebase Sign-In / Sign-Up Modal
│   ├── footer.tsx              # Footer Component
│   ├── navbar.tsx              # Navigation Bar & Profile Avatar Dropdown
│   └── ui/                     # Reusable UI Atoms (Buttons, Cards, Badges)
├── lib/                        # Core Compilation Engine & Utilities
│   ├── crawler/                # Playwright DOM Extractor & Page Capture
│   ├── firebase/               # Firebase Client & Admin SDK Configurations
│   ├── generator/              # HTML, React TSX, & Next.js Code Generators
│   ├── jobs/                   # In-Memory Queue & Garbage Collection
│   └── seo/                    # Schema.org JSON-LD & OpenGraph Generators
├── public/                     # Static Brand Assets & Favicons
├── exports/                    # Local Temporary Output Directory (Git-Ignored)
├── firestore.rules             # Firebase Firestore Security Rules
├── firebase.json               # Firebase CLI Deployment Spec
├── package.json                # Dependencies & Project Metadata
└── README.md                   # Project Documentation
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
