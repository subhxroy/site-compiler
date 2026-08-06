import { NextResponse } from 'next/server';
import { getAllBlogPosts } from '@/lib/content/mdx';

export async function GET() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://sitecompiler.com';
  const posts = getAllBlogPosts().filter((p) => p.coverImage);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${posts
  .map((p) => {
    const imageUrl = p.coverImage?.startsWith('http') ? p.coverImage : `${siteUrl}${p.coverImage}`;
    return `  <url>
    <loc>${siteUrl}/blog/${p.slug}</loc>
    <image:image>
      <image:loc>${imageUrl}</image:loc>
      <image:title>${escapeXml(p.title)}</image:title>
      <image:caption>${escapeXml(p.description)}</image:caption>
    </image:image>
  </url>`;
  })
  .join('\n')}
</urlset>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}
