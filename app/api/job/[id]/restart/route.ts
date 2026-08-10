import { NextResponse } from 'next/server';
import { getJob, toPublicJob, updateJob } from '@/lib/jobs/store';
import { API_BASE_URL } from '@/lib/api-config';
import { verifyAdminRequest } from '@/lib/firebase/verify-admin';
import { getApprovalState } from '@/lib/firebase/approval-status';
import { errorMessage } from '@/lib/errors';

const RESTARTABLE_STATUSES = new Set(['completed', 'failed', 'cancelled']);

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
      // Mirror the download route: the Render backend's in-memory store never
      // sees Netlify's approval write, so forward the shared secret when the
      // Firebase admin ID token verifies OR Firestore records an approval.
      const forwardHeaders: Record<string, string> = {};
      try {
        const bypassSecret = process.env.BACKEND_ADMIN_SECRET;
        if (bypassSecret) {
          const [authResult, approval] = await Promise.all([
            verifyAdminRequest(req).catch(() => ({ authorized: false })),
            getApprovalState(id),
          ]);
          if (authResult.authorized || approval?.paymentApproved) {
            forwardHeaders['x-sitecompiler-admin-bypass'] = bypassSecret;
          }
        }
      } catch {}

      const backendRes = await fetch(`${API_BASE_URL}/api/job/${id}/restart`, {
        method: 'POST',
        headers: forwardHeaders,
      });
      const data = await backendRes.json();
      return NextResponse.json(data, { status: backendRes.status });
    } catch (proxyError) {
      return NextResponse.json(
        { error: `Backend restart service unreachable: ${errorMessage(proxyError)}` },
        { status: 502 }
      );
    }
  }

  const job = getJob(id);
  if (!job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }

  if (!RESTARTABLE_STATUSES.has(job.status)) {
    return NextResponse.json(
      { error: `Job is ${job.status} and cannot be restarted right now` },
      { status: 409 }
    );
  }

  // Payment-triggered restart: only an approved payment or an admin may
  // re-run an export (prevents free regeneration of paid exports).
  if (!job.paymentApproved) {
    try {
      const authResult = await verifyAdminRequest(req);
      if (!authResult.authorized) {
        return NextResponse.json(
          { error: 'Restart requires approved payment or admin access' },
          { status: 403 }
        );
      }
    } catch {
      return NextResponse.json(
        { error: 'Restart requires approved payment or admin access' },
        { status: 403 }
      );
    }
  }

  updateJob(
    id,
    {
      status: 'pending',
      progressMessage: 'Job queued for restart...',
      error: undefined,
      completedAt: undefined,
      downloadUrl: undefined,
    },
    'Restart requested — re-running export pipeline'
  );

  const { processExportJob } = await import('@/lib/jobs/process');
  processExportJob(id).catch((err) => {
    console.error(`Background restart ${id} execution failed:`, err);
  });

  const restarted = getJob(id);
  return NextResponse.json({ jobId: id, status: restarted?.status, job: restarted ? toPublicJob(restarted) : undefined });
}
