import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import { getJob } from '@/lib/jobs/store';
import { API_BASE_URL } from '@/lib/api-config';
import { verifyAdminRequest } from '@/lib/firebase/verify-admin';
import { getApprovalState } from '@/lib/firebase/approval-status';
import { errorMessage } from '@/lib/errors';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(id)) {
    return NextResponse.json({ error: 'Invalid job id' }, { status: 400 });
  }

  if (API_BASE_URL) {
    try {
      // Admin free-pass: verify the Firebase admin ID token, then forward the
      // shared secret so the Render backend skips the payment gate. The secret
      // never reaches the browser — only this serverless function has it.
      // A job whose payment was approved in Firestore is unlocked the same
      // way, because the Render backend's in-memory store never sees Netlify's
      // approval write (cross-deployment split-brain).
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

      const backendRes = await fetch(`${API_BASE_URL}/api/job/${id}/download`, {
        headers: forwardHeaders,
      });
      if (!backendRes.ok) {
        let message = 'Export download failed on backend';
        try {
          const body = await backendRes.json();
          if (body?.error) message = body.error;
        } catch {}
        return NextResponse.json({ error: message }, { status: backendRes.status });
      }
      const arrayBuffer = await backendRes.arrayBuffer();
      return new NextResponse(arrayBuffer, {
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="sitecompiler-${id}.zip"`,
        },
      });
    } catch (proxyError) {
      return NextResponse.json(
        { error: `Backend download service unreachable: ${errorMessage(proxyError)}` },
        { status: 502 }
      );
    }
  }

  const job = getJob(id);

  if (!job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }

  if (!job.paymentApproved) {
    try {
      const authResult = await verifyAdminRequest(req);
      if (!authResult.authorized) {
        return NextResponse.json({ error: 'Export pending admin payment approval' }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: 'Export pending admin payment approval' }, { status: 403 });
    }
  }

  const zipPath = path.resolve(process.cwd(), 'exports', id, `${id}.zip`);
  const legacyZipPath = path.resolve(process.cwd(), 'exports', id, 'download.zip');
  const targetZip = fs.existsSync(zipPath) ? zipPath : fs.existsSync(legacyZipPath) ? legacyZipPath : null;

  if (!targetZip) {
    return NextResponse.json({ error: 'Download ZIP file not found' }, { status: 404 });
  }

  const fileStream = fs.readFileSync(targetZip);

  return new NextResponse(fileStream, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="sitecompiler-${id}.zip"`,
    },
  });
}
