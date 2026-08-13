# SiteCompiler — Standalone Admin Portal

This repository contains the standalone **Admin Portal** for SiteCompiler, designed to be hosted on a separate domain (e.g. `admin.sitecompiler.app`).

## Features
- **User Management & Access Control**: View all registered users and toggle export permissions (`canExport: true / false`).
- **Role Assignment**: Assign roles (`User`, `Pro Member`, `Administrator`).
- **Payment Approval Queue**: Review UPI payment submissions (`export_approvals`) and approve/reject — approval flips `paymentApproved` in Firestore **and** mirrors it into the backend's in-memory store, and re-triggers a failed/cancelled export job (payment-triggered restart).
- **Render Backend Engine Inspector**: Live health check & uptime monitor connecting to `https://site-compiler.onrender.com/health`.
- **System Metrics**: Real-time stats on total users, total saved exports, and engine status/uptime/memory.

## Local Execution
To run the Admin Portal locally on port 3002:

```bash
cd admin-portal
npm install
npm run dev
```

Open `http://localhost:3002`.

## Deployment to Custom Domain
1. Build a static export (`output: 'export'`) and connect the `admin-portal` folder to Vercel / Netlify / Cloudflare Pages.
2. Set Environment Variables:
   - `NEXT_PUBLIC_MAIN_SITE_URL`: `https://site-compiler.netlify.app`
   - `NEXT_PUBLIC_API_URL`: `https://site-compiler.onrender.com` (used for the engine health inspector)
3. Point your custom domain (e.g. `admin.sitecompiler.app`) to the deployment.

All admin API calls go against the **main site's** `/api/admin/*` routes with a Firebase ID token Bearer header (the portal itself is `noindex` and has no backend of its own).
