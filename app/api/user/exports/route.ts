import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase/admin';
import { checkRateLimit } from '@/lib/security/rate-limit';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

async function getAuthenticatedUid(req: Request): Promise<{ uid: string } | { error: NextResponse }> {
  const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: NextResponse.json({ error: 'Authorization header with Bearer token is required' }, { status: 401, headers: corsHeaders }) };
  }
  const token = authHeader.substring(7).trim();
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    return { uid: decoded.uid };
  } catch {
    return { error: NextResponse.json({ error: 'Invalid or expired authentication token' }, { status: 401, headers: corsHeaders }) };
  }
}

export async function GET(req: Request) {
  try {
    const rateLimit = checkRateLimit(req, 60, 60 * 1000);
    if (!rateLimit.allowed && rateLimit.response) {
      return rateLimit.response;
    }

    const auth = await getAuthenticatedUid(req);
    if ('error' in auth) return auth.error;

    // UID comes from the verified token — the query param is ignored to
    // prevent reading another user's export history (IDOR).
    const uid = auth.uid;

    const snapshot = await adminDb
      .collection('users')
      .doc(uid)
      .collection('exports')
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    const exports: Array<{ id: string } & Record<string, unknown>> = [];
    snapshot.forEach((doc) => {
      exports.push({ id: doc.id, ...doc.data() });
    });

    return NextResponse.json({ exports });
  } catch (error: unknown) {
    console.error('[Admin DB] Fetch exports error:', error);
    return NextResponse.json({ exports: [] });
  }
}

export async function POST(req: Request) {
  try {
    const rateLimit = checkRateLimit(req, 30, 60 * 1000);
    if (!rateLimit.allowed && rateLimit.response) {
      return rateLimit.response;
    }

    const auth = await getAuthenticatedUid(req);
    if ('error' in auth) return auth.error;

    const uid = auth.uid;
    const { jobId, url, format, title, zipSizeKb, downloadUrl } = await req.json().catch(() => ({})) || {};

    if (!uid || !jobId || typeof jobId !== 'string') {
      return NextResponse.json({ error: 'jobId is required' }, { status: 400 });
    }

    const docRef = await adminDb
      .collection('users')
      .doc(uid)
      .collection('exports')
      .add({
        jobId: String(jobId).slice(0, 128),
        url: String(url || '').slice(0, 2048),
        format: ['html', 'react', 'nextjs'].includes(format) ? format : 'nextjs',
        title: String(title || url || 'Export').slice(0, 256),
        zipSizeKb: Number(zipSizeKb) || 0,
        downloadUrl: String(downloadUrl || '').slice(0, 2048),
        createdAt: Date.now(),
        savedAt: new Date().toISOString(),
      });

    return NextResponse.json({ status: 'ok', id: docRef.id });
  } catch (error: unknown) {
    console.error('[Admin DB] Save export error:', error);
    return NextResponse.json({ error: (error as Error).message || 'Failed to save export' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}
