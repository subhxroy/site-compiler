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
