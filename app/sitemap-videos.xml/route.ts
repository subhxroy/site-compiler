import { NextResponse } from 'next/server';
import { getAllBlogPosts } from '@/lib/content/mdx';

export async function GET() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://sitecompiler.com';
  const postsWithVideo = getAllBlogPosts().filter((p) => p.videoUrl);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
${postsWithVideo
  .map((p) => {
    const thumb = p.coverImage ? (p.coverImage.startsWith('http') ? p.coverImage : `${siteUrl}${p.coverImage}`) : `${siteUrl}/og?title=${encodeURIComponent(p.title)}`;
    return `  <url>
    <loc>${siteUrl}/blog/${p.slug}</loc>
    <video:video>
      <video:thumbnail_loc>${thumb}</video:thumbnail_loc>
      <video:title>${escapeXml(p.title)}</video:title>
      <video:description>${escapeXml(p.description)}</video:description>
      <video:content_loc>${p.videoUrl}</video:content_loc>
      <video:publication_date>${new Date(p.publishedAt).toISOString()}</video:publication_date>
    </video:video>
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
