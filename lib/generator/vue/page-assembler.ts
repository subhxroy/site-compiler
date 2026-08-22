import * as fs from 'fs';
import * as path from 'path';
import { VueExportOptions, VueExportResult } from './types';
import {
  generateNuxtConfig,
  generateNuxtPackageJson,
  generateNuxtAppVue,
} from './templates';
import { transformHtmlToVue } from './vue-builder';

export async function buildVueExport(options: VueExportOptions): Promise<VueExportResult> {
  const { jobId, pages, consolidatedCss } = options;
  const outputDir = options.outputDir || path.resolve(process.cwd(), 'exports', jobId, 'output', 'vue-export');

  const pagesDir = path.join(outputDir, 'pages');
  const assetsDir = path.join(outputDir, 'assets', 'css');
  const publicDir = path.join(outputDir, 'public');

  for (const d of [outputDir, pagesDir, assetsDir, publicDir]) {
    fs.mkdirSync(d, { recursive: true });
  }

  // Write base configuration files
  fs.writeFileSync(path.join(outputDir, 'nuxt.config.ts'), generateNuxtConfig(), 'utf-8');
  fs.writeFileSync(path.join(outputDir, 'package.json'), generateNuxtPackageJson(`sitecompiler-export-${jobId}`), 'utf-8');
  fs.writeFileSync(path.join(outputDir, 'app.vue'), generateNuxtAppVue(), 'utf-8');

  // Styles
  const cssContent = consolidatedCss || '/* Compiled Site Styles */\n@tailwind base;\n@tailwind components;\n@tailwind utilities;\n';
  fs.writeFileSync(path.join(assetsDir, 'main.css'), cssContent, 'utf-8');

  // Pages
  let pageCount = 0;
  let entryPath = path.join(pagesDir, 'index.vue');

  for (const p of pages) {
    const rawPathname = p.pathname || '/';
    const normalized = rawPathname === '/' ? 'index' : rawPathname.replace(/^\//, '').replace(/\/$/, '').replace(/\//g, '-');
    const vueContent = transformHtmlToVue(p.cleanedHtml || p.html, p.title || normalized);
    const targetFile = path.join(pagesDir, `${normalized}.vue`);
    fs.writeFileSync(targetFile, vueContent, 'utf-8');
    pageCount++;
  }

  return {
    outputDir,
    pageCount,
    entryPath,
    configPath: path.join(outputDir, 'nuxt.config.ts'),
    packageJsonPath: path.join(outputDir, 'package.json'),
  };
}
