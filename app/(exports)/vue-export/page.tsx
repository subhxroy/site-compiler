import React from 'react';
import { buildMetadata } from '@/lib/seo/metadata';
import { ExportPageTemplate, ExportPageData } from '@/components/export-page-template';

export const metadata = buildMetadata({
  title: 'Export Website to Vue 3 Components — SiteCompiler',
  description: 'Convert published website templates into clean Vue 3 Single File Components (.vue) with Tailwind CSS.',
  path: '/vue-export',
});

const data: ExportPageData = {
  title: 'Vue 3 Export',
  badge: 'VUE 3 ENGINE',
  headline: 'Export sites to clean Vue 3 Single File Components',
  description: 'Deconstruct websites into modular Vue 3 components with script setup and template sections.',
  path: '/vue-export',
  whatItProduces: [
    'Modular Vue 3 (.vue) single file components',
    'Composition API script setup declarations',
    'Scoped styling modules and Tailwind CSS classes',
  ],
  beforeSnippet: `<div class="card"><h2>Vue Component</h2></div>`,
  afterSnippet: `<script setup lang="ts">
defineProps<{ title?: string }>();
</script>

<template>
  <div className="p-6 bg-[#07080a] rounded-xl border border-[#2f3031]">
    <h2 className="text-xl text-white font-medium">{{ title || 'Vue Component' }}</h2>
  </div>
</template>`,
  limitations: [
    'Vue Pinia global state stores must be configured manually after export.',
  ],
  faqs: [
    {
      question: 'Is Vue 3 Composition API supported?',
      answer: 'Yes. All generated Vue components use the modern Composition API with <script setup lang="ts">.',
    },
  ],
};

export default function VueExportPage() {
  return <ExportPageTemplate data={data} />;
}
