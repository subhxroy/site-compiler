import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { verifyAdminRequest } from '@/lib/firebase/verify-admin';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function GET(req: Request) {
  const authResult = await verifyAdminRequest(req);
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status || 403, headers: corsHeaders });
  }

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

    return NextResponse.json({ users }, { headers: corsHeaders });
  } catch (error: any) {
    console.error('[Admin API] Error fetching users:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch users' }, { status: 500, headers: corsHeaders });
  }
}

export async function POST(req: Request) {
  const authResult = await verifyAdminRequest(req);
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status || 403, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { uid, canExport, role, status } = body;

    if (!uid) {
      return NextResponse.json({ error: 'UID is required' }, { status: 400, headers: corsHeaders });
    }

    const updates: Record<string, any> = {};
    if (typeof canExport === 'boolean') updates.canExport = canExport;
    if (role) updates.role = role;
    if (status) updates.status = status;

    await adminDb.collection('users').doc(uid).update(updates);

    return NextResponse.json(
      { status: 'ok', message: 'User updated successfully', updates },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('[Admin API] Error updating user:', error);
    return NextResponse.json({ error: error.message || 'Failed to update user' }, { status: 500, headers: corsHeaders });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

