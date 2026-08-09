export interface CaptureOptions {
  jobId: string;
  url: string;
  maxPages?: number;
  debug?: boolean;
  onProgress?: (message: string) => void;
}

export interface ExtractedMeta {
  title: string;
  canonicalUrl: string | null;
  metaTags: Array<{ name?: string; property?: string; content?: string; [key: string]: string | undefined }>;
  jsonLd: unknown[];
}

export interface ExtractedAsset {
  originalUrl: string;
  category: 'images' | 'fonts' | 'icons' | 'video';
  localPath: string;
  filename: string;
}

export interface PageCaptured {
  url: string;
  pathname: string;
  title: string;
  htmlFilename: string; // e.g. "index.html", "work.html"
  rawHtmlPath: string;
  meta: ExtractedMeta;
}

export interface CaptureResult {
  jobId: string;
  rawDir: string;
  baseUrl: string;
  pages: PageCaptured[];
  cssPaths: string[];
  scriptPaths: string[];
  assetManifest: ExtractedAsset[];
  screenshotPaths: {
    desktop: string;
    tablet: string;
    mobile: string;
  };
  meta: ExtractedMeta;
}
