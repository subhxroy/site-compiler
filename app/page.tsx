import React from 'react';
import SiteCompilerPage from './client-page';
import { buildMetadata } from '@/lib/seo/metadata';
import { softwareApplicationSchema, faqPageSchema } from '@/lib/seo/schema';

export const metadata = buildMetadata({
  title: 'SiteCompiler — Convert Any Website to Clean React, Next.js & HTML',
  description:
    'Crawl any published website (Framer, Webflow, Wix) and compile it into clean, editable Static HTML, React TSX, or Next.js 15 + Tailwind in a single ZIP.',
  path: '/',
});

const homeFaqs = [
  {
    question: 'How does SiteCompiler capture Framer and React animations?',
    answer:
      'SiteCompiler uses a multi-pass Playwright crawler that executes smooth scroll sequences to trigger lazy-loaded images, IntersectionObserver thresholds, and Framer Motion hydration before taking a DOM snapshot.',
  },
  {
    question: 'What files are included in the exported ZIP archive?',
    answer:
      'The ZIP includes all captured subpages (index.html, work.html, blog.html), all local assets (images, WOFF2 fonts, SVG icons, video files), consolidated styles.css, script.js animation shim v3.0, and a README.md with deployment steps.',
  },
  {
    question: 'Can I convert Framer or Webflow sites into Next.js 15 App Router?',
    answer:
      'Yes. Select Next.js 15 as your output architecture. SiteCompiler reconstructs the site into a complete Next.js 15 project structure with App Router pages, TypeScript components, and Tailwind CSS configuration.',
  },
  {
    question: 'Are external fonts and media assets saved locally?',
    answer:
      'Yes. Every web font, image, icon, and video referenced in the site DOM or CSS is fetched and saved locally inside the ZIP so your exported project functions 100% offline.',
  },
];

export default function HomePage() {
  const appSchema = softwareApplicationSchema();
  const faqSchema = faqPageSchema(homeFaqs);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(appSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <SiteCompilerPage faqs={homeFaqs} />
    </>
  );
}
