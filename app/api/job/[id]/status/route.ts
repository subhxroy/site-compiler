import { NextResponse } from 'next/server';
import { getJob, toPublicJob } from '@/lib/jobs/store';
import { API_BASE_URL, isFreeExportEnabled } from '@/lib/api-config';
import { getApprovalState } from '@/lib/firebase/approval-status';
import { errorMessage } from '@/lib/errors';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const isFreeMode = isFreeExportEnabled();

  if (API_BASE_URL) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7500);

    try {
      const backendRes = await fetch(`${API_BASE_URL}/api/job/${id}/status`, { signal: controller.signal });
      clearTimeout(timeoutId);
      const contentType = backendRes.headers.get('content-type') || '';
      
      if (!contentType.includes('application/json')) {
        return NextResponse.json(
          { error: 'Backend server is waking up...', isColdStart: true },
          { status: 503 }
        );
      }

      const data = await backendRes.json();
      // The Render backend's in-memory job store never sees the payment state
      // written on the Netlify side. Overlay the durable Firestore approval
      // record so the client shows the correct pay/approved state in prod.
      if (backendRes.ok && data && typeof data === 'object') {
        if (isFreeMode) {
          data.paymentApproved = true;
        } else {
          try {
            const approval = await getApprovalState(id);
            if (approval) {
              data.paymentSubmitted = approval.paymentSubmitted;
              data.paymentApproved = approval.paymentApproved;
            }
          } catch (approvalErr) {
            console.warn('[Status Route] Firestore approval state check skipped:', approvalErr);
          }
        }
      }
      return NextResponse.json(data, { status: backendRes.status });

    } catch (proxyError) {
      clearTimeout(timeoutId);
      const isAbort = (proxyError as Error)?.name === 'AbortError';
      return NextResponse.json(
        { error: isAbort ? 'Backend status request timed out.' : `Backend service unreachable: ${errorMessage(proxyError)}` },
        { status: isAbort ? 503 : 502 }
      );
    }
  }


  const job = getJob(id);

  if (!job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }

  const publicData = toPublicJob(job);

  if (isFreeMode) {
    publicData.paymentApproved = true;
  } else {
    try {
      const approval = await getApprovalState(id);
      if (approval) {
        publicData.paymentSubmitted = approval.paymentSubmitted;
        publicData.paymentApproved = approval.paymentApproved;
      }
    } catch (approvalErr) {
      console.warn('[Status Route] Local Firestore approval check skipped:', approvalErr);
    }
  }

  return NextResponse.json(publicData);
}
