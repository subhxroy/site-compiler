# SiteCompiler Production Readiness & Operations Guide

**System Health:** **READY FOR DEPLOYMENT**  
**Version:** 1.0.0 (Next.js 16 + Express + Playwright)

---

## 1. Deployment Architecture

SiteCompiler uses a hybrid, distributed production architecture:

```
                      ┌──────────────────────────────────────┐
                      │             Cloudflare               │
                      │     (DNS, SSL Termination, CDN)      │
                      └──────────────────┬───────────────────┘
                                         │
                 ┌───────────────────────┴───────────────────────┐
                 ▼                                               ▼
   ┌───────────────────────────┐                   ┌───────────────────────────┐
   │     Netlify Frontend      │                   │      Render Backend       │
   │  Next.js 16 (App Router)  │                   │ Node.js / Express Service │
   │  - Marketing & Landing    │                   │  - Playwright Headless    │
   │  - Auth & Admin Console   │                   │  - AST Parser & Compiler  │
   │  - UPI Payment Form       │                   │  - Anti-SSRF Firewall     │
   │  - Polling & SSE Relay    │                   │  - ZIP Packager           │
   └─────────────┬─────────────┘                   └─────────────┬─────────────┘
                 │                                               │
                 └───────────────────────┬───────────────────────┘
                                         ▼
                           ┌───────────────────────────┐
                           │      Google Firebase      │
                           │ - Authentication          │
                           │ - Firestore Database      │
                           │ - Admin SDK Storage       │
                           └───────────────────────────┘
```

---

## 2. Environment Variables Checklist

### Netlify (Frontend)
| Variable | Description | Example / Default |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | Backend URL for compiler API | `https://api.sitecompiler.app` |
| `NEXT_PUBLIC_ADMIN_EMAILS` | Comma-separated admin email list | `contact.subhroy-1@gmail.com,subhxroy@gmail.com` |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase Client API Key | `AIzaSy...` |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase Auth Domain | `sitecompiler-prod.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase Project ID | `sitecompiler-prod` |
| `FIREBASE_ADMIN_SERVICE_ACCOUNT` | JSON-serialized service account | `{"type":"service_account",...}` |
| `ADMIN_BYPASS_SECRET` | Secret token for admin API relay | `[32+ character high-entropy string]` |

### Render (Backend)
| Variable | Description | Example / Default |
| :--- | :--- | :--- |
| `PORT` | HTTP Port for Express backend | `8080` / `10000` |
| `NODE_ENV` | Environment mode | `production` |
| `ADMIN_EMAILS` | Comma-separated admin email list | `contact.subhroy-1@gmail.com,subhxroy@gmail.com` |
| `ADMIN_BYPASS_SECRET` | Shared secret with Netlify | `[Same 32+ character string]` |
| `FIREBASE_ADMIN_SERVICE_ACCOUNT` | JSON-serialized service account | `{"type":"service_account",...}` |
| `EXPORT_JOB_TIMEOUT_MS` | Watchdog timeout for crawler jobs | `300000` (5 minutes) |
| `EXPORT_RETENTION_MS` | Auto-purging retention window | `86400000` (24 hours) |

---

## 3. Pre-Flight Verification Checklist

- [x] **Automated Test Suite:** 95/95 passing (`npm test`).
- [x] **Anti-SSRF Network Protection:** Verified active on both entry endpoints and Playwright route interception.
- [x] **Firestore Security Rules:** Hardened against client role tampering and unauthorized writes.
- [x] **Admin Authorization:** Verified exact email allowlist matching on both frontend and backend.
- [x] **TypeScript Compilation:** Zero errors (`npx tsc --noEmit` across main repo and `admin-portal`).
- [x] **Production Bundle Build:** Next.js 16 build passed with 62 static/dynamic routes.
- [x] **Log & Error Scrubbing:** Secret keys, Bearer tokens, and UTRs are stripped from all public logs.
