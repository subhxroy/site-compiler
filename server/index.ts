if (!process.env.PLAYWRIGHT_BROWSERS_PATH) {
  process.env.PLAYWRIGHT_BROWSERS_PATH = './pw-browsers';
}

import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { createJob, getJob } from '../lib/jobs/store';
import { processExportJob } from '../lib/jobs/process';

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration - Allow all origins dynamically (Netlify, Vercel, localhost, custom domains)
app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json());

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
app.post('/api/export', (req: Request, res: Response) => {
  try {
    const { url, format = 'nextjs' } = req.body || {};

    if (!url || typeof url !== 'string') {
      res.status(400).json({ error: 'Valid URL is required' });
      return;
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      res.status(400).json({ error: 'Invalid URL format' });
      return;
    }

    const job = createJob(parsedUrl.href, format);

    // Trigger background export process without blocking HTTP response
    processExportJob(job.id).catch((err) => {
      console.error(`[Render Backend] Background job ${job.id} failed:`, err);
    });

    res.status(200).json({ jobId: job.id, status: job.status });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// ── Job Status Endpoint ────────────────────────────────────────────────────────
app.get('/api/job/:id/status', (req: Request, res: Response) => {
  const { id } = req.params;
  const job = getJob(id);

  if (!job) {
    res.status(404).json({ error: 'Job not found' });
    return;
  }

  res.status(200).json(job);
});

// ── Job Download Endpoint ──────────────────────────────────────────────────────
app.get('/api/job/:id/download', (req: Request, res: Response) => {
  const { id } = req.params;
  const job = getJob(id);

  if (!job || job.status !== 'completed') {
    res.status(404).json({ error: 'Export package not ready' });
    return;
  }

  if (!job.paymentApproved) {
    res.status(403).json({ error: 'Export pending admin payment approval' });
    return;
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

// Root catch-all
app.get('*', (_req: Request, res: Response) => {
  res.status(200).json({
    name: 'SiteCompiler Render Backend API',
    status: 'running',
    healthCheck: '/health',
    exportEndpoint: '/api/export',
  });
});

app.listen(PORT, () => {
  console.log(`[SiteCompiler Backend] Express server running on port ${PORT}`);
  console.log(`[Health Router] Endpoint active at http://localhost:${PORT}/health`);
});
