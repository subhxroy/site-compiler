import React from 'react';
import { buildMetadata } from '@/lib/seo/metadata';
import { ExportPageTemplate, ExportPageData } from '@/components/export-page-template';

export const metadata = buildMetadata({
  title: 'Export Website to Astro Static Site — SiteCompiler',
  description: 'Compile published websites into high-speed Astro static site generator projects.',
  path: '/astro-export',
});

const data: ExportPageData = {
  title: 'Astro Export',
  badge: 'ASTRO ENGINE',
  headline: 'Export sites into high-speed Astro projects',
  description: 'Convert published website markup into lightweight Astro components (.astro) with zero client-side JS runtime by default.',
  path: '/astro-export',
  whatItProduces: [
    'Modular .astro page and layout files',
    'Zero client-side JS runtime payload',
    '100/100 Lighthouse Performance ready static output',
  ],
  beforeSnippet: `<div class="hero"><h1>Astro Site</h1></div>`,
  afterSnippet: `---
// Astro Component Script
const { title = "Astro Site" } = Astro.props;
---
<div className="py-12 text-center">
  <h1 className="text-4xl font-bold text-white">{title}</h1>
</div>`,
  limitations: [
    'Interactive client-side JS features require adding client:load directives on islands.',
  ],
  faqs: [
    {
      question: 'Why choose Astro export?',
      answer: 'Astro ships zero JavaScript by default, making it the fastest static output option for content sites.',
    },
  ],
};

export default function AstroExportPage() {
  return <ExportPageTemplate data={data} />;
}
