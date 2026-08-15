import { NextResponse } from 'next/server';
import { updateJob } from '@/lib/jobs/store';
import { adminDb } from '@/lib/firebase/admin';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { errorMessage } from '@/lib/errors';

export async function POST(req: Request) {
  try {
    // Rate Limit Protection (10 submissions per 5 minutes per IP)
    const rateLimit = checkRateLimit(req, 10, 5 * 60 * 1000);
    if (!rateLimit.allowed && rateLimit.response) {
      return rateLimit.response;
    }

    const body = await req.json();
    const { jobId, url, pageCount, senderAccount, utrNumber, userEmail } = body || {};

    if (!jobId || !utrNumber || !senderAccount) {
      return NextResponse.json({ error: 'Job ID, Sender Account, and UTR Number are required' }, { status: 400 });
    }

    // Never trust client-supplied amount. Recompute from a clamped pageCount so
    // an attacker can't under-report the price to ₹1 in the approval record.
    const safePageCount = Math.min(Math.max(1, Math.floor(Number(pageCount) || 1)), 100000);
    const amount = Math.max(500, Math.ceil(safePageCount / 10) * 500);

    // Update in-memory job store (UTR is not logged/returned to the client)
    updateJob(jobId, {
      paymentSubmitted: true,
      paymentApproved: false,
      senderAccount,
      utrNumber,
      paymentSubmittedAt: Date.now(),
      userEmail: userEmail || 'Anonymous',
    }, `Payment submitted — Awaiting Admin Approval`);

    // Record approval request in Firestore
    try {
      await adminDb.collection('export_approvals').doc(jobId).set({
        jobId,
        url: String(url || '').slice(0, 2048),
        pageCount: safePageCount,
        amount,
        senderAccount: String(senderAccount).slice(0, 256),
        utrNumber: String(utrNumber).slice(0, 256),
        userEmail: String(userEmail || 'Anonymous').slice(0, 256),
        status: 'pending',
        paymentSubmitted: true,
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
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}
