import { ClientConfig } from './types';
import { JobsResource } from './resources/jobs';
import { ExportsResource } from './resources/exports';

export class SiteCompilerClient {
  public readonly jobs: JobsResource;
  public readonly exports: ExportsResource;

  private readonly baseUrl: string;

  constructor(config: ClientConfig = {}) {
    this.baseUrl = (config.baseUrl || 'https://sitecompiler.dev').replace(/\/$/, '');

    const headers: Record<string, string> = {};
    if (config.apiKey) {
      headers['Authorization'] = `Bearer ${config.apiKey}`;
    }
    if (config.adminSecret) {
      headers['x-sitecompiler-admin-bypass'] = config.adminSecret;
    }

    const fetchFn = fetch.bind(globalThis);

    this.jobs = new JobsResource(this.baseUrl, fetchFn, headers);
    this.exports = new ExportsResource(this.baseUrl, fetchFn, headers);
  }
}
