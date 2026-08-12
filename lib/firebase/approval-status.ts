import { adminDb, isFirebaseAdminConfigured } from './admin';

/**
 * Payment approval is recorded durably in Firestore (collection
 * `export_approvals/{jobId}`) by the Netlify-side payment + admin routes.
 * The Render backend keeps its own in-memory copy that is NOT shared across
 * deployments, so the Netlify serverless functions reconcile against
 * Firestore — the single source of truth — before proxying status/downloads.
 */
export interface ApprovalState {
  paymentSubmitted: boolean;
  paymentApproved: boolean;
  status?: string;
}

export async function getApprovalState(jobId: string): Promise<ApprovalState | null> {
  if (!isFirebaseAdminConfigured()) {
    return null;
  }
  try {
    const doc = await adminDb.collection('export_approvals').doc(jobId).get();
    if (!doc.exists) return null;
    const data = doc.data() || {};
    return {
      // The approval record only exists once payment has been submitted, so an
      // existing doc means a submission happened even if the flag wasn't set.
      paymentSubmitted: data.paymentSubmitted === true || data.status !== undefined,
      paymentApproved: data.paymentApproved === true,
      status: typeof data.status === 'string' ? data.status : undefined,
    };
  } catch (err) {
    console.error('[Approval Status] Firestore lookup failed for', jobId, err);
    return null;
  }
}

