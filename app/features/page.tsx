import React from 'react';
import { buildMetadata } from '@/lib/seo/metadata';
import { breadcrumbListSchema } from '@/lib/seo/schema';

export const metadata = buildMetadata({
  title: 'Engineered Features & Architecture — SiteCompiler',
  description: 'Explore the internal architecture of SiteCompiler: multi-pass Playwright capture, PostCSS AST parsing, local asset bundlers, and universal animation shims.',
  path: '/features',
});

export default function FeaturesPage() {
  const breadcrumbSchema = breadcrumbListSchema([{ name: 'Features', item: '/features' }]);

  const featureBlocks = [
    {
      title: 'Multi-Pass Playwright Hydration',
      desc: 'Standard scrapers fail on Framer Motion and React components starting at opacity: 0. SiteCompiler performs programmatic scroll sequences that trigger IntersectionObserver thresholds before capturing the DOM.',
      tag: 'CRAWLER ENGINE',
    },
    {
      title: 'Local Asset Pipeline & Bundler',
      desc: 'Every image, SVG icon, MP4 video, and custom web font (WOFF2/TTF) referenced in the website DOM or stylesheet is downloaded locally and saved inside your ZIP file for 100% offline self-hosting.',
      tag: 'ASSET PIPELINE',
    },
    {
      title: 'Universal Animation Shim v3.0',
      desc: 'Replaces proprietary framework runtimes with a zero-dependency JS shim. Restores scroll reveal, quote scroll-color effects, card hovers, responsive breakpoints, sticky headers, and mobile nav toggles.',
      tag: 'ANIMATION ENGINE',
    },
    {
      title: 'CSS AST Consolidation',
      desc: 'Parses raw CSS files using PostCSS, rewrites asset URLs to relative paths, removes broken editor overlays, and outputs a single clean styles.css file.',
      tag: 'CSS AST ENGINE',
    },
    {
      title: 'Next.js 15 & React TSX Code Generator',
      desc: 'Transforms static HTML trees into structured Next.js 15 App Router pages and TypeScript components with clean Tailwind CSS utility mappings.',
      tag: 'CODE GENERATOR',
    },
    {
      title: 'Multi-Page Subpage Discovery',
      desc: 'Discovers internal site links and crawls up to 15 subpages automatically, rewriting absolute links to relative .html files for seamless offline navigation.',
      tag: 'MULTI-PAGE CRAWLER',
    },
  ];

  return (
    <main className="pt-28 pb-24">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      <div className="max-w-[1100px] mx-auto px-6 space-y-16">
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-[6px] bg-[#1b1c1e] border border-[#2f3031] text-[11px] font-mono text-[#ff6363] uppercase tracking-wider">
            Engineered Architecture
          </div>
          <h1 className="text-4xl sm:text-5xl font-normal text-white">Full-stack website compilation.</h1>
          <p className="text-base text-[#9c9c9d] leading-relaxed">
            Discover how SiteCompiler faithfully reconstructs design systems, animations, and code structure.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {featureBlocks.map((f, i) => (
            <div key={i} className="raycast-key-card p-8 space-y-4">
              <div className="font-mono text-[11px] text-[#ff6363] tracking-widest">{f.tag}</div>
              <h2 className="text-xl font-medium text-white">{f.title}</h2>
              <p className="text-xs text-[#9c9c9d] leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
