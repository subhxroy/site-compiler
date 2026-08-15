import * as cheerio from 'cheerio';

export interface PatchItem {
  nodeId: string;
  content?: string;
  src?: string;
  alt?: string;
}

export interface PatchResult {
  patchedHtml: string;
  warnings: string[];
}

const MAX_PATCH_BATCH_SIZE = 200;
const MAX_CONTENT_LENGTH = 5000;
const MAX_DATA_URI_SIZE = 2 * 1024 * 1024; // 2MB cap for embedded image data URIs

/**
 * Validates whether an image src is safe (relative path or safe image data URI).
 */
function isSafeImageSrc(src: string): boolean {
  const trimmed = src.trim();
  if (!trimmed) return false;

  // Safe relative paths within export assets
  if (trimmed.startsWith('./assets/') || trimmed.startsWith('assets/')) {
    // Prevent directory traversal
    if (trimmed.includes('..') || trimmed.includes('\\')) {
      return false;
    }
    return true;
  }

  // Safe image data URIs
  if (trimmed.startsWith('data:image/')) {
    if (trimmed.length > MAX_DATA_URI_SIZE) {
      return false;
    }
    return /^data:image\/(png|jpeg|jpg|webp|gif|svg\+xml);base64,[A-Za-z0-9+/=]+$/.test(trimmed) ||
           /^data:image\/svg\+xml;utf8,/.test(trimmed);
  }

  return false;
}

/**
 * Applies point patches to a tagged HTML string using Cheerio.
 * Does not alter DOM hierarchy, CSS classes, or sibling structures.
 */
export function applyPatches(rawTaggedHtml: string, patches: PatchItem[]): PatchResult {
  if (!Array.isArray(patches)) {
    throw new Error('Patches must be an array');
  }

  if (patches.length > MAX_PATCH_BATCH_SIZE) {
    throw new Error(`Batch size exceeds maximum limit of ${MAX_PATCH_BATCH_SIZE} patches per save`);
  }

  const warnings: string[] = [];
  const $ = cheerio.load(rawTaggedHtml);

  for (const patch of patches) {
    if (!patch || typeof patch.nodeId !== 'string') {
      warnings.push('Invalid patch item encountered: missing nodeId');
      continue;
    }

    const $el = $(`[data-sc-id="${patch.nodeId}"]`);
    if ($el.length === 0) {
      warnings.push(`Node with data-sc-id="${patch.nodeId}" was not found in document`);
      continue;
    }

    const tagName = ($el.prop('tagName') || '').toLowerCase();

    // 1. Image node patching
    if (tagName === 'img') {
      if (typeof patch.src === 'string') {
        if (isSafeImageSrc(patch.src)) {
          $el.attr('src', patch.src);
        } else {
          warnings.push(`Rejected unsafe or invalid image src for node "${patch.nodeId}": must be a relative path under ./assets/ or a valid data URI`);
        }
      }
      if (typeof patch.alt === 'string') {
        // Basic sanitize alt string (strip control characters)
        const cleanAlt = patch.alt.replace(/[\x00-\x1F\x7F]/g, '');
        $el.attr('alt', cleanAlt);
      }
    } else {
      // 2. Text node patching
      if (typeof patch.content === 'string') {
        if (patch.content.length > MAX_CONTENT_LENGTH) {
          throw new Error(`Content length for node "${patch.nodeId}" exceeds limit of ${MAX_CONTENT_LENGTH} characters`);
        }
        // Cheerio .text() safely updates direct text and escapes special characters
        $el.text(patch.content);
      }
    }
  }

  return {
    patchedHtml: $.html(),
    warnings,
  };
}
