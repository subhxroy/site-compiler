import React from 'react';
import { buildMetadata } from '@/lib/seo/metadata';
import { breadcrumbListSchema } from '@/lib/seo/schema';

export const metadata = buildMetadata({
  title: 'Product Roadmap — SiteCompiler',
  description: 'Upcoming features, export architectures, and compiler capabilities planned for SiteCompiler.',
  path: '/roadmap',
});

const roadmapItems = [
  {
    status: 'Planned (Q3 2026)',
    title: 'Vue 3 & Astro Output Generators',
    desc: 'Support for compiling websites directly into Vue 3 Single File Components (.vue) and Astro static site generators.',
  },
  {
    status: 'In Development',
    title: 'Framer CMS Collection Export',
    desc: 'Extracting dynamic Framer CMS collections and Webflow CMS collections into local Markdown/JSON files.',
  },
  {
    status: 'Released',
    title: 'Universal Animation Shim v3.0',
    desc: 'Zero-dependency JS shim restoring scroll reveals, hovers, counters, marquee, and sticky navigation.',
  },
];

export default function RoadmapPage() {
  const breadcrumbSchema = breadcrumbListSchema([{ name: 'Roadmap', item: '/roadmap' }]);

  return (
    <main className="pt-28 pb-24">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      <div className="max-w-3xl mx-auto px-6 space-y-12">
        <div className="space-y-4 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-[6px] bg-[#1b1c1e] border border-[#2f3031] text-[11px] font-mono text-[#ff6363] uppercase tracking-wider">
            Product Vision
          </div>
          <h1 className="text-4xl font-normal text-white">Feature Roadmap</h1>
        </div>

        <div className="space-y-6">
          {roadmapItems.map((item, i) => (
            <div key={i} className="raycast-key-card p-6 space-y-2">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-[4px] bg-[#1b1c1e] text-[#ff6363] border border-[#ff6363]/30">
                {item.status}
              </span>
              <h2 className="text-lg font-medium text-white pt-1">{item.title}</h2>
              <p className="text-xs text-[#9c9c9d] leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
