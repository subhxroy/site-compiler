import { captureSite } from '../crawler/capture';
import { buildHtmlExport } from '../generator/html/build';
import { detectSections } from '../detector/section-detector';
import { buildNextJsExport } from '../generator/nextjs/page-assembler';
import { createJobZip } from '../zip/build-zip';
import * as fs from 'fs';
import * as path from 'path';

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

// In-process job store
const jobStore = new Map<string, JobState>();

// 10-minute export auto-cleanup routine (600,000 ms)
const TEN_MINUTES_MS = 10 * 60 * 1000;

export function cleanupOldExportJobs(maxAgeMs: number = TEN_MINUTES_MS): void {
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
          jobStore.delete(entry.name);
          console.log(`[Exports Garbage Collector] Purged 10-minute old export package: ${entry.name}`);
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
  const timeStr = new Date().toLocaleTimeString('en-US', { hour12: true });
  const job: JobState = {
    id: jobId,
    url,
    format,
    status: 'pending',
    progressMessage: 'Job queued...',
    logs: [`[${timeStr}] Job created for ${url}`],
    createdAt: Date.now(),
  };
  jobStore.set(jobId, job);

  // Schedule automatic purging of server files after 10 minutes
  setTimeout(() => {
    try {
      const exportDir = path.resolve(process.cwd(), 'exports', jobId);
      if (fs.existsSync(exportDir)) {
        fs.rmSync(exportDir, { recursive: true, force: true });
        console.log(`[Exports Timer] Auto-deleted 10-min expired export: ${jobId}`);
      }
    } catch {}
  }, TEN_MINUTES_MS);

  return job;
}

export function getJob(jobId: string): JobState | undefined {
  cleanupOldExportJobs();
  return jobStore.get(jobId);
}

function updateJob(jobId: string, updates: Partial<JobState>, logMsg?: string) {
  const job = jobStore.get(jobId);
  if (!job) return;
  Object.assign(job, updates);
  if (logMsg) {
    const timeStr = new Date().toLocaleTimeString('en-US', { hour12: true });
    job.logs.push(`[${timeStr}] ${logMsg}`);
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
        progressMessage: `Export complete — ${zipSizeKb} KB ZIP ready for download (Expires in 10 mins).`,
        completedAt: Date.now(),
        downloadUrl: `/api/job/${jobId}/download`,
        zipSizeKb,
      },
      `Export completed — ${zipSizeKb} KB. Package will auto-delete in 10 minutes.`
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
