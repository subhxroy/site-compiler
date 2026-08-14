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
export function stripPlatformWatermarksFromDom($: cheerio.CheerioAPI): void {
  // 1. Comprehensive selector list for platform badges, overlays, and ads
  const PLATFORM_WATERMARK_SELECTORS = [
    // Framer badges & watermarks
    '.__framer-badge',
    '[class*="__framer-badge"]',
    '[class*="framer-badge"]',
    '[id*="framer-badge"]',
    '#framer-badge-container',
    '[data-framer-name*="Badge" i]',
    '[data-framer-component-type*="Badge" i]',
    'a[href*="framer.com"]',
    'a[href*="framer.link"]',
    'a[href*="framer.site"]',
    'a[href*="framer.website"]',
    'div[data-framer-generated="true"] a[href*="framer"]',

    // Webflow badges & ads
    '.w-webflow-badge',
    '[class*="webflow-badge"]',
    'a[href*="webflow.com"][target="_blank"]',
    'img[src*="webflow-badge"]',
    '[data-wf-site] + div a[href*="webflow.com"]',
    '[data-wf-badge]',

    // Wix badges & ads
    '.wix-badge',
    '.wixAdWrapper',
    '#WIX_ADS',
    '[id*="WIX_ADS"]',
    '[class*="wix-badge"]',
    'iframe[src*="wix.com"]',
    '#wix-ads-container',
    'div[data-testid="wix-ads-root"]',
    'div[data-testid="wix-ads-container"]',

    // WordPress / Squarespace / Shopify / Carrd / Weebly
    '#wpadminbar',
    '.admin-bar',
    'a[href*="carrd.co"]',
    '#carrd-badge',
    '[class*="carrd-badge"]',
    '#squarespace-badge',
    '[class*="squarespace-badge"]',
    'a[href*="squarespace.com"]',
    'a[href*="wordpress.org"]',
    'p.powered-by-wordpress',
    'a[href*="shopify.com/free-trial"]',
    'a[href*="shopify.com/?ref="]',

    // Tilda, Readymag, Dorik, Typedream, Vev, Site123, Zyro
    '.t-tildalabel',
    '[class*="t-tildalabel"]',
    'a[href*="tilda.cc"]',
    '[class*="readymag-badge"]',
    'a[href*="readymag.com"]',
    '.dorik-badge',
    'a[href*="dorik.com"]',
    '.typedream-badge',
    'a[href*="typedream.com"]',
    '[class*="vev-badge"]',
    'a[href*="vev.design"]',
    '[class*="site123-badge"]',
    'a[href*="site123.com"]',
    '[class*="zyro-badge"]',
    'a[href*="zyro.com"]',
    '[class*="weebly-footer"]',
    'a[href*="weebly.com"]',
    '[class*="strikingly-badge"]',
    'a[href*="strikingly.com"]',
  ].join(', ');

  $(PLATFORM_WATERMARK_SELECTORS).remove();

  // 2. Fixed/absolute floating badges (bottom right corner pills common in Framer & Webflow)
  $('[style*="fixed"], [style*="absolute"]').each((_, el) => {
    const htmlSnippet = ($(el).html() || '').toLowerCase();
    const textSnippet = ($(el).text() || '').trim().toLowerCase();
    const linksToPlatform = /framer\.com|framer\.link|framer\.site|webflow\.com|wix\.com|squarespace\.com|carrd\.co/i.test(htmlSnippet);
    const mentionsWatermark = /(made|built|designed|crafted|powered)\s+(in|with|by|on)\s+(framer|webflow|wix|wordpress|squarespace)/i.test(textSnippet) || /made in framer|built with framer|get started with framer/i.test(textSnippet);

    if (linksToPlatform || mentionsWatermark) {
      $(el).remove();
    }
  });

  // 3. Text, aria-label, title, and link regex matching across leaf & wrapper elements
  const WATERMARK_TEXT_RE = /(made|created|built|designed|crafted|proudly powered|powered|runs on|hosted by)\s+(in|with|by|on)\s+(framer|webflow|wix|wix\.com|wordpress|squarespace|godaddy|weebly|strikingly|carrd|tilda|readymag)\b/i;
  const FRAMER_EXPLICIT_RE = /(made in framer|built with framer|crafted in framer|designed in framer|create a free website|framer\.com|framer\.site)/i;

  const candidates = $('a, p, span, div, footer, small, li, h1, h2, h3, [aria-label], [title]');
  candidates.each((_, el) => {
    const text = ($(el).text() || '').replace(/\s+/g, ' ').trim();
    const ariaLabel = $(el).attr('aria-label') || '';
    const titleAttr = $(el).attr('title') || '';
    const href = $(el).attr('href') || '';
    const combined = `${text} ${ariaLabel} ${titleAttr} ${href}`.toLowerCase();

    if (!combined || combined.length > 250) return;

    const isWatermark =
      WATERMARK_TEXT_RE.test(combined) ||
      FRAMER_EXPLICIT_RE.test(combined) ||
      /framer\.com/i.test(href) ||
      /webflow\.com/i.test(href) ||
      /wix\.com/i.test(href);

    if (isWatermark) {
      const parent = $(el).parent();
      const tag = parent[0]?.tagName?.toLowerCase() || '';
      const isStructural = /^(main|section|article|header|footer|nav|aside|body|html|form|ul|ol|table|tbody|tr|td)$/i.test(tag);
      const isPureWrapper = parent.children().length === 1 && !isStructural;
      // If the parent is an isolated single-child wrapper around this badge, remove the wrapper
      if (parent.length && isPureWrapper && parent.text().trim().length < 80) {
        parent.remove();
      } else {
        $(el).remove();
      }
    }
  });

  // 4. Clean up any empty fixed/absolute container wrappers left over after badge removal
  $('[style*="fixed"], [style*="absolute"]').each((_, el) => {
    if ($(el).text().trim() === '' && $(el).find('img, svg, iframe, canvas').length === 0) {
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

  // 9. Simplify nested <span> wrappers and collapse single-child Framer positioning divs for human-editable code
  simplifyNestedSpansAndWrappers($);

  const title = $('title').first().text().trim() || 'Exported Website';

  return {
    cleanedHtml: $.html(),
    $,
    title,
  };
}

export function simplifyNestedSpansAndWrappers($: cheerio.CheerioAPI): void {
  // 1. Remove Framer search index & redirect metadata tags from head
  $('meta[name*="framer-search-index"], meta[data-redirect-timezone]').remove();

  // 2. Collapse redundant <span><span><span>text</span></span></span> wrappers
  for (let iter = 0; iter < 5; iter++) {
    let unnestedAny = false;
    $('span').each((_, el) => {
      const $el = $(el);
      const children = $el.children();
      if (children.length === 1 && children[0].tagName?.toLowerCase() === 'span') {
        const $child = $(children[0]);
        const parentClass = $el.attr('class') || '';
        const childClass = $child.attr('class') || '';
        if (!parentClass || parentClass.includes('framer-text') || !childClass) {
          $el.replaceWith($child);
          unnestedAny = true;
        }
      }
    });
    if (!unnestedAny) break;
  }

  // 3. Unwrap single-child framer container wrappers (e.g. framer-bcxrl8-container)
  // IMPORTANT: Only unwrap containers with NO style attribute at all.
  // Framer container divs frequently carry visual compositing properties in their
  // inline style (mix-blend-mode, filter, perspective, isolation, overflow, z-index)
  // that produce decorative effects (gradient glows, blend modes on images, etc.).
  // Unwrapping these destroys the visual layer structure. We are conservative here
  // and only collapse truly empty positional containers (no id, no style, 1 child).
  $('div').each((_, el) => {
    const $el = $(el);
    const classAttr = $el.attr('class') || '';
    const idAttr = $el.attr('id') || '';
    const styleAttr = $el.attr('style') || '';
    const children = $el.children();

    // Only unwrap if: matches framer container pattern, has exactly 1 child,
    // no id, and absolutely no style attribute (not even an empty one)
    if (!idAttr && !styleAttr && children.length === 1 && /framer-[a-z0-9]+-container/i.test(classAttr)) {
      $el.replaceWith($(children[0]));
    }
  });
}
