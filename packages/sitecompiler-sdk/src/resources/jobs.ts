import { CreateJobParams, Job, PollOptions } from '../types';
import { JobNotFoundError, SiteCompilerError, TimeoutError } from '../errors';

export class JobsResource {
  constructor(
    private readonly baseUrl: string,
    private readonly fetchFn: typeof fetch,
    private readonly headers: Record<string, string>
  ) {}

  /**
   * Submit a new website compilation job
   */
  async create(params: CreateJobParams): Promise<Job> {
    const res = await this.fetchFn(`${this.baseUrl}/api/export`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.headers,
        ...(params.idempotencyKey ? { 'x-idempotency-key': params.idempotencyKey } : {}),
      },
      body: JSON.stringify({
        url: params.url,
        format: params.format || 'nextjs',
      }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new SiteCompilerError(errorData.error || 'Failed to create export job', res.status, errorData);
    }

    const data = await res.json();
    return this.get(data.jobId || data.id);
  }

  /**
   * Retrieve the status and logs of an ongoing or completed job
   */
  async get(jobId: string): Promise<Job> {
    const res = await this.fetchFn(`${this.baseUrl}/api/job/${jobId}/status`, {
      headers: this.headers,
    });

    if (res.status === 404) {
      throw new JobNotFoundError(jobId);
    }

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new SiteCompilerError(errorData.error || 'Failed to fetch job status', res.status, errorData);
    }

    return res.json();
  }

  /**
   * Cancel an active job
   */
  async cancel(jobId: string): Promise<Job> {
    const res = await this.fetchFn(`${this.baseUrl}/api/job/${jobId}/cancel`, {
      method: 'POST',
      headers: this.headers,
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new SiteCompilerError(errorData.error || 'Failed to cancel job', res.status, errorData);
    }

    return res.json();
  }

  /**
   * Poll a job until it reaches a terminal status (completed, failed, cancelled)
   */
  async pollUntilComplete(jobId: string, options: PollOptions = {}): Promise<Job> {
    const intervalMs = options.intervalMs || 2000;
    const timeoutMs = options.timeoutMs || 900000; // 15 mins default
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      const job = await this.get(jobId);
      if (options.onProgress) {
        options.onProgress(job);
      }

      if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') {
        return job;
      }

      await new Promise((r) => setTimeout(r, intervalMs));
    }

    throw new TimeoutError(`Job ${jobId} did not complete within ${timeoutMs}ms`);
  }
}
