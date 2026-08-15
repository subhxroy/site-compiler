import type { CheerioAPI } from 'cheerio';
import type { Element } from 'domhandler';

/**
 * 32-bit FNV-1a non-cryptographic hash for stable, deterministic node IDs.
 */
function fnv1a32(str: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

/**
 * Builds a deterministic structural path for an element from the body.
 */
function getDomPath($: CheerioAPI, el: Element): string {
  const path: string[] = [];
  let current: Element | null = el;

  while (current && current.tagName && current.tagName.toLowerCase() !== 'html') {
    const tag = current.tagName.toLowerCase();
    if (tag === 'body') {
      path.unshift('body');
      break;
    }
    const parent = current.parent as Element | null;
    if (parent && parent.children) {
      const siblings = parent.children.filter(
        (c): c is Element => c.type === 'tag' && (c as Element).tagName.toLowerCase() === tag
      );
      const index = siblings.indexOf(current);
      path.unshift(`${tag}[${index}]`);
    } else {
      path.unshift(tag);
    }
    current = parent;
  }

  return path.join('>');
}

/**
 * Tags editable text and image nodes in a Cheerio DOM with deterministic data-sc-id attributes.
 * Idempotent: running multiple times does not alter existing data-sc-id values.
 */
export function tagEditableNodes($: CheerioAPI): void {
  const textSelectors = 'h1, h2, h3, h4, h5, h6, p, span, a, li, blockquote, button';

  // 1. Tag editable text container nodes with direct non-empty text
  $(textSelectors).each((_, element) => {
    const el = element as Element;
    const $el = $(el);

    // Skip if already tagged
    if ($el.attr('data-sc-id')) return;

    // Skip SiteCompiler injected shims or internal containers
    if ($el.closest('#sitecompiler-critical, [data-sitecompiler-internal], script, style, noscript, head').length > 0) {
      return;
    }

    // Check if element has direct non-empty text content (not purely nested child tags)
    const directTextNodes = $el.contents().filter((__, node) => {
      return node.type === 'text' && (node as unknown as { data: string }).data?.trim().length > 0;
    });

    if (directTextNodes.length > 0) {
      const tag = el.tagName.toLowerCase();
      const domPath = getDomPath($, el);
      const textSample = $el.text().trim().substring(0, 40);
      const hash = fnv1a32(`${tag}|${domPath}|${textSample}`);
      $el.attr('data-sc-id', `sc_${hash}`);
    }
  });

  // 2. Tag image nodes
  $('img').each((_, element) => {
    const el = element as Element;
    const $el = $(el);

    if ($el.attr('data-sc-id')) return;

    if ($el.closest('#sitecompiler-critical, [data-sitecompiler-internal], script, style, noscript, head').length > 0) {
      return;
    }

    const tag = 'img';
    const domPath = getDomPath($, el);
    const srcSample = ($el.attr('src') || '').trim().substring(0, 40);
    const hash = fnv1a32(`${tag}|${domPath}|${srcSample}`);
    $el.attr('data-sc-id', `sc_${hash}`);
  });
}
