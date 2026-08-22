export type ExportFormat = 'html' | 'react' | 'nextjs' | 'astro' | 'svelte' | 'vue' | 'remix';

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

export interface CreateJobParams {
  url: string;
  format?: ExportFormat;
  idempotencyKey?: string;
}

export interface Job {
  id: string;
  url: string;
  format: ExportFormat;
  status: JobStatus;
  progressMessage: string;
  logs: string[];
  downloadUrl?: string;
  zipSizeKb?: number;
  pageCount?: number;
  amount?: number;
  paymentSubmitted?: boolean;
  paymentApproved?: boolean;
  hasModel?: boolean;
  error?: string;
  createdAt: number;
  completedAt?: number;
}

export interface ClientConfig {
  baseUrl?: string;
  apiKey?: string;
  adminSecret?: string;
  timeoutMs?: number;
}

export interface PollOptions {
  intervalMs?: number;
  timeoutMs?: number;
  onProgress?: (job: Job) => void;
}
