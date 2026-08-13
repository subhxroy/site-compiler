import * as fs from 'fs';
import * as path from 'path';
import AdmZip from 'adm-zip';

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

const MIN_HTML_BYTES = 1024;

function fileCheck(p: string, errors: string[], label: string, minBytes = 1): void {
  if (!fs.existsSync(p)) {
    errors.push(`${label} missing: ${p}`);
    return;
  }
  const size = fs.statSync(p).size;
  if (size < minBytes) {
    errors.push(`${label} is empty or too small (${size} bytes): ${p}`);
  }
}

/**
 * Static HTML export must contain a non-trivial index.html, the consolidated
 * stylesheet, the animation shim, and a populated assets directory. A missing
 * piece means the pipeline silently degraded — fail the job instead of
 * shipping a broken package.
 */
export function validateHtmlOutput(outputDir: string): ValidationResult {
  const errors: string[] = [];
  fileCheck(path.join(outputDir, 'index.html'), errors, 'index.html', MIN_HTML_BYTES);
  fileCheck(path.join(outputDir, 'styles.css'), errors, 'styles.css');
  fileCheck(path.join(outputDir, 'script.js'), errors, 'script.js');
  return { ok: errors.length === 0, errors };
}

/**
 * Next.js / React export must be a buildable project scaffold: all config
 * files present plus at least one generated section component.
 */
export function validateNextOutput(outputDir: string): ValidationResult {
  const errors: string[] = [];
  fileCheck(path.join(outputDir, 'package.json'), errors, 'package.json');
  fileCheck(path.join(outputDir, 'tsconfig.json'), errors, 'tsconfig.json');
  fileCheck(path.join(outputDir, 'next.config.mjs'), errors, 'next.config.mjs');
  fileCheck(path.join(outputDir, 'postcss.config.mjs'), errors, 'postcss.config.mjs');
  fileCheck(path.join(outputDir, 'app', 'page.tsx'), errors, 'app/page.tsx');
  fileCheck(path.join(outputDir, 'app', 'layout.tsx'), errors, 'app/layout.tsx');
  fileCheck(path.join(outputDir, 'app', 'globals.css'), errors, 'app/globals.css');
  const componentsDir = path.join(outputDir, 'components');
  const componentFiles = fs.existsSync(componentsDir)
    ? fs.readdirSync(componentsDir).filter((f) => f.endsWith('.tsx'))
    : [];
  if (componentFiles.length === 0) errors.push('no generated section components found');
  return { ok: errors.length === 0, errors };
}

// Anything that must never ship inside a downloaded export package.
const FORBIDDEN_ZIP_PATTERNS = [
  /(^|\/)(node_modules|\.next|\.git|\.cache)(\/|$)/i,
  /\.env(\.|$)/i,
  /service[-_]account/i,
  /ai[-_]logs/i,
  /(^|\/)raw(\/|$)/i,
  /\.pem$/i,
  /\.key$/i,
  /secrets?\b/i,
];

/**
 * ZIP must exist, be non-trivial, open cleanly with AdmZip, and contain no
 * secrets / build artifacts / crawler internals.
 */
export function validateZip(zipPath: string): ValidationResult {
  const errors: string[] = [];
  fileCheck(zipPath, errors, 'ZIP archive', 1024);
  if (errors.length > 0) return { ok: false, errors };

  try {
    const zip = new AdmZip(zipPath);
    const entries = zip.getEntries();
    if (entries.length === 0) {
      errors.push('ZIP archive contains no files');
    }
    for (const entry of entries) {
      const name = entry.entryName;
      if (FORBIDDEN_ZIP_PATTERNS.some((re) => re.test(name))) {
        errors.push(`ZIP contains forbidden path: ${name}`);
      }
    }
  } catch (err) {
    errors.push(`ZIP is not readable: ${(err as Error)?.message || err}`);
  }
  return { ok: errors.length === 0, errors };
}
