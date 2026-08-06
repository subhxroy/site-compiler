# SiteCompiler — Standalone Admin Portal

This repository contains the standalone **Admin Portal** for SiteCompiler, designed to be hosted on a separate domain (e.g. `admin.sitecompiler.app`).

## Features
- **User Management & Access Control**: View all registered users and toggle export permissions (`canExport: true / false`).
- **Role Assignment**: Assign roles (`User`, `Pro Member`, `Administrator`).
- **Render Backend Engine Inspector**: Live health check & uptime monitor connecting to `https://site-compiler.onrender.com/health`.
- **System Metrics**: Real-time stats on total users, total saved exports, and active compilations.

## Local Execution
To run the Admin Portal locally on port 3002:

```bash
cd admin-portal
npm install
npm run dev
```

Open `http://localhost:3002`.

## Deployment to Custom Domain
1. Connect the `admin-portal` folder or branch to Vercel / Netlify / Cloudflare Pages.
2. Set Environment Variables:
   - `NEXT_PUBLIC_MAIN_SITE_URL`: `https://site-compiler.netlify.app`
   - `NEXT_PUBLIC_API_URL`: `https://site-compiler.onrender.com`
3. Point your custom domain (e.g. `admin.sitecompiler.app`) to the deployment.
