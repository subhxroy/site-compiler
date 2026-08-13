import React from 'react';
import { buildMetadata } from '@/lib/seo/metadata';
import { ExportPageTemplate, ExportPageData } from '@/components/export-page-template';

export const metadata = buildMetadata({
  title: 'Export Website to Next.js 16 App Router — SiteCompiler',
  description: 'Compile published Framer, Webflow, and static websites into Next.js 16 App Router projects with Tailwind CSS.',
  path: '/nextjs-export',
});

const data: ExportPageData = {
  title: 'Next.js 16 Export',
  badge: 'NEXT.JS 16 ENGINE',
  headline: 'Export sites to Next.js 16 App Router & Tailwind CSS',
  description: 'Generate full Next.js 16 App Router codebases with TypeScript, Tailwind CSS configuration, and zero platform lock-in.',
  path: '/nextjs-export',
  whatItProduces: [
    'Next.js 16 App Router structure (app/layout.tsx, app/page.tsx)',
    'Tailwind CSS v4 styling setup and theme definitions',
    'Local font preloading via next/font/google',
    'Ready for instant one-command deployment to Vercel or Netlify',
  ],
  beforeSnippet: `<div class="container">
  <div class="row"><div class="col"><h1>Next.js 16</h1></div></div>
</div>`,
  afterSnippet: `import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Exported Next.js 16 Site',
};

export default function Page() {
  return (
    <main className="container mx-auto px-6 py-12">
      <h1 className="text-4xl font-bold">Next.js 16</h1>
    </main>
  );
}`,
  limitations: [
    'Dynamic Next.js server actions must be authored after export.',
  ],
  faqs: [
    {
      question: 'Which version of Next.js is generated?',
      answer: 'SiteCompiler generates clean Next.js 16 App Router code with React 19 and Tailwind CSS.',
    },
  ],
};

export default function NextjsExportPage() {
  return <ExportPageTemplate data={data} />;
}
