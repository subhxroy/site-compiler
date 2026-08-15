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

  // ── 4. DOM Script & Modulepreload Rewriting ──
  const { cleanDom } = await import('../lib/parser/dom-cleaner');
  const sampleDomWithScripts = `
  <html>
    <head>
      <script src="https://framerusercontent.com/sites/123/script_main.mjs"></script>
      <link rel="modulepreload" href="https://framerusercontent.com/sites/123/react.mjs" />
    </head>
    <body>
      <div data-framer-name="Avatar - Front"><img src="https://framerusercontent.com/photo.jpg" /></div>
    </body>
  </html>`;
  const assetMap = {
    'https://framerusercontent.com/sites/123/script_main.mjs': './assets/scripts/1_script_main.mjs',
    'https://framerusercontent.com/sites/123/react.mjs': './assets/scripts/2_react.mjs',
    'https://framerusercontent.com/photo.jpg': './assets/images/1_photo.jpg',
  };
  const domCleaned = cleanDom(sampleDomWithScripts, assetMap, 'https://example.framer.website');
  assert('Rewrites script src to local asset path', domCleaned.cleanedHtml.includes('src="./assets/scripts/1_script_main.mjs"'));
  assert('Rewrites modulepreload href to local asset path', domCleaned.cleanedHtml.includes('href="./assets/scripts/2_react.mjs"'));
  assert('Rewrites image src to local asset path', domCleaned.cleanedHtml.includes('src="./assets/images/1_photo.jpg"'));

  return results;
}
