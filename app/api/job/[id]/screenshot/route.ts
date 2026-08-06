import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import { API_BASE_URL } from '@/lib/api-config';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') || 'desktop';

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
    } catch (proxyError: any) {
      return NextResponse.json(
        { error: `Backend screenshot service unreachable: ${proxyError.message}` },
        { status: 502 }
      );
    }
  }

  const p1 = path.resolve(process.cwd(), 'exports', id, 'raw', 'screenshots', `${type}.png`);
  const p2 = path.resolve(process.cwd(), 'exports', id, 'screenshots', `${type}.png`);
  const screenshotPath = fs.existsSync(p1) ? p1 : fs.existsSync(p2) ? p2 : null;

  if (!screenshotPath) {
    return NextResponse.json({ error: 'Screenshot not found' }, { status: 404 });
  }

  const imageBuffer = fs.readFileSync(screenshotPath);
  return new NextResponse(imageBuffer, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
