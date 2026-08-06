import { NextResponse } from 'next/server';
import { buildUnifiedFeed } from '@/lib/content/feeds';

export async function GET() {
  const feed = buildUnifiedFeed();

  return new NextResponse(feed.atom1(), {
    headers: {
      'Content-Type': 'application/atom+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
