import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export async function POST(req: Request) {
  try {
    const { uid, email, displayName, photoURL } = (await req.json()) || {};

    if (!uid) {
      return NextResponse.json({ error: 'UID is required' }, { status: 400 });
    }

    const userRef = adminDb.collection('users').doc(uid);
    const doc = await userRef.get();

    let userRole = 'user';
    const emailLower = (email || '').toLowerCase();
    const isAdminEmail = emailLower.includes('subhroy') || emailLower.includes('whysaurjya') || emailLower.includes('admin');

    if (!doc.exists) {
      userRole = isAdminEmail ? 'admin' : 'user';
      await userRef.set({
        uid,
        email: email || null,
        displayName: displayName || email?.split('@')[0] || 'User',
        photoURL: photoURL || null,
        canExport: true,
        role: userRole,
        status: 'active',
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      });
    } else {
      const data = doc.data();
      userRole = data?.role || (isAdminEmail ? 'admin' : 'user');
      if (isAdminEmail && data?.role !== 'admin') {
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
  } catch (error: any) {
    console.error('[Admin DB] User profile sync error:', error);
    return NextResponse.json({ error: error.message || 'Failed to sync user profile' }, { status: 500 });
  }
}
