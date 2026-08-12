if (!process.env.PLAYWRIGHT_BROWSERS_PATH) {
  process.env.PLAYWRIGHT_BROWSERS_PATH = './pw-browsers';
}

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import { createJob, getJob, toPublicJob, cancelExportJob, updateJob, getJobByIdempotencyKey } from '../lib/jobs/store';
import { processExportJob } from '../lib/jobs/process';
import { validateUrlForSsrf } from '../lib/security/ssrf';

const app = express();
const PORT = Number(process.env.PORT) || 3001;
const HOST = process.env.HOST || '0.0.0.0';

// ── Health Endpoints (registered BEFORE CORS so Render's scanner always gets a 200) ──
const healthHandler = (_req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.status(200).json({
    status: 'ok',
    service: 'sitecompiler-backend',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    memoryUsage: process.memoryUsage(),
  });
};

app.get('/health', healthHandler);
app.get('/api/health', healthHandler);

// CORS configuration — allow known origins only (local dev + Netlify frontend + configured domains).
// The browser now calls the Render backend directly for export job creation (to bypass
// Netlify's 10s serverless timeout). All other API calls proxy through Netlify.
// Custom origins can be added via the CORS_ORIGINS env var (comma-separated list).
function isAllowedOrigin(origin: string | undefined, callback: (err: Error | null, allow: boolean) => void): void {
  if (!origin) {
    // Server-to-server request (no Origin header) — always allow
    callback(null, true);
    return;
  }
  try {
    const u = new URL(origin);
    // Always allow local dev
    if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') {
      callback(null, true);
      return;
    }
    // Allow Netlify production domains
    if (u.hostname.endsWith('.netlify.app')) {
      callback(null, true);
      return;
    }
    // Allow the configured frontend URL (set in Render env as FRONTEND_URL)
    const frontendUrl = process.env.FRONTEND_URL || 'https://site-compiler.netlify.app';
    if (frontendUrl) {
      try {
        if (new URL(frontendUrl).origin === u.origin) {
          callback(null, true);
          return;
        }
      } catch { /* ignore */ }
    }
    // Allow any extra origins from CORS_ORIGINS env var
    const extra = (process.env.CORS_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
    const allowed = extra.some((e) => {
      try { return new URL(e).origin === u.origin; } catch { return false; }
    });
    callback(null, allowed);
  } catch {
    callback(null, false);
  }
}

app.use(
  cors({
    origin: isAllowedOrigin,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-idempotency-key', 'x-sitecompiler-admin-bypass'],
  })
);

app.use(express.json());

// ── Security Headers Middleware ─────────────────────────────────────────────
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// ── Express Rate Limiting (15 requests per minute for exports) ───────────────
const exportRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too Many Requests', message: 'Rate limit exceeded. Please wait 60 seconds before creating a new export.' },
});

// ── Export Endpoint ────────────────────────────────────────────────────────────
// The Netlify serverless layer (app/api/export/route.ts) already performed the
// DNS-resolving async SSRF check before proxying here. Use the fast lexical check
// on this hop so the endpoint responds in milliseconds (DNS lookup was the
// bottleneck causing Netlify's 10s function timeout to fire on warm instances).
app.post('/api/export', exportRateLimiter, async (req: Request, res: Response) => {
  try {
    const { url } = req.body || {};
    const allowedFormats = ['html', 'react', 'nextjs'];
    const format = allowedFormats.includes(req.body?.format) ? req.body.format : 'nextjs';
    const idempotencyKey = (req.get('x-idempotency-key') || req.body?.idempotencyKey || '').trim();

    const ssrfCheck = validateUrlForSsrf(url);
    if (!ssrfCheck.valid || !ssrfCheck.url) {
      res.status(400).json({ error: ssrfCheck.reason || 'Invalid or forbidden target URL' });
      return;
    }

    const safeUrl = ssrfCheck.url;
    const isNewJob = !idempotencyKey || !getJobByIdempotencyKey(idempotencyKey);
    const job = createJob(safeUrl, format, idempotencyKey || undefined);

    // Respond immediately with the jobId
    res.status(200).json({ jobId: job.id, status: job.status });

    // Trigger background export process only if this is a newly created job
    if (isNewJob && job.status === 'pending') {
      processExportJob(job.id).catch((err) => {
        console.error(`[Render Backend] Background job ${job.id} failed:`, err);
      });
    }
  } catch (error: unknown) {
    res.status(500).json({ error: (error as Error).message || 'Internal Server Error' });
  }
});

