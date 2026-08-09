import { Project } from 'ts-morph';
import * as cheerio from 'cheerio';
import type { AnyNode } from 'domhandler';
import prettier from 'prettier';
import { convertStyleStringtoTailwind } from './tailwind-mapper';
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

function convertCheerioElementToJsx(
  $: cheerio.CheerioAPI,
  element: AnyNode,
  depth: number = 0
): string {
  if (element.type === 'text') {
    const text = $(element).text().trim();
    if (!text) return '';
    return text.replace(/[{}]/g, (m) => (m === '{' ? '&#123;' : '&#125;'));
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
  };

  const attribSeen = new Set<string>();
  const attributes: string[] = [];
  const rawAttribs = element.attribs || {};

  for (const [key, rawVal] of Object.entries(rawAttribs)) {
    const val = typeof rawVal === 'string' ? rawVal : String(rawVal || '');
    if (key.startsWith('on') && key.length > 2) continue;

    const jsxKey = attribMap[key.toLowerCase()] || (key.includes('-') ? key : key.replace(/[^a-zA-Z0-9_]/g, ''));
    if (!jsxKey) continue;

    if (attribSeen.has(jsxKey)) continue;
    attribSeen.add(jsxKey);

    if (jsxKey === 'style') {
      const twClasses = convertStyleStringtoTailwind(val);
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
    } else if (val === '' || val === undefined) {
      attributes.push(jsxKey);
    } else {
      const safeVal = val.replace(/"/g, '&quot;');
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
  componentNameOverride?: string
): Promise<GeneratedComponent> {
  const componentName = componentNameOverride || sanitizeComponentName(section.name, sectionIndex);
  const project = new Project({ useInMemoryFileSystem: true });

  const fileName = `${componentName}.tsx`;
  const sourceFile = project.createSourceFile(fileName, '', { overwrite: true });

  const $ = cheerio.load(fullHtml);
  let targetEl = $(section.selector).first();

  if (targetEl.length === 0) {
    targetEl = $('body').children().eq(sectionIndex - 1);
  }

  const jsxContent = targetEl.length > 0
    ? convertCheerioElementToJsx($, targetEl[0])
    : `<div>{/* ${section.name} */}</div>`;

  sourceFile.addImportDeclaration({
    moduleSpecifier: 'react',
    defaultImport: 'React',
  });

  const func = sourceFile.addFunction({
    name: componentName,
    isExported: true,
    isDefaultExport: true,
  });

  func.setBodyText(`return (\n${jsxContent}\n);`);

  let code = sourceFile.getFullText();

  try {
    code = await prettier.format(code, { parser: 'typescript', singleQuote: true });
  } catch {
    code = code.replace(/className="(.*?)"/g, (_, cls) => `className="${cls.replace(/"/g, "'")}"`);
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
