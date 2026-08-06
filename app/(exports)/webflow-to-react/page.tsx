import React from 'react';
import { buildMetadata } from '@/lib/seo/metadata';
import { ExportPageTemplate, ExportPageData } from '@/components/export-page-template';

export const metadata = buildMetadata({
  title: 'Webflow to React: Convert Webflow Sites to React & Tailwind — SiteCompiler',
  description: 'Convert published Webflow websites into modular React components with semantic Tailwind CSS utility classes.',
  path: '/webflow-to-react',
});

const data: ExportPageData = {
  title: 'Webflow to React',
  badge: 'CONVERSION PAIR ENGINE',
  headline: 'Convert Webflow sites to React & Tailwind CSS',
  description: 'Deconstruct Webflow DOM structures and ix2 triggers into clean React TSX components and utility-first Tailwind CSS.',
  path: '/webflow-to-react',
  whatItProduces: [
    'Modular React TSX components (Header.tsx, Features.tsx, Pricing.tsx)',
    'Semantic Tailwind CSS class mapping replacing generated Webflow classes',
    'Interactive React state hooks replacing Webflow dropdown and modal scripts',
    'Local asset directories for images, SVG icons, and web fonts',
  ],
  beforeSnippet: `<div class="w-nav" data-collapse="medium" data-animation="default">
  <div class="w-container">
    <a href="#" class="w-nav-brand">Logo</a>
  </div>
</div>`,
  afterSnippet: `export function WebflowNav() {
  return (
    <header className="sticky top-0 z-50 bg-[#040506] border-b border-[#1b1c1e]">
      <div className="max-w-[1100px] mx-auto px-6 flex items-center justify-between">
        <Link href="/" className="font-bold text-white">Logo</Link>
      </div>
    </header>
  );
}`,
  limitations: [
    'Webflow Ecommerce cart states are converted into clean React checkout UI skeletons.',
  ],
  faqs: [
    {
      question: 'Are Webflow class names converted to Tailwind?',
      answer: 'Yes. SiteCompiler parses element computed styles and rewrites Webflow classes into standard Tailwind CSS utilities.',
    },
  ],
};

export default function WebflowToReactPage() {
  return <ExportPageTemplate data={data} />;
}
