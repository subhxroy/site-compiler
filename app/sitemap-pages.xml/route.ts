import { NextResponse } from 'next/server';

export async function GET() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://sitecompiler.com';
  const now = new Date().toISOString();

  const pages = [
    { url: '/', priority: '1.0', changefreq: 'daily' },
    { url: '/pricing', priority: '0.9', changefreq: 'weekly' },
    { url: '/features', priority: '0.9', changefreq: 'weekly' },
    { url: '/about', priority: '0.8', changefreq: 'monthly' },
    { url: '/contact', priority: '0.7', changefreq: 'monthly' },
    { url: '/changelog', priority: '0.8', changefreq: 'weekly' },
    { url: '/roadmap', priority: '0.8', changefreq: 'weekly' },
    { url: '/privacy', priority: '0.3', changefreq: 'yearly' },
    { url: '/terms', priority: '0.3', changefreq: 'yearly' },
    
    // Export landing pages
    { url: '/framer-export', priority: '0.8', changefreq: 'weekly' },
    { url: '/webflow-export', priority: '0.8', changefreq: 'weekly' },
    { url: '/wix-export', priority: '0.8', changefreq: 'weekly' },
    { url: '/html-export', priority: '0.8', changefreq: 'weekly' },
    { url: '/react-export', priority: '0.8', changefreq: 'weekly' },
    { url: '/nextjs-export', priority: '0.8', changefreq: 'weekly' },
    { url: '/tailwind-export', priority: '0.8', changefreq: 'weekly' },
    { url: '/vue-export', priority: '0.8', changefreq: 'weekly' },
    { url: '/astro-export', priority: '0.8', changefreq: 'weekly' },

    // Conversion-pair programmatic pages
    { url: '/framer-to-react', priority: '0.8', changefreq: 'weekly' },
    { url: '/framer-to-nextjs', priority: '0.8', changefreq: 'weekly' },
    { url: '/framer-to-html', priority: '0.8', changefreq: 'weekly' },
    { url: '/webflow-to-react', priority: '0.8', changefreq: 'weekly' },
    { url: '/website-to-tailwind', priority: '0.8', changefreq: 'weekly' },
    { url: '/website-to-vue', priority: '0.8', changefreq: 'weekly' },
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages
  .map(
    (p) => `  <url>
    <loc>${siteUrl}${p.url}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
