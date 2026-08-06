import React from 'react';
import { buildMetadata } from '@/lib/seo/metadata';
import { ExportPageTemplate, ExportPageData } from '@/components/export-page-template';

export const metadata = buildMetadata({
  title: 'Export Wix Websites to Clean Code — SiteCompiler',
  description: 'Convert published Wix websites into fast, lightweight HTML, React TSX, and Next.js 15 projects.',
  path: '/wix-export',
});

const data: ExportPageData = {
  title: 'Wix Export',
  badge: 'WIX EXPORTER ENGINE',
  headline: 'Export Wix sites into fast, lightweight code',
  description: 'Eliminate Wix script bloat and convert published Wix sites into clean, high-performance React and HTML bundles.',
  path: '/wix-export',
  whatItProduces: [
    'Clean HTML5 DOM without heavy Wix Viewer scripts',
    'Consolidated styles.css stripping thousands of unused rules',
    'Downloaded local image assets and custom web fonts',
    '100/100 Lighthouse Performance ready bundle',
  ],
  beforeSnippet: `<div id="comp-k23jf" class="comp-k23jf style-k23jf">
  <div class="style-k23jf_bg"></div>
  <p class="font_0">Welcome to Our Business</p>
</div>`,
  afterSnippet: `<section className="py-16 px-6 bg-[#040506] text-center">
  <h2 className="text-3xl font-medium text-white">Welcome to Our Business</h2>
</section>`,
  limitations: [
    'Wix Velo backend database functions are compiled into static client-side components.',
  ],
  faqs: [
    {
      question: 'Will my exported Wix site load faster?',
      answer: 'Yes! Wix site exports strip away megabytes of legacy viewer scripts, taking Lighthouse performance from 40 to 100.',
    },
  ],
};

export default function WixExportPage() {
  return <ExportPageTemplate data={data} />;
}
