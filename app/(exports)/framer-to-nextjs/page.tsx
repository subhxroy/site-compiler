import React from 'react';
import { buildMetadata } from '@/lib/seo/metadata';
import { ExportPageTemplate, ExportPageData } from '@/components/export-page-template';

export const metadata = buildMetadata({
  title: 'Framer to Next.js: Convert Framer to Next.js 16 App Router — SiteCompiler',
  description: 'Migrate Framer websites into Next.js 16 App Router projects with TypeScript, Tailwind CSS, and Vercel readiness.',
  path: '/framer-to-nextjs',
});

const data: ExportPageData = {
  title: 'Framer to Next.js',
  badge: 'CONVERSION PAIR ENGINE',
  headline: 'Migrate Framer sites to Next.js 16 App Router',
  description: 'Compile published Framer templates into complete Next.js 16 App Router projects with Tailwind CSS.',
  path: '/framer-to-nextjs',
  whatItProduces: [
    'Next.js 16 App Router project structure (app/layout.tsx, app/page.tsx)',
    'Tailwind CSS v4 styling configuration',
    'Local font optimization and static page generation (SSG)',
    'Ready for one-click Vercel or Netlify deployments',
  ],
  beforeSnippet: `<div class="framer-Wh99X framer-egmbj8">
  <div class="framer-14q8xyt-container">
    <nav class="framer-jZbNr">Framer Nav</nav>
  </div>
</div>`,
  afterSnippet: `import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Converted Framer Site' };

export default function Page() {
  return (
    <main className="min-h-screen bg-[#040506] text-white">
      <nav className="fixed top-5 left-1/2 -translate-x-1/2">Framer Nav</nav>
    </main>
  );
}`,
  limitations: [
    'Custom Framer code overrides must be replaced with native React hooks.',
  ],
  faqs: [
    {
      question: 'Can I host the generated Next.js project anywhere?',
      answer: 'Yes! The project is a standard Next.js 16 codebase that can be deployed to Vercel, Netlify, AWS Amplify, or Docker.',
    },
  ],
};

export default function FramerToNextjsPage() {
  return <ExportPageTemplate data={data} />;
}
