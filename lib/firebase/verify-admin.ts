import { adminAuth, adminDb } from './admin';

export interface AdminAuthResult {
  authorized: boolean;
  uid?: string;
  email?: string;
  error?: string;
  status?: number;
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
    } catch (err: any) {
      console.error('[Admin Auth] Invalid Firebase ID Token:', err.message);
      return { authorized: false, error: 'Invalid or expired Firebase authentication token', status: 401 };
    }

    const uid = decodedToken.uid;

    // Check user role in Firestore
    const userDoc = await adminDb.collection('users').doc(uid).get();
    if (!userDoc.exists) {
      return { authorized: false, error: 'User record not found in database', status: 403 };
    }

    const userData = userDoc.data();
    if (userData?.role !== 'admin') {
      return { authorized: false, error: 'Forbidden: Administrator privileges required', status: 403 };
    }

    return { authorized: true, uid, email: decodedToken.email };
  } catch (error: any) {
    console.error('[Admin Auth Error]:', error);
    return { authorized: false, error: error.message || 'Internal authentication error', status: 500 };
  }
}
