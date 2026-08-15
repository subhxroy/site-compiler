import { captureSite } from '../crawler/capture';
import { buildHtmlExport } from '../generator/html/build';
import { detectSections } from '../detector/section-detector';
import { buildNextJsExport } from '../generator/nextjs/page-assembler';
import { createJobZip } from '../zip/build-zip';
import { getJob, isJobActive, updateJob, stripAnsi } from './store';
import { validateHtmlOutput, validateNextOutput, validateZip } from './validate';
import * as path from 'path';

function throwIfCancelled(jobId: string): void {
  if (!isJobActive(jobId)) {
    throw new Error('Export was cancelled.');
  }
}

export async function processExportJob(jobId: string): Promise<void> {
  const job = getJob(jobId);
  if (!job) return;

  let currentPhase = 'crawling';
  console.log(`[job:${jobId}] CREATED`);

  try {
    // ── Phase 1: Crawl ──────────────────────────────────────────────────────
    currentPhase = 'crawling';
    console.log(`[job:${jobId}] CRAWL_START`);
    updateJob(
      jobId,
      { status: 'crawling', progressMessage: 'Launching browser and crawling site...' },
      'Phase 1: Starting Playwright crawl'
    );

    const crawlResult = await captureSite({
      jobId,
      url: job.url,
      onProgress: (msg) => updateJob(jobId, { progressMessage: msg }, msg),
    });

    throwIfCancelled(jobId);
    console.log(`[job:${jobId}] CRAWL_END`);

    updateJob(jobId, {
      screenshots: {
        desktop: `/api/job/${jobId}/screenshot?type=desktop`,
        tablet:  `/api/job/${jobId}/screenshot?type=tablet`,
        mobile:  `/api/job/${jobId}/screenshot?type=mobile`,
      },
    });

    // ── Phase 2: Parse HTML + CSS ───────────────────────────────────────────
    currentPhase = 'parsing';
    console.log(`[job:${jobId}] PARSE_START`);
    updateJob(
      jobId,
      { status: 'parsing', progressMessage: 'Processing DOM and consolidating styles...' },
      'Phase 2: Cleaning DOM and parsing CSS'
    );

    const htmlResult = await buildHtmlExport({
      jobId,
      baseUrl: job.url,
      pages: crawlResult.pages,
    });

    throwIfCancelled(jobId);
    console.log(`[job:${jobId}] PARSE_END`);

    // ── Phase 2b: Validate HTML output ──────────────────────────────────────
    currentPhase = 'validating';
    console.log(`[job:${jobId}] VALIDATE_START`);
    updateJob(
      jobId,
      { status: 'validating', progressMessage: 'Validating HTML output...' },
      'Phase 2b: Validating HTML output'
    );

    const htmlCheck = validateHtmlOutput(htmlResult.outputDir);
    if (!htmlCheck.ok) {
      throw new Error(`HTML output validation failed: ${htmlCheck.errors.join('; ')}`);
    }
    console.log(`[job:${jobId}] VALIDATE_END`);

    // ── Phase 3: Section Detection ──────────────────────────────────────────
    currentPhase = 'detecting';
    console.log(`[job:${jobId}] DETECT_START`);
    updateJob(
      jobId,
      { status: 'detecting', progressMessage: 'Analysing layout sections and components...' },
      'Phase 3: Detecting sections'
    );

    const detectionResult = await detectSections(
      jobId,
      htmlResult.cleanedHtml || '',
      crawlResult.screenshotPaths.desktop
    );

    throwIfCancelled(jobId);
    console.log(`[job:${jobId}] DETECT_END`);

    // ── Phase 4: Code Generation (Next.js / React only) ────────────────────
    currentPhase = 'generating';
    console.log(`[job:${jobId}] GENERATE_START`);
    updateJob(
      jobId,
      { status: 'generating', progressMessage: 'Generating code output...' },
      `Phase 4: Code generation for format: ${job.format}`
    );

    if (job.format === 'nextjs' || job.format === 'react') {
      await buildNextJsExport({
        jobId,
        baseUrl: job.url,
        sections: detectionResult.sections,
      });
    }

    throwIfCancelled(jobId);
    console.log(`[job:${jobId}] GENERATE_END`);

    // ── Phase 4b: Validate generated output (Next.js / React only) ─────────
    if (job.format === 'nextjs' || job.format === 'react') {
      currentPhase = 'output-validation';
      console.log(`[job:${jobId}] OUTPUT_VALIDATE_START`);
      updateJob(
        jobId,
        { status: 'validating-output', progressMessage: 'Validating generated project...' },
        'Phase 4b: Validating generated project scaffold'
      );

      const nextDir = path.resolve(process.cwd(), 'exports', jobId, 'output', 'nextjs-export');
      const genCheck = validateNextOutput(nextDir);
      if (!genCheck.ok) {
        throw new Error(`Generated project validation failed: ${genCheck.errors.join('; ')}`);
      }
      console.log(`[job:${jobId}] OUTPUT_VALIDATE_END`);
    }

    // ── Phase 5: ZIP with README ────────────────────────────────────────────
    currentPhase = 'zipping';
    console.log(`[job:${jobId}] ZIP_START`);
    updateJob(
      jobId,
      { status: 'zipping', progressMessage: 'Packaging files and writing README...' },
      'Phase 5: Creating ZIP with README'
    );

    const title = crawlResult.meta?.title || new URL(job.url).hostname;

    const zipPath = await createJobZip({
      jobId,
      format: job.format,
      sourceUrl: job.url,
      title,
      pageCount: htmlResult.pageCount || (crawlResult.pages && crawlResult.pages.length) || 1,
      assetCount: htmlResult.assetCount || 0,
    });

    // ── Phase 5b: Validate the ZIP before claiming success ──────────────────
    const zipCheck = validateZip(zipPath);
    if (!zipCheck.ok) {
      throw new Error(`ZIP validation failed: ${zipCheck.errors.join('; ')}`);
    }
    console.log(`[job:${jobId}] ZIP_END`);

    // Measure the resulting archive
    const { statSync } = await import('fs');
    const stat = statSync(zipPath);
    const zipSizeKb = Math.round(stat.size / 1024);

    const pageCount = htmlResult.pageCount || (crawlResult.pages && crawlResult.pages.length) || 1;
    const amount = Math.max(500, Math.ceil(pageCount / 10) * 500);

    updateJob(
      jobId,
      {
        status: 'completed',
        progressMessage: `Export complete — ${pageCount} page(s) captured (₹${amount}). ${zipSizeKb} KB ZIP ready for approval.`,
        completedAt: Date.now(),
        downloadUrl: `/api/job/${jobId}/download`,
        zipSizeKb,
        pageCount,
        amount,
        paymentApproved: false,
      },
      `Export completed — ${pageCount} page(s), ₹${amount}, ${zipSizeKb} KB.`
    );
    console.log(`[job:${jobId}] COMPLETED`);
  } catch (err: unknown) {
    const jobAfter = getJob(jobId);
    if (jobAfter && jobAfter.status === 'cancelled') {
      console.log(`[job:${jobId}] Skipping failure handling — job was cancelled.`);
      return;
    }
    const rawErrMsg = (err as Error).message || String(err);
    const errMsg = stripAnsi(rawErrMsg);
    console.error(`[job:${jobId}] FAILED phase=${currentPhase} error=${errMsg}`);
    updateJob(
      jobId,
      {
        status: 'failed',
        error: errMsg,
        progressMessage: `Export failed during ${currentPhase}: ${errMsg}`,
      },
      `ERROR phase=${currentPhase}: ${errMsg}`
    );
  }
}
