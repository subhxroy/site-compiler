import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { verifyAdminRequest } from '@/lib/firebase/verify-admin';
import { updateJob } from '@/lib/jobs/store';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function GET(req: Request) {
  const authResult = await verifyAdminRequest(req);
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status || 403, headers: corsHeaders });
  }

  try {
    const snapshot = await adminDb
      .collection('export_approvals')
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get();

    const approvals: Array<{ id: string } & Record<string, unknown>> = [];
    snapshot.forEach((doc) => {
      approvals.push({ id: doc.id, ...doc.data() });
    });

    return NextResponse.json({ approvals }, { headers: corsHeaders });
  } catch (error: unknown) {
    console.error('[Admin Approvals API] Error fetching approvals:', error);
    return NextResponse.json({ error: (error as Error).message || 'Failed to fetch export approvals' }, { status: 500, headers: corsHeaders });
  }
}

export async function POST(req: Request) {
  const authResult = await verifyAdminRequest(req);
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status || 403, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { jobId, action } = body || {};

    if (!jobId || !action) {
      return NextResponse.json({ error: 'jobId and action (approve/reject) are required' }, { status: 400, headers: corsHeaders });
    }

    const isApproved = action === 'approve';
    const newStatus = isApproved ? 'approved' : 'rejected';

    // Update Firestore document
    await adminDb.collection('export_approvals').doc(jobId).set(
      {
        status: newStatus,
        paymentApproved: isApproved,
        reviewedAt: new Date().toISOString(),
        reviewedBy: authResult.uid || 'Admin',
      },
      { merge: true }
    );

    // Update in-memory server job store
    updateJob(
      jobId,
      { paymentApproved: isApproved },
      isApproved ? 'Payment approved by Admin — Download unlocked' : 'Payment rejected by Admin'
    );

    // Payment-triggered restart: if this export previously failed or was
    // cancelled, approving the payment kicks the pipeline off again so the
    // paid download is actually generated. Best-effort and local-only — on
    // Netlify the job lives on the Render backend and gets restarted there.
    if (isApproved) {
      try {
        const { getJob } = await import('@/lib/jobs/store');
        const localJob = getJob(jobId);
        if (localJob && ['failed', 'cancelled'].includes(localJob.status)) {
          updateJob(
            jobId,
            { status: 'pending', progressMessage: 'Payment approved — restarting export...' },
            'Payment approved — restarting failed export'
          );
          const { processExportJob } = await import('@/lib/jobs/process');
          processExportJob(jobId).catch((err) => {
            console.error(`Payment-triggered restart ${jobId} failed:`, err);
          });
        }
      } catch (restartErr) {
        console.error('[Admin Approvals API] Payment-triggered restart error:', restartErr);
      }
    }

    return NextResponse.json(
      { status: 'ok', message: `Export payment ${newStatus} successfully`, jobId, isApproved },
      { headers: corsHeaders }
    );
  } catch (error: unknown) {
    console.error('[Admin Approvals API] Error processing approval:', error);
    return NextResponse.json({ error: (error as Error).message || 'Failed to process approval' }, { status: 500, headers: corsHeaders });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}
