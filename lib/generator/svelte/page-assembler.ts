import * as fs from 'fs';
import * as path from 'path';
import { SvelteExportOptions, SvelteExportResult } from './types';
import {
  generateSvelteConfig,
  generateSveltePackageJson,
  generateSvelteViteConfig,
  generateSvelteLayout,
  generateSvelteAppHtml,
} from './templates';
import { transformHtmlToSvelte } from './svelte-builder';

export async function buildSvelteExport(options: SvelteExportOptions): Promise<SvelteExportResult> {
  const { jobId, pages, consolidatedCss } = options;
  const outputDir = options.outputDir || path.resolve(process.cwd(), 'exports', jobId, 'output', 'svelte-export');

  const srcDir = path.join(outputDir, 'src');
  const routesDir = path.join(srcDir, 'routes');
  const libDir = path.join(srcDir, 'lib');
  const staticDir = path.join(outputDir, 'static');

  for (const d of [outputDir, srcDir, routesDir, libDir, staticDir]) {
    fs.mkdirSync(d, { recursive: true });
  }

  // Write base configuration files
  fs.writeFileSync(path.join(outputDir, 'svelte.config.js'), generateSvelteConfig(), 'utf-8');
  fs.writeFileSync(path.join(outputDir, 'vite.config.ts'), generateSvelteViteConfig(), 'utf-8');
  fs.writeFileSync(path.join(outputDir, 'package.json'), generateSveltePackageJson(`sitecompiler-export-${jobId}`), 'utf-8');

  // App template and styles
  fs.writeFileSync(path.join(srcDir, 'app.html'), generateSvelteAppHtml(), 'utf-8');
  const cssContent = consolidatedCss || '/* Compiled Site Styles */\n@tailwind base;\n@tailwind components;\n@tailwind utilities;\n';
  fs.writeFileSync(path.join(srcDir, 'app.css'), cssContent, 'utf-8');
  fs.writeFileSync(path.join(routesDir, '+layout.svelte'), generateSvelteLayout(), 'utf-8');

  // Generate page routes
  let pageCount = 0;
  let entryPath = path.join(routesDir, '+page.svelte');

  for (const p of pages) {
    const rawPathname = p.pathname || '/';
    const svelteContent = transformHtmlToSvelte(p.cleanedHtml || p.html, p.title || 'Page');

    if (rawPathname === '/' || rawPathname === '') {
      fs.writeFileSync(path.join(routesDir, '+page.svelte'), svelteContent, 'utf-8');
    } else {
      const pageSubdir = path.join(routesDir, rawPathname.replace(/^\//, ''));
      fs.mkdirSync(pageSubdir, { recursive: true });
      fs.writeFileSync(path.join(pageSubdir, '+page.svelte'), svelteContent, 'utf-8');
    }
    pageCount++;
  }

  return {
    outputDir,
    pageCount,
    entryPath,
    configPath: path.join(outputDir, 'svelte.config.js'),
    packageJsonPath: path.join(outputDir, 'package.json'),
  };
}
