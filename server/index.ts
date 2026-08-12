if (!process.env.PLAYWRIGHT_BROWSERS_PATH) {
  process.env.PLAYWRIGHT_BROWSERS_PATH = './pw-browsers';
}

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import { createJob, getJob, toPublicJob, cancelExportJob, updateJob } from '../lib/jobs/store';
import { processExportJob } from '../lib/jobs/process';
import { validateUrlForSsrfAsync } from '../lib/security/ssrf';

const app = express();
const PORT = Number(process.env.PORT) || 3001;
const HOST = process.env.HOST || '0.0.0.0';

// ── Security Headers Middleware ─────────────────────────────────────────────
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// CORS configuration — allow known origins only (local dev + configured domains).
// The Render backend is reached server-to-server from the Next.js API routes in
// production, so reflecting arbitrary browser origins with credentials is not
// needed and is a latent vulnerability. Custom origins can be added via the
// CORS_ORIGINS env var (comma-separated list of origins).
function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return false;
  try {
    const u = new URL(origin);
    if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') return true;
    const extra = (process.env.CORS_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
    return extra.some((e) => {
      try { return new URL(e).origin === u.origin; } catch { return false; }
    });
  } catch {
    return false;
  }
}

app.use(
  cors({
    origin: isAllowedOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json());

// ── Express Rate Limiting (15 requests per minute for exports) ───────────────
const exportRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too Many Requests', message: 'Rate limit exceeded. Please wait 60 seconds before creating a new export.' },
});

// ── Render Health Router Endpoint ─────────────────────────────────────────────
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

// ── Export Endpoint ────────────────────────────────────────────────────────────
app.post('/api/export', exportRateLimiter, async (req: Request, res: Response) => {
  try {
    const { url } = req.body || {};
    const allowedFormats = ['html', 'react', 'nextjs'];
    const format = allowedFormats.includes(req.body?.format) ? req.body.format : 'nextjs';

    const ssrfCheck = await validateUrlForSsrfAsync(url);
    if (!ssrfCheck.valid || !ssrfCheck.url) {
      res.status(400).json({ error: ssrfCheck.reason || 'Invalid or forbidden target URL' });
      return;
    }

    const safeUrl = ssrfCheck.url;
    const job = createJob(safeUrl, format);

    // Trigger background export process without blocking HTTP response
    processExportJob(job.id).catch((err) => {
      console.error(`[Render Backend] Background job ${job.id} failed:`, err);
    });

    res.status(200).json({ jobId: job.id, status: job.status });
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
  const screenshotPath = fs.existsSync(p1) ? p1 : fs.existsSync(p2) ? p2 : null;

  if (!screenshotPath) {
    res.status(404).json({ error: 'Screenshot not found' });
    return;
  }

  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  fs.createReadStream(screenshotPath).pipe(res);
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

app.listen(PORT, HOST, () => {
  console.log(`[SiteCompiler Backend] Express server running on ${HOST}:${PORT}`);
  console.log(`[Health Router] Endpoint active at http://localhost:${PORT}/health`);
});
