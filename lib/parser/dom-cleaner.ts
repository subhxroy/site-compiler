import * as cheerio from 'cheerio';
import { ProcessedAssetMap } from './asset-pipeline';
import { PageCaptured } from '../crawler/types';

export interface CleanDomOptions {
  rawHtml: string;
  assetMap: ProcessedAssetMap;
  baseUrl: string;
  pages?: PageCaptured[];
  currentHtmlFilename?: string;
}

export interface CleanDomResult {
  cleanedHtml: string;
  $: cheerio.CheerioAPI;
  title: string;
}

export function cleanDom(
  rawHtml: string,
  assetMap: ProcessedAssetMap,
  baseUrl: string,
  pages: PageCaptured[] = [],
  currentHtmlFilename: string = 'index.html'
): CleanDomResult {
  const $ = cheerio.load(rawHtml, {
    xml: false,
  });

  const baseHost = new URL(baseUrl).hostname;

  // 1. Remove ONLY analytics, tracking, & editor overlays
  const trackingKeywords = [
    'google-analytics', 'googletagmanager', 'gtag', 'ga.js', 'analytics.js',
    'facebook.net', 'fbevents', 'mixpanel', 'hotjar', 'segment.com', 'intercom',
    'clarity.ms', 'doubleclick', 'drift', 'hubspot'
  ];

  $('script').each((_, el) => {
    const src = $(el).attr('src') || '';
    const text = $(el).text() || '';
    const isTracking = trackingKeywords.some(kw => src.toLowerCase().includes(kw) || text.toLowerCase().includes(kw));
    if (isTracking) {
      $(el).remove();
    }
  });

  $('noscript').remove();

  // Remove comment nodes
  $('*').contents().filter((_, node) => node.type === 'comment').remove();

  // 2. Helper to resolve asset URL to local relative path
  const resolveAssetUrl = (urlStr: string | undefined): string | undefined => {
    if (!urlStr || urlStr.startsWith('data:')) return urlStr;

    let absoluteUrl = urlStr;
    try {
      absoluteUrl = new URL(urlStr, baseUrl).href;
    } catch {}

    if (assetMap[absoluteUrl]) return assetMap[absoluteUrl];
    if (assetMap[urlStr]) return assetMap[urlStr];

    for (const [orig, local] of Object.entries(assetMap)) {
      if (orig.endsWith(urlStr) || urlStr.endsWith(orig.split('?')[0].split('#')[0].split('/').pop() || '')) {
        return local;
      }
    }

    return urlStr;
  };

  // 3. Rewrite internal links (<a href="...">) to local HTML subpages
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) return;

    try {
      const linkUrl = new URL(href, baseUrl);
      // Check if it belongs to the target site
      if (linkUrl.hostname === baseHost) {
        const pathNoSlash = linkUrl.pathname.replace(/\/$/, '');

        // Find matching captured page
        const matchPage = pages.find((p) => {
          const pPathNoSlash = p.pathname.replace(/\/$/, '');
          return pPathNoSlash === pathNoSlash;
        });

        if (matchPage) {
          const hash = linkUrl.hash || '';
          const targetFilename = matchPage.htmlFilename;
          $(el).attr('href', `./${targetFilename}${hash}`);
        } else if (pathNoSlash === '' || pathNoSlash === '/') {
          const hash = linkUrl.hash || '';
          $(el).attr('href', `./index.html${hash}`);
        }
      }
    } catch {}
  });

  // 4. Rewrite <img> src and srcset
  $('img').each((_, el) => {
    const src = $(el).attr('src');
    if (src) {
      const resolved = resolveAssetUrl(src);
      if (resolved) $(el).attr('src', resolved);
    }

    const srcset = $(el).attr('srcset');
    if (srcset) {
      const parts = srcset.split(',').map((part) => {
        const trimmed = part.trim();
        const tokens = trimmed.split(/\s+/);
        if (tokens[0]) {
          const res = resolveAssetUrl(tokens[0]);
          if (res) tokens[0] = res;
        }
        return tokens.join(' ');
      });
      $(el).attr('srcset', parts.join(', '));
    }
  });

  // 5. Rewrite <source> src and srcset
  $('source').each((_, el) => {
    const src = $(el).attr('src');
    if (src) {
      const resolved = resolveAssetUrl(src);
      if (resolved) $(el).attr('src', resolved);
    }
    const srcset = $(el).attr('srcset');
    if (srcset) {
      const parts = srcset.split(',').map((part) => {
        const trimmed = part.trim();
        const tokens = trimmed.split(/\s+/);
        if (tokens[0]) {
          const res = resolveAssetUrl(tokens[0]);
          if (res) tokens[0] = res;
        }
        return tokens.join(' ');
      });
      $(el).attr('srcset', parts.join(', '));
    }
  });

  // 6. Rewrite <video> src and poster
  $('video').each((_, el) => {
    const src = $(el).attr('src');
    if (src) {
      const resolved = resolveAssetUrl(src);
      if (resolved) $(el).attr('src', resolved);
    }
    const poster = $(el).attr('poster');
    if (poster) {
      const resolved = resolveAssetUrl(poster);
      if (resolved) $(el).attr('poster', resolved);
    }
  });

  // 7. Rewrite <link rel="icon">
  $('link[rel*="icon"]').each((_, el) => {
    const href = $(el).attr('href');
    if (href) {
      const resolved = resolveAssetUrl(href);
      if (resolved) $(el).attr('href', resolved);
    }
  });

  // 8. Rewrite inline style="background-image: url(...)"
  $('[style*="url("]').each((_, el) => {
    const styleAttr = $(el).attr('style');
    if (styleAttr) {
      const updatedStyle = styleAttr.replace(/url\(['"]?(.*?)['"]?\)/g, (match, p1) => {
        const res = resolveAssetUrl(p1);
        return res ? `url("${res}")` : match;
      });
      $(el).attr('style', updatedStyle);
    }
  });

  const title = $('title').first().text().trim() || 'Exported Website';

  return {
    cleanedHtml: $.html(),
    $,
    title,
  };
}
