import * as fs from 'fs';
import * as path from 'path';
import AdmZip from 'adm-zip';
import { createJob, getJob, updateJob, cancelExportJob, getJobByIdempotencyKey } from '../lib/jobs/store';
import { validateHtmlOutput, validateNextOutput, validateZip } from '../lib/jobs/validate';
import { createJobZip } from '../lib/zip/build-zip';

export async function runPipelineTests(): Promise<{ name: string; passed: boolean; error?: string }[]> {
  const results: { name: string; passed: boolean; error?: string }[] = [];

  function assert(name: string, condition: boolean, message?: string) {
    if (condition) {
      results.push({ name, passed: true });
    } else {
      results.push({ name, passed: false, error: message || 'Assertion failed' });
    }
  }

  // ── 1. Job Lifecycle & State Transitions ──
  const testJob = createJob('https://testsite.com', 'html');
  assert('Job initially created in pending status', testJob.status === 'pending');
  assert('Job stores URL and format properly', testJob.url === 'https://testsite.com' && testJob.format === 'html');

  updateJob(testJob.id, { status: 'crawling', progressMessage: 'Crawling site...' }, 'Started crawling');
  const crawlingJob = getJob(testJob.id);
  assert('Job transitions to crawling status', crawlingJob?.status === 'crawling');
  assert('Job logs append correctly', crawlingJob?.logs.some(l => l.includes('Started crawling')) === true);

  updateJob(testJob.id, { status: 'completed', progressMessage: 'Export ready' }, 'Compilation finished');
  const completedJob = getJob(testJob.id);
  assert('Job transitions to completed status', completedJob?.status === 'completed');

  // Cancel test
  const cancelTestJob = createJob('https://cancelsite.com', 'react');
  const cancelled = cancelExportJob(cancelTestJob.id);
  assert('cancelExportJob sets job to cancelled', cancelled?.status === 'cancelled');

  // ── 2. Idempotency Store (Active Job Deduplication) ──
  const idemKey = `test-idem-${Date.now()}`;
  const activeJob = createJob('https://active-idem.com', 'html', idemKey);
  const foundJob = getJobByIdempotencyKey(idemKey);
  assert('Idempotency store records and returns active job for valid key', foundJob?.id === activeJob.id);
  assert('Non-existent idempotency key returns undefined', getJobByIdempotencyKey('non-existent-key-1234') === undefined);

  // Disk rehydration test for jobs created before server restart
  const testRehydrateId = `job_${Date.now()}_rehydrate`;
  const rehydrateDir = path.resolve(process.cwd(), 'exports', testRehydrateId);
  fs.mkdirSync(rehydrateDir, { recursive: true });
  fs.writeFileSync(path.join(rehydrateDir, `${testRehydrateId}.zip`), 'dummy-zip-content');
  const diskJob = getJob(testRehydrateId);
  assert('getJob rehydrates existing job from disk when not in memory', diskJob !== undefined && diskJob.id === testRehydrateId);
  try { fs.rmSync(rehydrateDir, { recursive: true, force: true }); } catch {}

  // ── 3. Output Validation: Static HTML ──
  const tempTestDir = path.resolve(process.cwd(), 'exports', `test_pipeline_${Date.now()}`);
  const htmlOutputDir = path.join(tempTestDir, 'output', 'html-export');
  fs.mkdirSync(htmlOutputDir, { recursive: true });

  const sampleHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Test Page</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <header><h1>Test Header</h1></header>
  <main>
    <h2>Test Section</h2>
    <p>${'A'.repeat(1200)}</p>
  </main>
  <script src="script.js"></script>
</body>
</html>`;

  fs.writeFileSync(path.join(htmlOutputDir, 'index.html'), sampleHtml);
  fs.writeFileSync(path.join(htmlOutputDir, 'styles.css'), 'body { font-family: sans-serif; }');
  fs.writeFileSync(path.join(htmlOutputDir, 'script.js'), 'console.log("ready");');

  const htmlVal = validateHtmlOutput(htmlOutputDir);
  assert('HTML output validation passes valid HTML, CSS, and JS', htmlVal.ok === true);

  // ── 4. Output Validation: Next.js Scaffold ──
  const nextOutputDir = path.join(tempTestDir, 'output', 'nextjs-export');
  fs.mkdirSync(path.join(nextOutputDir, 'app'), { recursive: true });
  fs.mkdirSync(path.join(nextOutputDir, 'components'), { recursive: true });

  const sampleLayout = `export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html><body>{children}</body></html>;
}`;
  const samplePage = `export default function Page() { return <h1>Next.js Page</h1>; }`;
  const samplePackageJson = JSON.stringify({
    name: 'exported-nextjs-site',
    version: '0.1.0',
    scripts: { dev: 'next dev', build: 'next build', start: 'next start' },
    dependencies: { next: '^16.0.0', react: '^19.0.0', 'react-dom': '^19.0.0' }
  }, null, 2);

  fs.writeFileSync(path.join(nextOutputDir, 'app', 'layout.tsx'), sampleLayout);
  fs.writeFileSync(path.join(nextOutputDir, 'app', 'page.tsx'), samplePage);
  fs.writeFileSync(path.join(nextOutputDir, 'app', 'globals.css'), '@import "tailwindcss";');
  fs.writeFileSync(path.join(nextOutputDir, 'package.json'), samplePackageJson);
  fs.writeFileSync(path.join(nextOutputDir, 'tsconfig.json'), '{}');
  fs.writeFileSync(path.join(nextOutputDir, 'next.config.mjs'), 'export default {};');
  fs.writeFileSync(path.join(nextOutputDir, 'postcss.config.mjs'), 'export default {};');
  fs.writeFileSync(path.join(nextOutputDir, 'components', 'Hero.tsx'), 'export function Hero() { return <section>Hero</section>; }');

  const nextVal = validateNextOutput(nextOutputDir);
  assert('Next.js output validation passes valid App Router scaffold', nextVal.ok === true);

  // ── 5. ZIP Creation & Archive Validation ──
  const testJobId = path.basename(tempTestDir);
  const zipFilePath = await createJobZip({
    jobId: testJobId,
    format: 'html',
    sourceUrl: 'https://testsite.com',
    title: 'Test Pipeline Site',
    pageCount: 1,
    assetCount: 1,
  });

  assert('createJobZip produces valid zip file on disk', fs.existsSync(zipFilePath) && fs.statSync(zipFilePath).size > 0);

  const zipVal = validateZip(zipFilePath);
  assert('validateZip confirms archive integrity and minimum size', zipVal.ok === true);

  const admZip = new AdmZip(zipFilePath);
  const zipEntries = admZip.getEntries().map(e => e.entryName);
  assert('ZIP contains index.html at root', zipEntries.includes('index.html'));
  assert('ZIP contains styles.css at root', zipEntries.includes('styles.css'));
  assert('ZIP contains generated README.md with deployment guides', zipEntries.includes('README.md'));

  // Clean up temporary test artifacts
  try {
    fs.rmSync(tempTestDir, { recursive: true, force: true });
  } catch {}

  return results;
}
