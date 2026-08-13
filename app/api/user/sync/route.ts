import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase/admin';
import { checkRateLimit } from '@/lib/security/rate-limit';

function isAdminEmail(email: string): boolean {
  const e = (email || '').toLowerCase().trim();
  if (!e) return false;

  // Exact allowlist matching only. Substring checks are forbidden to prevent
  // privilege escalation from attacker emails containing owner keywords.
  const defaultAdminEmails = ['contact.subhroy-1@gmail.com', 'contact.subhroy@gmail.com', 'subhxroy@gmail.com'];
  const allowlist = (process.env.ADMIN_EMAILS || defaultAdminEmails.join(','))
    .split(',')
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);

  return allowlist.includes(e);
}

export async function POST(req: Request) {
  try {
    const rateLimit = checkRateLimit(req, 60, 60 * 1000);
    if (!rateLimit.allowed && rateLimit.response) {
      return rateLimit.response;
    }

    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization header with Bearer token is required' }, { status: 401 });
    }

    const token = authHeader.substring(7).trim();
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(token);
    } catch {
      return NextResponse.json({ error: 'Invalid or expired authentication token' }, { status: 401 });
    }

    const uid = decodedToken.uid;

    // Identity always derives from the verified token — never from the request
    // body. This prevents client-side role/email/uid spoofing.
    const email = decodedToken.email || '';
    const body = (await req.json().catch(() => ({}))) || {};
    const displayName = body.displayName || email.split('@')[0] || 'User';
    const photoURL = body.photoURL || null;

    const wantsAdmin = isAdminEmail(email);
    const userRef = adminDb.collection('users').doc(uid);
    const doc = await userRef.get();

    let userRole = 'user';

    if (!doc.exists) {
      userRole = wantsAdmin ? 'admin' : 'user';
      await userRef.set({
        uid,
        email,
        displayName,
        photoURL,
        canExport: true,
        role: userRole,
        status: 'active',
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      });
    } else {
      const data = doc.data();
      userRole = data?.role || 'user';

      // Only auto-escalate when the VERIFIED token email matches the admin
      // allowlist AND the existing role is not already admin. Never downgrade.
      if (wantsAdmin && data?.role !== 'admin') {
        userRole = 'admin';
        await userRef.update({ role: 'admin' }).catch(() => {});
      }

      await userRef.update({
        lastLoginAt: new Date().toISOString(),
        ...(displayName && { displayName }),
        ...(photoURL && { photoURL }),
      });
    }

    return NextResponse.json({
      status: 'ok',
      message: 'User profile synced',
      role: userRole,
      isAdmin: userRole === 'admin',
    });
  } catch (error: unknown) {
    console.error('[Admin DB] User profile sync error:', error);
    return NextResponse.json({ error: (error as Error).message || 'Failed to sync user profile' }, { status: 500 });
  }
}
