import { NextResponse } from 'next/server';

export async function GET() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://sitecompiler.com';

  const body = `User-agent: *
Allow: /

Disallow: /api/
Disallow: /dashboard/
Disallow: /login/
Disallow: /settings/
Disallow: /account/
Disallow: /billing/
Disallow: /checkout/

Sitemap: ${siteUrl}/sitemap-index.xml
Host: ${siteUrl}
`;

  return new NextResponse(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=86400',
    },
  });
}
