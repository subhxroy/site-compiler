import postcss from 'postcss';
import * as fs from 'fs';
import { ProcessedAssetMap } from './asset-pipeline';

/**
 * Strip NUL bytes, BOMs, zero-width padding, `@charset` directives in concatenated CSS,
 * and decode HTML entities (like `&quot;`, `&apos;`, `&#34;`) that crash PostCSS with
 * `CssSyntaxError: Unknown word`.
 */
export function sanitizeCssText(raw: string): string {
  if (!raw) return raw;
  return raw
    .replace(/^\uFEFF/, '')
    .replace(/\u0000/g, '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
    // Remove mid-file @charset declarations which crash PostCSS when combined
    .replace(/@charset\s+["'][^"']+["'];?/gi, '')
    // Decode HTML entities in CSS values / font names
    .replace(/&quot;/gi, '"')
    .replace(/&quot(?![a-zA-Z0-9])/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&apos(?![a-zA-Z0-9])/gi, "'")
    .replace(/&#0*34;/g, '"')
    .replace(/&#0*39;/g, "'")
    .replace(/&#x0*22;/gi, '"')
    .replace(/&#x0*27;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&');
}

export interface CssRuleInfo {
  selector: string;
  declarations: string;
}

export interface ProcessedCssResult {
  consolidatedCss: string;
  classMap: Map<string, string>; // className -> CSS declaration block string
}

export function parseAndConsolidateCss(
  cssFilePaths: string[],
  assetMap: ProcessedAssetMap,
  baseUrl: string
): ProcessedCssResult {
  let combinedCss = '';

  // Read all CSS files
  for (const filePath of cssFilePaths) {
    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        combinedCss += sanitizeCssText(content) + '\n';
      } catch {}
    }
  }

  const classMap = new Map<string, string>();
  const rulesMap = new Map<string, string[]>(); // declarationString -> list of selectors sharing exact same CSS

  let root: postcss.Root;
  const sanitizedCombined = sanitizeCssText(combinedCss);

  try {
    root = postcss.parse(sanitizedCombined);
  } catch (err: unknown) {
    console.warn(`[CSS Parser Warning] Primary PostCSS parse failed: ${(err as Error)?.message || err}. Attempting fault-tolerant recovery...`);

    // Fallback: Parse each file individually, skipping or repairing malformed syntax lines
    root = postcss.root();

    for (const filePath of cssFilePaths) {
      if (!fs.existsSync(filePath)) continue;
      try {
        const rawContent = fs.readFileSync(filePath, 'utf-8');
        const cleanContent = sanitizeCssText(rawContent);
        try {
          const subRoot = postcss.parse(cleanContent);
          root.append(subRoot);
        } catch (subErr) {
          const lines = cleanContent.split('\n');
          const errLine = (subErr as { line?: number })?.line;
          if (errLine && errLine > 0 && errLine <= lines.length) {
            lines.splice(errLine - 1, 1);
          }
          try {
            const recoveredRoot = postcss.parse(lines.join('\n'));
            root.append(recoveredRoot);
          } catch {
            // Skip unparseable CSS file gracefully
          }
        }
      } catch {}
    }
  }

  root.walkRules((rule) => {
    // Strip platform watermark/badge CSS rules
    if (/framer-badge|webflow-badge|wix-badge|wixAdWrapper|wpadminbar/i.test(rule.selector)) {
      rule.remove();
      return;
    }

    // Collect declarations
    const decls: string[] = [];
    rule.walkDecls((decl) => {
      let value = decl.value;
      // Rewrite url(...) references in CSS values
      value = value.replace(/url\(['"]?(.*?)['"]?\)/g, (match, p1) => {
        if (!p1 || p1.startsWith('data:')) return match;
        let absUrl = p1;
        try {
          absUrl = new URL(p1, baseUrl).href;
        } catch {}

        if (assetMap[absUrl]) {
          return `url("${assetMap[absUrl]}")`;
        }
        if (assetMap[p1]) {
          return `url("${assetMap[p1]}")`;
        }
        // Match by filename
        for (const [orig, local] of Object.entries(assetMap)) {
          const base = orig.split('?')[0].split('/').pop();
          if (base && (p1.endsWith(base) || orig.endsWith(p1))) {
            return `url("${local}")`;
          }
        }
        return match;
      });

      decls.push(`${decl.prop}: ${value}${decl.important ? ' !important' : ''};`);
    });

    const declString = decls.sort().join(' ');
    if (declString) {
      if (!rulesMap.has(declString)) {
        rulesMap.set(declString, []);
      }
      rulesMap.get(declString)!.push(rule.selector);
    }

    // Extract class names from selector
    const classMatches = rule.selector.match(/\.([a-zA-Z0-9_-]+)/g);
    if (classMatches) {
      classMatches.forEach((cls) => {
        const className = cls.substring(1);
        classMap.set(className, declString);
      });
    }
  });

  // Re-serialize clean PostCSS tree
  root.walkDecls((decl) => {
    decl.value = decl.value.replace(/url\(['"]?(.*?)['"]?\)/g, (match, p1) => {
      if (!p1 || p1.startsWith('data:')) return match;
      let absUrl = p1;
      try {
        absUrl = new URL(p1, baseUrl).href;
      } catch {}

      if (assetMap[absUrl]) return `url("${assetMap[absUrl]}")`;
      if (assetMap[p1]) return `url("${assetMap[p1]}")`;
      for (const [orig, local] of Object.entries(assetMap)) {
        const base = orig.split('?')[0].split('/').pop();
        if (base && (p1.endsWith(base) || orig.endsWith(p1))) {
          return `url("${local}")`;
        }
      }
      return match;
    });
  });

  const consolidatedCss = root.toString();

  return {
    consolidatedCss,
    classMap,
  };
}
