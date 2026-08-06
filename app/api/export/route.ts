import { NextResponse } from 'next/server';
import { createJob, processExportJob } from '@/lib/jobs/queue';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { url, format = 'nextjs' } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'Valid URL is required' }, { status: 400 });
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
    }

    const job = createJob(parsedUrl.href, format);
    
    // Trigger asynchronous job processing in background without blocking API response
    processExportJob(job.id).catch((err) => {
      console.error(`Background job ${job.id} execution failed:`, err);
    });

    return NextResponse.json({ jobId: job.id, status: job.status });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
