import * as cheerio from 'cheerio';

/**
 * Transforms crawled HTML into Svelte 5 Single-File Components (+page.svelte).
 */
export function transformHtmlToSvelte(html: string, title: string = 'Page'): string {
  const $ = cheerio.load(html);

  $('script:not([type="application/ld+json"])').remove();
  $('meta').remove();
  $('link[rel="stylesheet"]').remove();
  $('title').remove();

  const bodyContent = $('body').html() || $.html() || '<div>No content</div>';

  return `<svelte:head>
  <title>${title.replace(/"/g, '&quot;')}</title>
</svelte:head>

<main class="site-main-content">
${bodyContent
  .split('\n')
  .map((line) => `  ${line}`)
  .join('\n')}
</main>
`;
}
