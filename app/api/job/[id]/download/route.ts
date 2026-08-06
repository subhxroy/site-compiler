import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import { getJob } from '@/lib/jobs/queue';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const job = getJob(id);

  if (!job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }

  const zipPath = path.resolve(process.cwd(), 'exports', id, 'download.zip');

  if (!fs.existsSync(zipPath)) {
    return NextResponse.json({ error: 'Download ZIP file not found' }, { status: 404 });
  }

  const fileStream = fs.readFileSync(zipPath);

  return new NextResponse(fileStream, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="sitecompiler-${id}.zip"`,
    },
  });
}
