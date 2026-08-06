import React from 'react';
import { buildMetadata } from '@/lib/seo/metadata';
import { ExportPageTemplate, ExportPageData } from '@/components/export-page-template';

export const metadata = buildMetadata({
  title: 'Framer to HTML: Convert Framer to Static HTML & CSS — SiteCompiler',
  description: 'Convert Framer websites into 100% self-hosted static HTML5, CSS3, and JS bundles for instant local or FTP hosting.',
  path: '/framer-to-html',
});

const data: ExportPageData = {
  title: 'Framer to HTML',
  badge: 'CONVERSION PAIR ENGINE',
  headline: 'Convert Framer sites to static HTML & CSS',
  description: 'Export Framer websites into self-contained HTML5 files, local asset bundles, and universal animation shims.',
  path: '/framer-to-html',
  whatItProduces: [
    'Hydrated HTML5 files with all DOM elements preserved',
    'Consolidated styles.css stripping editor artifacts',
    'Universal Animation Shim v3.0 restoring scroll reveals and navbars',
    'Downloaded local asset directories (images/, fonts/, icons/)',
  ],
  beforeSnippet: `<div class="framer-14q8xyt-container">
  <nav class="framer-jZbNr">Framer Nav</nav>
</div>`,
  afterSnippet: `<!DOCTYPE html>
<html lang="en">
<head>
  <link rel="stylesheet" href="./styles.css">
</head>
<body>
  <div class="framer-14q8xyt-container">
    <nav class="framer-jZbNr">Framer Nav</nav>
  </div>
  <script src="./script.js"></script>
</body>
</html>`,
  limitations: [
    'Static HTML exports cannot execute Framer server-side React code overrides.',
  ],
  faqs: [
    {
      question: 'How do I open the Framer HTML export locally?',
      answer: 'Use npx serve . or any HTTP web server to preview index.html locally with CORS web fonts.',
    },
  ],
};

export default function FramerToHtmlPage() {
  return <ExportPageTemplate data={data} />;
}
