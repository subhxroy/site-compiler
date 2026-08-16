import path from 'path';
import fs from 'fs';

if (!process.env.PLAYWRIGHT_BROWSERS_PATH && fs.existsSync(path.resolve(process.cwd(), 'pw-browsers'))) {
  process.env.PLAYWRIGHT_BROWSERS_PATH = './pw-browsers';
}

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { createJob, getJob, toPublicJob, cancelExportJob, updateJob, getJobByIdempotencyKey } from '../lib/jobs/store';
import { processExportJob } from '../lib/jobs/process';
import { validateUrlForSsrf } from '../lib/security/ssrf';
import { adminAuth, isFirebaseAdminConfigured } from '../lib/firebase/admin';
import { processJobPatches } from '../lib/model/patch-job';

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
    // Allow Netlify production domains and custom domain sitecompiler.app
    if (u.hostname === 'sitecompiler.app' || u.hostname === 'www.sitecompiler.app' || u.hostname.endsWith('.netlify.app')) {
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
app.get('/api/job/:id/download', async (req: Request, res: Response) => {
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
    const bypassSecret = process.env.ADMIN_BYPASS_SECRET;
    const isAdminBypassHeader = !!bypassSecret && req.get('x-sitecompiler-admin-bypass') === bypassSecret;

    let isVerifiedAdminToken = false;
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7).trim();
      if (isFirebaseAdminConfigured() && adminAuth) {
        try {
          const decoded = await adminAuth.verifyIdToken(token);
          if (decoded && decoded.email) {
            const e = decoded.email.toLowerCase().trim();
            const defaultAdminEmails = ['contact.subhroy-1@gmail.com', 'contact.subhroy@gmail.com', 'subhxroy@gmail.com'];
            const allowlist = (process.env.ADMIN_EMAILS || defaultAdminEmails.join(','))
              .split(',')
              .map((x) => x.trim().toLowerCase())
              .filter(Boolean);
            if (allowlist.includes(e)) {
              isVerifiedAdminToken = true;
            }
          }
        } catch (tokenErr) {
          console.warn('[Download API] Admin ID token verification warning:', tokenErr);
        }
      }
    }

    if (!isAdminBypassHeader && !isVerifiedAdminToken) {
      res.status(403).json({ error: 'Export pending admin payment approval' });
      return;
    }
  }

  const exportsRoot = path.resolve(process.cwd(), 'exports');
  const exportDir = path.resolve(exportsRoot, id);
  if (!exportDir.startsWith(exportsRoot)) {
    res.status(400).json({ error: 'Invalid path access' });
    return;
  }

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
      <text x="720" y="480" fill="#ffffff" font-family="sans-serif" font-size="22" font-weight="bold" text-anchor="middle">SiteCompiler Live Preview</text>
      <text x="720" y="515" fill="#8a8b8d" font-family="sans-serif" font-size="14" text-anchor="middle">Crawling target site &amp; capturing screenshots... (${viewport})</text>
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

