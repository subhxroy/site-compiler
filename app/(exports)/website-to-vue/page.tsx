import React from 'react';
import { buildMetadata } from '@/lib/seo/metadata';
import { ExportPageTemplate, ExportPageData } from '@/components/export-page-template';

export const metadata = buildMetadata({
  title: 'Website to Vue: Convert Any Site to Vue 3 — SiteCompiler',
  description: 'Convert published website templates into Vue 3 Single File Components (.vue) with Composition API script setup.',
  path: '/website-to-vue',
});

const data: ExportPageData = {
  title: 'Website to Vue',
  badge: 'CONVERSION PAIR ENGINE',
  headline: 'Convert any website into Vue 3 Components',
  description: 'Compile published web pages into clean Vue 3 single-file components (.vue) with Composition API.',
  path: '/website-to-vue',
  whatItProduces: [
    'Vue 3 (.vue) single file component structure',
    'Composition API script setup declarations with TypeScript types',
    'Local asset imports and Tailwind CSS styling',
  ],
  beforeSnippet: `<div class="hero"><h1>Vue Exporter</h1></div>`,
  afterSnippet: `<script setup lang="ts">
const title = 'Vue Exporter';
</script>

<template>
  <div className="py-12 text-center">
    <h1 className="text-4xl font-bold text-white">{{ title }}</h1>
  </div>
</template>`,
  limitations: [
    'Vue Router configuration files must be added post-export for multi-page routing.',
  ],
  faqs: [
    {
      question: 'Does this output Vue 3 Composition API?',
      answer: 'Yes. All generated Vue components use modern Vue 3 <script setup lang="ts"> syntax.',
    },
  ],
};

export default function WebsiteToVuePage() {
  return <ExportPageTemplate data={data} />;
}
