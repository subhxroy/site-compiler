import React from 'react';
import { buildMetadata } from '@/lib/seo/metadata';
import { ExportPageTemplate, ExportPageData } from '@/components/export-page-template';

export const metadata = buildMetadata({
  title: 'Website to Tailwind: Convert Any Site to Tailwind CSS — SiteCompiler',
  description: 'Convert custom website stylesheets and inline CSS into clean, maintainable Tailwind CSS utility classes.',
  path: '/website-to-tailwind',
});

const data: ExportPageData = {
  title: 'Website to Tailwind',
  badge: 'CONVERSION PAIR ENGINE',
  headline: 'Convert any website styles into Tailwind CSS',
  description: 'Parse raw website DOM trees and stylesheets into semantic utility-first Tailwind CSS classes.',
  path: '/website-to-tailwind',
  whatItProduces: [
    'Clean HTML/React markup formatted with Tailwind CSS utilities',
    'Custom color palette, spacing, and typography theme scales',
    'Responsive flexbox and grid layout utilities',
  ],
  beforeSnippet: `<div style="background:#111214;padding:32px;border-radius:12px;display:flex;gap:16px">
  <span style="color:#ff6363;font-weight:600">Tailwind Mapper</span>
</div>`,
  afterSnippet: `<div className="bg-[#111214] p-8 rounded-xl flex gap-4">
  <span className="text-[#ff6363] font-semibold">Tailwind Mapper</span>
</div>`,
  limitations: [
    'Unique custom CSS clip-paths are compiled into custom utility plugin definitions.',
  ],
  faqs: [
    {
      question: 'How accurate is the Tailwind CSS conversion?',
      answer: 'SiteCompiler maps colors, spacing scales, typography weights, flexbox, and grid definitions to exact Tailwind classes.',
    },
  ],
};

export default function WebsiteToTailwindPage() {
  return <ExportPageTemplate data={data} />;
}
