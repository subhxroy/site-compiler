import { NextResponse } from 'next/server';
import { getJob, toPublicJob, cancelExportJob } from '@/lib/jobs/store';
import { API_BASE_URL } from '@/lib/api-config';
import { errorMessage } from '@/lib/errors';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(id)) {
    return NextResponse.json({ error: 'Invalid job id' }, { status: 400 });
  }

  if (API_BASE_URL) {
    try {
      const backendRes = await fetch(`${API_BASE_URL}/api/job/${id}/cancel`, { method: 'POST' });
      const data = await backendRes.json();
      return NextResponse.json(data, { status: backendRes.status });
    } catch (proxyError) {
      return NextResponse.json(
        { error: `Backend cancel service unreachable: ${errorMessage(proxyError)}` },
        { status: 502 }
      );
    }
  }

  const job = getJob(id);
  if (!job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }

  const cancelled = cancelExportJob(id);
  if (!cancelled) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }

  return NextResponse.json(toPublicJob(cancelled));
}
