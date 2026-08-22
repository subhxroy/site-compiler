import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import { API_BASE_URL, isFreeExportEnabled } from '@/lib/api-config';
import { processJobPatches } from '@/lib/model/patch-job';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { getJob } from '@/lib/jobs/store';
import { adminAuth, isFirebaseAdminConfigured } from '@/lib/firebase/admin';

async function verifyModelAuth(req: Request, jobId: string): Promise<boolean> {
  const job = getJob(jobId);
  if (!job) return false;

  if (isFreeExportEnabled()) return true;

  const bypassSecret = process.env.ADMIN_BYPASS_SECRET;
  const bypassHeader = req.headers.get('x-sitecompiler-admin-bypass');
  if (bypassSecret && bypassHeader === bypassSecret) return true;

  if (job.paymentApproved) return true;

  // If job was created anonymously (no user email attached), allow creator access via job ID
  if (!job.userEmail) return true;

  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
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

          if (job.userEmail.toLowerCase().trim() === userEmail) {
            return true;
          }
        }
      } catch {}
    }
  }

  return false;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(id)) {
    return NextResponse.json({ error: 'Invalid job id' }, { status: 400 });
  }

  if (API_BASE_URL) {
    try {
      const backendRes = await fetch(`${API_BASE_URL}/api/job/${id}/model`, {
        headers: {
          'Authorization': req.headers.get('authorization') || '',
          'x-sitecompiler-admin-bypass': req.headers.get('x-sitecompiler-admin-bypass') || '',
        },
      });
      const data = await backendRes.json();
      return NextResponse.json(data, { status: backendRes.status });
    } catch {}
  }

  const job = getJob(id);
  if (!job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }

  const isAuthorized = await verifyModelAuth(req, id);
  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized: Model access requires verified job ownership or admin access' }, { status: 403 });
  }

  const modelPath = path.resolve(process.cwd(), 'exports', id, 'output', 'html-export', 'site-model.json');
  if (!fs.existsSync(modelPath)) {
    return NextResponse.json({ error: 'Site model not found for this export' }, { status: 404 });
  }

  try {
    const raw = fs.readFileSync(modelPath, 'utf-8');
    const siteModel = JSON.parse(raw);
    return NextResponse.json(siteModel);
  } catch {
    return NextResponse.json({ error: 'Failed to read site model' }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(id)) {
    return NextResponse.json({ error: 'Invalid job id' }, { status: 400 });
  }

  // Rate limit: 20 saves per minute per IP
  const limitCheck = checkRateLimit(req, 20, 60 * 1000);
  if (!limitCheck.allowed && limitCheck.response) {
    return limitCheck.response;
  }

  let body: { patches?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const { patches } = body;
  if (!Array.isArray(patches)) {
    return NextResponse.json({ error: 'Patches must be an array' }, { status: 400 });
  }

  if (API_BASE_URL) {
    try {
      const backendRes = await fetch(`${API_BASE_URL}/api/job/${id}/model`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': req.headers.get('authorization') || '',
          'x-sitecompiler-admin-bypass': req.headers.get('x-sitecompiler-admin-bypass') || '',
        },
        body: JSON.stringify({ patches }),
      });
      const data = await backendRes.json();
      return NextResponse.json(data, { status: backendRes.status });
    } catch {}
  }

  const job = getJob(id);
  if (!job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }

  const isAuthorized = await verifyModelAuth(req, id);
  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized: Model access requires verified job ownership or admin access' }, { status: 403 });
  }

  try {
    const result = await processJobPatches(id, patches);
    if (!result.ok) {
      return NextResponse.json(result, { status: 400 });
    }
    return NextResponse.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to apply patches';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
