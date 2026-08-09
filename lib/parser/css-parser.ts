import postcss from 'postcss';
import * as fs from 'fs';
import { ProcessedAssetMap } from './asset-pipeline';

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
      combinedCss += fs.readFileSync(filePath, 'utf-8') + '\n';
    }
  }

  // Parse CSS with PostCSS
  const root = postcss.parse(combinedCss);
  const classMap = new Map<string, string>();
  const rulesMap = new Map<string, string[]>(); // declarationString -> list of selectors sharing exact same CSS

  root.walkRules((rule) => {
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
