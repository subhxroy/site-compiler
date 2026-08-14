import { Project } from 'ts-morph';
import * as cheerio from 'cheerio';
import type { AnyNode } from 'domhandler';
import prettier from 'prettier';
import { convertStyleStringtoTailwind } from './tailwind-mapper';
import { detectAnimationPatterns, wrapWithFramerMotion } from './animation-builder';
import { DetectedSection } from '../../detector/section-detector';

export interface GeneratedComponent {
  componentName: string;
  filePath: string;
  code: string;
}

export function sanitizeComponentName(name: string, index: number): string {
  let clean = name.replace(/[^a-zA-Z0-9]/g, '');
  if (!clean || !/^[A-Z]/.test(clean)) {
    clean = `Section${index}`;
  }
  return clean;
}

export function convertStyleStringToJsxObject(styleString: string): string {
  if (!styleString) return '{}';
  const declarations = styleString.split(';').filter((s) => s.trim().length > 0);
  const props: string[] = [];

  for (const decl of declarations) {
    const colonIdx = decl.indexOf(':');
    if (colonIdx < 0) continue;
    const rawProp = decl.slice(0, colonIdx).trim();
    const rawVal = decl.slice(colonIdx + 1).trim();
    if (!rawProp || !rawVal) continue;

    const jsProp = rawProp
      .replace(/^-ms-/, 'ms-')
      .replace(/-([a-z])/g, (_, g1) => g1.toUpperCase());
    const safeVal = rawVal.replace(/'/g, "\\'");
    props.push(`${jsProp}: '${safeVal}'`);
  }

  return `{ ${props.join(', ')} }`;
}

function convertCheerioElementToJsx(
  $: cheerio.CheerioAPI,
  element: AnyNode,
  depth: number = 0
): string {
  if (element.type === 'text') {
    const text = $(element).text();
    if (!text) return '';
    // JSX text cannot contain raw `{`/`}` — wrap them in string expressions so
    // they render literally instead of being eaten as a JSX expression. HTML
    // entities are NOT decoded in JSX text, so &#123; would print literally.
    // Single pass with a callback — a second chained replace would re-escape
    // the `}` we just inserted.
    return text.replace(/[{}]/g, (m) => (m === '{' ? "{'{'}" : "{'}'}"));
  }

  if (element.type === 'comment') {
    return '';
  }

  if (element.type !== 'tag') {
    return '';
  }

  const tagName = element.tagName.toLowerCase();

  // HTML to JSX attribute name mapping
  const attribMap: Record<string, string> = {
    class: 'className',
    for: 'htmlFor',
    autocomplete: 'autoComplete',
    autofocus: 'autoFocus',
    colspan: 'colSpan',
    rowspan: 'rowSpan',
    tabindex: 'tabIndex',
    readonly: 'readOnly',
    maxlength: 'maxLength',
    srcset: 'srcSet',
    'fill-rule': 'fillRule',
    'fill-opacity': 'fillOpacity',
    'stroke-width': 'strokeWidth',
    'stroke-linecap': 'strokeLinecap',
    'stroke-linejoin': 'strokeLinejoin',
    'stroke-miterlimit': 'strokeMiterlimit',
    'stroke-dasharray': 'strokeDasharray',
    'stroke-dashoffset': 'strokeDashoffset',
    'stroke-opacity': 'strokeOpacity',
    'clip-rule': 'clipRule',
    'clip-path': 'clipPath',
    viewbox: 'viewBox',
    'xmlns:xlink': 'xmlnsXlink',
    'xlink:href': 'xlinkHref',
  };

  const attribSeen = new Set<string>();
  const attributes: string[] = [];
  const rawAttribs = element.attribs || {};

  for (const [key, rawVal] of Object.entries(rawAttribs)) {
    const val = typeof rawVal === 'string' ? rawVal : String(rawVal || '');
    if (key.startsWith('on') && key.length > 2) continue;

    const lowerKey = key.toLowerCase();
    if (
      lowerKey.startsWith('data-projection-') ||
      lowerKey === 'data-framer-ssr-id' ||
      lowerKey === 'data-framer-page-optimized' ||
      lowerKey === 'data-framer-cursor' ||
      lowerKey === 'data-framer-hydrated' ||
      lowerKey === 'data-framer-portal-id' ||
      lowerKey === 'data-framer-highlight' ||
      lowerKey === 'data-framer-name-for-ssr' ||
      lowerKey === 'data-border' ||
      lowerKey === 'data-wf-element-id' ||
      lowerKey === 'data-wf-id' ||
      lowerKey === 'data-testid'
    ) {
      continue;
    }

    const jsxKey = attribMap[lowerKey] || (key.includes('-') ? key : key.replace(/[^a-zA-Z0-9_]/g, ''));
    if (!jsxKey) continue;

    if (attribSeen.has(jsxKey)) continue;
    attribSeen.add(jsxKey);

    if (jsxKey === 'style') {
      // Convert inline styles to Tailwind utilities property-by-property.
      // Properties that can't be safely represented (transform, filter,
      // box-shadow, transition, animation, url()s, custom props, etc.) stay
      // as a small inline style object instead of forcing the WHOLE element
      // into raw inline styles — this keeps the output actually editable.
      const { classes: twClasses, remainingStyle } = convertStyleStringtoTailwind(val);
      if (twClasses) {
        const safeTw = twClasses.replace(/"/g, "'");
        const existingClassIdx = attributes.findIndex((a) => a.startsWith('className='));
        if (existingClassIdx >= 0) {
          attributes[existingClassIdx] = attributes[existingClassIdx].replace(
            /className="(.*?)"/,
            `className="$1 ${safeTw}"`
          );
        } else {
          attributes.push(`className="${safeTw}"`);
          attribSeen.add('className');
        }
      }
      if (remainingStyle) {
        attributes.push(`style={${convertStyleStringToJsxObject(remainingStyle)}}`);
      }
    } else if (val === '' || val === undefined) {
      attributes.push(jsxKey);
    } else {
      let finalVal = val;
      // In Next.js, static assets in public/ are served at root path /assets/...
      if ((jsxKey === 'src' || jsxKey === 'srcSet' || jsxKey === 'poster' || jsxKey === 'href') && finalVal.startsWith('./assets/')) {
        finalVal = finalVal.replace(/^\.\/assets\//, '/assets/');
      }
      const safeVal = finalVal.replace(/"/g, '\\"');
      attributes.push(`${jsxKey}="${safeVal}"`);
    }
  }

  const attrStr = attributes.length > 0 ? ' ' + attributes.join(' ') : '';

  // Self-closing HTML tags
  const selfClosing = ['img', 'input', 'br', 'hr', 'meta', 'link', 'source', 'embed', 'wbr'];
  if (selfClosing.includes(tagName)) {
    return `<${tagName}${attrStr} />`;
  }

  // Children
  const childrenJsx: string[] = [];
  $(element).contents().each((_, child) => {
    const childCode = convertCheerioElementToJsx($, child, depth + 1);
    if (childCode) {
      childrenJsx.push(childCode);
    }
  });

  const content = childrenJsx.join('\n');
  if (!content.trim()) {
    return `<${tagName}${attrStr}></${tagName}>`;
  }

  return `<${tagName}${attrStr}>\n${content}\n</${tagName}>`;
}

export async function generateComponentFromSection(
  section: DetectedSection,
  sectionIndex: number,
  fullHtml: string,
  componentNameOverride?: string,
  cssContent: string = ''
): Promise<GeneratedComponent> {
  const componentName = componentNameOverride || sanitizeComponentName(section.name, sectionIndex);
  const project = new Project({ useInMemoryFileSystem: true });

  const fileName = `${componentName}.tsx`;
  const sourceFile = project.createSourceFile(fileName, '', { overwrite: true });

  // IMPORTANT: use the section's pre-resolved, verified htmlContent (frozen
  // at detection time against the exact HTML the detector looked at) rather
  // than re-running section.selector against `fullHtml` here. Re-matching a
  // second time against a possibly-different HTML string (post-cleanup,
  // different element ordering, etc.) is what caused sections to silently
  // pick up the WRONG content. If htmlContent is missing, the selector never
  // resolved — surface that clearly instead of guessing positionally.
  let jsxContent: string;
  let usedFallbackPlaceholder = false;

  if (section.htmlContent) {
    const $section = cheerio.load(section.htmlContent);
    const rootNode = $section.root().children().first();
    jsxContent = rootNode.length > 0
      ? convertCheerioElementToJsx($section, rootNode[0])
      : `<div>{/* ${section.name}: resolved but empty */}</div>`;
  } else {
    usedFallbackPlaceholder = true;
    jsxContent = `<div data-sitecompiler-unresolved="${section.name}">{/* Could not reliably locate the "${section.name}" section (selector "${section.selector}" did not match). Copy this section's markup in manually. */}</div>`;
  }

  // Reconstruct viewport/scroll animations that the source site had, instead
  // of shipping a static, motion-less clone.
  let usesFramerMotion = false;
  if (!usedFallbackPlaceholder) {
    const anim = detectAnimationPatterns(cssContent, section.htmlContent || '');
    if (anim.hasViewportScrollTrigger) {
      jsxContent = wrapWithFramerMotion(jsxContent);
      usesFramerMotion = true;
    }
  }

  const rawCode = `import React from 'react';
${usesFramerMotion ? `import { motion } from 'framer-motion';\n` : ''}
export default function ${componentName}() {
  return (
    /* ── ${componentName} Component ── */
    ${jsxContent}
  );
}
`;

  let code = rawCode;

  try {
    code = await prettier.format(rawCode, { parser: 'typescript', singleQuote: true });
  } catch {
    code = rawCode.replace(/className="(.*?)"/g, (_, cls) => `className="${cls.replace(/"/g, "'")}"`);
    try {
      code = await prettier.format(code, { parser: 'typescript', singleQuote: true });
    } catch {}
  }

  return {
    componentName,
    filePath: `components/${fileName}`,
    code,
  };
}
