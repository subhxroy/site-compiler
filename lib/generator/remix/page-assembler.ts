import * as fs from 'fs';
import * as path from 'path';
import { RemixExportOptions, RemixExportResult } from './types';
import {
  generateRemixViteConfig,
  generateRemixPackageJson,
  generateRemixRoot,
} from './templates';
import { transformHtmlToRemix } from './remix-builder';

export async function buildRemixExport(options: RemixExportOptions): Promise<RemixExportResult> {
  const { jobId, pages, consolidatedCss } = options;
  const outputDir = options.outputDir || path.resolve(process.cwd(), 'exports', jobId, 'output', 'remix-export');

  const appDir = path.join(outputDir, 'app');
  const routesDir = path.join(appDir, 'routes');
  const publicDir = path.join(outputDir, 'public');

  for (const d of [outputDir, appDir, routesDir, publicDir]) {
    fs.mkdirSync(d, { recursive: true });
  }

  // Write base configuration files
  fs.writeFileSync(path.join(outputDir, 'vite.config.ts'), generateRemixViteConfig(), 'utf-8');
  fs.writeFileSync(path.join(outputDir, 'package.json'), generateRemixPackageJson(`sitecompiler-export-${jobId}`), 'utf-8');
  fs.writeFileSync(path.join(appDir, 'root.tsx'), generateRemixRoot(), 'utf-8');

  // Styles
  const cssContent = consolidatedCss || '/* Compiled Site Styles */\n@tailwind base;\n@tailwind components;\n@tailwind utilities;\n';
  fs.writeFileSync(path.join(appDir, 'tailwind.css'), cssContent, 'utf-8');

  // Routes
  let pageCount = 0;
  let entryPath = path.join(routesDir, '_index.tsx');

  for (const p of pages) {
    const rawPathname = p.pathname || '/';
    const normalized = rawPathname === '/' ? '_index' : rawPathname.replace(/^\//, '').replace(/\/$/, '').replace(/\//g, '.');
    const remixContent = transformHtmlToRemix(p.cleanedHtml || p.html, p.title || normalized);
    const targetFile = path.join(routesDir, `${normalized}.tsx`);
    fs.writeFileSync(targetFile, remixContent, 'utf-8');
    pageCount++;
  }

  return {
    outputDir,
    pageCount,
    entryPath,
    configPath: path.join(outputDir, 'vite.config.ts'),
    packageJsonPath: path.join(outputDir, 'package.json'),
  };
}
