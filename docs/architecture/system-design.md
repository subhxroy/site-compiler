# System Design Architecture

SiteCompiler is an automated website compiler and code generator engineered to crawl, sanitize, and deconstruct production web pages into idiomatic source code across modern frontend frameworks (Next.js 15, Astro 4, SvelteKit 2, Vue 3/Nuxt 3, and Remix).

```mermaid
graph TD
    Client[Browser Client / SDK] -->|1. Submit Job| Proxy[Next.js Serverless Edge / Netlify]
    Proxy -->|2. Proxy Request| Backend[Render Express Worker Node]
    Backend -->|3. Spawn Playwright| Crawler[Headless Chromium Cluster]
    Crawler -->|4. Raw DOM + CSS Assets| Pipeline[Compilation Pipeline]
    
    subgraph Pipeline Phases
        Pipeline --> P1[DOM Cleaner & Sanitizer]
        P1 --> P2[CSS Parser & Consolidator]
        P2 --> P3[AST Parser & Stable ID Tagger]
        P3 --> P4[Section Detector & Component Scaffolder]
        P4 --> P5[Framework Generator: Next.js / Astro / Svelte / Vue / Remix]
        P5 --> P6[Archive Packager: ZIP]
    end
    
    P6 -->|7. Export Ready| Storage[Local FS / Cloud Storage]
    Client -->|8. Direct Download| Storage
```

## Architectural Highlights

1. **Dual-Tier Deployment Strategy**:
   - **Frontend & Edge Tier (Netlify/Vercel)**: Serves static assets, user authentication, and lightweight proxies.
   - **Heavy Worker Tier (Render Docker instance)**: Houses the headless Chromium runtime and memory-intensive compilation tasks.

2. **Idempotency & Resilience**:
   - Every compilation request accepts an `x-idempotency-key` header to prevent duplicate crawler runs.
   - Watchdog timers enforce strict timeouts across individual stages, with automatic fallbacks (e.g. raw HTML fallback if AST parsing fails).

3. **Multi-Target Code Generation Engine**:
   - Compiles parsed DOM representations into framework-specific idioms:
     - **Next.js**: React Server Components + Client hydration boundaries.
     - **Astro**: Static `.astro` component layouts and zero-JS hydration islands.
     - **SvelteKit**: Single-file reactive components (`.svelte`).
     - **Vue / Nuxt**: Composition API templates (`.vue`) and Pinia stores.
     - **Remix**: Route modules with meta functions and loaders.
