# SiteCompiler — Academic Design System & Slide Specification (`design.md`)

> **Institution:** Department of Physics  
> **Project:** SiteCompiler — Automated Website-to-Code Extraction System  
> **Presenter:** Subhankar Roy  
> **Design Theme:** *Academic & Physical Sciences (Scholarly Edition)*  
> **Version:** 2.1 (Defense Specification)

---

## 1. Design Philosophy & Academic Ethos

The visual language of **SiteCompiler** reflects the rigor, precision, and clarity of **Scientific & Physical Computing**:

### Core Principles
1. **Scholarly Clarity & Signal Density:** Replaces loud startup marketing gradients and high-saturation neon blocks with a clean, dignified academic palette. Information is organized logically through structured cards, bullet points, and vector schematics.
2. **High-Contrast Optical Readability:** Pure off-white / light slate canvas (`#F8FAFC`) paired with deep slate text (`#0F172A` / `#1E293B`) ensuring 100% WCAG AAA contrast readability from any presentation distance.
3. **Balanced Vertical Spacing:** Elimination of hollow gaps inside cards. Content is structured with clear conceptual headings, bulleted points with bold lead keywords, and discrete takeaway footers.
4. **Distraction-Free Navigation:** Slide footers, academic metadata, and viewport controls are isolated into distinct coordinate layers, featuring a 1-second auto-hiding frosted control dock.

---

## 2. Design Tokens (Three-Layer Architecture)

```
Primitive Tokens (Raw Chromatic & Scale Values)
       │
       ▼
Semantic Tokens (Purpose & Role-Based Aliases)
       │
       ▼
Component Tokens (Academic Cards, Badges, & Control Specifications)
```

### 2.1 Primitive Tokens
```css
/* Academic Color Palette */
--color-slate-900: #0F172A; /* Deepest slate for titles & primary text */
--color-slate-800: #1E293B; /* Secondary headers & bold emphasis */
--color-slate-700: #334155; /* Body copy & narrative explanations */
--color-slate-600: #475569; /* Subtitles and secondary annotations */
--color-slate-500: #64748B; /* Metadata labels & captions */
--color-slate-200: #E2E8F0; /* Clean academic borders & hairlines */
--color-slate-100: #F1F5F9; /* Subtle badge backdrops */
--color-slate-50:  #F8FAFC; /* Base canvas background */
--color-chalk:     #FFFFFF; /* Card background */

/* Scholarly Accent Tones */
--color-primary:        #1E40AF; /* Academic Navy Blue */
--color-primary-light:  #EFF6FF; /* Tinted blue card/badge background */
--color-primary-border: #BFDBFE; /* Subtle blue hairline */

--color-success-text:   #166534; /* Verified results / solutions */
--color-success-bg:     #F0FDF4; /* Light emerald tint */
--color-success-border: #BBF7D0;

--color-danger-text:    #991B1B; /* Problem statements / limitations */
--color-danger-bg:      #FEF2F2; /* Light crimson tint */
--color-danger-border:  #FECACA;

--color-amber-text:     #92400E; /* Analogies & scientific notes */
--color-amber-bg:       #FFFBEB;
--color-amber-border:   #FDE68A;

/* Typography Stacks */
--font-display: 'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
--font-body:    'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
--font-mono:    'Geist Mono', 'SF Mono', monospace;

/* Geometry & Radii */
--radius-card: 16px;
--radius-pill: 9999px;
--radius-sm:   8px;

/* Motion */
--ease-morph: cubic-bezier(0.16, 1, 0.3, 1);
```

### 2.2 Semantic Tokens
| Token | Source Value | Usage Description |
|---|---|---|
| `--surface-canvas` | `var(--color-slate-50)` | Main 16:9 slide container background |
| `--surface-card-neutral` | `var(--color-chalk)` | Standard content cards with `#E2E8F0` border |
| `--surface-card-solution`| `var(--color-primary-light)` | Solution cards with `#BFDBFE` border |
| `--surface-card-problem` | `var(--color-danger-bg)` | Problem cards with `#FECACA` border |
| `--surface-card-metric`  | `var(--color-success-bg)` | Success benchmark cards with `#BBF7D0` border |
| `--text-title` | `var(--color-slate-900)` | Section headings, display numbers |
| `--text-body` | `var(--color-slate-700)` | Academic explanations and comparisons |
| `--text-secondary` | `var(--color-slate-600)` | Subtitles and explanatory copy |
| `--text-meta` | `var(--color-slate-500)` | Monospace headers, footers, and timestamps |
| `--border-academic` | `1px solid var(--color-slate-200)` | Header, footer, and card structural dividers |

