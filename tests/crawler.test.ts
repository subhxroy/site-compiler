import { stripPlatformWatermarks } from '../lib/parser/dom-cleaner';
import { sanitizeCssText, parseAndConsolidateCss } from '../lib/parser/css-parser';

export async function runCrawlerTests(): Promise<{ name: string; passed: boolean; error?: string }[]> {
  const results: { name: string; passed: boolean; error?: string }[] = [];

  function assert(name: string, condition: boolean, message?: string) {
    if (condition) {
      results.push({ name, passed: true });
    } else {
      results.push({ name, passed: false, error: message || 'Assertion failed' });
    }
  }

  // ── 1. DOM Cleaner & Watermark Stripping ──
  const htmlWithWatermarks = `
  <html>
    <head><title>Test Page</title></head>
    <body>
      <nav>Navbar Content</nav>
      <main>
        <h1>Welcome</h1>
        <div id="__framer-badge-container">Made in Framer</div>
        <a class="w-webflow-badge" href="https://webflow.com">Made with Webflow</a>
        <div id="wix-badge">Created with Wix</div>
        <div id="wpadminbar">WordPress Admin Bar</div>
      </main>
    </body>
  </html>`;

  const cleanedHtml = stripPlatformWatermarks(htmlWithWatermarks);

  assert('Strips Framer watermark badge', !cleanedHtml.includes('__framer-badge-container') && !cleanedHtml.includes('Made in Framer'));
  assert('Strips Webflow watermark badge', !cleanedHtml.includes('w-webflow-badge') && !cleanedHtml.includes('Made with Webflow'));
  assert('Strips Wix watermark badge', !cleanedHtml.includes('wix-badge') && !cleanedHtml.includes('Created with Wix'));
  assert('Strips WordPress admin bar', !cleanedHtml.includes('wpadminbar'));
  assert('Preserves essential page markup', cleanedHtml.includes('Navbar Content') && cleanedHtml.includes('Welcome'));

  // ── 2. CSS Text Sanitization (NUL bytes & BOMs) ──
  const dirtyCss = '\uFEFF\x00body { color: #fff; }\x00\u0000h1 { font-size: 24px; }\x00';
  const cleanCss = sanitizeCssText(dirtyCss);
  assert('Strips UTF byte order mark (BOM)', !cleanCss.startsWith('\uFEFF'));
  assert('Strips NUL bytes from CSS string', !cleanCss.includes('\x00') && !cleanCss.includes('\u0000'));
  assert('Preserves valid CSS rules during sanitization', cleanCss.includes('body { color: #fff; }') && cleanCss.includes('h1 { font-size: 24px; }'));

  // ── 3. CSS Parsing & Consolidation ──
  const cssResult = parseAndConsolidateCss([], {}, 'https://example.com');
  assert('parseAndConsolidateCss returns consolidatedCss and classMap', typeof cssResult.consolidatedCss === 'string' && cssResult.classMap instanceof Map);

  return results;
}
