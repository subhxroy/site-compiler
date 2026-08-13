import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { API_BASE_URL } from '@/lib/api-config';
import { verifyAdminRequest } from '@/lib/firebase/verify-admin';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function GET(req: Request) {
  const authResult = await verifyAdminRequest(req);
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status || 403, headers: corsHeaders });
  }

  try {
    // Total registered users
    const usersSnapshot = await adminDb.collection('users').get();
    const totalUsers = usersSnapshot.size;

    // Total exports saved across users (collection group query with fallback to approvals)
    let totalExports = 0;
    try {
      const exportsGroupSnapshot = await adminDb.collectionGroup('exports').get();
      totalExports = exportsGroupSnapshot.size;
    } catch {
      const approvalsSnapshot = await adminDb.collection('export_approvals').get();
      totalExports = approvalsSnapshot.size;
    }

    // Server health status check
    let backendStatus = 'offline';
    let backendUptime = 0;
    let backendMemory: unknown = null;

    try {
      const healthRes = await fetch(`${API_BASE_URL}/health`, { cache: 'no-store' });
      if (healthRes.ok) {
        const data = await healthRes.json();
        backendStatus = 'online';
        backendUptime = data.uptimeSeconds || 0;
        backendMemory = data.memoryUsage || null;
      }
    } catch {
      backendStatus = 'unreachable';
    }

    return NextResponse.json(
      {
        totalUsers,
        totalExports,
        backendStatus,
        backendUptime,
        backendMemory,
        backendUrl: API_BASE_URL,
        timestamp: new Date().toISOString(),
      },
      { headers: corsHeaders }
    );
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message || 'Failed to fetch admin stats' }, { status: 500, headers: corsHeaders });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

