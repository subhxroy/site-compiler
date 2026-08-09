import { NextResponse } from 'next/server';
import { createJob } from '@/lib/jobs/store';
import { API_BASE_URL } from '@/lib/api-config';
import { validateUrlForSsrfAsync } from '@/lib/security/ssrf';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { errorMessage } from '@/lib/errors';

export async function POST(req: Request) {
  try {
    // 1. Rate Limit Protection (15 exports per minute per IP)
    const rateLimit = checkRateLimit(req, 15, 60000);
    if (!rateLimit.allowed && rateLimit.response) {
      return rateLimit.response;
    }

    const body = await req.json();
    const { url } = body;
    const allowedFormats = ['html', 'react', 'nextjs'];
    const format = allowedFormats.includes(body.format) ? body.format : 'nextjs';

    // 2. Anti-SSRF & Input URL Validation (DNS-resolving)
    const ssrfCheck = await validateUrlForSsrfAsync(url);
    if (!ssrfCheck.valid || !ssrfCheck.url) {
      return NextResponse.json({ error: ssrfCheck.reason || 'Invalid or forbidden target URL' }, { status: 400 });
    }

    const safeUrl = ssrfCheck.url;

    // Proxy request to Express/Render backend if configured
    if (API_BASE_URL) {
      try {
        const backendRes = await fetch(`${API_BASE_URL}/api/export`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: safeUrl, format }),
        });
        const data = await backendRes.json();
        return NextResponse.json(data, { status: backendRes.status });
      } catch (proxyError) {
        console.error('Failed to proxy export request to Render backend:', errorMessage(proxyError));
        return NextResponse.json(
          { error: `Backend service unavailable (${API_BASE_URL}). ${errorMessage(proxyError)}` },
          { status: 502 }
        );
      }
    }

    // Local Node.js execution fallback
    const job = createJob(safeUrl, format);
    
    // Dynamically import the heavy processor (Playwright + generators) so this
    // serverless function never bundles/loads it on the Netlify edge.
    const { processExportJob } = await import('@/lib/jobs/process');
    processExportJob(job.id).catch((err) => {
      console.error(`Background job ${job.id} execution failed:`, err);
    });

    return NextResponse.json({ jobId: job.id, status: job.status });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}
