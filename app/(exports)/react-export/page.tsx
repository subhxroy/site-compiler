import React from 'react';
import { buildMetadata } from '@/lib/seo/metadata';
import { ExportPageTemplate, ExportPageData } from '@/components/export-page-template';

export const metadata = buildMetadata({
  title: 'Export Website to React TSX Components — SiteCompiler',
  description: 'Convert websites into modular React TSX component trees with TypeScript definitions and style modules.',
  path: '/react-export',
});

const data: ExportPageData = {
  title: 'React TSX Export',
  badge: 'REACT TSX ENGINE',
  headline: 'Convert websites into modular React component trees',
  description: 'Deconstruct complex HTML structures into reusable React TSX components with strict TypeScript types.',
  path: '/react-export',
  whatItProduces: [
    'Modular React component files (Navbar.tsx, Hero.tsx, Features.tsx)',
    'TypeScript interface props definitions',
    'Local asset imports and modular CSS styling',
    'Clean JSX formatting without legacy inline style bloat',
  ],
  beforeSnippet: `<div class="hero-block" style="background:#040506;padding:80px">
  <h1 style="color:#ffffff">React Component</h1>
</div>`,
  afterSnippet: `export interface HeroProps {
  title?: string;
}

export function Hero({ title = "React Component" }: HeroProps) {
  return (
    <div className="bg-[#040506] p-20 text-center">
      <h1 className="text-white text-4xl font-bold">{title}</h1>
    </div>
  );
}`,
  limitations: [
    'Complex canvas 3D WebGL scenes are generated as fallback video/image React components.',
  ],
  faqs: [
    {
      question: 'Is TypeScript supported out of the box?',
      answer: 'Yes. All generated React components include full TypeScript props definitions (.tsx).',
    },
  ],
};

export default function ReactExportPage() {
  return <ExportPageTemplate data={data} />;
}
