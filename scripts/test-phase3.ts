import { detectSections } from '../lib/detector/section-detector';
import * as fs from 'fs';
import * as path from 'path';

async function runTest() {
  const exportsDir = path.resolve(process.cwd(), 'exports');
  const jobs = fs.readdirSync(exportsDir).filter((d) => d.startsWith('test_phase1_'));
  if (jobs.length === 0) {
    console.error('No test jobs found.');
    process.exit(1);
  }

  const latestJobId = jobs.sort().pop()!;
  console.log(`=== Testing Phase 3 Section Detector on Job: ${latestJobId} ===`);

  const rawHtmlPath = path.join(exportsDir, latestJobId, 'raw', 'page.html');
  const screenshotPath = path.join(exportsDir, latestJobId, 'raw', 'screenshots', 'desktop.png');
  const cleanedHtml = fs.readFileSync(rawHtmlPath, 'utf-8');

  const result = await detectSections(latestJobId, cleanedHtml, screenshotPath);

  console.log('\n=== Phase 3 Results Summary ===');
  console.log(`Detected Sections Count: ${result.sections.length}`);
  result.sections.forEach((sec, idx) => {
    console.log(`  [${idx + 1}] Name: ${sec.name} | Selector: ${sec.selector} | Desc: ${sec.description}`);
  });
  console.log(`Renamed Hashed Classes: ${Object.keys(result.globalClassRenameMap).length}`);
  console.log(`AI Logs stored in: ${result.aiLogsDir}`);
  console.log('=== Test Completed Successfully ===');
}

runTest().catch((err) => {
  console.error('Phase 3 test failed:', err);
  process.exit(1);
});
