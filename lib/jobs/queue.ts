import { captureSite } from '../crawler/capture';
import { buildHtmlExport } from '../generator/html/build';
import { detectSections } from '../detector/section-detector';
import { buildNextJsExport } from '../generator/nextjs/page-assembler';
import { createJobZip } from '../zip/build-zip';

export type JobStatus =
  | 'pending'
  | 'crawling'
  | 'parsing'
  | 'detecting'
  | 'generating'
  | 'zipping'
  | 'completed'
  | 'failed';

export interface JobState {
  id: string;
  url: string;
  format: 'html' | 'react' | 'nextjs';
  status: JobStatus;
  progressMessage: string;
  logs: string[];
  createdAt: number;
  completedAt?: number;
  error?: string;
  downloadUrl?: string;
  zipSizeKb?: number;
  fileCount?: number;
  screenshots?: {
    desktop: string;
    tablet: string;
    mobile: string;
  };
}

import * as fs from 'fs';
import * as path from 'path';

// In-process job store (single-server, localhost use)
const jobStore = new Map<string, JobState>();

export function cleanupOldExportJobs(maxAgeMs: number = 60 * 60 * 1000): void {
  try {
    const exportsDir = path.resolve(process.cwd(), 'exports');
    if (!fs.existsSync(exportsDir)) return;

    const entries = fs.readdirSync(exportsDir, { withFileTypes: true });
    const now = Date.now();

    for (const entry of entries) {
      if (entry.name === '.gitkeep' || entry.name === '.gitignore') continue;
      const fullPath = path.join(exportsDir, entry.name);
      try {
        const stats = fs.statSync(fullPath);
        if (now - stats.mtimeMs > maxAgeMs) {
          fs.rmSync(fullPath, { recursive: true, force: true });
          console.log(`[Exports Garbage Collector] Purged old export directory: ${entry.name}`);
        }
      } catch {}
    }
  } catch (err) {
    console.error('[Exports Garbage Collector] Cleanup error:', err);
  }
}

export function createJob(url: string, format: 'html' | 'react' | 'nextjs'): JobState {
  cleanupOldExportJobs();
  const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const job: JobState = {
    id: jobId,
    url,
    format,
    status: 'pending',
    progressMessage: 'Job queued...',
    logs: [`[${new Date().toLocaleTimeString()}] Job created for ${url}`],
    createdAt: Date.now(),
  };
  jobStore.set(jobId, job);
  return job;
}

export function getJob(jobId: string): JobState | undefined {
  return jobStore.get(jobId);
}

function updateJob(jobId: string, updates: Partial<JobState>, logMsg?: string) {
  const job = jobStore.get(jobId);
  if (!job) return;
  Object.assign(job, updates);
  if (logMsg) {
    job.logs.push(`[${new Date().toLocaleTimeString()}] ${logMsg}`);
  }
}

export async function processExportJob(jobId: string): Promise<void> {
  const job = getJob(jobId);
  if (!job) return;

  try {
    // ── Phase 1: Crawl ──────────────────────────────────────────────────────
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

    updateJob(jobId, {
      screenshots: {
        desktop: `/api/job/${jobId}/screenshot?type=desktop`,
        tablet:  `/api/job/${jobId}/screenshot?type=tablet`,
        mobile:  `/api/job/${jobId}/screenshot?type=mobile`,
      },
    });

    // ── Phase 2: Parse HTML + CSS ───────────────────────────────────────────
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

    // ── Phase 3: Section Detection ──────────────────────────────────────────
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

    // ── Phase 4: Code Generation (Next.js / React only) ────────────────────
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
    // HTML format: html-export dir is already populated by buildHtmlExport

    // ── Phase 5: ZIP with README ────────────────────────────────────────────
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
    });

    // Measure the resulting archive
    const { statSync } = await import('fs');
    const stat = statSync(zipPath);
    const zipSizeKb = Math.round(stat.size / 1024);

    updateJob(
      jobId,
      {
        status: 'completed',
        progressMessage: `Export complete — ${zipSizeKb} KB ZIP ready for download.`,
        completedAt: Date.now(),
        downloadUrl: `/api/job/${jobId}/download`,
        zipSizeKb,
      },
      `Export completed — ${zipSizeKb} KB. Ready for download.`
    );
  } catch (err: any) {
    console.error(`[Job ${jobId}] Failed:`, err);
    updateJob(
      jobId,
      {
        status: 'failed',
        error: err.message || String(err),
        progressMessage: `Export failed: ${err.message || String(err)}`,
      },
      `ERROR: ${err.message || String(err)}`
    );
  }
}
