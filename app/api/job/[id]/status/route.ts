import { NextResponse } from 'next/server';
import { getJob } from '@/lib/jobs/queue';
import { API_BASE_URL } from '@/lib/api-config';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (API_BASE_URL) {
    try {
      const backendRes = await fetch(`${API_BASE_URL}/api/job/${id}/status`);
      const data = await backendRes.json();
      return NextResponse.json(data, { status: backendRes.status });
    } catch (proxyError: any) {
      return NextResponse.json(
        { error: `Backend service unreachable: ${proxyError.message}` },
        { status: 502 }
      );
    }
  }

  const job = getJob(id);

  if (!job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }

  return NextResponse.json(job);
}
