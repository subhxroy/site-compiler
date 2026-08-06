import { buildHtmlExport } from '../lib/generator/html/build';
import * as fs from 'fs';
import * as path from 'path';

async function runTest() {
  // Find latest test_phase1 job directory in exports
  const exportsDir = path.resolve(process.cwd(), 'exports');
  if (!fs.existsSync(exportsDir)) {
    console.error('No exports directory found.');
    process.exit(1);
  }

  const jobs = fs.readdirSync(exportsDir).filter((d) => d.startsWith('test_phase1_'));
  if (jobs.length === 0) {
    console.error('No test_phase1 jobs found. Run Phase 1 test first.');
    process.exit(1);
  }

  const latestJobId = jobs.sort().pop()!;
  console.log(`=== Testing Phase 2 Static HTML Export on Job: ${latestJobId} ===`);

  const result = await buildHtmlExport({
    jobId: latestJobId,
    baseUrl: 'https://framer.com',
  });

  console.log('\n=== Phase 2 Results Summary ===');
  console.log(`Output Directory: ${result.outputDir}`);
  console.log(`index.html size: ${fs.statSync(result.indexHtmlPath).size} bytes`);
  console.log(`styles.css size: ${fs.statSync(result.stylesCssPath).size} bytes`);
  console.log(`script.js size: ${fs.statSync(result.scriptJsPath).size} bytes`);
  console.log(`Assets processed: ${result.assetCount}`);
  console.log('=== Test Completed Successfully ===');
}

runTest().catch((err) => {
  console.error('Phase 2 test failed:', err);
  process.exit(1);
});
