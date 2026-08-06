import { captureSite } from '../lib/crawler/capture';
import * as fs from 'fs';
import * as path from 'path';

async function runTest() {
  const targetUrl = process.argv[2] || 'https://example.com';
  const jobId = `test_phase1_${Date.now()}`;

  console.log(`=== Testing Phase 1 Crawler on ${targetUrl} ===`);
  const result = await captureSite({
    jobId,
    url: targetUrl,
    debug: false,
    onProgress: (msg) => console.log(`[PROGRESS] ${msg}`),
  });

  console.log('\n=== Phase 1 Results Summary ===');
  console.log(`Job ID: ${result.jobId}`);
  console.log(`Raw Folder: ${result.rawDir}`);
  console.log(`Page HTML size: ${fs.statSync(path.join(result.rawDir, 'page.html')).size} bytes`);
  console.log(`Stylesheets captured: ${result.cssPaths.length}`);
  console.log(`Scripts captured: ${result.scriptPaths.length}`);
  console.log(`Assets downloaded: ${result.assetManifest.length}`);
  console.log(`Desktop Screenshot: ${fs.existsSync(result.screenshotPaths.desktop) ? 'EXISTS' : 'MISSING'}`);
  console.log(`Tablet Screenshot: ${fs.existsSync(result.screenshotPaths.tablet) ? 'EXISTS' : 'MISSING'}`);
  console.log(`Mobile Screenshot: ${fs.existsSync(result.screenshotPaths.mobile) ? 'EXISTS' : 'MISSING'}`);
  console.log(`Meta Title: "${result.meta.title}"`);
  console.log(`Meta tags count: ${result.meta.metaTags.length}`);
  console.log('=== Test Completed Successfully ===');
}

runTest().catch((err) => {
  console.error('Phase 1 test failed:', err);
  process.exit(1);
});
