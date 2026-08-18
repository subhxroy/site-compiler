import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import { API_BASE_URL } from '@/lib/api-config';

const MIME_MAP: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
};

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string; file: string[] }> }
) {
  const { id, file } = await params;

  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(id)) {
    return NextResponse.json({ error: 'Invalid job id' }, { status: 400 });
  }

  if (API_BASE_URL) {
    try {
      const subPath = file.map((segment) => encodeURIComponent(segment)).join('/');
      const backendRes = await fetch(`${API_BASE_URL}/api/job/${id}/preview/${subPath}`);
      if (backendRes.ok) {
        const ext = path.extname(file[file.length - 1] || '').toLowerCase();
        const contentType = backendRes.headers.get('content-type') || MIME_MAP[ext] || 'application/octet-stream';
        const arrayBuffer = await backendRes.arrayBuffer();
        return new NextResponse(arrayBuffer, {
          headers: {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=3600',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }
    } catch (err) {
      console.error('[Preview Sub-Asset Proxy Error]', err);
    }
  }

  const exportHtmlDir = path.resolve(process.cwd(), 'exports', id, 'output', 'html-export');
  const safeRelativePath = path.join(...file).replace(/^(\.\.[\/\\])+/, '');
  const filePath = path.join(exportHtmlDir, safeRelativePath);

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_MAP[ext] || 'application/octet-stream';
    const fileBuffer = fs.readFileSync(filePath);
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  return NextResponse.json({ error: 'File not found' }, { status: 404 });
}
