/**
 * Build a safe Tailwind arbitrary value class. Returns null when the value
 * cannot be represented safely (url(), quotes, control chars, semicolons) so
 * the caller can keep the original inline style instead of emitting a broken
 * or silently-mutated class.
 */
function arbitraryValue(cleanProp: string, cleanVal: string): string | null {
  if (/[;{}]/.test(cleanVal) || /url\(/i.test(cleanVal) || /["\n\r]/.test(cleanVal)) {
    return null;
  }
  const safe = cleanVal.replace(/\s+/g, '_');
  if (!safe) return null;
  return `[${cleanProp}:${safe}]`;
}

export function cssPropertyToTailwind(prop: string, value: string): string | null {
  const cleanProp = prop.trim().toLowerCase();
  const cleanVal = value.trim().replace('!important', '').trim().toLowerCase();

  // Complex artistic styling properties MUST be preserved as JSX style objects
  if (
    cleanProp === 'transform' ||
    cleanProp === 'transform-origin' ||
    cleanProp === 'filter' ||
    cleanProp === 'backdrop-filter' ||
    cleanProp === 'perspective' ||
    cleanProp === 'clip-path' ||
    cleanProp === 'mask' ||
    cleanProp === 'mask-image' ||
    cleanProp === 'box-shadow' ||
    cleanProp === 'transition' ||
    cleanProp === 'animation' ||
    cleanProp.startsWith('--')
  ) {
    return null;
  }

  // Color mapping helpers
  if (cleanProp === 'color') {
    if (cleanVal === '#ffffff' || cleanVal === 'white') return 'text-white';
    if (cleanVal === '#000000' || cleanVal === 'black') return 'text-black';
    if (cleanVal === 'transparent') return 'text-transparent';
    return arbitraryValue('text', cleanVal);
  }

  if (cleanProp === 'background-color') {
    if (cleanVal === '#ffffff' || cleanVal === 'white') return 'bg-white';
    if (cleanVal === '#000000' || cleanVal === 'black') return 'bg-black';
    if (cleanVal === 'transparent') return 'bg-transparent';
    return arbitraryValue('bg', cleanVal);
  }

  // Display
  if (cleanProp === 'display') {
    if (cleanVal === 'flex') return 'flex';
    if (cleanVal === 'inline-flex') return 'inline-flex';
    if (cleanVal === 'grid') return 'grid';
    if (cleanVal === 'block') return 'block';
    if (cleanVal === 'inline-block') return 'inline-block';
    if (cleanVal === 'none') return 'hidden';
  }

  // Flexbox & Grid
  if (cleanProp === 'flex-direction') {
    if (cleanVal === 'row') return 'flex-row';
    if (cleanVal === 'column') return 'flex-col';
    if (cleanVal === 'row-reverse') return 'flex-row-reverse';
    if (cleanVal === 'column-reverse') return 'flex-col-reverse';
  }

  if (cleanProp === 'align-items') {
    if (cleanVal === 'center') return 'items-center';
    if (cleanVal === 'flex-start' || cleanVal === 'start') return 'items-start';
    if (cleanVal === 'flex-end' || cleanVal === 'end') return 'items-end';
    if (cleanVal === 'stretch') return 'items-stretch';
  }

  if (cleanProp === 'justify-content') {
    if (cleanVal === 'center') return 'justify-center';
    if (cleanVal === 'flex-start' || cleanVal === 'start') return 'justify-start';
    if (cleanVal === 'flex-end' || cleanVal === 'end') return 'justify-end';
    if (cleanVal === 'space-between') return 'justify-between';
    if (cleanVal === 'space-around') return 'justify-around';
    if (cleanVal === 'space-evenly') return 'justify-evenly';
  }

  // Position
  if (cleanProp === 'position') {
    if (cleanVal === 'relative') return 'relative';
    if (cleanVal === 'absolute') return 'absolute';
    if (cleanVal === 'fixed') return 'fixed';
    if (cleanVal === 'sticky') return 'sticky';
  }

  // Spacing (padding / margin)
  const pxMap: Record<string, string> = {
    '0px': '0', '0': '0',
    '4px': '1', '8px': '2', '12px': '3', '16px': '4',
    '20px': '5', '24px': '6', '32px': '8', '40px': '10', '48px': '12', '64px': '16',
  };

  if (cleanProp === 'padding') return pxMap[cleanVal] ? `p-${pxMap[cleanVal]}` : arbitraryValue('p', cleanVal);
  if (cleanProp === 'padding-top') return pxMap[cleanVal] ? `pt-${pxMap[cleanVal]}` : arbitraryValue('pt', cleanVal);
  if (cleanProp === 'padding-right') return pxMap[cleanVal] ? `pr-${pxMap[cleanVal]}` : arbitraryValue('pr', cleanVal);
  if (cleanProp === 'padding-bottom') return pxMap[cleanVal] ? `pb-${pxMap[cleanVal]}` : arbitraryValue('pb', cleanVal);
  if (cleanProp === 'padding-left') return pxMap[cleanVal] ? `pl-${pxMap[cleanVal]}` : arbitraryValue('pl', cleanVal);

  if (cleanProp === 'margin') return pxMap[cleanVal] ? `m-${pxMap[cleanVal]}` : arbitraryValue('m', cleanVal);
  if (cleanProp === 'margin-top') return pxMap[cleanVal] ? `mt-${pxMap[cleanVal]}` : arbitraryValue('mt', cleanVal);
  if (cleanProp === 'margin-right') return pxMap[cleanVal] ? `mr-${pxMap[cleanVal]}` : arbitraryValue('mr', cleanVal);
  if (cleanProp === 'margin-bottom') return pxMap[cleanVal] ? `mb-${pxMap[cleanVal]}` : arbitraryValue('mb', cleanVal);
  if (cleanProp === 'margin-left') return pxMap[cleanVal] ? `ml-${pxMap[cleanVal]}` : arbitraryValue('ml', cleanVal);

  // Font weight
  if (cleanProp === 'font-weight') {
    if (cleanVal === '400' || cleanVal === 'normal') return 'font-normal';
    if (cleanVal === '500') return 'font-medium';
    if (cleanVal === '600') return 'font-semibold';
    if (cleanVal === '700' || cleanVal === 'bold') return 'font-bold';
    return arbitraryValue('font', cleanVal);
  }

  // Text alignment
  if (cleanProp === 'text-align') {
    if (cleanVal === 'center') return 'text-center';
    if (cleanVal === 'left') return 'text-left';
    if (cleanVal === 'right') return 'text-right';
  }

  // Fallback to arbitrary value syntax — ONLY when the value is safe for
  // Tailwind arbitrary values. Anything with url(), quotes, or control
  // characters must keep the original inline style instead.
  return arbitraryValue(cleanProp, cleanVal);
}

export interface TailwindConversionResult {
  classes: string;        // safely-convertible declarations, as Tailwind utility classes
  remainingStyle: string; // declarations that must stay inline (transform, filter, etc.)
}

export function convertStyleStringtoTailwind(styleString: string): TailwindConversionResult {
  if (!styleString) return { classes: '', remainingStyle: '' };
  const declarations = styleString.split(';').filter((s) => s.trim().length > 0);
  const classes: string[] = [];
  const remaining: string[] = [];

  for (const decl of declarations) {
    // Split on the FIRST colon only — values may themselves contain colons
    // (url(...), gradients, calc(1px : 2px), etc.).
    const colonIdx = decl.indexOf(':');
    if (colonIdx < 0) continue;
    const prop = decl.slice(0, colonIdx).trim();
    const val = decl.slice(colonIdx + 1).trim();
    if (!prop || !val) continue;

    const cls = cssPropertyToTailwind(prop, val);
    if (cls === null) {
      // Unsafe/unmappable — keep ONLY this declaration inline. Previously
      // this bailed the ENTIRE style string, so any element with even one
      // transform/filter/transition lost all of its Tailwind classes and
      // became an unreadable, hard-to-edit inline style blob.
      remaining.push(`${prop}: ${val}`);
    } else {
      classes.push(cls);
    }
  }

  return { classes: classes.join(' '), remainingStyle: remaining.join('; ') };
}
