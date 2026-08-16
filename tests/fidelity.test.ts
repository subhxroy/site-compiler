import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';
import { cleanDom } from '../lib/parser/dom-cleaner';
import { buildHtmlExport } from '../lib/generator/html/build';
import { createJob } from '../lib/jobs/store';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

export async function runFidelityTests(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  function assert(name: string, condition: boolean, errorDetail?: string) {
    if (condition) {
      results.push({ name, passed: true });
    } else {
      results.push({ name, passed: false, error: errorDetail || 'Assertion failed' });
    }
  }

  // ── 1. Inline Text Whitespace Fidelity ──
  const complexHeadingHtml = `<h1 dir="auto" class="framer-text" style="white-space:pre"><span class="framer-text">U</span><span class="framer-text">I/</span><span class="framer-text">UX</span> Designer.</h1>`;
  const $heading = cheerio.load(complexHeadingHtml);
  const serialized = $heading.html();

  assert('Cheerio serialization preserves exact inline characters without newline injection', !serialized.includes('\n') && serialized.includes('>U</span><span'));

  // ── 2. DOM Cleaner Hierarchy Preservation for React Hydration ──
  const sampleFramerDom = `
    <div id="main">
      <div class="framer-11pbcgx-container">
        <header class="framer-11pbcgx">
          <div class="framer-1k4mzxj">
            <h1 class="framer-text"><span><span>Hero Title</span></span></h1>
          </div>
        </header>
      </div>
      <div class="framer-badge">Made in Framer</div>
    </div>
  `;

  const { cleanedHtml } = cleanDom(sampleFramerDom, {}, 'https://example.com');
  const $clean = cheerio.load(cleanedHtml);

  assert('Strips platform watermark badge', $clean('.framer-badge').length === 0);
  assert('Preserves structural framer container div for React hydration', $clean('.framer-11pbcgx-container').length === 1);
  assert('Preserves header element', $clean('header.framer-11pbcgx').length === 1);
  assert('Preserves nested span hierarchy', $clean('h1 span span').length === 1);

  // ── 3. Script.js Universal Animation Shim Engine Capabilities ──
  const mockJob = createJob('https://example.com', 'html');
  const exportsDir = path.resolve(process.cwd(), 'exports', mockJob.id);
  const rawDir = path.join(exportsDir, 'raw');
  fs.mkdirSync(rawDir, { recursive: true });

  const rawHtml = `<!DOCTYPE html><html><head><title>Test Fidelity</title></head><body>
    <div data-framer-name="Slider">
      <div data-framer-name="Circle">
        <img src="https://example.com/hero.png" />
      </div>
    </div>
  </body></html>`;
  fs.writeFileSync(path.join(rawDir, 'page.html'), rawHtml, 'utf-8');
  fs.writeFileSync(path.join(rawDir, 'assets_manifest.json'), '[]', 'utf-8');

  const buildRes = await buildHtmlExport({
    jobId: mockJob.id,
    baseUrl: 'https://example.com'
  });

  const scriptContent = fs.readFileSync(buildRes.scriptJsPath, 'utf-8');
  assert('script.js contains 3D carousel & slider engine', scriptContent.includes('init3DCarouselAndSlider'));
  assert('script.js contains perspective 3D rotation logic', scriptContent.includes('perspective(1200px) rotateY'));
  assert('script.js contains pointer drag interaction handlers', scriptContent.includes('pointerdown') && scriptContent.includes('pointermove'));
  assert('script.js contains smooth scroll-reveal engine', scriptContent.includes('initScrollReveal'));
  assert('script.js contains responsive breakpoint engine', scriptContent.includes('applyBreakpoints'));

  // ── 4. Exported HTML Formatting Integrity & Visual CMS Generation ──
  const exportedHtml = fs.readFileSync(buildRes.indexHtmlPath, 'utf-8');
  assert('Exported HTML contains critical non-destructive CSS', exportedHtml.includes('id="sitecompiler-critical"'));
  assert('Exported HTML links script.js', exportedHtml.includes('src="./script.js"'));
  assert('Exported HTML links styles.css', exportedHtml.includes('href="./styles.css"'));

  const editorHtmlPath = path.join(buildRes.outputDir, 'editor.html');
  assert('Export output contains standalone editor.html', fs.existsSync(editorHtmlPath));
  if (fs.existsSync(editorHtmlPath)) {
    const editorContent = fs.readFileSync(editorHtmlPath, 'utf-8');
    assert('editor.html contains Visual Content CMS', editorContent.includes('Visual Content CMS'));
    assert('editor.html contains page selection dropdown', editorContent.includes('id="pageSelect"'));
    assert('editor.html contains save & export action', editorContent.includes('Save &amp; Export Page'));
  }

  // Cleanup
  try {
    fs.rmSync(exportsDir, { recursive: true, force: true });
  } catch {}

  return results;
}
