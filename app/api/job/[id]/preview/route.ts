import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import { API_BASE_URL } from '@/lib/api-config';
import { getJob } from '@/lib/jobs/store';

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
      const backendRes = await fetch(`${API_BASE_URL}/api/job/${id}/preview`);
      if (backendRes.ok) {
        const text = await backendRes.text();
        return new NextResponse(text, {
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
          },
        });
      }
    } catch {}
  }

  const exportHtmlPath = path.resolve(process.cwd(), 'exports', id, 'output', 'html-export', 'index.html');
  if (fs.existsSync(exportHtmlPath)) {
    const htmlContent = fs.readFileSync(exportHtmlPath, 'utf-8');
    return new NextResponse(htmlContent, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=600',
      },
    });
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

  return new NextResponse(loadingHtml, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}
