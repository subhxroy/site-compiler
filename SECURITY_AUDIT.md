# SiteCompiler Security Audit & Hardening Report

**Audit Date:** August 2026  
**Audited By:** Lead Security Engineer  
**Status:** **PASSED / HARDENED**  
**Classification:** Production Grade

---

## 1. Executive Summary

A comprehensive, zero-trust security audit was performed across the entire SiteCompiler codebase, covering frontend Next.js applications, backend Node/Express compilation engines, Playwright browser crawling infrastructure, Firebase Authentication, and Firestore Security Rules.

All critical and high-severity vulnerabilities identified during the audit have been remediated, verified with automated test suites (`tests/ssrf.test.ts`, `tests/security.test.ts`), and confirmed against production build pipelines.

---

## 2. Threat Analysis & Remediations

### 2.1 Server-Side Request Forgery (SSRF) & Network Perimeter
- **Vulnerability**: Target URLs submitted by users could potentially resolve to internal loopback addresses (`127.0.0.1`, `[::1]`), cloud metadata endpoints (`169.254.169.254`, `100.100.100.200`, `metadata.google.internal`), Carrier-Grade NAT (`100.64.0.0/10`), or private RFC 1918 subnets (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`).
- **Remediation**:
  1. Built a complete IPv4 and IPv6 CIDR parser in [`lib/security/ssrf.ts`](file:///c:/Users/Subhankar%20Roy/Desktop/codify/lib/security/ssrf.ts) checking against all IANA-reserved and cloud metadata ranges.
  2. Implemented strict DNS resolution verification (`dns.promises.lookup`) to defeat DNS rebinding attacks.
  3. Added Playwright browser context route interception (`context.route('**/*', ...)`) in [`lib/crawler/capture.ts`](file:///c:/Users/Subhankar%20Roy/Desktop/codify/lib/crawler/capture.ts) ensuring that subresource fetches (images, CSS, scripts, iframes) and HTTP redirects cannot reach private IPs or metadata endpoints.
  4. Added async pre-validation before crawling any discovered subpages.

### 2.2 Privilege Escalation & Admin Role Verification
- **Vulnerability**: User sync (`app/api/user/sync/route.ts`) and client auth context used loose substring checks (e.g. `email.includes('subhroy')`), allowing malicious emails such as `attacker_subhroy@evil.com` to gain unauthorized administrative privileges.
- **Remediation**:
  1. Replaced substring checks with strict, exact allowlist matching against configured `ADMIN_EMAILS` (defaulting to verified owner addresses `contact.subhroy-1@gmail.com`, `contact.subhroy@gmail.com`, `subhxroy@gmail.com`).
  2. Made administrative status strictly server-authoritative (`isAdmin` and `userRole` are set exclusively by server responses and Firebase Auth verified tokens).
  3. Hardened backend admin endpoints (`/api/job/:id/download`, `/api/admin/*`) to verify Firebase ID tokens or high-entropy bypass secrets (`ADMIN_BYPASS_SECRET`).

### 2.3 Firestore Security Rules & Access Controls
- **Vulnerability**: `firestore.rules` permitted open client writes to `/exports/{exportId}` and allowed users to update their own `/users/{userId}` documents without field restrictions, permitting client-side elevation to `role: 'admin'` or `isAdmin: true`.
- **Remediation**:
  1. Locked `/users/{userId}` update rules so clients can only update non-sensitive metadata (`lastLoginAt`, `name`, `photoURL`) while strictly forbidding modification of `role`, `isAdmin`, `canExport`, or `customClaims`.
  2. Moved `/exports` and `/export_approvals` writes exclusively to server-side Firebase Admin SDK (`allow read, write: if false;`).
  3. User export subcollections (`/users/{userId}/exports/{exportId}`) are restricted to authenticated owners with document ID matches.

### 2.4 PII & Financial Data Redaction
- **Vulnerability**: Transaction numbers (UTR), payer UPI IDs, and internal server paths could leak to unauthenticated client polls.
- **Remediation**:
  1. Created `toPublicJob()` sanitization layer in [`lib/jobs/store.ts`](file:///c:/Users/Subhankar%20Roy/Desktop/codify/lib/jobs/store.ts) stripping `utrNumber`, `senderAccount`, `userEmail`, and internal file paths before returning JSON payloads to client polling endpoints.
  2. Implemented log secret scrubbers ensuring Firebase keys, Bearer tokens, and UTR numbers are never emitted in console streams or audit logs.

### 2.5 Path Traversal & ZIP Injection
- **Vulnerability**: Download endpoints and ZIP packaging functions could be exploited via relative path traversal (`../`) to access server root files.
- **Remediation**:
  1. Enforced directory containment checks using `path.resolve` in [`server/index.ts`](file:///c:/Users/Subhankar%20Roy/Desktop/codify/server/index.ts) ensuring download requests remain strictly within `exports/`.
  2. Sanitized file entry names in [`lib/zip/build-zip.ts`](file:///c:/Users/Subhankar%20Roy/Desktop/codify/lib/zip/build-zip.ts) rejecting any path components containing `..` or illegal control characters.

---

## 3. Automated Test Verification

| Test Suite | Test Count | Status |
| :--- | :--- | :--- |
| **Anti-SSRF & Network Firewall** | 50 Tests | **100% Passed** |
| **Security, Auth & PII Protection** | 21 Tests | **100% Passed** |
| **Compiler Pipeline & Output Gates** | 15 Tests | **100% Passed** |
| **Crawler, DOM & CSS Consolidation** | 9 Tests | **100% Passed** |
| **Total Automated Tests** | **95 Tests** | **ALL PASSED** |

---

## 4. Recommendations for Operations

1. **Environment Variables**:
   - Ensure `ADMIN_EMAILS` is populated in production environments on both Render and Netlify.
   - Set strong, high-entropy secrets for `ADMIN_BYPASS_SECRET` and `CRON_SECRET`.
2. **Network Firewalls**:
   - Keep Render backend instances isolated in standard private container runtimes with outbound rate limiting.
3. **Log Monitoring**:
   - Monitor Sentry error captures for any elevated frequency of `SSRF_BLOCKED` or `AUTHENTICATION_DENIED` events.
