import * as path from 'path';
import * as fs from 'fs';
import { createJob } from '../lib/jobs/store';
import { processExportJob } from '../lib/jobs/process';

async function testNextJsExport() {
  console.log('--- Testing Full Next.js 16 Export & Build ---');
  const targetUrl = 'https://subhxroy.framer.website/';
  const job = createJob(targetUrl, 'nextjs');

  console.log(`Starting job ${job.id} for ${targetUrl}...`);
  await processExportJob(job.id);

  const nextDir = path.resolve(process.cwd(), 'exports', job.id, 'output', 'nextjs-export');
  console.log(`Next.js Export Dir: ${nextDir}`);

  if (!fs.existsSync(path.join(nextDir, 'app', 'page.tsx'))) {
    throw new Error('app/page.tsx does not exist in nextjs export');
  }

  console.log('Next.js export files created successfully.');
  console.log('Verification PASSED.');
}

testNextJsExport().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
