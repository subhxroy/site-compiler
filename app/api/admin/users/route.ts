import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export async function GET() {
  try {
    const snapshot = await adminDb.collection('users').get();
    const users = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        uid: doc.id,
        email: data.email || 'N/A',
        displayName: data.displayName || 'User',
        photoURL: data.photoURL || null,
        canExport: data.canExport !== false, // default true unless explicitly false
        role: data.role || 'user',
        status: data.status || 'active',
        createdAt: data.createdAt || new Date().toISOString(),
        lastLoginAt: data.lastLoginAt || new Date().toISOString(),
      };
    });

    return NextResponse.json({ users }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    });
  } catch (error: any) {
    console.error('[Admin API] Error fetching users:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch users' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { uid, canExport, role, status } = body;

    if (!uid) {
      return NextResponse.json({ error: 'UID is required' }, { status: 400 });
    }

    const updates: Record<string, any> = {};
    if (typeof canExport === 'boolean') updates.canExport = canExport;
    if (role) updates.role = role;
    if (status) updates.status = status;

    await adminDb.collection('users').doc(uid).update(updates);

    return NextResponse.json({ status: 'ok', message: 'User updated successfully', updates }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    });
  } catch (error: any) {
    console.error('[Admin API] Error updating user:', error);
    return NextResponse.json({ error: error.message || 'Failed to update user' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