// ── Job Status Endpoint ────────────────────────────────────────────────────────
app.get('/api/job/:id/status', (req: Request, res: Response) => {
  const { id } = req.params;
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(id)) {
    res.status(400).json({ error: 'Invalid job id' });
    return;
  }
  const job = getJob(id);

  if (!job) {
    res.status(404).json({ error: 'Job not found' });
    return;
  }

  res.status(200).json(toPublicJob(job));
});

// ── Job Download Endpoint ──────────────────────────────────────────────────────
app.get('/api/job/:id/download', (req: Request, res: Response) => {
  const { id } = req.params;
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(id)) {
    res.status(400).json({ error: 'Invalid job id' });
    return;
  }
  const job = getJob(id);

  if (!job || job.status !== 'completed') {
    res.status(404).json({ error: 'Export package not ready' });
    return;
  }

  if (!job.paymentApproved) {
    // Admin free-pass: the Netlify download route verifies the Firebase admin
    // ID token, then forwards this shared-secret header. Never trust browsers —
    // only the frontend serverless function knows ADMIN_BYPASS_SECRET.
    const bypassSecret = process.env.ADMIN_BYPASS_SECRET;
    const isAdminBypass = !!bypassSecret && req.get('x-sitecompiler-admin-bypass') === bypassSecret;
    if (!isAdminBypass) {
      res.status(403).json({ error: 'Export pending admin payment approval' });
      return;
    }
  }

  const exportDir = path.join(process.cwd(), 'exports', id);
  const zipPath1 = path.join(exportDir, `${id}.zip`);
  const zipPath2 = path.join(exportDir, `download.zip`);
  const zipPath = fs.existsSync(zipPath1) ? zipPath1 : fs.existsSync(zipPath2) ? zipPath2 : null;

  if (!zipPath) {
    res.status(404).json({ error: 'ZIP file not found' });
    return;
  }

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${id}.zip"`);
  
  const stream = fs.createReadStream(zipPath);
  stream.pipe(res);
});

