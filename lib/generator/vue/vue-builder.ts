import * as cheerio from 'cheerio';

/**
 * Transforms crawled HTML into Vue 3 Single-File Components (.vue).
 */
export function transformHtmlToVue(html: string, title: string = 'Page'): string {
  const $ = cheerio.load(html);

  $('script:not([type="application/ld+json"])').remove();
  $('meta').remove();
  $('link[rel="stylesheet"]').remove();
  $('title').remove();

  const bodyContent = $('body').html() || $.html() || '<div>No content</div>';

  return `<script setup lang="ts">
useHead({
  title: '${title.replace(/'/g, "\\'")}',
});
</script>

<template>
  <main class="site-main-content">
${bodyContent
  .split('\n')
  .map((line) => `    ${line}`)
  .join('\n')}
  </main>
</template>
`;
}
