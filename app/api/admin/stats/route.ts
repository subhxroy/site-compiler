import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { API_BASE_URL } from '@/lib/api-config';

export async function GET() {
  try {
    // Total registered users
    const usersSnapshot = await adminDb.collection('users').get();
    const totalUsers = usersSnapshot.size;

    // Total exports saved across users
    const exportsSnapshot = await adminDb.collection('user_exports').get();
    const totalExports = exportsSnapshot.size;

    // Server health status check
    let backendStatus = 'offline';
    let backendUptime = 0;
    let backendMemory: any = null;

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
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch admin stats' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
