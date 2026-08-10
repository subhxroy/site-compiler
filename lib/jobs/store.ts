import * as fs from 'fs';
import * as path from 'path';

export type JobStatus =
  | 'pending'
  | 'crawling'
  | 'parsing'
  | 'validating'
  | 'detecting'
  | 'generating'
  | 'validating-output'
  | 'zipping'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface JobState {
  id: string;
  url: string;
  format: 'html' | 'react' | 'nextjs';
  status: JobStatus;
  progressMessage: string;
  logs: string[];
  createdAt: number;
  completedAt?: number;
  cancelledAt?: number;
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

// Export package retention. Previously 10 minutes — too short for the
// pay → admin-approve → download flow (approval routinely happens after the
// purge, deleting the ZIP and causing "file didn't exist" on download).
// Default 24 hours; override with EXPORT_RETENTION_MS.
const DEFAULT_RETENTION_MS = 24 * 60 * 60 * 1000;
const RETENTION_MS = (() => {
  const fromEnv = Number(process.env.EXPORT_RETENTION_MS);
  return Number.isFinite(fromEnv) && fromEnv > 0 ? fromEnv : DEFAULT_RETENTION_MS;
})();

const ACTIVE_STATUSES = new Set<JobStatus>([
  'pending',
  'crawling',
  'parsing',
  'validating',
  'detecting',
  'generating',
  'validating-output',
  'zipping',
]);

export function cleanupOldExportJobs(maxAgeMs: number = RETENTION_MS): void {
  try {
    const exportsDir = path.resolve(process.cwd(), 'exports');
    if (!fs.existsSync(exportsDir)) return;

    const entries = fs.readdirSync(exportsDir, { withFileTypes: true });
    const now = Date.now();

    for (const entry of entries) {
      if (entry.name === '.gitkeep' || entry.name === '.gitignore') continue;
      // Never purge an export dir while its job is still running — long crawls
      // can keep the dir older than maxAgeMs between writes.
      const job = jobStore.get(entry.name);
      if (job && ACTIVE_STATUSES.has(job.status)) continue;
      const fullPath = path.join(exportsDir, entry.name);
      try {
        const stats = fs.statSync(fullPath);
        if (now - stats.mtimeMs > maxAgeMs) {
          fs.rmSync(fullPath, { recursive: true, force: true });
          jobStore.delete(entry.name);
          console.log(`[Exports Garbage Collector] Purged expired export package: ${entry.name}`);
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

  // Schedule automatic purging of server files after the retention window.
  // Skip if the job is still running so a long crawl's export dir is never
  // deleted mid-write; the mtime-based GC will pick it up once the job finishes.
  setTimeout(() => {
    try {
      const job = jobStore.get(jobId);
      if (job && ACTIVE_STATUSES.has(job.status)) return;
      const exportDir = path.resolve(process.cwd(), 'exports', jobId);
      if (fs.existsSync(exportDir)) {
        fs.rmSync(exportDir, { recursive: true, force: true });
        console.log(`[Exports Timer] Auto-deleted expired export: ${jobId}`);
      }
    } catch {}
  }, RETENTION_MS);

  return job;
}

export function getJob(jobId: string): JobState | undefined {
  cleanupOldExportJobs();
  return jobStore.get(jobId);
}

/**
 * Job shape safe to expose to unauthenticated clients. Payment PII
 * (UTR number, sender account, user email) is stripped so anyone who
 * guesses/obtains a jobId cannot harvest other users' bank/identity data.
 */
export function toPublicJob(job: JobState) {
  return {
    id: job.id,
    url: job.url,
    format: job.format,
    status: job.status,
    progressMessage: job.progressMessage,
    createdAt: job.createdAt,
    completedAt: job.completedAt,
    cancelledAt: job.cancelledAt,
    error: job.error,
    downloadUrl: job.downloadUrl,
    zipSizeKb: job.zipSizeKb,
    fileCount: job.fileCount,
    pageCount: job.pageCount,
    amount: job.amount,
    paymentSubmitted: job.paymentSubmitted,
    paymentApproved: job.paymentApproved,
    paymentSubmittedAt: job.paymentSubmittedAt,
    screenshots: job.screenshots,
    logs: (job.logs || []).map((line) => line.replace(/\bUTR[:\s]+[A-Za-z0-9]{4,}/gi, 'UTR: [redacted]')),
  };
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

export function isJobActive(jobId: string): boolean {
  const job = jobStore.get(jobId);
  return !!job && ACTIVE_STATUSES.has(job.status);
}

/**
 * Mark a job as cancelled and purge its export dir. The pipeline checks this
 * flag between phases, so a cancelled job stops at the next safe boundary
 * instead of corrupting an in-progress write. Cancellation is terminal and
 * cannot be reversed.
 */
export function cancelExportJob(jobId: string): JobState | undefined {
  const job = jobStore.get(jobId);
  if (!job) return undefined;
  if (!ACTIVE_STATUSES.has(job.status)) {
    return job; // already completed / failed — nothing to cancel
  }
  job.status = 'cancelled';
  job.cancelledAt = Date.now();
  job.progressMessage = 'Export cancelled.';
  const timeStr = new Date().toLocaleTimeString('en-US', { hour12: true });
  job.logs.push(`[${timeStr}] Job cancelled by user.`);
  try {
    const exportDir = path.resolve(process.cwd(), 'exports', jobId);
    if (fs.existsSync(exportDir)) {
      fs.rmSync(exportDir, { recursive: true, force: true });
      console.log(`[Exports] Purged cancelled job export dir: ${jobId}`);
    }
  } catch {}
  return job;
}
