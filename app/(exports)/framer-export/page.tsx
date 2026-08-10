import React from 'react';
import { buildMetadata } from '@/lib/seo/metadata';
import { ExportPageTemplate, ExportPageData } from '@/components/export-page-template';

export const metadata = buildMetadata({
  title: 'Export Framer Websites to Clean Code — SiteCompiler',
  description: 'Convert published Framer websites into clean React TSX, Next.js 16, and static HTML bundles with zero lock-in.',
  path: '/framer-export',
});

const data: ExportPageData = {
  title: 'Framer Export',
  badge: 'FRAMER EXPORTER ENGINE',
  headline: 'Export Framer sites to clean React & Next.js code',
  description: 'Crawl any published .framer.website or custom domain Framer site, preserve animations, and download editable code.',
  path: '/framer-export',
  whatItProduces: [
    'Clean React TSX components with TypeScript prop definitions',
    'Next.js 16 App Router page structure',
    'Universal Animation Shim v3.0 preserving Framer scroll reveals',
    'Local WOFF2 fonts, SVG icons, and image asset pipeline',
  ],
  beforeSnippet: `<div class="framer-14q8xyt-container" data-framer-appear-id="14q8xyt" style="opacity:1;transform:translateX(-50%)">
  <nav class="framer-jZbNr framer-3C8PO">
    <a href="#hero">SUBH</a>
  </nav>
</div>`,
  afterSnippet: `export function NavigationBar() {
  return (
    <nav className="fixed top-5 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-[#07080a] border border-[#363739] rounded-full flex items-center justify-between">
      <Link href="#hero" className="font-bold text-white">SUBH</Link>
    </nav>
  );
}`,
  limitations: [
    'Framer CMS dynamic collection pagination is bundled into static multi-page files.',
    'Complex canvas shaders are converted into high-resolution fallback video/image assets.',
  ],
  faqs: [
    {
      question: 'How are Framer Motion animations preserved?',
      answer: 'SiteCompiler uses Playwright DOM capture to record initial state metrics, coupled with a zero-dependency JS shim restoring scroll reveals.',
    },
    {
      question: 'Can I deploy the Framer export to Vercel?',
      answer: 'Yes. The export includes a Next.js 16 App Router setup that deploys instantly on Vercel with zero configuration.',
    },
  ],
};

export default function FramerExportPage() {
  return <ExportPageTemplate data={data} />;
}
