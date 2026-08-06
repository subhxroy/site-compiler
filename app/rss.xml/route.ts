import { NextResponse } from 'next/server';
import { buildUnifiedFeed } from '@/lib/content/feeds';

export async function GET() {
  const feed = buildUnifiedFeed();

  return new NextResponse(feed.rss2(), {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
