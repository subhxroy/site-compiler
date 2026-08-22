import * as cheerio from 'cheerio';

/**
 * Transforms raw crawled HTML into Astro component markup (.astro).
 * Converts inline styles, head elements, and structure into idiomatic Astro templates.
 */
export function transformHtmlToAstro(html: string, pageTitle: string = 'Page'): string {
  const $ = cheerio.load(html);

  // Remove scripts, meta tags, and head elements handled by Layout.astro
  $('script:not([type="application/ld+json"])').remove();
  $('meta').remove();
  $('link[rel="stylesheet"]').remove();
  $('title').remove();

  const bodyContent = $('body').html() || $.html() || '<div>No content</div>';

  return `---
import Layout from '../layouts/Layout.astro';
---

<Layout title="${pageTitle.replace(/"/g, '\\"')}">
  <main class="site-main-content">
${bodyContent
  .split('\n')
  .map((line) => `    ${line}`)
  .join('\n')}
  </main>
</Layout>
`;
}
