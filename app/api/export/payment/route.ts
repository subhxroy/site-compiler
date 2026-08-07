import { NextResponse } from 'next/server';
import { getJob, updateJob } from '@/lib/jobs/store';
import { adminDb } from '@/lib/firebase/admin';
import { checkRateLimit } from '@/lib/security/rate-limit';

export async function POST(req: Request) {
  try {
    // Rate Limit Protection (10 submissions per 5 minutes per IP)
    const rateLimit = checkRateLimit(req, 10, 5 * 60 * 1000);
    if (!rateLimit.allowed && rateLimit.response) {
      return rateLimit.response;
    }

    const body = await req.json();
    const { jobId, url, pageCount, amount, senderAccount, utrNumber, userEmail } = body || {};

    if (!jobId || !utrNumber || !senderAccount) {
      return NextResponse.json({ error: 'Job ID, Sender Account, and UTR Number are required' }, { status: 400 });
    }

    // Update in-memory job store
    updateJob(jobId, {
      paymentSubmitted: true,
      paymentApproved: false,
      senderAccount,
      utrNumber,
      paymentSubmittedAt: Date.now(),
      userEmail: userEmail || 'Anonymous',
    }, `Payment submitted (UTR: ${utrNumber}) — Awaiting Admin Approval`);

    // Record approval request in Firestore
    try {
      await adminDb.collection('export_approvals').doc(jobId).set({
        jobId,
        url: url || '',
        pageCount: pageCount || 1,
        amount: amount || 20,
        senderAccount,
        utrNumber,
        userEmail: userEmail || 'Anonymous',
        status: 'pending',
        paymentApproved: false,
        createdAt: Date.now(),
        submittedAt: new Date().toISOString(),
      });
    } catch (fsErr) {
      console.warn('[Export Payment API] Firestore save warning:', fsErr);
    }

    return NextResponse.json({
      status: 'ok',
      message: 'Payment verification submitted. Awaiting Admin Approval.',
      jobId,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to submit payment verification' }, { status: 500 });
  }
}