---

## 3. Typography Scale & Hierarchy

| Element | Font Family | Size (px) | Weight | Case / Tracking | Role |
|---|---|---|---|---|---|
| **Display Title (Hero)** | `var(--font-display)` | `48px – 52px` | 800 / Extrabold | Title Case / `-0.02em` | Slide 1 Title, Final Slide "Thank You" |
| **Slide Header Title** | `var(--font-display)` | `30px – 34px` | 700 / Bold | Title Case / `-0.015em` | Main section headings (e.g. "What is SiteCompiler...") |
| **Section Subtitle** | `var(--font-body)` | `14.5px – 15.5px` | 400 / Regular | Sentence Case / Normal | Descriptive analytical context under title |
| **Card Heading** | `var(--font-display)` | `17px – 18px` | 700 / Bold | Title Case / Normal | Card title (e.g. "OCR Scanner for the Web") |
| **Body Paragraph** | `var(--font-body)` | `13px – 13.5px` | 400 / Regular | Normal / `1.55` | Body explanation text inside cards |
| **Academic Bullet List**| `var(--font-body)` | `12.5px – 13px` | 400 / Regular | Normal / `1.5` | Key evidence with **Bold Keywords** |
| **Academic Header Meta**| `var(--font-mono)` | `11px – 11.5px` | 500 / Medium | UPPERCASE / `+0.06em` | Top metadata bar (Course, Department) |
| **Code & Technical Data**| `var(--font-mono)` | `11px – 12px` | 500 / Medium | Monospace | URLs, pipeline speeds, runtime metrics |

---

## 4. Slide Anatomy & Layout Specifications

All slides adhere to an exact **16:9 Landscape Canvas (1280px × 720px)** with responsive scaling.

```
┌────────────────────────────────────────────────────────────────────────┐
│  [Top Progress Bar: 3.5px Navy Fill]                                   │
├────────────────────────────────────────────────────────────────────────┤
│  DEPARTMENT OF PHYSICS • ACADEMIC PROJECT DEFENSE      [SITECOMPILER]  │
│  ────────────────────────────────────────────────────────────────────  │
│                                                                        │
│  What is SiteCompiler & What Problem Does It Solve?                    │
│  An analytical breakdown of the web scanner concept and solution.      │
│                                                                        │
│  ┌─────────────────────────┐     ┌──────────────────────────────────┐  │
│  │ [01 • Optical Analogy]  │     │ [03 • The Solution]              │  │
│  │ OCR Scanner for the Web │     │ 100% Free Hosting Sovereignty    │  │
│  │ ─────────────────────── │     │ ──────────────────────────────── │  │
│  │ • Reconstructs DOM      │     │ • Zero forced watermarks         │  │
│  │ • Modular code output   │     │ • Perpetual $0/yr deployment     │  │
│  │                         │     │                                  │  │
│  │ Input: URL ➔ Output: ZIP│     │ Outcome: Code Sovereignty        │  │
│  └─────────────────────────┘     └──────────────────────────────────┘  │
│                                                                        │
│  ────────────────────────────────────────────────────────────────────  │
│  SiteCompiler • Academic Project Defense    Department of Physics    Slide 02 of 12 │
└────────────────────────────────────────────────────────────────────────┘
                    [ ‹ Prev  •••••  02 / 12  Next ›  ⛶ ] (Auto-hides in 1s)
```

### 4.1 Academic Header Bar
- **Position:** Top of slide content (`padding-bottom: 10px`).
- **Left:** Monospace metadata (e.g. `01 • PROBLEM DEFINITION & CONCEPTUAL FRAMEWORK`).
- **Right:** Badge pill (e.g. `OVERVIEW`, `ARCHITECTURE`).
- **Divider:** `1px solid var(--color-slate-200)`.

### 4.2 Balanced Card Content Structure
- Cards avoid hollow vertical spacing by utilizing structured content blocks:
  1. **Header Badge:** Categorical label (e.g. `01 • Optical Analogy`).
  2. **Card Title:** Concise, bold title (`18px`).
  3. **Analytical Paragraph:** High-signal introductory description.
  4. **Structured Bulleted Points:** Concrete technical details with bold prefixes.
  5. **Footer Summary:** Highlighted takeaway anchored cleanly at the bottom.

