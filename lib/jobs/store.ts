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
  pageCount?: number;
  amount?: number;
  paymentSubmitted?: boolean;
  paymentApproved?: boolean;
  senderAccount?: string;
  utrNumber?: string;
  paymentSubmittedAt?: number;
  userEmail?: string;
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

export function updateJob(jobId: string, updates: Partial<JobState>, logMsg?: string) {
  const job = jobStore.get(jobId);
  if (!job) return;
  Object.assign(job, updates);
  if (logMsg) {
    const timeStr = new Date().toLocaleTimeString('en-US', { hour12: true });
    job.logs.push(`[${timeStr}] ${logMsg}`);
  }
}
