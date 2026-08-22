import * as fs from 'fs';
import * as path from 'path';
import { AstroExportOptions, AstroExportResult } from './types';
import {
  generateAstroConfig,
  generateAstroPackageJson,
  generateAstroTsConfig,
  generateAstroTailwindConfig,
  generateAstroLayout,
} from './templates';
import { transformHtmlToAstro } from './astro-builder';

export async function buildAstroExport(options: AstroExportOptions): Promise<AstroExportResult> {
  const { jobId, pages, consolidatedCss } = options;
  const outputDir = options.outputDir || path.resolve(process.cwd(), 'exports', jobId, 'output', 'astro-export');

  const srcDir = path.join(outputDir, 'src');
  const layoutsDir = path.join(srcDir, 'layouts');
  const pagesDir = path.join(srcDir, 'pages');
  const stylesDir = path.join(srcDir, 'styles');
  const publicDir = path.join(outputDir, 'public');

  for (const d of [outputDir, srcDir, layoutsDir, pagesDir, stylesDir, publicDir]) {
    fs.mkdirSync(d, { recursive: true });
  }

  // Write base configuration files
  fs.writeFileSync(path.join(outputDir, 'astro.config.mjs'), generateAstroConfig(), 'utf-8');
  fs.writeFileSync(path.join(outputDir, 'package.json'), generateAstroPackageJson(`sitecompiler-export-${jobId}`), 'utf-8');
  fs.writeFileSync(path.join(outputDir, 'tsconfig.json'), generateAstroTsConfig(), 'utf-8');
  fs.writeFileSync(path.join(outputDir, 'tailwind.config.mjs'), generateAstroTailwindConfig(), 'utf-8');

  // Write global styles
  const cssContent = consolidatedCss || '/* Compiled Site Styles */\n@tailwind base;\n@tailwind components;\n@tailwind utilities;\n';
  fs.writeFileSync(path.join(stylesDir, 'global.css'), cssContent, 'utf-8');

  // Write base layout
  fs.writeFileSync(path.join(layoutsDir, 'Layout.astro'), generateAstroLayout(pages[0]?.title || 'Exported Site'), 'utf-8');

  // Generate pages
  let pageCount = 0;
  let entryPath = path.join(pagesDir, 'index.astro');

  for (const p of pages) {
    const rawPathname = p.pathname || '/';
    const normalized = rawPathname === '/' ? 'index' : rawPathname.replace(/^\//, '').replace(/\/$/, '').replace(/\//g, '-');
    const astroContent = transformHtmlToAstro(p.cleanedHtml || p.html, p.title || normalized);
    const targetFile = path.join(pagesDir, `${normalized}.astro`);
    fs.writeFileSync(targetFile, astroContent, 'utf-8');
    pageCount++;
  }

  return {
    outputDir,
    pageCount,
    entryPath,
    configPath: path.join(outputDir, 'astro.config.mjs'),
    packageJsonPath: path.join(outputDir, 'package.json'),
  };
}
