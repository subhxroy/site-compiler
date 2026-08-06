import { NextResponse } from 'next/server';
import { createJob } from '@/lib/jobs/store';
import { API_BASE_URL } from '@/lib/api-config';

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

    // Proxy request to Express/Render backend if configured
    if (API_BASE_URL) {
      try {
        const backendRes = await fetch(`${API_BASE_URL}/api/export`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: parsedUrl.href, format }),
        });
        const data = await backendRes.json();
        return NextResponse.json(data, { status: backendRes.status });
      } catch (proxyError: any) {
        console.error('Failed to proxy export request to Render backend:', proxyError);
        return NextResponse.json(
          { error: `Backend service unavailable (${API_BASE_URL}). ${proxyError.message}` },
          { status: 502 }
        );
      }
    }

    // Local Node.js execution fallback
    const job = createJob(parsedUrl.href, format);
    
    // Dynamically import the heavy processor (Playwright + generators) so this
    // serverless function never bundles/loads it on the Netlify edge.
    const { processExportJob } = await import('@/lib/jobs/process');
    processExportJob(job.id).catch((err) => {
      console.error(`Background job ${job.id} execution failed:`, err);
    });

    return NextResponse.json({ jobId: job.id, status: job.status });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
