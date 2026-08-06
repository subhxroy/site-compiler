export function cssPropertyToTailwind(prop: string, value: string): string {
  const cleanProp = prop.trim().toLowerCase();
  const cleanVal = value.trim().toLowerCase().replace('!important', '').trim();

  // Color mapping helpers
  if (cleanProp === 'color') {
    if (cleanVal === '#ffffff' || cleanVal === 'white') return 'text-white';
    if (cleanVal === '#000000' || cleanVal === 'black') return 'text-black';
    if (cleanVal === 'transparent') return 'text-transparent';
    return `text-[${cleanVal}]`;
  }

  if (cleanProp === 'background-color') {
    if (cleanVal === '#ffffff' || cleanVal === 'white') return 'bg-white';
    if (cleanVal === '#000000' || cleanVal === 'black') return 'bg-black';
    if (cleanVal === 'transparent') return 'bg-transparent';
    return `bg-[${cleanVal}]`;
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

  if (cleanProp === 'padding') return pxMap[cleanVal] ? `p-${pxMap[cleanVal]}` : `p-[${cleanVal}]`;
  if (cleanProp === 'padding-top') return pxMap[cleanVal] ? `pt-${pxMap[cleanVal]}` : `pt-[${cleanVal}]`;
  if (cleanProp === 'padding-right') return pxMap[cleanVal] ? `pr-${pxMap[cleanVal]}` : `pr-[${cleanVal}]`;
  if (cleanProp === 'padding-bottom') return pxMap[cleanVal] ? `pb-${pxMap[cleanVal]}` : `pb-[${cleanVal}]`;
  if (cleanProp === 'padding-left') return pxMap[cleanVal] ? `pl-${pxMap[cleanVal]}` : `pl-[${cleanVal}]`;

  if (cleanProp === 'margin') return pxMap[cleanVal] ? `m-${pxMap[cleanVal]}` : `m-[${cleanVal}]`;
  if (cleanProp === 'margin-top') return pxMap[cleanVal] ? `mt-${pxMap[cleanVal]}` : `mt-[${cleanVal}]`;
  if (cleanProp === 'margin-right') return pxMap[cleanVal] ? `mr-${pxMap[cleanVal]}` : `mr-[${cleanVal}]`;
  if (cleanProp === 'margin-bottom') return pxMap[cleanVal] ? `mb-${pxMap[cleanVal]}` : `mb-[${cleanVal}]`;
  if (cleanProp === 'margin-left') return pxMap[cleanVal] ? `ml-${pxMap[cleanVal]}` : `ml-[${cleanVal}]`;

  // Font weight
  if (cleanProp === 'font-weight') {
    if (cleanVal === '400' || cleanVal === 'normal') return 'font-normal';
    if (cleanVal === '500') return 'font-medium';
    if (cleanVal === '600') return 'font-semibold';
    if (cleanVal === '700' || cleanVal === 'bold') return 'font-bold';
    return `font-[${cleanVal}]`;
  }

  // Text alignment
  if (cleanProp === 'text-align') {
    if (cleanVal === 'center') return 'text-center';
    if (cleanVal === 'left') return 'text-left';
    if (cleanVal === 'right') return 'text-right';
  }

  // Fallback to arbitrary value syntax for any unmapped CSS declaration
  return `[${cleanProp}:${cleanVal.replace(/\s+/g, '_')}]`;
}

export function convertStyleStringtoTailwind(styleString: string): string {
  if (!styleString) return '';
  const declarations = styleString.split(';').filter((s) => s.trim().length > 0);
  const classes: string[] = [];

  for (const decl of declarations) {
    const [prop, val] = decl.split(':');
    if (prop && val) {
      classes.push(cssPropertyToTailwind(prop, val));
    }
  }

  return classes.join(' ');
}
