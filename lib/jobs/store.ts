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

// Idempotency key store: maps request idempotency key -> { jobId, createdAt }
const idempotencyStore = new Map<string, { jobId: string; createdAt: number }>();

// Export package retention. Default 24 hours.
const DEFAULT_RETENTION_MS = 24 * 60 * 60 * 1000;
const RETENTION_MS = (() => {
  const fromEnv = Number(process.env.EXPORT_RETENTION_MS);
  return Number.isFinite(fromEnv) && fromEnv > 0 ? fromEnv : DEFAULT_RETENTION_MS;
})();

// Max allowed job duration before watchdog marks it failed. Default 5 minutes (300,000 ms).
const DEFAULT_JOB_TIMEOUT_MS = 5 * 60 * 1000;
export const EXPORT_JOB_TIMEOUT_MS = (() => {
  const fromEnv = Number(process.env.EXPORT_JOB_TIMEOUT_MS);
  return Number.isFinite(fromEnv) && fromEnv > 0 ? fromEnv : DEFAULT_JOB_TIMEOUT_MS;
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

    // Clean up stale idempotency keys (> 1 hour old)
    for (const [key, val] of idempotencyStore.entries()) {
      if (now - val.createdAt > 60 * 60 * 1000) {
        idempotencyStore.delete(key);
      }
    }
  } catch (err) {
    console.error('[Exports Garbage Collector] Cleanup error:', err);
  }
}

export function getJobByIdempotencyKey(key: string): JobState | undefined {
  if (!key) return undefined;
  const entry = idempotencyStore.get(key);
  if (!entry) return undefined;
  const job = jobStore.get(entry.jobId);
  if (job && ACTIVE_STATUSES.has(job.status)) {
    return job;
  }
  return undefined;
}

export function registerJobIdempotencyKey(key: string, jobId: string): void {
  if (!key || !jobId) return;
  idempotencyStore.set(key, { jobId, createdAt: Date.now() });
}

export function stripAnsi(str: string): string {
  if (!str) return '';
  return str.replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, '').replace(/\[\d{1,2}m/g, '');
}

export function createJob(url: string, format: 'html' | 'react' | 'nextjs', idempotencyKey?: string): JobState {
  cleanupOldExportJobs();

  if (idempotencyKey) {
    const existingJob = getJobByIdempotencyKey(idempotencyKey);
    if (existingJob) {
      console.log(`[Job Store] Reusing active job ${existingJob.id} for idempotency key ${idempotencyKey}`);
      return existingJob;
    }
  }

  const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const timeStr = new Date().toISOString();
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

  if (idempotencyKey) {
    registerJobIdempotencyKey(idempotencyKey, jobId);
  }

  // Watchdog timer: automatically fail job if it remains active beyond EXPORT_JOB_TIMEOUT_MS
  setTimeout(() => {
    try {
      const current = jobStore.get(jobId);
      if (current && ACTIVE_STATUSES.has(current.status)) {
        const timeNow = new Date().toISOString();
        console.error(`[Job Watchdog] Job ${jobId} timed out after ${EXPORT_JOB_TIMEOUT_MS}ms`);
        current.status = 'failed';
        current.error = 'Export timed out. The backend engine or target site took too long to process.';
        current.progressMessage = 'Export timed out. The backend may have been unavailable or target site took too long.';
        current.logs.push(`[${timeNow}] ERROR: Export timed out after ${Math.round(EXPORT_JOB_TIMEOUT_MS / 1000)} seconds.`);
      }
    } catch {}
  }, EXPORT_JOB_TIMEOUT_MS);

  // Schedule automatic purging of server files after the retention window.
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
    logs: (job.logs || []).map((line) => stripAnsi(line).replace(/\bUTR[:\s]+[A-Za-z0-9]{4,}/gi, 'UTR: [redacted]')),
  };
}

export function updateJob(jobId: string, updates: Partial<JobState>, logMsg?: string) {
  const job = jobStore.get(jobId);
  if (!job) return;
  Object.assign(job, updates);
  if (logMsg) {
    const timeStr = new Date().toISOString();
    const cleanMsg = stripAnsi(logMsg);
    job.logs.push(`[${timeStr}] ${cleanMsg}`);
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
  const timeStr = new Date().toISOString();
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

