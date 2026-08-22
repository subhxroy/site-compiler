import * as cheerio from 'cheerio';

/**
 * Transforms crawled HTML into Remix route components (_index.tsx, about.tsx).
 */
export function transformHtmlToRemix(html: string, title: string = 'Page'): string {
  const $ = cheerio.load(html);

  $('script:not([type="application/ld+json"])').remove();
  $('meta').remove();
  $('link[rel="stylesheet"]').remove();
  $('title').remove();

  const bodyContent = $('body').html() || $.html() || '<div>No content</div>';

  return `import type { MetaFunction } from "@remix-run/node";

export const meta: MetaFunction = () => {
  return [
    { title: "${title.replace(/"/g, '\\"')}" },
    { name: "description", content: "Exported with SiteCompiler Remix Engine" },
  ];
};

export default function RoutePage() {
  return (
    <main
      className="site-main-content"
      dangerouslySetInnerHTML={{
        __html: \`${bodyContent.replace(/`/g, '\\`').replace(/\${/g, '\\${')}\`,
      }}
    />
  );
}
`;
}
