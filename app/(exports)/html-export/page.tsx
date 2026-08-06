import React from 'react';
import { buildMetadata } from '@/lib/seo/metadata';
import { ExportPageTemplate, ExportPageData } from '@/components/export-page-template';

export const metadata = buildMetadata({
  title: 'Export Website to Static HTML, CSS & JS — SiteCompiler',
  description: 'Compile any published website into a 100% self-hosted static HTML bundle with local assets and universal animation shims.',
  path: '/html-export',
});

const data: ExportPageData = {
  title: 'Static HTML Export',
  badge: 'STATIC HTML ENGINE',
  headline: 'Compile any site into 100% offline static HTML',
  description: 'Generate clean HTML5 pages, consolidated CSS stylesheets, local asset bundles, and lightweight animation shims.',
  path: '/html-export',
  whatItProduces: [
    'Fully hydrated HTML5 files (index.html, subpages)',
    'Single consolidated styles.css file',
    'Zero-dependency script.js animation shim v3.0',
    'Local asset directories (images/, fonts/, icons/, video/)',
  ],
  beforeSnippet: `<html class="framer-1">...</html>`,
  afterSnippet: `<!DOCTYPE html>
<html lang="en">
<head>
  <link rel="stylesheet" href="./styles.css">
</head>
<body>
  <script src="./script.js"></script>
</body>
</html>`,
  limitations: [
    'Static HTML exports require HTTP web servers (npx serve or Netlify) for smooth CORS font loading.',
  ],
  faqs: [
    {
      question: 'Where can I host static HTML exports?',
      answer: 'Drag and drop your unzipped folder directly onto Netlify, Cloudflare Pages, Vercel, or traditional cPanel FTP hosting.',
    },
  ],
};

export default function HtmlExportPage() {
  return <ExportPageTemplate data={data} />;
}
