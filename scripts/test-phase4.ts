import { detectSections } from '../lib/detector/section-detector';
import { buildNextJsExport } from '../lib/generator/nextjs/page-assembler';
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
  console.log(`=== Testing Phase 4 React/Next.js Generator on Job: ${latestJobId} ===`);

  const rawHtmlPath = path.join(exportsDir, latestJobId, 'raw', 'page.html');
  const cleanedHtml = fs.readFileSync(rawHtmlPath, 'utf-8');

  // Detect sections
  const detectionResult = await detectSections(latestJobId, cleanedHtml);

  // Build Next.js Export
  const result = await buildNextJsExport({
    jobId: latestJobId,
    baseUrl: 'https://framer.com',
    sections: detectionResult.sections,
  });

  console.log('\n=== Phase 4 Results Summary ===');
  console.log(`Export Folder: ${result.outputDir}`);
  console.log(`Components Generated: ${result.components.length}`);
  result.components.forEach((c) => {
    console.log(`  - ${c.componentName} -> ${c.filePath}`);
  });
  console.log(`app/page.tsx size: ${fs.statSync(result.pagePath).size} bytes`);
  console.log(`app/layout.tsx size: ${fs.statSync(result.layoutPath).size} bytes`);
  console.log(`package.json exists: ${fs.existsSync(path.join(result.outputDir, 'package.json'))}`);
  console.log('=== Test Completed Successfully ===');
}

runTest().catch((err) => {
  console.error('Phase 4 test failed:', err);
  process.exit(1);
});
