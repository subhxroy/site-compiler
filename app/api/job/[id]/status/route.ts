import { NextResponse } from 'next/server';
import { getJob, toPublicJob } from '@/lib/jobs/store';
import { API_BASE_URL } from '@/lib/api-config';
import { getApprovalState } from '@/lib/firebase/approval-status';
import { errorMessage } from '@/lib/errors';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (API_BASE_URL) {
    try {
      const backendRes = await fetch(`${API_BASE_URL}/api/job/${id}/status`);
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
        const approval = await getApprovalState(id);
        if (approval) {
          data.paymentSubmitted = approval.paymentSubmitted;
          data.paymentApproved = approval.paymentApproved;
        }
      }
      return NextResponse.json(data, { status: backendRes.status });
    } catch (proxyError) {
      return NextResponse.json(
        { error: `Backend service unreachable: ${errorMessage(proxyError)}` },
        { status: 502 }
      );
    }
  }


  const job = getJob(id);

  if (!job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }

  return NextResponse.json(toPublicJob(job));
}
