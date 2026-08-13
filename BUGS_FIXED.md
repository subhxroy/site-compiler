# SiteCompiler Confirmed Bugs & Remediations Report

This document records all confirmed bugs identified during the architectural and reliability audit of the SiteCompiler repository, along with the root cause and technical resolution applied.

---

## 1. Security & Authorization Bugs

### BUG-001: Substring Admin Email Match Privilege Escalation
- **Location:** `app/api/user/sync/route.ts` & `lib/firebase/auth-context.tsx`
- **Root Cause:** Admin status was verified with `email.includes('subhroy')`, allowing arbitrary third parties with accounts like `attacker_subhroy@domain.com` to gain administrator status.
- **Fix:** Switched to exact array matching (`allowlist.includes(email.toLowerCase().trim())`) against `ADMIN_EMAILS` with verified owner email defaults (`contact.subhroy-1@gmail.com`, `contact.subhroy@gmail.com`, `subhxroy@gmail.com`).

### BUG-002: Missing `adminAuth` Reference in Backend Download Handler
- **Location:** `server/index.ts`
- **Root Cause:** The `/api/job/:id/download` route attempted to call `adminAuth.verifyIdToken()` without importing `adminAuth` or `isFirebaseAdminConfigured`, triggering unhandled `ReferenceError` crashes upon authenticated download attempts.
- **Fix:** Imported `adminAuth` and `isFirebaseAdminConfigured` from `../lib/firebase/admin`, added graceful token verification and exact admin email matching.

### BUG-003: Overly Broad Firestore Security Rules
- **Location:** `firestore.rules`
- **Root Cause:** Top-level `/exports` had client write access, and `/users/{userId}` update rule allowed client payloads to set `isAdmin: true` and `role: 'admin'`.
- **Fix:** Locked down `/users/{userId}` updates to only safe user profile fields (`lastLoginAt`, `name`, `photoURL`), explicitly rejecting role escalations. Restricted `/exports` and `/export_approvals` to Firebase Admin SDK only.

### BUG-004: Incomplete SSRF CIDR Range Coverage
- **Location:** `lib/security/ssrf.ts`
- **Root Cause:** SSRF filter lacked coverage for Carrier-Grade NAT (`100.64.0.0/10`), IPv6 Unique Local Addresses (`fc00::/7`), IPv6 link-local (`fe80::/10`), documentation IPs (`192.0.2.0/24`, `198.51.100.0/24`, `203.0.113.0/24`), and Alibaba Cloud metadata (`100.100.100.200`).
- **Fix:** Implemented bitwise IPv4 and IPv6 subnet validators covering all IANA reserved, multicast, loopback, CGNAT, and cloud metadata blocks.

### BUG-005: Unrestricted Subpage Crawling SSRF Bypass
- **Location:** `lib/crawler/capture.ts`
- **Root Cause:** While initial entry URLs were validated, subpage links discovered during crawling and subresource network requests made inside Playwright browser pages were navigated without SSRF interception.
- **Fix:** Added Playwright context route interception (`context.route('**/*', ...)`) that resolves and checks all outgoing requests, plus asynchronous pre-validation before navigating subpages.

---

## 2. Pipeline, Reliability & Functional Bugs

### BUG-006: Admin Analytics Counter Stalled on Multi-Tenancy Architecture
- **Location:** `app/api/admin/stats/route.ts`
- **Root Cause:** Admin analytics queried the legacy top-level `/exports` collection which was empty because user exports are written to nested `/users/{uid}/exports/{id}` subcollections.
- **Fix:** Updated the query to use `adminDb.collectionGroup('exports')` with graceful fallback to `export_approvals` snapshot count.

### BUG-007: Aggressive DOM Watermark Stripping Removing Legitimate Structural Elements
- **Location:** `lib/parser/dom-cleaner.ts`
- **Root Cause:** `stripPlatformWatermarksFromDom` checked if the parent container had text length < 80 and removed the entire parent without verifying if the parent was a structural tag (`<main>`, `<section>`, `<nav>`, `<footer>`) or contained multiple child elements.
- **Fix:** Added structural tag guards and single-child verification (`parent.children().length === 1 && !isStructural`) before wrapper removal.

### BUG-008: Missing PWA Static Manifest Icons Causing 404 Errors
- **Location:** `public/icon-192.png` & `public/icon-512.png`
- **Root Cause:** `manifest.webmanifest` and SEO schema referenced `icon-192.png` and `icon-512.png` which were absent from the `public/` directory.
- **Fix:** Generated production-ready branding icons using raw PNG chunk generators and saved them in `public/`.

### BUG-009: Pricing Schema Mismatch in Marketing & SEO Tags
- **Location:** `app/(exports)/nextjs-export/page.tsx` & `lib/seo/schema.ts`
- **Root Cause:** Next.js export marketing banner referenced "NEXT.JS 15 ENGINE" instead of Next.js 16, and JSON-LD schema referenced outdated USD pricing ($9.99) instead of the canonical INR UPI paywall (₹20 per 10 pages).
- **Fix:** Synchronized badge to "NEXT.JS 16 ENGINE" and updated Schema.org JSON-LD definitions to ₹20 INR.

### BUG-010: Export History Page Download Failing for Authenticated Free-Pass Users
- **Location:** `app/history/page.tsx`
- **Root Cause:** Download button used direct unauthenticated `window.location.href` navigation, failing for admin users and approved exports that require Authorization headers.
- **Fix:** Implemented authenticated `fetch` with Bearer token, blob conversion, and fallback anchor trigger.

---

## 3. Verification

All 10 confirmed bugs have been verified as resolved:
- **Unit & Integration Tests:** 95/95 passing (`npm test`).
- **TypeScript Typecheck:** 0 errors across root and `admin-portal` (`npx tsc --noEmit`).
- **ESLint Validation:** 0 errors (`npm run lint`).
- **Production Build:** 62/62 static & dynamic routes compiled cleanly (`npm run build`).
