import React from 'react';
import { buildMetadata } from '@/lib/seo/metadata';
import { breadcrumbListSchema } from '@/lib/seo/schema';

export const metadata = buildMetadata({
  title: 'Changelog & Release Notes — SiteCompiler',
  description: 'Track the latest updates, features, and fixes released for SiteCompiler website exporter.',
  path: '/changelog',
});

const releases = [
  {
    version: 'v1.104.21',
    date: 'August 6, 2026',
    title: 'Universal Animation Shim v3.0 & Framer Centering Fix',
    changes: [
      'Added [data-framer-layout-hint-center-x] selector rule restoring fixed top-center positioning for floating Framer pill navbars.',
      'Released Universal Animation Shim v3.0 with support for Webflow breakpoints, sticky headers, counters, parallax, and lightbox.',
      'Enhanced Playwright multi-pass scroll hydration with cookie banner auto-dismissal.',
    ],
  },
  {
    version: 'v1.100.0',
    date: 'August 1, 2026',
    title: 'Multi-Page Subpage Discovery & Local Asset Pipeline',
    changes: [
      'Added multi-page crawling supporting up to 15 subpages per export job.',
      'Local asset pipeline downloads all images, WOFF2 web fonts, SVG icons, and MP4 videos for 100% offline self-hosting.',
      'Added Next.js 15 App Router code generator architecture.',
    ],
  },
];

export default function ChangelogPage() {
  const breadcrumbSchema = breadcrumbListSchema([{ name: 'Changelog', item: '/changelog' }]);

  return (
    <main className="pt-28 pb-24">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      <div className="max-w-3xl mx-auto px-6 space-y-12">
        <div className="space-y-4 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-[6px] bg-[#1b1c1e] border border-[#2f3031] text-[11px] font-mono text-[#ff6363] uppercase tracking-wider">
            Release Notes
          </div>
          <h1 className="text-4xl font-normal text-white">Product Changelog</h1>
        </div>

        <div className="space-y-8">
          {releases.map((rel, i) => (
            <div key={i} className="raycast-key-card p-8 space-y-4">
              <div className="flex items-center justify-between font-mono text-xs text-[#6a6b6c] border-b border-[#1b1c1e] pb-3">
                <span className="text-[#ff6363] font-semibold">{rel.version}</span>
                <span>{rel.date}</span>
              </div>
              <h2 className="text-xl font-medium text-white">{rel.title}</h2>
              <ul className="space-y-2 text-xs text-[#9c9c9d]">
                {rel.changes.map((c, j) => (
                  <li key={j} className="flex items-start gap-2">
                    <span className="text-[#ff6363]">•</span>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
