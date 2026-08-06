import React from 'react';
import { buildMetadata } from '@/lib/seo/metadata';
import { ExportPageTemplate, ExportPageData } from '@/components/export-page-template';

export const metadata = buildMetadata({
  title: 'Export Website to Tailwind CSS — SiteCompiler',
  description: 'Convert custom website styles and hashed CSS rules into clean, semantic Tailwind CSS utility classes.',
  path: '/tailwind-export',
});

const data: ExportPageData = {
  title: 'Tailwind CSS Export',
  badge: 'TAILWIND CSS ENGINE',
  headline: 'Convert website styles into semantic Tailwind CSS',
  description: 'Map raw inline styles and class definitions into utility-first Tailwind CSS classes.',
  path: '/tailwind-export',
  whatItProduces: [
    'Semantic Tailwind CSS utility class markup',
    'Custom theme color and font definitions',
    'Responsive padding, margin, flexbox, and grid mappings',
  ],
  beforeSnippet: `<div style="background-color:#07080a;padding:24px;border-radius:16px;border:1px solid #2f3031">
  <p style="color:#9c9c9d;font-size:14px">Tailwind Box</p>
</div>`,
  afterSnippet: `<div className="bg-[#07080a] p-6 rounded-2xl border border-[#2f3031]">
  <p className="text-sm text-[#9c9c9d]">Tailwind Box</p>
</div>`,
  limitations: [
    'Complex keyframe animation blocks are compiled into custom Tailwind plugin extensions.',
  ],
  faqs: [
    {
      question: 'Which Tailwind CSS version is supported?',
      answer: 'SiteCompiler supports both Tailwind CSS v3 and Tailwind CSS v4 syntax.',
    },
  ],
};

export default function TailwindExportPage() {
  return <ExportPageTemplate data={data} />;
}
