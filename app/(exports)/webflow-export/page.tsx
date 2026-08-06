import React from 'react';
import { buildMetadata } from '@/lib/seo/metadata';
import { ExportPageTemplate, ExportPageData } from '@/components/export-page-template';

export const metadata = buildMetadata({
  title: 'Export Webflow Websites to React & Tailwind — SiteCompiler',
  description: 'Compile published Webflow websites into clean React components, Next.js 15 projects, and semantic Tailwind CSS.',
  path: '/webflow-export',
});

const data: ExportPageData = {
  title: 'Webflow Export',
  badge: 'WEBFLOW EXPORTER ENGINE',
  headline: 'Export Webflow sites to clean React & Tailwind CSS',
  description: 'Convert Webflow DOM trees and ix2 interaction triggers into production-ready Next.js 15 App Router code bases.',
  path: '/webflow-export',
  whatItProduces: [
    'Modular React components without Webflow JS runtime overhead',
    'Semantic Tailwind CSS utility class mapping',
    'Interactive mobile navigation and dropdown scripts',
    'Downloaded local assets, icons, and web fonts',
  ],
  beforeSnippet: `<div class="w-layout-grid hero-grid">
  <div id="w-node-1" class="w-col hero-[#w-node-1]">
    <h1 class="hero-heading">Build Fast</h1>
  </div>
</div>`,
  afterSnippet: `export function HeroSection() {
  return (
    <section className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
      <h1 className="text-5xl font-bold leading-tight text-white">Build Fast</h1>
    </section>
  );
}`,
  limitations: [
    'Webflow Ecommerce cart logic requires connecting to Stripe/Shopify APIs post-export.',
    'Complex multi-step forms are compiled into native React form elements.',
  ],
  faqs: [
    {
      question: 'Do I need a Webflow paid plan to export?',
      answer: 'No. SiteCompiler compiles any published webflow.io subdomain or custom domain directly.',
    },
    {
      question: 'Is Webflow CSS converted into Tailwind CSS?',
      answer: 'Yes. SiteCompiler maps Webflow class rules into semantic Tailwind CSS utility classes.',
    },
  ],
};

export default function WebflowExportPage() {
  return <ExportPageTemplate data={data} />;
}
