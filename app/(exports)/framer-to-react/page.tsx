import React from 'react';
import { buildMetadata } from '@/lib/seo/metadata';
import { ExportPageTemplate, ExportPageData } from '@/components/export-page-template';

export const metadata = buildMetadata({
  title: 'Framer to React: Convert Framer Sites to React TSX — SiteCompiler',
  description: 'Convert published Framer websites directly into clean, modular React TSX components with TypeScript definitions.',
  path: '/framer-to-react',
});

const data: ExportPageData = {
  title: 'Framer to React',
  badge: 'CONVERSION PAIR ENGINE',
  headline: 'Convert Framer sites directly into React TSX',
  description: 'Migrate off Framer and into custom React applications while preserving layout fidelity, fonts, and animation triggers.',
  path: '/framer-to-react',
  whatItProduces: [
    'Clean React TSX component hierarchy (components/Hero.tsx, components/Navbar.tsx)',
    'TypeScript interface props for dynamic content replacement',
    'Downloaded local asset bundle (images, WOFF2 web fonts, SVG icons)',
    'Zero Framer runtime dependency',
  ],
  beforeSnippet: `<div class="framer-14q8xyt-container" data-framer-appear-id="14q8xyt">
  <nav class="framer-jZbNr">
    <p>SUBH</p>
  </nav>
</div>`,
  afterSnippet: `export function FramerNavbar() {
  return (
    <nav className="fixed top-5 left-1/2 -translate-x-1/2 px-4 py-2 bg-[#07080a] border border-[#363739] rounded-full">
      <p className="font-bold text-white">SUBH</p>
    </nav>
  );
}`,
  limitations: [
    'Framer CMS dynamic collections are converted into clean JSON data props.',
  ],
  faqs: [
    {
      question: 'How long does Framer to React compilation take?',
      answer: 'Compilation typically finishes in 30 to 60 seconds depending on total page asset size.',
    },
  ],
};

export default function FramerToReactPage() {
  return <ExportPageTemplate data={data} />;
}
