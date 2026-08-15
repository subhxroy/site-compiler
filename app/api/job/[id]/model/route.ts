import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import { API_BASE_URL } from '@/lib/api-config';
import { processJobPatches } from '@/lib/model/patch-job';

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
