import * as cheerio from 'cheerio';
import { ProcessedAssetMap } from './asset-pipeline';
import { PageCaptured } from '../crawler/types';

export interface CleanDomResult {
  cleanedHtml: string;
  $: cheerio.CheerioAPI;
  title: string;
}

// ── Source-platform watermark stripping ───────────────────────────────────────
// Exported sites often carry a small "Made in Framer" / "Powered by Webflow" /
// Wix.com badge from the platform template. This pass removes those so the
// exported code doesn't advertise the tool it was exported from.
const WATERMARK_RE =
  /^(made|created|built|designed|crafted|proudly powered|powered|runs on|hosted by)\s+(in|with|by)\s+(framer|webflow|wix|wix\.com|wordpress|squarespace|godaddy|weebly|strikingly|carrd|tilda|readymag)\b.*$/i;
const BARE_POWERED_RE = /^(proudly powered by|powered by)\s+(wordpress|framer|webflow|wix)\b.*$/i;

export function stripPlatformWatermarksFromDom($: cheerio.CheerioAPI): void {
  // Known badge/fixed-watermark selectors
  // `__framer-badge` is Framer's "Made in Framer" pill; `.w-webflow-badge` is
  // Webflow's badge; `.wix-badge` is Wix's free-site badge.
  $('.__framer-badge, [class*="__framer-badge"], .w-webflow-badge, [class*="webflow-badge"], .wix-badge, .wixAdWrapper, #wpadminbar')
    .remove();

  const candidates = $('a, p, span, div, footer, small, li, h1, h2, h3');
  candidates.each((_, el) => {
    const text = ($(el).text() || '').replace(/\s+/g, ' ').trim();
    if (!text || text.length > 80) return;

    const isWatermark =
      WATERMARK_RE.test(text) ||
      BARE_POWERED_RE.test(text) ||
      /^wix\.com\s*$/i.test(text) ||
      (text.length < 40 && /wix\.com/i.test(text) && /(powered|built|created|made)/i.test(text));

    if (!isWatermark) return;

    // Only remove leaf-ish elements / links / footers — never big containers
    const childCount = $(el).children().length;
    const isLink = el.tagName === 'a';
    const isFooter = el.tagName === 'footer';
    if (isLink || isFooter || childCount === 0 || text.length < 50) {
      $(el).remove();
    }
  });

  // aria-label / title based watermarks (e.g. Framer "Made in Framer" links)
  $('[aria-label], [title]').each((_, el) => {
    const combined = `${$(el).attr('aria-label') || ''} ${$(el).attr('title') || ''}`.replace(/\s+/g, ' ').trim();
    if (!combined || combined.length > 140) return;
    if (WATERMARK_RE.test(combined) || BARE_POWERED_RE.test(combined) || /^create a free website with framer/i.test(combined)) {
      $(el).remove();
    }
  });
}

export function stripPlatformWatermarks(html: string): string {
  const $ = cheerio.load(html, { xml: false });
  stripPlatformWatermarksFromDom($);
  return $.html();
}

export function cleanDom(
  rawHtml: string,
  assetMap: ProcessedAssetMap,
  baseUrl: string,
  pages: PageCaptured[] = []
): CleanDomResult {
  const $ = cheerio.load(rawHtml, {
    xml: false,
  });

  const baseHost = new URL(baseUrl).hostname;

  // 1. Remove ONLY analytics, tracking, & editor overlays
  const trackingKeywords = [
    'google-analytics', 'googletagmanager', 'gtag', 'ga.js', 'analytics.js',
    'facebook.net', 'fbevents', 'mixpanel', 'hotjar', 'segment.com', 'intercom',
    'clarity.ms', 'doubleclick', 'drift', 'hubspot',
    'events.framer.com', 'framer.com/edit'
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

  // Remove editor overlay iframes (Framer editor bar, etc.) & editor module preloads
  $('iframe').each((_, el) => {
    const src = $(el).attr('src') || '';
    const id = $(el).attr('id') || '';
    if (/framer\.com\/edit|__framer-editorbar|editorbar/i.test(src) || /editorbar/i.test(id)) {
      $(el).remove();
    }
  });
  $('link[rel="modulepreload"]').each((_, el) => {
    const href = $(el).attr('href') || '';
    if (/framer\.com\/edit/.test(href)) $(el).remove();
  });

  // Remove comment nodes
  $('*').contents().filter((_, node) => node.type === 'comment').remove();

  // Remove source-platform watermarks (Made in Framer / Powered by Webflow / Wix badge)
  stripPlatformWatermarksFromDom($);

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
