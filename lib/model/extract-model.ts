import type { CheerioAPI } from 'cheerio';
import type { Element } from 'domhandler';

export interface SiteModelNode {
  type: 'text' | 'image';
  tag: string;
  content?: string; // for text nodes
  src?: string; // for image nodes, relative asset path or data URI
  alt?: string;
}

export interface SiteModel {
  version: 1;
  nodes: Record<string, SiteModelNode>;
}

/**
 * Extracts a structured SiteModel JSON from all [data-sc-id] tagged elements in a Cheerio document.
 */
export function extractSiteModel($: CheerioAPI): SiteModel {
  const nodes: Record<string, SiteModelNode> = {};

  $('[data-sc-id]').each((_, element) => {
    const el = element as Element;
    const $el = $(el);
    const id = $el.attr('data-sc-id');
    if (!id) return;

    const tag = el.tagName.toLowerCase();

    if (tag === 'img') {
      nodes[id] = {
        type: 'image',
        tag: 'img',
        src: $el.attr('src') || '',
        alt: $el.attr('alt') || '',
      };
    } else {
      nodes[id] = {
        type: 'text',
        tag,
        content: $el.text(),
      };
    }
  });

  return {
    version: 1,
    nodes,
  };
}
