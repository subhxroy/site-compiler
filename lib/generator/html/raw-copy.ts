import * as fs from 'fs';
import * as path from 'path';
import { PageCaptured } from '../../crawler/types';
import { processAssets } from '../../parser/asset-pipeline';

export interface BuildRawCopyOptions {
  jobId: string;
  baseUrl: string;
  pages?: PageCaptured[];
}

export interface BuildRawCopyResult {
  outputDir: string;
  indexHtmlPath: string;
  assetCount: number;
  pageCount: number;
}

export async function buildRawCopyExport(options: BuildRawCopyOptions): Promise<BuildRawCopyResult> {
  const { jobId, baseUrl, pages = [] } = options;

  const exportsDir = path.resolve(process.cwd(), 'exports', jobId);
  const rawDir = path.join(exportsDir, 'raw');
  const outputDir = path.join(exportsDir, 'output', 'html-export');

  fs.mkdirSync(outputDir, { recursive: true });

  const assetMap = processAssets(rawDir, outputDir);
  const assetCount = Object.keys(assetMap).length;

  const basenameMap = new Map<string, string>();
  for (const [origUrl, localPath] of Object.entries(assetMap)) {
    const bn = origUrl.split('?')[0].split('/').pop() || '';
    if (bn && !basenameMap.has(bn)) {
      basenameMap.set(bn, localPath);
    }
  }

  const pagesRawDir = path.join(rawDir, 'pages');
  let pagesToProcess = pages;

  if (pagesToProcess.length === 0 && fs.existsSync(pagesRawDir)) {
    const pageFiles = fs.readdirSync(pagesRawDir).filter((f) => f.endsWith('.html'));
    if (pageFiles.length > 0) {
      pagesToProcess = pageFiles.map((f) => ({
        url: f === 'index.html' ? baseUrl : `${baseUrl.replace(/\/$/, '')}/${f.replace('.html', '')}`,
        pathname: f === 'index.html' ? '/' : `/${f.replace('.html', '')}`,
        title: f.replace('.html', ''),
        htmlFilename: f,
        rawHtmlPath: path.join(pagesRawDir, f),
        meta: { title: f.replace('.html', ''), canonicalUrl: null, metaTags: [], jsonLd: [] },
      }));
    }
  }

  if (pagesToProcess.length === 0) {
    const fallbackPath = path.join(rawDir, 'page.html');
    pagesToProcess = [{
      url: baseUrl,
      pathname: '/',
      title: 'Exported Site',
      htmlFilename: 'index.html',
      rawHtmlPath: fs.existsSync(fallbackPath) ? fallbackPath : '',
      meta: { title: 'Exported Site', canonicalUrl: null, metaTags: [], jsonLd: [] },
    }];
  }

  let primaryIndexHtmlPath = path.join(outputDir, 'index.html');

  for (const pageItem of pagesToProcess) {
    const candidatePaths = [
      pageItem.rawHtmlPath,
      path.join(pagesRawDir, pageItem.htmlFilename),
      path.join(rawDir, 'page.html'),
    ];
    const rawHtmlPath = candidatePaths.find((p) => p && fs.existsSync(p));
    if (!rawHtmlPath) continue;

    let html = fs.readFileSync(rawHtmlPath, 'utf-8');
    html = rewriteAssetUrlsInHtml(html, assetMap, basenameMap, baseUrl);

    if (!/<base\s/i.test(html)) {
      let baseHref = baseUrl;
      try {
        const u = new URL(baseUrl);
        baseHref = u.origin + '/';
      } catch {}
      html = html.replace(/(<head[^>]*>)/i, `$1\n  <base href="${baseHref}">`);
    }

    html = removeTrackingBeacons(html);

    const destPath = path.join(outputDir, pageItem.htmlFilename);
    fs.writeFileSync(destPath, html, 'utf-8');

    if (pageItem.htmlFilename === 'index.html') {
      primaryIndexHtmlPath = destPath;
    }
  }

  const netlifyHeaders = `/*
  Access-Control-Allow-Origin: *
  X-Content-Type-Options: nosniff

/*.js
  Content-Type: application/javascript; charset=utf-8

/*.mjs
  Content-Type: application/javascript; charset=utf-8

/assets/scripts/*.mjs
  Content-Type: application/javascript; charset=utf-8

/*.css
  Content-Type: text/css; charset=utf-8

/*.woff2
  Content-Type: font/woff2

/*.woff
  Content-Type: font/woff
`;
  fs.writeFileSync(path.join(outputDir, '_headers'), netlifyHeaders, 'utf-8');

  const netlifyRedirects = `/*    /index.html   200\n`;
  fs.writeFileSync(path.join(outputDir, '_redirects'), netlifyRedirects, 'utf-8');

  return {
    outputDir,
    indexHtmlPath: primaryIndexHtmlPath,
    assetCount,
    pageCount: pagesToProcess.length,
  };
}

function rewriteAssetUrlsInHtml(
  html: string,
  assetMap: Record<string, string>,
  basenameMap: Map<string, string>,
  baseUrl: string,
): string {
  const resolveUrl = (raw: string): string => {
    if (!raw || raw.startsWith('data:') || raw.startsWith('blob:') || raw.startsWith('#') || raw.startsWith('javascript:')) {
      return raw;
    }
    let abs = raw;
    try { abs = new URL(raw, baseUrl).href; } catch {}
    if (assetMap[abs]) return assetMap[abs];
    if (assetMap[raw]) return assetMap[raw];
    const bn = abs.split('?')[0].split('/').pop() || '';
    if (bn && basenameMap.has(bn)) return basenameMap.get(bn)!;
    return raw;
  };

  html = html.replace(
    /(<(?:img|script|source|video|audio|track|embed|iframe|input)\b[^>]+\bsrc\s*=\s*)(['"]?)([^'">\s]+)\2/gi,
    (match, prefix, quote, url) => `${prefix}${quote || ''}${resolveUrl(url)}${quote || ''}`,
  );

  html = html.replace(
    /(\bsrcset\s*=\s*)(['"]?)([^'">\n]+)\2/gi,
    (match, prefix, quote, srcset) => {
      const parts = srcset.split(',').map((part: string) => {
        const [url, ...descriptors] = part.trim().split(/\s+/);
        const resolved = url ? resolveUrl(url) : '';
        return [resolved, ...descriptors].join(' ');
      });
      return `${prefix}${quote || ''}${parts.join(', ')}${quote || ''}`;
    },
  );

  html = html.replace(
    /url\(['"]?([^'")]+)['"]?\)/g,
    (match, url) => {
      if (url.startsWith('data:')) return match;
      return `url("${resolveUrl(url)}")`;
    },
  );

  html = html.replace(
    /(\bposter\s*=\s*)(['"]?)([^'">\s]+)\2/gi,
    (match, prefix, quote, url) => `${prefix}${quote || ''}${resolveUrl(url)}${quote || ''}`,
  );

  return html;
}

function removeTrackingBeacons(html: string): string {
  html = html.replace(/<img[^>]+src=["'][^"']*facebook\.com\/tr[^"']*["'][^>]*\/?>/gi, '');
  html = html.replace(/<img[^>]+src=["'][^"']*google-analytics[^"']*["'][^>]*\/?>/gi, '');
  html = html.replace(/<div[^>]+id="__framer-editorbar"[^>]*>[\s\S]*?<\/div>/gi, '');
  return html;
}