// ── Job Screenshot Endpoint ────────────────────────────────────────────────────
app.get('/api/job/:id/screenshot', (req: Request, res: Response) => {
  const { id } = req.params;
  const viewport = (req.query.type as string) || 'desktop';

  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(id)) {
    res.status(400).json({ error: 'Invalid job id' });
    return;
  }
  if (!['desktop', 'tablet', 'mobile'].includes(viewport)) {
    res.status(400).json({ error: 'Invalid viewport type' });
    return;
  }

  const p1 = path.join(process.cwd(), 'exports', id, 'raw', 'screenshots', `${viewport}.png`);
  const p2 = path.join(process.cwd(), 'exports', id, 'screenshots', `${viewport}.png`);
  
  let screenshotPath = fs.existsSync(p1) ? p1 : fs.existsSync(p2) ? p2 : null;

  // Fallback: Check desktop frame if specific viewport is missing
  if (!screenshotPath) {
    const d1 = path.join(process.cwd(), 'exports', id, 'raw', 'screenshots', 'desktop.png');
    const d2 = path.join(process.cwd(), 'exports', id, 'screenshots', 'desktop.png');
    screenshotPath = fs.existsSync(d1) ? d1 : fs.existsSync(d2) ? d2 : null;
  }

  if (!screenshotPath) {
    // Dynamic SVG fallback so broken <img> never occurs
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="900" viewBox="0 0 1440 900" fill="none">
      <rect width="1440" height="900" fill="#0b0c0e"/>
      <rect x="40" y="40" width="1360" height="820" rx="16" fill="#141518" stroke="#2a2b2e" stroke-width="2"/>
      <circle cx="80" cy="80" r="8" fill="#ff5f56"/>
      <circle cx="104" cy="80" r="8" fill="#ffbd2e"/>
      <circle cx="128" cy="80" r="8" fill="#27c93f"/>
      <rect x="160" y="68" width="1120" height="24" rx="6" fill="#1e1f23"/>
      <text x="720" y="84" fill="#8a8b8d" font-family="monospace" font-size="12" text-anchor="middle">https://sitecompiler.dev/export/${id}</text>
      <circle cx="720" cy="400" r="40" fill="#ff6363" fill-opacity="0.1" stroke="#ff6363" stroke-width="2"/>
      <text x="720" y="480" fill="#ffffff" font-family="sans-serif" font-size="22" font-weight="bold" text-anchor="middle">SiteCompiler Export Ready</text>
      <text x="720" y="515" fill="#8a8b8d" font-family="sans-serif" font-size="14" text-anchor="middle">Job ID: ${id} (${viewport})</text>
    </svg>`;
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.send(svg);
    return;
  }

  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  fs.createReadStream(screenshotPath).pipe(res);
});

// ── Job Payment Submission Endpoint ───────────────────────────────────────────
app.post('/api/job/:id/payment', (req: Request, res: Response) => {
  const { id } = req.params;
  const { senderAccount, utrNumber, userEmail } = req.body || {};

  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(id)) {
    res.status(400).json({ error: 'Invalid job id' });
    return;
  }

  const job = getJob(id);
  if (!job) {
    res.status(404).json({ error: 'Job not found' });
    return;
  }

  updateJob(id, {
    paymentSubmitted: true,
    paymentApproved: false,
    senderAccount: senderAccount ? String(senderAccount).slice(0, 256) : undefined,
    utrNumber: utrNumber ? String(utrNumber).slice(0, 256) : undefined,
    paymentSubmittedAt: Date.now(),
    userEmail: userEmail ? String(userEmail).slice(0, 256) : undefined,
  }, 'Payment submitted — Awaiting Admin Approval');

  res.json({ status: 'ok', message: 'Payment verification submitted', jobId: id });
});

// ── Job Cancel Endpoint ────────────────────────────────────────────────────────
app.post('/api/job/:id/cancel', (req: Request, res: Response) => {
  const { id } = req.params;
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(id)) {
    res.status(400).json({ error: 'Invalid job id' });
    return;
  }
  const job = getJob(id);
  if (!job) {
    res.status(404).json({ error: 'Job not found' });
    return;
  }
  const cancelled = cancelExportJob(id);
  if (!cancelled) {
    res.status(404).json({ error: 'Job not found' });
    return;
  }
  res.status(200).json(toPublicJob(cancelled));
});

// ── Job Restart Endpoint (payment-triggered) ─────────────────────────────────
const RESTARTABLE_STATUSES = new Set(['completed', 'failed', 'cancelled']);

app.post('/api/job/:id/restart', (req: Request, res: Response) => {
  const { id } = req.params;
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(id)) {
    res.status(400).json({ error: 'Invalid job id' });
    return;
  }
  const job = getJob(id);
  if (!job) {
    res.status(404).json({ error: 'Job not found' });
    return;
  }
  if (!RESTARTABLE_STATUSES.has(job.status)) {
    res.status(409).json({ error: `Job is ${job.status} and cannot be restarted right now` });
    return;
  }
  if (!job.paymentApproved) {
    // Same admin free-pass header as the download endpoint.
    const bypassSecret = process.env.ADMIN_BYPASS_SECRET;
    const isAdminBypass = !!bypassSecret && req.get('x-sitecompiler-admin-bypass') === bypassSecret;
    if (!isAdminBypass) {
      res.status(403).json({ error: 'Restart requires approved payment or admin access' });
      return;
    }
  }

  updateJob(
    id,
    {
      status: 'pending',
      progressMessage: 'Job queued for restart...',
      error: undefined,
      completedAt: undefined,
      downloadUrl: undefined,
    },
    'Restart requested — re-running export pipeline'
  );

  processExportJob(id).catch((err) => {
    console.error(`[Render Backend] Background restart ${id} failed:`, err);
  });

  const restarted = getJob(id);
  res.status(200).json({ jobId: id, status: restarted?.status, job: restarted ? toPublicJob(restarted) : undefined });
});

// Root catch-all
app.get('*', (_req: Request, res: Response) => {
  res.status(200).json({
    name: 'SiteCompiler Render Backend API',
    status: 'running',
    healthCheck: '/health',
    exportEndpoint: '/api/export',
  });
});

// ── Process-level error guards (prevent silent crash → port disappears) ───────
process.on('uncaughtException', (err) => {
  console.error('[SiteCompiler Backend] uncaughtException:', err);
  // Keep the process alive — a single failed job should not kill the server.
});

process.on('unhandledRejection', (reason) => {
  console.error('[SiteCompiler Backend] unhandledRejection:', reason);
});

app.listen(PORT, HOST, () => {
  console.log(`[SiteCompiler Backend] Express server running on ${HOST}:${PORT}`);
  console.log(`[Health Router] Endpoint active at http://localhost:${PORT}/health`);
});
