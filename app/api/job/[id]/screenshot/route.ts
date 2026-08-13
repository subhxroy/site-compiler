import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import { API_BASE_URL } from '@/lib/api-config';
import { errorMessage } from '@/lib/errors';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') || 'desktop';

  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(id)) {
    return NextResponse.json({ error: 'Invalid job id' }, { status: 400 });
  }
  if (!['desktop', 'tablet', 'mobile'].includes(type)) {
    return NextResponse.json({ error: 'Invalid viewport type' }, { status: 400 });
  }

  if (API_BASE_URL) {
    try {
      const backendRes = await fetch(`${API_BASE_URL}/api/job/${id}/screenshot?type=${type}`);
      if (!backendRes.ok) {
        return NextResponse.json({ error: 'Screenshot unavailable on backend' }, { status: backendRes.status });
      }
      const arrayBuffer = await backendRes.arrayBuffer();
      return new NextResponse(arrayBuffer, {
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=3600',
        },
      });
    } catch (proxyError) {
      return NextResponse.json(
        { error: `Backend screenshot service unreachable: ${errorMessage(proxyError)}` },
        { status: 502 }
      );
    }
  }

  const p1 = path.resolve(process.cwd(), 'exports', id, 'raw', 'screenshots', `${type}.png`);
  const p2 = path.resolve(process.cwd(), 'exports', id, 'screenshots', `${type}.png`);
  let screenshotPath = fs.existsSync(p1) ? p1 : fs.existsSync(p2) ? p2 : null;

  // Fallback to desktop frame if specific viewport is missing
  if (!screenshotPath) {
    const d1 = path.resolve(process.cwd(), 'exports', id, 'raw', 'screenshots', 'desktop.png');
    const d2 = path.resolve(process.cwd(), 'exports', id, 'screenshots', 'desktop.png');
    screenshotPath = fs.existsSync(d1) ? d1 : fs.existsSync(d2) ? d2 : null;
  }

  if (!screenshotPath) {
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
      <text x="720" y="515" fill="#8a8b8d" font-family="sans-serif" font-size="14" text-anchor="middle">Crawling target site &amp; capturing screenshots... (${type})</text>
    </svg>`;
    return new NextResponse(svg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=300',
      },
    });
  }

  const imageBuffer = fs.readFileSync(screenshotPath);
  return new NextResponse(imageBuffer, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
