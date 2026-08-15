import * as fs from 'fs';
import * as path from 'path';
import * as cheerio from 'cheerio';
import prettier from 'prettier';
import { applyPatches, PatchItem } from './apply-patch';
import { extractSiteModel } from './extract-model';
import { getJob, updateJob } from '../jobs/store';
import { validateHtmlOutput, validateZip } from '../jobs/validate';
import { createJobZip } from '../zip/build-zip';

export interface ProcessPatchResult {
  ok: boolean;
  warnings: string[];
  zipReady: boolean;
  error?: string;
  errors?: string[];
}

const CRITICAL_OVERRIDE_CSS = `
<style id="sitecompiler-critical">
  html { scroll-behavior: smooth; }
  html, body { overflow-x: clip !important; }
  [data-framer-appear-id]:not([data-framer-layout-hint-center-x]) {
    opacity: 1 !important;
    visibility: visible !important;
  }
  [data-framer-appear-id][data-framer-layout-hint-center-x] {
    opacity: 1 !important;
    visibility: visible !important;
  }
</style>`;

/**
 * Applies patches to an existing HTML export job, re-validates, and re-zips.
 */
export async function processJobPatches(jobId: string, patches: PatchItem[]): Promise<ProcessPatchResult> {
  const exportsDir = path.resolve(process.cwd(), 'exports', jobId);
  const htmlExportDir = path.join(exportsDir, 'output', 'html-export');
  const scTaggedDir = path.join(htmlExportDir, '.sc-tagged');
  const siteModelPath = path.join(htmlExportDir, 'site-model.json');

  if (!fs.existsSync(htmlExportDir)) {
    return { ok: false, warnings: [], zipReady: false, error: 'Export output directory not found' };
  }

  if (!fs.existsSync(scTaggedDir)) {
    return { ok: false, warnings: [], zipReady: false, error: 'Tagged source markup (.sc-tagged) not found for this export' };
  }

  // Short-circuit on empty patch list
  if (!patches || patches.length === 0) {
    return { ok: true, warnings: [], zipReady: true };
  }

  const allWarnings: string[] = [];
  const stagingDir = path.join(htmlExportDir, '.staging');
  if (fs.existsSync(stagingDir)) {
    fs.rmSync(stagingDir, { recursive: true, force: true });
  }
  fs.mkdirSync(stagingDir, { recursive: true });

  try {
    // 1. Process all tagged HTML pages
    const taggedFiles = fs.readdirSync(scTaggedDir).filter(f => f.endsWith('.html'));
    if (taggedFiles.length === 0) {
      return { ok: false, warnings: [], zipReady: false, error: 'No tagged HTML pages found to patch' };
    }

    for (const file of taggedFiles) {
      const rawTaggedHtml = fs.readFileSync(path.join(scTaggedDir, file), 'utf-8');
      const { patchedHtml, warnings } = applyPatches(rawTaggedHtml, patches);
      allWarnings.push(...warnings);

      // Assemble final production HTML with overrides & scripts
      const $ = cheerio.load(patchedHtml);

      if (!$('#sitecompiler-critical').length) {
        $('head').append(CRITICAL_OVERRIDE_CSS);
      }
      if (!$('link[href*="styles.css"]').length) {
        $('head').append('  <link rel="stylesheet" href="./styles.css">\n');
      }
      if (!$('script[src*="script.js"]').length) {
        $('body').append('  <script src="./script.js"></script>\n');
      }

      let formattedHtml = $.html();
      try {
        formattedHtml = await prettier.format(formattedHtml, { parser: 'html', printWidth: 120 });
      } catch {}

      fs.writeFileSync(path.join(stagingDir, file), formattedHtml, 'utf-8');
    }

    // 2. Copy supporting assets to staging for validation
    const stylesPath = path.join(htmlExportDir, 'styles.css');
    if (fs.existsSync(stylesPath)) {
      fs.copyFileSync(stylesPath, path.join(stagingDir, 'styles.css'));
    }
    const scriptPath = path.join(htmlExportDir, 'script.js');
    if (fs.existsSync(scriptPath)) {
      fs.copyFileSync(scriptPath, path.join(stagingDir, 'script.js'));
    }
    const assetsDir = path.join(htmlExportDir, 'assets');
    if (fs.existsSync(assetsDir)) {
      // Create symlink or shallow copy directory for validator
      fs.cpSync(assetsDir, path.join(stagingDir, 'assets'), { recursive: true });
    }

    // 3. Re-extract updated site-model.json from patched primary page
    const primaryStagedHtml = path.join(stagingDir, 'index.html');
    if (fs.existsSync(primaryStagedHtml)) {
      const $primary = cheerio.load(fs.readFileSync(primaryStagedHtml, 'utf-8'));
      const updatedModel = extractSiteModel($primary);
      fs.writeFileSync(path.join(stagingDir, 'site-model.json'), JSON.stringify(updatedModel, null, 2), 'utf-8');
    }

    // 4. Validate staged output before replacing production files
    const validation = validateHtmlOutput(stagingDir);
    if (!validation.ok) {
      fs.rmSync(stagingDir, { recursive: true, force: true });
      return {
        ok: false,
        warnings: allWarnings,
        zipReady: false,
        error: 'Validation failed on patched HTML output',
        errors: validation.errors,
      };
    }

    // 5. Validation passed: Atomically move patched files into place
    for (const file of taggedFiles) {
      fs.copyFileSync(path.join(stagingDir, file), path.join(htmlExportDir, file));
    }
    const stagedModelPath = path.join(stagingDir, 'site-model.json');
    if (fs.existsSync(stagedModelPath)) {
      fs.copyFileSync(stagedModelPath, siteModelPath);
    }
    fs.rmSync(stagingDir, { recursive: true, force: true });

    // 6. Re-zip updated export package
    const job = getJob(jobId);
    const sourceUrl = job?.url || 'https://exported.site';
    const title = 'Exported Site';
    const pageCount = taggedFiles.length;

    const zipPath = await createJobZip({
      jobId,
      format: 'html',
      sourceUrl,
      title,
      pageCount,
      assetCount: 0,
    });

    const zipCheck = validateZip(zipPath);
    if (!zipCheck.ok) {
      return {
        ok: false,
        warnings: allWarnings,
        zipReady: false,
        error: 'Patched ZIP validation failed',
        errors: zipCheck.errors,
      };
    }

    const stat = fs.statSync(zipPath);
    const zipSizeKb = Math.round(stat.size / 1024);

    updateJob(jobId, {
      hasModel: true,
      zipSizeKb,
      downloadUrl: `/api/job/${jobId}/download`,
    }, `Patched ${patches.length} node(s) and re-generated ${zipSizeKb} KB ZIP.`);

    return {
      ok: true,
      warnings: allWarnings,
      zipReady: true,
    };
  } catch (err: unknown) {
    if (fs.existsSync(stagingDir)) {
      fs.rmSync(stagingDir, { recursive: true, force: true });
    }
    const errorMsg = err instanceof Error ? err.message : 'Unknown error occurred while applying patches';
    return {
      ok: false,
      warnings: allWarnings,
      zipReady: false,
      error: errorMsg,
    };
  }
}
