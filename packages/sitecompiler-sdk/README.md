# @sitecompiler/sdk

The official TypeScript/Node.js client library for the **SiteCompiler** API. Turn any public web page into production-ready Next.js, Astro, Svelte, or Vue projects programmatically.

## Installation

```bash
npm install @sitecompiler/sdk
```

## Quick Start

```typescript
import { SiteCompilerClient } from '@sitecompiler/sdk';

const client = new SiteCompilerClient({
  baseUrl: 'https://site-compiler.onrender.com',
});

// 1. Submit an export job
const job = await client.jobs.create({
  url: 'https://example.com',
  format: 'nextjs',
});

console.log(`Job created: ${job.id}`);

// 2. Poll until complete
const completedJob = await client.jobs.pollUntilComplete(job.id, {
  onProgress: (status) => console.log(`[${status.status}] ${status.progressMessage}`),
});

// 3. Download the compiled ZIP package
const zipBuffer = await client.exports.downloadZip(job.id);
```
