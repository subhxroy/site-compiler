import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import { getJob } from '@/lib/jobs/store';
import { API_BASE_URL } from '@/lib/api-config';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (API_BASE_URL) {
    try {
      const backendRes = await fetch(`${API_BASE_URL}/api/job/${id}/download`);
      if (!backendRes.ok) {
        return NextResponse.json({ error: 'Export download failed on backend' }, { status: backendRes.status });
      }
      const arrayBuffer = await backendRes.arrayBuffer();
      return new NextResponse(arrayBuffer, {
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="sitecompiler-${id}.zip"`,
        },
      });
    } catch (proxyError: any) {
      return NextResponse.json(
        { error: `Backend download service unreachable: ${proxyError.message}` },
        { status: 502 }
      );
    }
  }

  const job = getJob(id);

  if (!job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }

  const zipPath = path.resolve(process.cwd(), 'exports', id, `${id}.zip`);
  const legacyZipPath = path.resolve(process.cwd(), 'exports', id, 'download.zip');
  const targetZip = fs.existsSync(zipPath) ? zipPath : fs.existsSync(legacyZipPath) ? legacyZipPath : null;

  if (!targetZip) {
    return NextResponse.json({ error: 'Download ZIP file not found' }, { status: 404 });
  }

  const fileStream = fs.readFileSync(targetZip);

  return new NextResponse(fileStream, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="sitecompiler-${id}.zip"`,
    },
  });
}
