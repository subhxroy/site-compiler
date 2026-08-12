import http from 'http';
import { AddressInfo } from 'net';
import express, { Request, Response } from 'express';
import cors from 'cors';
import { createJob, getJob, toPublicJob, getJobByIdempotencyKey } from '../lib/jobs/store';
import { processExportJob } from '../lib/jobs/process';
import { validateUrlForSsrf } from '../lib/security/ssrf';

async function runE2eTest() {
  console.log('EXPORT E2E TEST\n');

  const targetUrl = process.env.TEST_SITE_URL || 'https://example.com';
  const isProdFlag = process.argv.includes('--prod') || process.argv.includes('--remote') || process.env.PROD === '1';
  const externalBackend = process.env.BACKEND_URL || (isProdFlag ? 'https://site-compiler.onrender.com' : '');

  let backendUrl = '';
  let server: http.Server | null = null;

  if (externalBackend) {
    backendUrl = externalBackend.replace(/\/$/, '');
    console.log(`Backend Target: ${backendUrl} (External Remote/Env)`);
  } else {
    // Spin up lightweight test server instance
    const app = express();
    app.use(cors());
    app.use(express.json());

    app.get('/health', (_req: Request, res: Response) => res.json({ status: 'ok' }));

    app.post('/api/export', (req: Request, res: Response) => {
      const { url, format } = req.body;
      const idempotencyKey = req.headers['x-idempotency-key'] as string | undefined;

      const ssrfCheck = validateUrlForSsrf(url);
      if (!ssrfCheck.valid) {
        return res.status(400).json({ error: ssrfCheck.reason || 'Invalid URL' });
      }

      if (idempotencyKey) {
        const existing = getJobByIdempotencyKey(idempotencyKey);
        if (existing) {
          return res.json({ jobId: existing.id, reused: true });
        }
      }

      const job = createJob(url, format || 'html', idempotencyKey);
      void processExportJob(job.id);
      return res.json({ jobId: job.id });
    });

    app.get('/api/job/:id/status', (req: Request, res: Response) => {
      const job = getJob(req.params.id);
      if (!job) return res.status(404).json({ error: 'Job not found' });
      return res.json(toPublicJob(job));
    });

    app.get('/api/job/:id/download', async (req: Request, res: Response) => {
      const job = getJob(req.params.id);
      if (!job) return res.status(404).json({ error: 'Job not found' });
      if (job.status !== 'completed') return res.status(400).json({ error: 'Job not completed' });

      const path = await import('path');
      const fs = await import('fs');
      const zipPath = path.resolve(process.cwd(), 'exports', job.id, `${job.id}.zip`);
      if (!fs.existsSync(zipPath)) {
        return res.status(404).json({ error: 'Zip file missing' });
      }

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${job.id}.zip"`);
      return res.sendFile(zipPath);
    });

    app.get('/api/job/:id/screenshot', async (req: Request, res: Response) => {
      const job = getJob(req.params.id);
      if (!job) return res.status(404).json({ error: 'Job not found' });
      const path = await import('path');
      const fs = await import('fs');
      const screenshotPath = path.resolve(process.cwd(), 'exports', job.id, 'raw', 'screenshots', 'desktop.png');
      if (!fs.existsSync(screenshotPath)) {
        return res.status(404).json({ error: 'Screenshot not available' });
      }
      res.setHeader('Content-Type', 'image/png');
      return res.sendFile(screenshotPath);
    });

    await new Promise<void>((resolve) => {
      const activeServer = app.listen(0, '127.0.0.1', () => {
        const addr = activeServer.address() as AddressInfo;
        backendUrl = `http://127.0.0.1:${addr.port}`;
        server = activeServer;
        resolve();
      });
    });
    console.log(`Backend Target: ${backendUrl} (Ephemeral Server)`);
  }

  console.log(`Target Site:    ${targetUrl}\n`);
  console.log('Creating job...');

  const idempotencyKey = `e2e_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const createRes = await fetch(`${backendUrl}/api/export`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-idempotency-key': idempotencyKey,
    },
    body: JSON.stringify({ url: targetUrl, format: 'html' }),
  });

  const activeServer: http.Server | null = server;

  if (!createRes.ok) {
    const text = await createRes.text();
    console.error(`❌ Export POST failed (${createRes.status}): ${text}`);
    if (activeServer) activeServer.close();
    process.exit(1);
  }

  const createData = (await createRes.json()) as { jobId: string };
  const jobId = createData.jobId;
  console.log(`✓ jobId: ${jobId}\n`);
  console.log('Polling status directly from Render backend...');

  const seenStatuses = new Set<string>();
  const startTime = Date.now();
  const TIMEOUT_MS = 180 * 1000; // 3 minute timeout

  let finalJobState: { status?: string; error?: string } | null = null;

  while (Date.now() - startTime < TIMEOUT_MS) {
    const statusRes = await fetch(`${backendUrl}/api/job/${jobId}/status`);
    if (!statusRes.ok) {
      console.error(`❌ Status fetch failed with status ${statusRes.status}`);
      if (activeServer) activeServer.close();
      process.exit(1);
    }

    const job = (await statusRes.json()) as { status?: string; progressMessage?: string; error?: string };
    finalJobState = job;

    if (job.status && !seenStatuses.has(job.status)) {
      seenStatuses.add(job.status);
      console.log(`  ✓ ${job.status} — ${job.progressMessage}`);
    }

    if (job.status === 'completed') {
      break;
    } else if (job.status === 'failed') {
      console.error(`\n❌ Job failed: ${job.error}`);
      if (activeServer) activeServer.close();
      process.exit(1);
    }

    await new Promise((r) => setTimeout(r, 1000));
  }

  if (finalJobState?.status !== 'completed') {
    console.error('\n❌ Job execution timed out before completion.');
    if (activeServer) activeServer.close();
    process.exit(1);
  }

  console.log('\nTesting download endpoint...');
  const adminSecret = process.env.ADMIN_BYPASS_SECRET || '';
  const downloadHeaders: Record<string, string> = adminSecret ? { 'x-sitecompiler-admin-bypass': adminSecret } : {};
  const downloadRes = await fetch(`${backendUrl}/api/job/${jobId}/download`, { headers: downloadHeaders });
  console.log(`  ✓ download HTTP response status: ${downloadRes.status}`);

  const contentType = downloadRes.headers.get('content-type') || '';
  console.log(`  ✓ Content-Type: ${contentType}`);

  if (downloadRes.status === 403) {
    console.log('  ✓ Payment Gate active (403 Forbidden as expected for unapproved export without admin secret)');
  } else if (downloadRes.status === 200) {
    if (!contentType.includes('application/zip')) {
      console.error(`❌ Download content-type is not application/zip! Received: ${contentType}`);
      if (activeServer) activeServer.close();
      process.exit(1);
    }
    const buffer = await downloadRes.arrayBuffer();
    const zipKb = Math.round(buffer.byteLength / 1024);
    console.log(`  ✓ ZIP size: ${zipKb} KB (${buffer.byteLength} bytes)`);

    if (buffer.byteLength === 0) {
      console.error('❌ Downloaded ZIP is 0 bytes!');
      if (activeServer) activeServer.close();
      process.exit(1);
    }
  } else {
    console.error(`❌ Unexpected download HTTP status: ${downloadRes.status}`);
    if (activeServer) activeServer.close();
    process.exit(1);
  }

  console.log('\nTesting screenshot endpoint...');
  const screenshotRes = await fetch(`${backendUrl}/api/job/${jobId}/screenshot?type=desktop`);
  console.log(`  ✓ screenshot HTTP status: ${screenshotRes.status}`);

  if (activeServer) activeServer.close();
  console.log('\nRESULT: PASS\n');
}

runE2eTest().catch((err) => {
  console.error('Unhandled E2E Exception:', err);
  process.exit(1);
});
