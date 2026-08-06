import { NextResponse } from 'next/server';

/**
 * Render Health Check Router Endpoint
 * 
 * Used by Render's healthCheckPath and 24/7 keep-alive services
 * (e.g. GitHub Actions cron every 5 min) to keep the Render free instance active.
 */
export async function GET() {
  const uptime = process.uptime();

  return NextResponse.json(
    {
      status: 'ok',
      service: 'sitecompiler-backend',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(uptime),
      memoryUsage: process.memoryUsage(),
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
      },
    }
  );
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
