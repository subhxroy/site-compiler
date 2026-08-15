# Walkthrough — Phase 1: Stable Node IDs & Patchable HTML Live Editor

We have fully implemented and verified **Phase 1: Stable Node IDs + Patchable HTML Export** for SiteCompiler.

---

## 1. Summary of Accomplishments

### A. Deterministic DOM Node Tagging (`lib/model/node-tagger.ts`)
- Implemented non-cryptographic **FNV-1a 32-bit hashing** based on element tag, DOM structural path, and initial text/image content sample.
- Deterministically attaches `data-sc-id="sc_<fnv1a_hash>"` to text nodes (`h1..h6, p, span, a, li, blockquote, button`) and `<img>` tags on the cleaned Cheerio AST.
- Strictly idempotent: repeated passes do not change existing hashes.
- Automatically excludes internal elements (`#sitecompiler-critical`, scripts, styles, noscript, head).

### B. Site Model JSON Extraction (`lib/model/extract-model.ts`)
- Extracts a structured `SiteModel` dictionary (`version: 1`, `nodes: Record<string, SiteModelNode>`).
- Saves `site-model.json` at the root of `output/html-export/`.

### C. Atomic Point-Patch Engine (`lib/model/apply-patch.ts` & `lib/model/patch-job.ts`)
- Applies mutations **strictly** via `.text(content)` and `.attr('src'|'alt', value)` on exact `[data-sc-id]` selectors.
- **Zero Structural Drift**: Never touches `.html()`, inner/outer structures, parent containers, or CSS class names.
- Validates batch size ($\le 200$), text string lengths ($\le 5000$), and sanitizes image sources (allowing local `./assets/` or base64 data URIs, while safely rejecting remote/malicious URLs).
- Staged output is validated via `validateHtmlOutput()` before atomic replacement, followed by `createJobZip()` re-packaging and `validateZip()` archive verification.

### D. Server Endpoints (`server/index.ts` & `app/api/job/[id]/model/route.ts`)
- `GET /api/job/:id/model`: Serves the `SiteModel` JSON map.
- `POST /api/job/:id/model`: Applies batch patches with IP rate-limiting (20 saves/min).

### E. In-Browser Visual Live Editor (`app/edit/[jobId]/page.tsx`)
- Renders the interactive preview iframe with an injected `contenteditable` bridge.
- Provides immediate visual editing on text nodes, inline image replacement, pending changes badge, one-click "Save Changes", and "Download updated ZIP" button.
- Integrated into `app/client-page.tsx` and `app/history/page.tsx`.

### F. ZIP Archive Isolation (`lib/zip/build-zip.ts`)
- Configured directory exclusion in `collectFiles` and `addFolderToZip` to guarantee `.sc-tagged/` files remain internal and are not bundled into user ZIP downloads.

---

## 2. Verification & Automated Test Results

All test suites and production build gates passed with zero errors:

| Check | Result | Details |
|---|---|---|
| `npm test` | ✅ **122 / 122 PASSED** | All 5 test suites (SSRF, Security/PII, Pipeline, DOM, and Model Patching) green. |
| `npx tsc --noEmit` | ✅ **0 ERRORS** | Full TypeScript strict type compliance. |
| `npm run lint` | ✅ **0 ERRORS** | Clean ESLint verification. |
| `npm run build` | ✅ **62 / 62 PAGES** | Next.js production build succeeded for all pages and API routes. |
| `git push` | ✅ **COMMITTED & PUSHED** | Commit `c15f618` pushed to `origin/main`. |

---

## 3. Git History

- **Commit `c15f618`**: `feat: implement Phase 1 stable node IDs, site model extraction, and patchable HTML editor`
- Pushed to `https://github.com/subhxroy/site-compiler.git`.
