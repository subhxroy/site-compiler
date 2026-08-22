import { PaymentRequiredError, SiteCompilerError } from '../errors';

export class ExportsResource {
  constructor(
    private readonly baseUrl: string,
    private readonly fetchFn: typeof fetch,
    private readonly headers: Record<string, string>
  ) {}

  /**
   * Download the compiled ZIP archive as an ArrayBuffer or Buffer
   */
  async downloadZip(jobId: string): Promise<ArrayBuffer> {
    const res = await this.fetchFn(`${this.baseUrl}/api/job/${jobId}/download`, {
      headers: this.headers,
    });

    if (res.status === 403) {
      throw new PaymentRequiredError();
    }

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new SiteCompilerError(errorData.error || 'Failed to download zip export', res.status, errorData);
    }

    return res.arrayBuffer();
  }

  /**
   * Retrieve the editable AST Site Model for a completed job
   */
  async getSiteModel(jobId: string): Promise<Record<string, unknown>> {
    const res = await this.fetchFn(`${this.baseUrl}/api/job/${jobId}/model`, {
      headers: this.headers,
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new SiteCompilerError(errorData.error || 'Failed to fetch site model', res.status, errorData);
    }

    return res.json();
  }
}
