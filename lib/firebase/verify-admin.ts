import { adminAuth, adminDb } from './admin';

export interface AdminAuthResult {
  authorized: boolean;
  uid?: string;
  email?: string;
  error?: string;
  status?: number;
}

function isAdminEmail(email?: string): boolean {
  const e = (email || '').toLowerCase().trim();
  if (!e) return false;

  // Exact allowlist matching only
  const defaultAdminEmails = ['contact.subhroy-1@gmail.com', 'contact.subhroy@gmail.com', 'subhxroy@gmail.com'];
  const allowlist = (process.env.ADMIN_EMAILS || defaultAdminEmails.join(','))
    .split(',')
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);

  return allowlist.includes(e);
}

export async function verifyAdminRequest(req: Request): Promise<AdminAuthResult> {
  try {
    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { authorized: false, error: 'Authorization header with Bearer token is required', status: 401 };
    }

    const token = authHeader.substring(7).trim();
    if (!token) {
      return { authorized: false, error: 'Authentication token is empty', status: 401 };
    }

    // Verify Firebase ID Token
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(token);
    } catch (err: unknown) {
      console.error('[Admin Auth] Invalid Firebase ID Token:', (err as Error).message);
      return { authorized: false, error: 'Invalid or expired Firebase authentication token', status: 401 };
    }

    const uid = decodedToken.uid;
    const email = (decodedToken.email || '').toLowerCase().trim();
    const isAllowlistedAdmin = isAdminEmail(email);

    // Check / update user role in Firestore
    try {
      const userDoc = await adminDb.collection('users').doc(uid).get();
      if (!userDoc.exists) {
        if (isAllowlistedAdmin) {
          await adminDb.collection('users').doc(uid).set({
            uid,
            email,
            displayName: decodedToken.name || email.split('@')[0] || 'Admin',
            photoURL: decodedToken.picture || null,
            canExport: true,
            role: 'admin',
            status: 'active',
            createdAt: new Date().toISOString(),
            lastLoginAt: new Date().toISOString(),
          }).catch(() => {});
          return { authorized: true, uid, email };
        }
        return { authorized: false, error: 'User record not found in database', status: 403 };
      }

      const userData = userDoc.data();
      if (isAllowlistedAdmin) {
        if (userData?.role !== 'admin') {
          await adminDb.collection('users').doc(uid).update({ role: 'admin' }).catch(() => {});
        }
        return { authorized: true, uid, email };
      }

      if (userData?.role !== 'admin') {
        return { authorized: false, error: 'Forbidden: Administrator privileges required', status: 403 };
      }

      return { authorized: true, uid, email };
    } catch (dbErr) {
      if (isAllowlistedAdmin) {
        return { authorized: true, uid, email };
      }
      throw dbErr;
    }
  } catch (error: unknown) {
    console.error('[Admin Auth Error]:', error);
    return { authorized: false, error: (error as Error).message || 'Internal authentication error', status: 500 };
  }
}
