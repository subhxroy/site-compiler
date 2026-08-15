import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';
import { tagEditableNodes } from '../lib/model/node-tagger';
import { extractSiteModel } from '../lib/model/extract-model';
import { applyPatches } from '../lib/model/apply-patch';
import { processJobPatches } from '../lib/model/patch-job';
import { createJob, updateJob } from '../lib/jobs/store';
import { validateHtmlOutput, validateZip } from '../lib/jobs/validate';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

export async function runModelPatchTests(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  function assert(name: string, condition: boolean, errorDetail?: string) {
    if (condition) {
      results.push({ name, passed: true });
    } else {
      results.push({ name, passed: false, error: errorDetail || 'Assertion failed' });
    }
  }

  // ── 1. Node Tagger: Deterministic ID Generation ──
  const sampleHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Sample Exported Site Title</title>
  <meta name="description" content="A realistic sample site for testing model extraction and point patching in SiteCompiler." />
  <style id="sitecompiler-critical">body { color: red; }</style>
  <style>
    /* Framework base styles simulation */
    .framer-container { max-width: 1200px; margin: 0 auto; padding: 40px 20px; display: flex; flex-direction: column; gap: 24px; }
    .framer-title { font-size: 48px; font-weight: 700; line-height: 1.1; color: #ffffff; }
    .framer-desc { font-size: 18px; line-height: 1.6; color: #a1a1aa; max-width: 600px; }
    .framer-nested { display: flex; align-items: center; gap: 16px; margin-top: 16px; }
    .framer-link { display: inline-flex; padding: 12px 24px; background: #ff6363; color: #000000; border-radius: 8px; font-weight: 600; text-decoration: none; }
    .framer-img { width: 100%; max-width: 800px; border-radius: 12px; object-fit: cover; }
  </style>
</head>
<body>
  <div class="framer-container">
    <h1 class="framer-title">Welcome to SiteCompiler</h1>
    <p class="framer-desc">Compile any website to clean code with zero structural drift.</p>
    <div class="framer-nested">
      <a href="/about" class="framer-link"><span>Learn More</span></a>
      <img src="./assets/images/hero.png" alt="Hero Image" class="framer-img" />
    </div>
  </div>
</body>
</html>`;

  const $1 = cheerio.load(sampleHtml);
  tagEditableNodes($1);

  const h1Id = $1('h1').attr('data-sc-id');
  const pId = $1('p').attr('data-sc-id');
  const aId = $1('a span').attr('data-sc-id') || $1('a').attr('data-sc-id');
  const imgId = $1('img').attr('data-sc-id');

  assert('H1 element receives data-sc-id', typeof h1Id === 'string' && h1Id.startsWith('sc_'));
  assert('P element receives data-sc-id', typeof pId === 'string' && pId.startsWith('sc_'));
  assert('Link text element receives data-sc-id', typeof aId === 'string' && aId.startsWith('sc_'));
  assert('Image element receives data-sc-id', typeof imgId === 'string' && imgId.startsWith('sc_'));

  // Idempotency check: running second time must not alter IDs
  const $2 = cheerio.load($1.html());
  tagEditableNodes($2);
  assert('Tagger is idempotent: H1 retains exact same ID on re-tagging', $2('h1').attr('data-sc-id') === h1Id);
  assert('Tagger is idempotent: Image retains exact same ID on re-tagging', $2('img').attr('data-sc-id') === imgId);

  // Critical CSS elements are untouched
  assert('Critical override styles are not tagged', $1('#sitecompiler-critical').attr('data-sc-id') === undefined);

  // ── 2. Site Model Extraction ──
  const model = extractSiteModel($1);
  assert('Site model has version 1', model.version === 1);
  assert('Site model extracts H1 text node', model.nodes[h1Id!]?.content === 'Welcome to SiteCompiler');
  assert('Site model extracts Image node src and alt', model.nodes[imgId!]?.src === './assets/images/hero.png' && model.nodes[imgId!]?.alt === 'Hero Image');

  // ── 3. Point Patching (applyPatches) ──
  const taggedHtml = $1.html();
  const patchResult = applyPatches(taggedHtml, [
    { nodeId: h1Id!, content: 'Updated Headline By User' },
    { nodeId: imgId!, src: './assets/images/new-hero.png', alt: 'New Hero Alt' },
  ]);

  const $patched = cheerio.load(patchResult.patchedHtml);
  assert('Patch successfully updates H1 text without structural drift', $patched(`[data-sc-id="${h1Id}"]`).text() === 'Updated Headline By User');
  assert('Patch successfully updates image src', $patched(`[data-sc-id="${imgId}"]`).attr('src') === './assets/images/new-hero.png');
  assert('Patch successfully updates image alt', $patched(`[data-sc-id="${imgId}"]`).attr('alt') === 'New Hero Alt');
  assert('Patch preserves surrounding container classes', $patched('.framer-container').length === 1 && $patched('.framer-nested').length === 1);

  // ── 3b. Deep Structural Diff Isolation Verification ──
  // Strip the 2 target nodes from both $orig and $patched, and assert 100% exact equality
  const $diffOrig = cheerio.load(taggedHtml);
  const $diffPatched = cheerio.load(patchResult.patchedHtml);
  $diffOrig(`[data-sc-id="${h1Id}"]`).remove();
  $diffOrig(`[data-sc-id="${imgId}"]`).remove();
  $diffPatched(`[data-sc-id="${h1Id}"]`).remove();
  $diffPatched(`[data-sc-id="${imgId}"]`).remove();
  assert('Deep structural diff: 100% of all untouched DOM nodes, attributes, and classes are identical', $diffOrig.html() === $diffPatched.html());

  // ── 4. Patch Security Validations ──
  // Remote/malicious URL rejection
  const badSrcResult = applyPatches(taggedHtml, [
    { nodeId: imgId!, src: 'http://malicious-site.com/exploit.jpg' },
  ]);
  assert('Rejects remote image URL patch with warning', badSrcResult.warnings.length > 0);
  const $bad = cheerio.load(badSrcResult.patchedHtml);
  assert('Image src remains untouched on rejected remote URL', $bad(`[data-sc-id="${imgId}"]`).attr('src') === './assets/images/hero.png');

  // Safe data URI acceptance
  const validDataUri = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const dataUriResult = applyPatches(taggedHtml, [
    { nodeId: imgId!, src: validDataUri },
  ]);
  const $dataUri = cheerio.load(dataUriResult.patchedHtml);
  assert('Accepts safe base64 image data URI', $dataUri(`[data-sc-id="${imgId}"]`).attr('src') === validDataUri);

  // ── 5. End-to-End Mock Job Patching & Re-zipping ──
  const mockJob = createJob('https://example.com', 'html');
  const mockJobId = mockJob.id;

  const exportsDir = path.resolve(process.cwd(), 'exports', mockJobId);
  const htmlExportDir = path.join(exportsDir, 'output', 'html-export');
  const scTaggedDir = path.join(htmlExportDir, '.sc-tagged');
  const assetsDir = path.join(htmlExportDir, 'assets', 'images');

  fs.mkdirSync(assetsDir, { recursive: true });
  fs.mkdirSync(scTaggedDir, { recursive: true });

  fs.writeFileSync(path.join(assetsDir, 'hero.png'), 'fake-image-bytes');
  fs.writeFileSync(path.join(htmlExportDir, 'styles.css'), 'body { background: #000; }');
  fs.writeFileSync(path.join(htmlExportDir, 'script.js'), 'console.log("shim");');
  fs.writeFileSync(path.join(htmlExportDir, 'index.html'), taggedHtml);
  fs.writeFileSync(path.join(scTaggedDir, 'index.html'), taggedHtml);
  fs.writeFileSync(path.join(htmlExportDir, 'site-model.json'), JSON.stringify(model, null, 2));

  updateJob(mockJobId, { status: 'completed', pageCount: 1 });

  // Test empty patch short-circuit
  const emptyPatchResult = await processJobPatches(mockJobId, []);
  assert('Empty patches list short-circuits with ok=true without rewriting', emptyPatchResult.ok === true && emptyPatchResult.zipReady === true);

  const jobPatchResult = await processJobPatches(mockJobId, [
    { nodeId: h1Id!, content: 'Live Edited Headline' },
  ]);

  assert('processJobPatches succeeds on valid mock job', jobPatchResult.ok === true);
  assert('processJobPatches reports zipReady', jobPatchResult.zipReady === true);

  // Verify updated HTML on disk
  const onDiskHtml = fs.readFileSync(path.join(htmlExportDir, 'index.html'), 'utf-8');
  assert('Disk index.html contains updated text', onDiskHtml.includes('Live Edited Headline'));

  // Verify updated site-model.json on disk
  const onDiskModelRaw = fs.readFileSync(path.join(htmlExportDir, 'site-model.json'), 'utf-8');
  const onDiskModel = JSON.parse(onDiskModelRaw);
  assert('Disk site-model.json contains updated node content', onDiskModel.nodes[h1Id!]?.content === 'Live Edited Headline');

  // Verify validation passes on patched output
  const htmlCheck = validateHtmlOutput(htmlExportDir);
  assert('validateHtmlOutput passes on patched export directory', htmlCheck.ok === true);

  const zipPath = path.join(exportsDir, `${mockJobId}.zip`);
  const zipCheck = validateZip(zipPath);
  assert('validateZip passes on re-generated ZIP', zipCheck.ok === true);

  // Verify ZIP contents and .sc-tagged exclusion
  const AdmZip = (await import('adm-zip')).default;
  const zip = new AdmZip(zipPath);
  const zipEntries = zip.getEntries().map((e) => e.entryName);
  const hasTaggedDir = zipEntries.some((name) => name.includes('.sc-tagged'));
  assert('ZIP package explicitly excludes internal .sc-tagged directory', hasTaggedDir === false);
  assert('ZIP contains root index.html', zipEntries.includes('index.html'));
  assert('ZIP contains root styles.css', zipEntries.includes('styles.css'));

  // Cleanup test mock dir
  try {
    fs.rmSync(exportsDir, { recursive: true, force: true });
  } catch {}

  return results;
}