### 4.3 Decoupled Slide Footer
- **Position:** Fixed at bottom of slide (`padding-top: 10px`, `border-top: 1px solid var(--color-slate-200)`).
- **Left:** `SiteCompiler • Academic Project Defense`
- **Center:** `Department of Physics • Subhankar Roy`
- **Right:** `Slide XX of 12` in bold academic primary color (`#1E40AF`).

---

## 5. Presentation Controls & Fullscreen UX

### 5.1 Floating Control Dock
- **Style:** Frosted Deep Slate (`rgba(15, 23, 42, 0.92)`, `backdrop-filter: blur(16px)`).
- **Border:** `1px solid rgba(255, 255, 255, 0.12)`.
- **Dimensions & Radius:** Pill shape (`border-radius: 9999px`, `padding: 7px 18px`).
- **Position:** Fixed bottom center (`bottom: 20px; left: 50%; transform: translateX(-50%);`).

### 5.2 1-Second Auto-Hide Inactivity Timer
- **Inactivity Timeout:** **1.0 second (1000ms)** in both Fullscreen and standard presentation modes.
- **Wake Triggers:** Pointer movement (`mousemove`), touch tap (`touchstart`), and keyboard navigation (`keydown`).
- **Transition:** Smooth fade & slide down (`opacity: 0; transform: translateX(-50%) translateY(16px); pointer-events: none;`).

---

## 6. Color Contrast Ratios (WCAG AAA Compliance)

| Element Pair | Foreground | Background | Contrast Ratio | Compliance |
|---|---|---|---|---|
| **Slate 900 on Slate 50 (Canvas)** | `#0F172A` | `#F8FAFC` | **17.8 : 1** | **AAA** (Optimal) |
| **Slate 900 on White (Card)** | `#0F172A` | `#FFFFFF` | **18.7 : 1** | **AAA** (Optimal) |
| **Slate 700 on White (Body)** | `#334155` | `#FFFFFF` | **9.6 : 1** | **AAA** (Optimal) |
| **Primary Blue on Light Blue** | `#1E40AF` | `#EFF6FF` | **7.9 : 1** | **AAA** (Optimal) |
| **Danger Crimson on Light Red** | `#991B1B` | `#FEF2F2` | **8.1 : 1** | **AAA** (Optimal) |
| **Success Emerald on Light Green** | `#166534` | `#F0FDF4` | **8.5 : 1** | **AAA** (Optimal) |

---

## 7. Slide-by-Slide Academic Storyboard

1. **Slide 01 — Defense Title & Research Agenda:** Student credentials, department metadata, and research modules overview.
2. **Slide 02 — Problem Definition & Conceptual Framework:** Optical character recognition (OCR) analogy, vendor lock-in mechanics, and code sovereignty.
3. **Slide 03 — 4-Stage System Flowchart:** Linear pipeline (URL Ingestion ➔ Headless Snapshot ➔ DOM Sanitization ➔ Code Emission).
4. **Slide 04 — AI-Assisted Engineering Methodology:** Scientific modeling and Student + Antigravity AI pair programming topology.
5. **Slide 05 — Live Interface & Interactive Workflow:** 4-step user workflow paired with high-fidelity browser viewport demo.
6. **Slide 06 — Economic & Technical Analysis:** Quantitative SaaS fee analysis ($240–$600/yr) vs zero-cost deployment on Netlify / GitHub Pages.
7. **Slide 07 — 5-Stage Compilation Pipeline:** Detailed technical breakdown from Playwright capture to ts-morph AST synthesis.
8. **Slide 08 — Full-Stack Architecture & Data Flow:** Decoupled 3-tier architecture (Next.js UI, Express API, Playwright AST engine).
9. **Slide 09 — Algorithmic Watermark & Artifact Pruning:** Heuristic DOM node sanitization preserving layout integrity.
10. **Slide 10 — Multi-Format Output Deliverables:** Modular breakdown of Static HTML5/CSS3, React 19 TSX, and Next.js 16 projects.
11. **Slide 11 — Quantitative Results & Evaluation:** Performance metrics (<4.2s latency, 100% watermark stripping, zero vendor lock-in).
12. **Slide 12 — Conclusion & Defense Q&A:** Closing remarks, open-source repository, and live web application link.
