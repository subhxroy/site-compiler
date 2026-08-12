import * as fs from 'fs';
import * as path from 'path';

export function setupMockJob(jobId = 'test_phase1_mock') {
  const exportsDir = path.resolve(process.cwd(), 'exports', jobId);
  const rawDir = path.join(exportsDir, 'raw');
  const pagesDir = path.join(rawDir, 'pages');
  const screensDir = path.join(rawDir, 'screenshots');
  const stylesDir = path.join(rawDir, 'styles');
  const assetsDir = path.join(rawDir, 'assets', 'images');

  fs.mkdirSync(pagesDir, { recursive: true });
  fs.mkdirSync(screensDir, { recursive: true });
  fs.mkdirSync(stylesDir, { recursive: true });
  fs.mkdirSync(assetsDir, { recursive: true });

  const mockHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Mock Test Site</title>
  <style>.hero { background-color: #040506; color: #ffffff; padding: 40px; } .hero-title { font-size: 32px; }</style>
</head>
<body>
  <header class="hero">
    <h1 class="hero-title">Welcome to Mock Test Site</h1>
    <p>This is a test page for SiteCompiler pipeline verification.</p>
  </header>
  <main>
    <section class="features">
      <h2>Features</h2>
      <p>Clean export code generation.</p>
    </section>
  </main>
</body>
</html>`;

  fs.writeFileSync(path.join(rawDir, 'page.html'), mockHtml, 'utf-8');
  fs.writeFileSync(path.join(pagesDir, 'index.html'), mockHtml, 'utf-8');
  fs.writeFileSync(path.join(stylesDir, 'style_1.css'), '.hero { background-color: #040506; }', 'utf-8');
  fs.writeFileSync(path.join(rawDir, 'meta.json'), JSON.stringify({ title: 'Mock Test Site', metaTags: [] }), 'utf-8');
  fs.writeFileSync(path.join(rawDir, 'assets_manifest.json'), JSON.stringify([]), 'utf-8');

  // Create empty screenshot 1x1 png file
  const base64Png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  fs.writeFileSync(path.join(screensDir, 'desktop.png'), Buffer.from(base64Png, 'base64'));

  console.log(`Mock job set up at ${exportsDir}`);
}

if (require.main === module) {
  setupMockJob();
}
