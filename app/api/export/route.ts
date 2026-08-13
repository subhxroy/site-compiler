import { NextResponse } from 'next/server';
import { createJob } from '@/lib/jobs/store';
import { API_BASE_URL } from '@/lib/api-config';
import { validateUrlForSsrf } from '@/lib/security/ssrf';
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

    // 2. Anti-SSRF & Input URL Validation (Fast lexical check on Netlify layer)
    const ssrfCheck = validateUrlForSsrf(url);
    if (!ssrfCheck.valid || !ssrfCheck.url) {
      return NextResponse.json({ error: ssrfCheck.reason || 'Invalid or forbidden target URL' }, { status: 400 });
    }

    const safeUrl = ssrfCheck.url;

    const idempotencyKey = req.headers.get('x-idempotency-key') || undefined;

    // Proxy request to Express/Render backend if configured
    if (API_BASE_URL) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8500); // 8.5s timeout (within Netlify 10s budget)

      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (idempotencyKey) headers['x-idempotency-key'] = idempotencyKey;

        const backendRes = await fetch(`${API_BASE_URL}/api/export`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ url: safeUrl, format }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        const contentType = backendRes.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await backendRes.json();
          return NextResponse.json(data, { status: backendRes.status });
        }

        // Non-JSON response (e.g. 502/504 HTML during Render cold start)
        return NextResponse.json(
          {
            error: 'Backend server is waking up from sleep. Please wait a few seconds and try again.',
            isColdStart: true,
          },
          { status: 503 }
        );
      } catch (proxyError) {
        clearTimeout(timeoutId);
        const isAbort = (proxyError as Error)?.name === 'AbortError';
        console.error('Failed to proxy export request to Render backend:', errorMessage(proxyError));
        return NextResponse.json(
          {
            error: isAbort
              ? 'Render backend server cold start timeout. The backend is waking up — please try again in 5 seconds.'
              : `Backend service unavailable (${API_BASE_URL}).`,
            isColdStart: true,
          },
          { status: 503 }
        );
      }
    }

    // Local Node.js execution fallback
    const job = createJob(safeUrl, format, idempotencyKey);

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