// ── Job Live Interactive Preview Endpoint ──────────────────────────────────
app.get(['/api/job/:id/preview', '/api/job/:id/preview/*'], (req: Request, res: Response) => {
  const { id } = req.params;
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(id)) {
    res.status(400).json({ error: 'Invalid job id' });
    return;
  }

  const exportHtmlDir = path.resolve(process.cwd(), 'exports', id, 'output', 'html-export');

  // If requesting a sub-file (e.g. /api/job/:id/preview/styles.css or assets/...)
  const reqSubPath = req.params[0];
  if (reqSubPath) {
    const safeSubPath = path.normalize(reqSubPath).replace(/^(\.\.[\/\\])+/, '');
    const subFilePath = path.join(exportHtmlDir, safeSubPath);
    if (fs.existsSync(subFilePath) && fs.statSync(subFilePath).isFile()) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.sendFile(subFilePath);
      return;
    }
  }

  const exportHtmlPath = path.join(exportHtmlDir, 'index.html');
  if (fs.existsSync(exportHtmlPath)) {
    let htmlContent = fs.readFileSync(exportHtmlPath, 'utf-8');
    if (!htmlContent.includes('<base ') && htmlContent.includes('<head>')) {
      htmlContent = htmlContent.replace('<head>', `<head>\n    <base href="/api/job/${id}/preview/">`);
    } else if (!htmlContent.includes('<base ') && htmlContent.includes('<head ')) {
      htmlContent = htmlContent.replace(/<head[^>]*>/, `$&\\n    <base href="/api/job/${id}/preview/">`);
    }

    if (req.query.edit === '1') {
      const editorBridge = `
<style id="sitecompiler-editor-bridge-css">
  [data-sc-id] {
    -webkit-user-select: text !important;
    user-select: text !important;
    pointer-events: auto !important;
    cursor: text !important;
    transition: outline 0.15s ease, background-color 0.15s ease !important;
  }
  [data-sc-id] * {
    -webkit-user-select: text !important;
    user-select: text !important;
    pointer-events: auto !important;
  }
  [data-sc-id]:hover {
    outline: 2px dashed #ff6363 !important;
    outline-offset: 3px !important;
    cursor: text !important;
  }
  [data-sc-id]:focus, [data-sc-id]:focus-visible {
    outline: 2px solid #ff6363 !important;
    outline-offset: 3px !important;
    background-color: rgba(255, 99, 99, 0.15) !important;
    cursor: text !important;
  }
  img[data-sc-id] {
    cursor: pointer !important;
    -webkit-user-select: none !important;
    user-select: none !important;
  }
  img[data-sc-id]:hover {
    outline: 2px solid #ff6363 !important;
    outline-offset: 3px !important;
    filter: brightness(1.08) !important;
  }
</style>
<script id="sitecompiler-editor-bridge-js">
(function() {
  window.addEventListener('pointerdown', function(e) {
    const scNode = e.target.closest('[data-sc-id]');
    if (scNode && scNode.tagName.toLowerCase() !== 'img') {
      e.stopPropagation();
    }
  }, true);

  window.addEventListener('click', function(e) {
    const scNode = e.target.closest('[data-sc-id]');
    if (scNode) {
      const tag = scNode.tagName.toLowerCase();
      if (tag === 'img') {
        e.preventDefault();
        e.stopPropagation();
        window.parent.postMessage({
          type: 'sc-select-image',
          nodeId: scNode.getAttribute('data-sc-id'),
          src: scNode.getAttribute('src') || ''
        }, '*');
        return;
      } else {
        e.preventDefault();
        e.stopPropagation();
        scNode.setAttribute('contenteditable', 'true');
        scNode.focus();
        return;
      }
    }
    const anchor = e.target.closest('a');
    if (anchor) {
      e.preventDefault();
    }
  }, true);

  function bindEditableNodes() {
    const editableNodes = document.querySelectorAll('[data-sc-id]');
    let count = 0;

    editableNodes.forEach(function(el) {
      count++;
      const id = el.getAttribute('data-sc-id');
      const tag = el.tagName.toLowerCase();

      if (tag === 'img') {
        el.style.cursor = 'pointer';
      } else {
        el.setAttribute('contenteditable', 'true');
        el.setAttribute('spellcheck', 'false');

        if (!el.getAttribute('data-sc-bound')) {
          el.setAttribute('data-sc-bound', '1');
          let initialText = el.textContent;

          el.addEventListener('input', function() {
            window.parent.postMessage({
              type: 'sc-edit',
              nodeId: id,
              content: el.textContent
            }, '*');
          });

          el.addEventListener('blur', function() {
            if (el.textContent !== initialText) {
              initialText = el.textContent;
              window.parent.postMessage({
                type: 'sc-edit',
                nodeId: id,
                content: el.textContent
              }, '*');
            }
          });

          el.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
              el.blur();
            }
          });
        }
      }
    });

    if (count > 0) {
      window.parent.postMessage({ type: 'sc-ready', nodeCount: count }, '*');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindEditableNodes);
  } else {
    bindEditableNodes();
  }

  const observer = new MutationObserver(function() {
    bindEditableNodes();
  });
  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  } else {
    window.addEventListener('DOMContentLoaded', function() {
      if (document.body) observer.observe(document.body, { childList: true, subtree: true });
    });
  }

  let checks = 0;
  const interval = setInterval(function() {
    bindEditableNodes();
    checks++;
    if (checks > 10) clearInterval(interval);
  }, 300);
})();
</script>
`;
      htmlContent = htmlContent.includes('</body>')
        ? htmlContent.replace('</body>', `${editorBridge}</body>`)
        : `${htmlContent}${editorBridge}`;
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(htmlContent);
    return;
  }

  // If compilation is still ongoing, return clean loading page
  const job = getJob(id);
  const progressMsg = job?.progressMessage || 'Compiling site and generating interactive live preview…';
  const loadingHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Live Preview</title>
  <style>
    body { margin:0; background:#07080a; color:#ffffff; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif; display:flex; align-items:center; justify-content:center; height:100vh; flex-direction:column; gap:16px; text-align:center; padding:20px; box-sizing:border-box; }
    .spinner { width:36px; height:36px; border:3px solid #22242a; border-top-color:#ff6363; border-radius:50%; animation:spin 0.8s linear infinite; }
    @keyframes spin { to { transform:rotate(360deg); } }
    .title { font-size:14px; font-weight:600; color:#ffffff; }
    .desc { font-size:12px; color:#8a8b8d; font-family:monospace; max-width:360px; line-height:1.5; }
  </style>
  <meta http-equiv="refresh" content="2">
</head>
<body>
  <div class="spinner"></div>
  <div class="title">Generating Live Interactive Preview…</div>
  <div class="desc">${progressMsg}</div>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.send(loadingHtml);
});

// Rate limiter for patch/edit requests (20 saves per minute per IP)
const modelRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: 'Too many edit requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Also support relative asset lookups like /api/job/:id/styles.css or /api/job/:id/assets/...
app.get('/api/job/:id/:file(*)', (req: Request, res: Response, next: NextFunction) => {
  const { id, file } = req.params;
  if (['status', 'screenshot', 'preview', 'download', 'payment', 'cancel', 'restart', 'model'].includes(file)) {
    return next();
  }
  const exportHtmlDir = path.resolve(process.cwd(), 'exports', id, 'output', 'html-export');
  const safeFile = path.normalize(file).replace(/^(\.\.[\/\\])+/, '');
  const filePath = path.join(exportHtmlDir, safeFile);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.sendFile(filePath);
    return;
  }
  next();
});

// Helper to verify requester ownership or admin privileges for site model access
async function verifyModelAccess(req: Request, job: JobState | undefined): Promise<boolean> {
  if (!job) return false;

  // 1. Check admin bypass secret header
  const bypassSecret = process.env.ADMIN_BYPASS_SECRET;
  const isAdminBypass = !!bypassSecret && req.get('x-sitecompiler-admin-bypass') === bypassSecret;
  if (isAdminBypass) return true;

  // 2. Check verified admin or job owner ID token
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    if (isFirebaseAdminConfigured() && adminAuth) {
      try {
        const decoded = await adminAuth.verifyIdToken(token);
        if (decoded && decoded.email) {
          const userEmail = decoded.email.toLowerCase().trim();
          const defaultAdminEmails = ['contact.subhroy-1@gmail.com', 'contact.subhroy@gmail.com', 'subhxroy@gmail.com'];
          const allowlist = (process.env.ADMIN_EMAILS || defaultAdminEmails.join(','))
            .split(',')
            .map((x) => x.trim().toLowerCase())
            .filter(Boolean);
          if (allowlist.includes(userEmail)) return true;

          if (job.userEmail && job.userEmail.toLowerCase().trim() === userEmail) {
            return true;
          }
        }
      } catch (tokenErr) {
        console.warn('[Model API] ID token verification warning:', tokenErr);
      }
    }
  }

  // 3. If job payment is already approved (unlocked export)
  if (job.paymentApproved) return true;

  // 4. If job was created anonymously (no user email attached), allow creator access via job ID
  if (!job.userEmail) return true;

  return false;
}

// ── Site Model API Endpoints ──────────────────────────────────────────────────
app.get('/api/job/:id/model', async (req: Request, res: Response) => {
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

  const isAuthorized = await verifyModelAccess(req, job);
  if (!isAuthorized) {
    res.status(403).json({ error: 'Unauthorized: Model access requires verified job ownership or admin access' });
    return;
  }

  const modelPath = path.resolve(process.cwd(), 'exports', id, 'output', 'html-export', 'site-model.json');
  if (!fs.existsSync(modelPath)) {
    res.status(404).json({ error: 'Site model not found for this export' });
    return;
  }

  try {
    const raw = fs.readFileSync(modelPath, 'utf-8');
    const siteModel = JSON.parse(raw);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.json(siteModel);
  } catch {
    res.status(500).json({ error: 'Failed to read site model' });
  }
});

app.post('/api/job/:id/model', modelRateLimit, async (req: Request, res: Response) => {
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

  const isAuthorized = await verifyModelAccess(req, job);
  if (!isAuthorized) {
    res.status(403).json({ error: 'Unauthorized: Model access requires verified job ownership or admin access' });
    return;
  }

  const { patches } = req.body || {};
  if (!Array.isArray(patches)) {
    res.status(400).json({ error: 'Patches must be an array' });
    return;
  }

  try {
    const result = await processJobPatches(id, patches);
    if (!result.ok) {
      res.status(400).json(result);
      return;
    }
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to apply patches';
    res.status(500).json({ ok: false, error: msg });
  }
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
