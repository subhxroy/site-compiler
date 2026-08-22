export interface SvelteExportOptions {
  jobId: string;
  baseUrl: string;
  pages: Array<{
    url: string;
    pathname: string;
    title: string;
    html: string;
    cleanedHtml?: string;
  }>;
  siteModel?: Record<string, unknown>;
  consolidatedCss?: string;
  outputDir?: string;
}

export interface SvelteExportResult {
  outputDir: string;
  pageCount: number;
  entryPath: string;
  configPath: string;
  packageJsonPath: string;
}
