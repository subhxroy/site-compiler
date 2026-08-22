import { chromium, type Browser, type BrowserContext, type Page, type Response } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import { URL } from 'url';
import { CaptureOptions, CaptureResult, ExtractedAsset, ExtractedMeta, PageCaptured } from './types';
import { validateUrlForSsrf, validateUrlForSsrfAsync } from '../security/ssrf';
import { stripPlatformWatermarks } from '../parser/dom-cleaner';
import { sanitizeCssText } from '../parser/css-parser';
import { stripAnsi } from '../jobs/store';

// Set browser path to ./pw-browsers if present (Render build→runtime), otherwise use default system cache
if (!process.env.PLAYWRIGHT_BROWSERS_PATH && fs.existsSync(path.resolve(process.cwd(), 'pw-browsers'))) {
  process.env.PLAYWRIGHT_BROWSERS_PATH = './pw-browsers';
}

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) {
      c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

function createPngChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const bufToCrc = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(bufToCrc), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

export function createMinimalPngBuffer(width = 1200, height = 800): Buffer {
  const rowSize = 1 + width * 3;
  const rawData = Buffer.alloc(height * rowSize);
  for (let y = 0; y < height; y++) {
    const offset = y * rowSize;
    rawData[offset] = 0;
    for (let x = 0; x < width; x++) {
      const pxOffset = offset + 1 + x * 3;
      rawData[pxOffset] = 11;
      rawData[pxOffset + 1] = 12;
      rawData[pxOffset + 2] = 14;
    }
  }
  const compressed = zlib.deflateSync(rawData);
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    sig,
    createPngChunk('IHDR', ihdr),
    createPngChunk('IDAT', compressed),
    createPngChunk('IEND', Buffer.alloc(0)),
  ]);
}


// ── Helpers ───────────────────────────────────────────────────────────────────

// normalizeUrl: for PAGE URLs only — strips both query string and hash for dedup
function normalizeUrl(urlStr: string): string {
  try {
    const u = new URL(urlStr);
    u.hash = '';
    u.search = '';
    let p = u.pathname;
    if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
    return `${u.protocol}//${u.host}${p}`;
  } catch {
    return urlStr;
  }
}

// normalizeAssetUrl: for ASSET URLs — strips only the hash fragment.
// Query strings MUST be preserved because CDN transformations (Cloudinary w=800&q=80,
// Imgix fit=crop&w=600) are encoded in the query string. Stripping them fetches
// the wrong resource (wrong size/crop/format).
function normalizeAssetUrl(urlStr: string): string {
  try {
    const u = new URL(urlStr);
    u.hash = '';
    return u.href;
  } catch {
    return urlStr;
  }
}

function sanitizeFilename(urlStr: string, index: number, defaultExt: string, category?: string): string {
  try {
    const parsed = new URL(urlStr);
    let basename = path.basename(parsed.pathname).split('?')[0].split('#')[0];
    if (category === 'scripts' && basename.includes('.')) {
      // Keep exact script / module basename so internal ES module imports (import "./foo@1.0.mjs") resolve cleanly
      const clean = basename.replace(/[^a-zA-Z0-9_.\-@~+]/g, '_');
      if (clean.length > 0 && clean.length <= 120) return clean;
    }
    if (!basename.includes('.')) {
      basename = `asset_${index}${defaultExt}`;
    } else {
      basename = `${index}_${basename.replace(/[^a-zA-Z0-9_.\-@~+]/g, '_')}`;
      if (basename.length > 80) basename = `asset_${index}${defaultExt}`;
    }
    return basename;
  } catch {
    return `asset_${index}${defaultExt}`;
  }
}

function urlToHtmlFilename(urlStr: string, isEntry: boolean): string {
  try {
    const u = new URL(urlStr);
    const p = u.pathname.replace(/\/$/, '');
    if (!p || p === '' || p === '/' || isEntry) return 'index.html';
    const clean = p.replace(/^\//, '').replace(/\//g, '_').replace(/[^a-zA-Z0-9_.-]/g, '');
    return clean.endsWith('.html') ? clean : `${clean}.html`;
  } catch {
    return isEntry ? 'index.html' : 'page.html';
  }
}

function getAssetCategory(urlStr: string, contentType?: string): 'images' | 'fonts' | 'icons' | 'video' | 'scripts' {
  const u = urlStr.toLowerCase().split('?')[0];
  const ct = (contentType || '').toLowerCase();

  if (u.match(/\.(woff2?|ttf|otf|eot)/) || ct.includes('font')) return 'fonts';
  if (u.match(/\.(mp4|webm|ogg|mov|avi)/) || ct.includes('video')) return 'video';
  if (u.match(/\.(ico|svg)/) || ct.includes('icon') || ct.includes('svg')) return 'icons';
  if (u.match(/\.(m?js|wasm)/) || ct.includes('javascript') || ct.includes('ecmascript')) return 'scripts';
  return 'images';
}

function guessExtension(urlStr: string, contentType?: string): string {
  const u = urlStr.toLowerCase().split('?')[0];
  const extMatch = u.match(/\.(jpe?g|png|gif|webp|avif|svg|ico|woff2?|ttf|otf|eot|mp4|webm|ogg|css|js|mjs|wasm)(\?|$)/);
  if (extMatch) return `.${extMatch[1]}`;
  const ct = (contentType || '').split(';')[0].trim();
  const ctMap: Record<string, string> = {
    'image/jpeg': '.jpg', 'image/png': '.png', 'image/gif': '.gif',
    'image/webp': '.webp', 'image/avif': '.avif', 'image/svg+xml': '.svg',
    'image/x-icon': '.ico', 'font/woff2': '.woff2', 'font/woff': '.woff',
    'font/ttf': '.ttf', 'video/mp4': '.mp4', 'video/webm': '.webm',
    'text/css': '.css', 'application/javascript': '.mjs', 'text/javascript': '.js',
  };
  return ctMap[ct] || '.bin';
}

function findPlaywrightChromium(): string | undefined {
  const basePaths = [
    path.join(process.cwd(), 'pw-browsers'),
    process.env.PLAYWRIGHT_BROWSERS_PATH,
    '/opt/render/.cache/ms-playwright',
    path.join(process.cwd(), '.cache', 'ms-playwright'),
    '/tmp/ms-playwright',
  ].filter(Boolean) as string[];

  for (const base of basePaths) {
    if (!fs.existsSync(base)) continue;
    try {
      const dirs = fs.readdirSync(base);
      for (const dir of dirs) {
        if (dir.startsWith('chromium')) {
          const candidates = [
            path.join(base, dir, 'chrome-linux', 'chrome'),
            path.join(base, dir, 'chrome-linux64', 'chrome'),
            path.join(base, dir, 'chrome-headless-shell-linux64', 'chrome-headless-shell'),
            path.join(base, dir, 'chrome-headless-shell-linux', 'chrome-headless-shell'),
          ];
          for (const cand of candidates) {
            if (fs.existsSync(cand)) return cand;
          }
        }
      }
    } catch {}
  }
  return undefined;
}

// ── Multi-page crawler ────────────────────────────────────────────────────────

export async function captureSite(options: CaptureOptions): Promise<CaptureResult> {
  // Default maxPages set to 1000 for unlimited full-site crawling
  const { jobId, url, maxPages = 1000, onProgress } = options;

  const normalizedEntryUrl = normalizeUrl(url);
  const ssrfCheck = await validateUrlForSsrfAsync(normalizedEntryUrl);
  if (!ssrfCheck.valid) {
    throw new Error(`Target URL failed SSRF security validation: ${ssrfCheck.reason || 'Blocked IP/host'}`);
  }

  const entryUrlParsed = new URL(ssrfCheck.url || normalizedEntryUrl);
  const targetHost = entryUrlParsed.hostname;

  const log = (msg: string) => {
    const cleanMsg = stripAnsi(msg);
    console.log(`[Job ${jobId}] ${cleanMsg}`);
    if (onProgress) onProgress(cleanMsg);
  };

  log(`Starting full-site capture for: ${normalizedEntryUrl}`);

  // ── Directory setup ─────────────────────────────────────────────────────
  const exportsDir  = path.resolve(/* turbopackIgnore: true */ process.cwd(), 'exports', jobId);
  const rawDir      = path.join(/* turbopackIgnore: true */ exportsDir, 'raw');
  const pagesRawDir = path.join(/* turbopackIgnore: true */ rawDir, 'pages');
  const stylesDir   = path.join(/* turbopackIgnore: true */ rawDir, 'styles');
  const scriptsDir  = path.join(/* turbopackIgnore: true */ rawDir, 'scripts');
  const assetsDir   = path.join(/* turbopackIgnore: true */ rawDir, 'assets');
  const imagesDir   = path.join(/* turbopackIgnore: true */ assetsDir, 'images');
  const fontsDir    = path.join(/* turbopackIgnore: true */ assetsDir, 'fonts');
  const iconsDir    = path.join(/* turbopackIgnore: true */ assetsDir, 'icons');
  const videoDir    = path.join(/* turbopackIgnore: true */ assetsDir, 'video');
  const assetsScriptsDir = path.join(/* turbopackIgnore: true */ assetsDir, 'scripts');
  const screensDir  = path.join(/* turbopackIgnore: true */ rawDir, 'screenshots');
  const screensExportDir = path.join(/* turbopackIgnore: true */ exportsDir, 'screenshots');

  for (const d of [exportsDir, rawDir, pagesRawDir, stylesDir, scriptsDir, assetsDir, imagesDir, fontsDir, iconsDir, videoDir, assetsScriptsDir, screensDir, screensExportDir]) {
    fs.mkdirSync(d, { recursive: true });
  }

  // ── Launch browser ──────────────────────────────────────────────────────
  const execPath = findPlaywrightChromium();
  if (execPath) {
    log(`[Browser Engine] Located Playwright binary: ${execPath}`);
  }

  // NOTE: Optimized Chromium flags for low-memory (512MB RAM) and headless hosting environments.
  const containerArgs = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--disable-gpu',
    '--disable-blink-features=AutomationControlled',
    '--no-first-run',
    '--disable-background-networking',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-breakpad',
    '--disable-component-extensions-with-background-pages',
    '--disable-extensions',
    '--disable-features=Translate,BackForwardCache,AcceptCHFrame,MediaRouter,OptimizationHints',
    '--disable-ipc-flooding-protection',
    '--disable-renderer-backgrounding',
    '--enable-features=NetworkService,NetworkServiceInProcess',
    '--force-color-profile=srgb',
    '--mute-audio',
    '--js-flags=--max-old-space-size=256',
  ];

  let browser!: Browser;
  let context!: BrowserContext;
  let page!: Page;

  // Track network assets. Attached to every freshly created page so the listener
  // survives browser relaunches (previously only the first page had it).
  const networkAssetUrls = new Set<string>();

  const initBrowserAndContext = async () => {
    try {
      browser = await chromium.launch({
        headless: true,
        ...(execPath && { executablePath: execPath }),
        args: containerArgs,
      });
    } catch (launchErr) {
      log(`[Browser Launch Warning] Standard launch failed: ${(launchErr as Error)?.message}. Attempting fallback...`);
      browser = await chromium.launch({
        headless: true,
        ...(execPath && { executablePath: execPath }),
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--js-flags=--max-old-space-size=256'],
      });
    }
    context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      extraHTTPHeaders: {
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'sec-ch-ua': '"Chromium";v="126", "Google Chrome";v="126"',
        'sec-ch-ua-platform': '"Windows"',
      },
      ignoreHTTPSErrors: true,
      javaScriptEnabled: true,
    });

    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3] });
    });

    page = await context.newPage();

    // ── Anti-SSRF Route Interception (blocks redirects, localhost, cloud metadata, private IPs) ──
    await context.route('**/*', async (route) => {
      try {
        const req = route.request();
        const reqUrl = req.url();

        // Allow standard browser pseudo-schemes
        if (reqUrl.startsWith('data:') || reqUrl.startsWith('blob:') || reqUrl.startsWith('about:')) {
          return route.continue();
        }

        const lexical = validateUrlForSsrf(reqUrl);
        if (!lexical.valid) {
          return route.abort('blockedbyclient');
        }

        if (req.isNavigationRequest()) {
          const asyncCheck = await validateUrlForSsrfAsync(reqUrl);
          if (!asyncCheck.valid) {
            return route.abort('blockedbyclient');
          }
        }

        return route.continue();
      } catch {
        return route.abort('blockedbyclient');
      }
    });

    page.on('response', (resp: Response) => {
      const reqUrl = resp.url();
      const ct = resp.headers()['content-type'] || '';
      if (
        ct.startsWith('image/') ||
        ct.startsWith('font/') ||
        ct.includes('video/') ||
        ct.includes('svg') ||
        ct.includes('javascript') ||
        ct.includes('ecmascript') ||
        reqUrl.includes('.mjs') ||
        reqUrl.includes('.js')
      ) {
        networkAssetUrls.add(reqUrl);
      }
    });
  };

  await initBrowserAndContext();

  const ensureActivePage = async () => {
    try {
      if (page && !page.isClosed() && context && browser && browser.isConnected()) {
        return page;
      }
    } catch {}

    log('[Browser Engine] Re-launching browser instance & context...');
    try { if (browser) await browser.close().catch(() => {}); } catch {}
    await initBrowserAndContext();
    return page;
  };

  const isBrowserCrashError = (err: unknown): boolean => {
    const msg = String((err as Error)?.message || '');
    if (
      msg.includes('Target closed') ||
      msg.includes('Target page, context or browser has been closed') ||
      msg.includes('browser has closed') ||
      msg.includes('browser has disconnected') ||
      msg.includes('context or browser has been closed') ||
      msg.includes('Execution context was destroyed') ||
      msg.includes('Connection closed') ||
      msg.includes('browserType.launch')
    ) {
      return true;
    }
    try {
      if (browser && !browser.isConnected()) return true;
      if (page && page.isClosed()) return true;
    } catch {
      return true;
    }
    return false;
  };

  const pagesToCrawl: string[] = [normalizedEntryUrl];
  const visitedUrls = new Set<string>();
  const retryCounts = new Map<string, number>();
  const MAX_PAGE_ATTEMPTS = 3;
  const capturedPages: PageCaptured[] = [];
  const allDiscoveredAssetUrls = new Set<string>();
  const collectedStylesheetData: Array<{ type: 'inline' | 'link'; content?: string; href?: string }> = [];

  const crawlStartTime = Date.now();
  // Raised to 6 minutes to allow full-site crawl on 512MB single-core free tier servers
  const MAX_CRAWL_DURATION_MS = 6 * 60 * 1000;

  // ── Sitemap.xml Automatic Page Discovery ──────────────────────────────
  try {
    const sitemapCandidates = [
      new URL('/sitemap.xml', normalizedEntryUrl).href,
      new URL('/sitemap_index.xml', normalizedEntryUrl).href,
      new URL('/sitemap-pages.xml', normalizedEntryUrl).href,
    ];

    for (const smUrl of sitemapCandidates) {
      try {
        const smSafety = await validateUrlForSsrfAsync(smUrl);
        if (!smSafety.valid) continue;
        const smRes = await context.request.get(smUrl, { timeout: 5000 });
        if (smRes.ok()) {
          const smText = await smRes.text();
          const locMatches = smText.matchAll(/<loc>([^<]+)<\/loc>/gi);
          let addedCount = 0;
          for (const locMatch of locMatches) {
            const rawLoc = (locMatch[1] || '').trim();
            if (!rawLoc) continue;
            const normLoc = normalizeUrl(rawLoc);
            try {
              const parsedLoc = new URL(normLoc);
              const cleanHost = (h: string) => h.toLowerCase().replace(/^www\./, '');
              if (cleanHost(parsedLoc.hostname) === cleanHost(targetHost)) {
                if (!visitedUrls.has(normLoc) && !pagesToCrawl.includes(normLoc)) {
                  const isBinaryPath = /\.(png|jpe?g|gif|webp|avif|svg|ico|pdf|zip|mp[34]|woff2?|css|js|xml)($|\/)/i.test(parsedLoc.pathname);
                  if (!isBinaryPath) {
                    pagesToCrawl.push(normLoc);
                    addedCount++;
                  }
                }
              }
            } catch {}
          }
          if (addedCount > 0) {
            log(`[Sitemap Discovery] Discovered ${addedCount} pages from ${smUrl}`);
            break;
          }
        }
      } catch {}
    }
  } catch {}

  try {
    let pageCount = 0;

    while (pagesToCrawl.length > 0 && pageCount < maxPages) {
      if (Date.now() - crawlStartTime > MAX_CRAWL_DURATION_MS && capturedPages.length > 0) {
        log(`[Crawl Watchdog] Crawl duration limit reached. Finalizing capture with ${capturedPages.length} page(s)...`);
        break;
      }

      page = await ensureActivePage();

      const rawCurrentUrl = pagesToCrawl.shift()!;
      const currentUrl = normalizeUrl(rawCurrentUrl);

      // Pages whose crawl crashed (browser/context closed on heavy JS sites) are
      // re-queued for retry instead of being permanently dropped. Retry attempts
      // don't re-check visited nor consume the page budget.
      const tries = retryCounts.get(currentUrl) || 0;
      if (tries === 0) {
        if (visitedUrls.has(currentUrl)) continue;
        visitedUrls.add(currentUrl);
        pageCount++;
      }

      const isEntry = currentUrl === normalizedEntryUrl || pageCount === 1;

      // Subpage SSRF validation
      const ssrfSubpage = await validateUrlForSsrfAsync(currentUrl);
      if (!ssrfSubpage.valid) {
        log(`[SSRF Guard] Skipping blocked subpage URL: ${currentUrl} (${ssrfSubpage.reason || 'Blocked IP/host'})`);
        continue;
      }

      log(`Crawling page ${pageCount}: ${currentUrl}`);

      // Generous timeout for 512MB single-core CPU hosting (45s entry, 30s subpages)
      const gotoTimeout = isEntry ? 45000 : 30000;

      try {
        try {
          await page.goto(currentUrl, { waitUntil: 'domcontentloaded', timeout: gotoTimeout });
        } catch {
          log(`[Browser Engine] domcontentloaded timeout on ${currentUrl}, checking DOM content fallback...`);
          try {
            await page.goto(currentUrl, { waitUntil: 'load', timeout: 10000 });
          } catch {}
        }
        
        try { await page.waitForLoadState('networkidle', { timeout: 2000 }); } catch {}

        // ── Agentic Engine: Smart Preloader Detection & Hydration Wait ─────
        log(`[Agent Engine] Inspecting DOM & awaiting preloader resolution on ${currentUrl}...`);

        try {
          await page.evaluate(async (isEntryPage: boolean) => {
            const startTime = Date.now();
            const maxWait = isEntryPage ? 10000 : 5000; // Wait up to 10s for entry, 5s for subpages on slow CPU

            const preloaderSelectors = [
              '.loader-wrap', '.loader-wrap-heading', '.preloader', '#preloader',
              '.loader', '#loader', '[class*="loader-wrap"]', '[class*="preloader"]',
              '[id*="preloader"]', '[class*="splash"]', '[class*="intro-loader"]',
              '[id*="splash"]', '.page-loader', '#page-loader', '.loading-screen',
              '#loading-screen', '.framer-preloader', '#framer-preloader'
            ];

            const isPreloaderActive = () => {
              for (const sel of preloaderSelectors) {
                const el = document.querySelector(sel);
                if (el) {
                  const style = window.getComputedStyle(el);
                  if (style.display !== 'none' && style.visibility !== 'hidden' && parseFloat(style.opacity || '1') > 0.05) {
                    return true;
                  }
                }
              }
              return false;
            };

            // Poll until preloader exits and anchors/main content are present
            while (Date.now() - startTime < maxWait) {
              const anchorsCount = document.querySelectorAll('a[href]').length;
              const mainEl = document.querySelector('main, #main, article, [data-framer-component], .content, #content');
              const mainVisible = mainEl ? window.getComputedStyle(mainEl).display !== 'none' && parseFloat(window.getComputedStyle(mainEl).opacity || '1') > 0.1 : true;

              if (!isPreloaderActive() && anchorsCount > 0 && mainVisible) {
                break;
              }
              await new Promise((r) => setTimeout(r, 250));
            }

            // Forced Preloader Bypass: Force-hide lingering preloader overlays & unhide main content
            preloaderSelectors.forEach((sel) => {
              document.querySelectorAll(sel).forEach((el) => {
                try {
                  (el as HTMLElement).style.display = 'none';
                  (el as HTMLElement).style.opacity = '0';
                  (el as HTMLElement).style.visibility = 'hidden';
                  (el as HTMLElement).style.pointerEvents = 'none';
                  (el as HTMLElement).style.zIndex = '-9999';
                } catch {}
              });
            });

            // Unhide main content container if hidden by GSAP/CSS
            document.querySelectorAll('main, #main, article, [data-framer-component], .content, #content').forEach((el) => {
              try {
                (el as HTMLElement).style.opacity = '1';
                (el as HTMLElement).style.visibility = 'visible';
                (el as HTMLElement).style.display = 'block';
              } catch {}
            });
          }, isEntry);
        } catch {}

        // RC5 fix: Short network-idle wait — capped tightly so sites with continuous
        // API polling don't eat the full timeout on every page.
        // Entry page gets 1200ms, subpages get 600ms (they share the same JS bundle
        // already loaded on entry so networkidle settles much faster).
        const idleTimeout = isEntry ? 1200 : 600;
        try { await page.waitForLoadState('networkidle', { timeout: idleTimeout }); } catch {}

        // Dismiss cookie/GDPR banners
        const cookieDismissSelectors = [
          'button[id*="accept"]', 'button[class*="accept"]',
          'button[id*="cookie"]', 'button[class*="cookie"]',
          '[aria-label*="Accept"]', '[aria-label*="accept"]',
          '.cc-btn.cc-allow', '.fc-cta-consent', '#onetrust-accept-btn-handler',
          'button:has-text("Accept")', 'button:has-text("Accept all")',
          'button:has-text("I accept")', 'button:has-text("Got it")',
          'button:has-text("Agree")', '.cookie-accept',
        ];
        for (const sel of cookieDismissSelectors) {
          try {
            const btn = page.locator(sel).first();
            if (await btn.isVisible({ timeout: 500 })) {
              await btn.click({ timeout: 500 });
              await page.waitForTimeout(200);
              break;
            }
          } catch {}
        }

        // RC6 fix: Fast-scroll BEFORE page.content() so IntersectionObserver lazy images
        // resolve before the DOM snapshot.
        // Entry page: full bidirectional pass (catches above-fold + below-fold lazy loads).
        // Subpages:   single downward pass only — fast, avoids timeout budget overrun.
        try {
          await page.evaluate(async (isEntryPage: boolean) => {
            const maxScroll = Math.min(
              Math.max(document.body.scrollHeight, document.documentElement.scrollHeight),
              isEntryPage ? 8000 : 5000
            );
            // Downward pass: trigger IntersectionObserver on every lazy image
            const step = isEntryPage ? 300 : 400;
            const delay = isEntryPage ? 50 : 40;
            for (let y = 0; y < maxScroll; y += step) {
              window.scrollTo({ top: y, behavior: 'instant' });
              await new Promise((r) => setTimeout(r, delay));
            }
            // Entry page only: one upward pass to catch above-fold lazy loads
            if (isEntryPage) {
              for (let y = maxScroll; y >= 0; y -= 600) {
                window.scrollTo({ top: y, behavior: 'instant' });
                await new Promise((r) => setTimeout(r, 30));
              }
            }
            window.scrollTo(0, 0);
            await new Promise((r) => setTimeout(r, 200));

            // Reset smooth scroll wrapper inline transformations so snapshot is clean
            const smoothWrapper = document.getElementById('smooth-wrapper');
            if (smoothWrapper) {
              smoothWrapper.style.position = 'static';
              smoothWrapper.style.overflow = 'visible';
              smoothWrapper.style.inset = 'auto';
              smoothWrapper.style.height = 'auto';
            }
            const smoothContent = document.getElementById('smooth-content');
            if (smoothContent) {
              smoothContent.style.transform = 'none';
              smoothContent.style.translate = 'none';
              smoothContent.style.position = 'static';
              smoothContent.style.overflow = 'visible';
            }
            if (document.body) {
              document.body.style.height = 'auto';
              document.body.style.overflow = 'visible';
            }
          }, isEntry);
        } catch {}

        // Short settle after scroll — 800ms entry / 400ms subpages
        // (replaces the old 2500ms networkidle that ran to timeout on polling sites)
        await page.waitForTimeout(isEntry ? 800 : 400);

        // Clean up blocking preloader elements before DOM HTML snapshot
        try {
          await page.evaluate(() => {
            const preloaderSelectors = [
              '.loader-wrap', '.loader-wrap-heading', '.preloader', '#preloader',
              '.loader', '#loader', '[class*="loader-wrap"]', '[class*="preloader"]',
              '[id*="preloader"]', '[class*="splash"]', '[class*="intro-loader"]'
            ];
            preloaderSelectors.forEach((sel) => {
              document.querySelectorAll(sel).forEach((el) => {
                try { el.remove(); } catch {}
              });
            });
          });
        } catch {}

        // NOW snapshot the DOM — lazy images are resolved, preloaders removed,
        // scroll position is back at top, smooth-scroll wrappers are neutralised.
        const pageHtml = await page.content();
        const cleanPageHtml = stripPlatformWatermarks(pageHtml);
        const htmlFilename = urlToHtmlFilename(currentUrl, isEntry);
        const rawHtmlPath = path.join(/* turbopackIgnore: true */ pagesRawDir, htmlFilename);
        fs.writeFileSync(rawHtmlPath, cleanPageHtml, 'utf-8');

        if (isEntry) {
          fs.writeFileSync(path.join(/* turbopackIgnore: true */ rawDir, 'page.html'), cleanPageHtml, 'utf-8');
        }

        // Wait for the DOM to contain anchors — protects against extracting
        // during early hydration when SPA frameworks briefly unmount/replace SSR markup.
        try {
          await page.evaluate(async () => {
            const started = Date.now();
            while (Date.now() - started < 8000) {
              if (document.querySelectorAll('a[href]').length > 0) return true;
              await new Promise((r) => setTimeout(r, 250));
            }
            return false;
          });
        } catch {}

        // Extract internal links for subpage crawling (checks standard anchors, data-href, and client router references)
        let internalLinks: string[] = [];
        try {
          internalLinks = await page.evaluate((targetHost: string) => {
            const links = new Set<string>();
            const cleanHost = (h: string) => h.toLowerCase().replace(/^www\./, '');
            const normalizedTarget = cleanHost(targetHost);

            const checkAndAdd = (hrefProp: string | null | undefined) => {
              if (!hrefProp || typeof hrefProp !== 'string') return;
              const h = hrefProp.trim();
              if (!h || h === './' || h.startsWith('#') || h.startsWith('javascript:') || h.startsWith('mailto:') || h.startsWith('tel:') || h.startsWith('data:')) return;
              try {
                const absUrl = new URL(h, window.location.href);
                if (cleanHost(absUrl.hostname) === normalizedTarget && (absUrl.protocol === 'http:' || absUrl.protocol === 'https:')) {
                  let p = absUrl.pathname || '/';
                  if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
                  const norm = `${absUrl.protocol}//${absUrl.host}${p}`;
                  links.add(norm);
                }
              } catch {}
            };

            // 1. Standard HTML Anchors
            document.querySelectorAll('a[href]').forEach((el) => {
              const a = el as HTMLAnchorElement;
              checkAndAdd(a.getAttribute('href') || a.href);
            });

            // 2. Custom button / card data-href or data-url attributes
            document.querySelectorAll('[data-href], [data-url], [data-path], [data-route]').forEach((el) => {
              checkAndAdd(el.getAttribute('data-href') || el.getAttribute('data-url') || el.getAttribute('data-path') || el.getAttribute('data-route'));
            });

            // 3. Framer __framer__ / routes in window or hydration scripts
            try {
              document.querySelectorAll('script').forEach((s) => {
                const txt = s.textContent || '';
                if (txt.includes('routes') || txt.includes('path') || txt.includes('/work/') || txt.includes('/project/')) {
                  const m = txt.matchAll(/"(path|route|href|url)":\s*"(\/[a-zA-Z0-9_\-\/]+)"/gi);
                  for (const match of m) {
                    if (match && match[2]) checkAndAdd(match[2]);
                  }
                }
              });
            } catch {}

            return [...links];
          }, targetHost);
        } catch {}

        // Fallback: Regex scan captured HTML source for exact href links (handles static and SSR anchors)
        const linkRegex = /(?:href|data-href|data-url)=["']([^"']+)["']/gi;
        let match;
        while ((match = linkRegex.exec(cleanPageHtml)) !== null) {
          const hrefVal = (match[1] || '').trim();
          if (!hrefVal || hrefVal === './' || hrefVal.startsWith('#') || hrefVal.startsWith('javascript:') || hrefVal.startsWith('mailto:') || hrefVal.startsWith('tel:') || hrefVal.startsWith('//') || /^[a-z][a-z0-9+.-]*:/i.test(hrefVal)) continue;
          try {
            const u = new URL(hrefVal, currentUrl);
            u.hash = '';
            u.search = '';
            let p = u.pathname;
            if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
            const fullUrl = `${u.protocol}//${u.host}${p}`;

            const cleanHost = (h: string) => h.toLowerCase().replace(/^www\./, '');
            const uHost = cleanHost(u.hostname);
            const tHost = cleanHost(targetHost);
            if (uHost === tHost && !internalLinks.includes(fullUrl)) {
              internalLinks.push(fullUrl);
            }
          } catch {}
        }

        log(`Discovered ${internalLinks.length} internal links on ${currentUrl}`);

        for (const rawLink of internalLinks) {
          const link = normalizeUrl(rawLink);
          const linkCheck = validateUrlForSsrf(link);
          const isExternalDomainInPath = /\/(www\.|linkedin\.com|twitter\.com|facebook\.com|instagram\.com|github\.com|youtube\.com)/i.test(link);
          if (linkCheck.valid && !visitedUrls.has(link) && !pagesToCrawl.includes(link) && !isExternalDomainInPath) {
            // Only crawl pages — never binary/media/data files. Anything whose
            // path ends in a non-HTML extension (images, fonts, video, archives,
            // config, manifests, icons, maps) is an asset, not a page. Query
            // strings were already stripped by normalizeUrl, so `$` is safe.
            const pathPart = new URL(link).pathname;
            const isBinaryPath = /\.(png|jpe?g|gif|webp|avif|svg|ico|bmp|tiff?|webmanifest|json|xml|pdf|zip|gz|tar|7z|rar|mp[34]|webm|ogg|mov|avi|wav|flac|woff2?|ttf|otf|eot|css|js|map|wasm|txt|md|rss|atom|cur|bin|eps|psd|ai)($|\/)/i.test(pathPart);
            if (!isBinaryPath) {
              pagesToCrawl.push(link);
              log(`Queued subpage: ${link}`);
            }
          }
        }

        // Extract Page Metadata
        let meta: ExtractedMeta = { title: currentUrl, canonicalUrl: null, metaTags: [], jsonLd: [] };
        try {
          meta = await page.evaluate(() => {
            const title = document.title || '';
            const canonicalEl = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
            const canonicalUrl = canonicalEl?.href || null;
            const metaTags: Array<{ name?: string; property?: string; content?: string }> = [];
            document.querySelectorAll('meta').forEach((m) => {
              const name     = m.getAttribute('name')     || undefined;
              const property = m.getAttribute('property') || undefined;
              const content  = m.getAttribute('content')  || undefined;
              if (name || property) metaTags.push({ name, property, content });
            });
            const jsonLd: unknown[] = [];
            document.querySelectorAll('script[type="application/ld+json"]').forEach((s) => {
              try { if (s.textContent) jsonLd.push(JSON.parse(s.textContent)); } catch {}
            });
            return { title, canonicalUrl, metaTags, jsonLd };
          });
        } catch {}

        if (!capturedPages.some((p) => p.url === currentUrl)) {
          capturedPages.push({
            url: currentUrl,
            pathname: new URL(currentUrl).pathname,
            title: meta.title || currentUrl,
            htmlFilename,
            rawHtmlPath,
            meta,
          });
        }

        // Collect DOM assets from this page (images, videos, fonts, icons, scripts)
        let domAssets: string[] = [];
        try {
          domAssets = await page.evaluate(() => {
            const urls = new Set<string>();
            document.querySelectorAll('img').forEach((el) => {
              if (el.src && !el.src.startsWith('data:')) urls.add(el.src);
              el.srcset?.split(',').forEach((p) => {
                const u = p.trim().split(/\s+/)[0];
                if (u && !u.startsWith('data:')) urls.add(u);
              });
            });
            document.querySelectorAll('source').forEach((el) => {
              if ((el as HTMLSourceElement).src) urls.add((el as HTMLSourceElement).src);
              (el as HTMLSourceElement).srcset?.split(',').forEach((p) => {
                const u = p.trim().split(/\s+/)[0];
                if (u) urls.add(u);
              });
            });
            document.querySelectorAll('video').forEach((el) => {
              if (el.src) urls.add(el.src);
              if (el.poster) urls.add(el.poster);
            });
            document.querySelectorAll<HTMLLinkElement>('link[rel*="icon"],link[rel*="apple"]').forEach((el) => {
              if (el.href) urls.add(el.href);
            });
            document.querySelectorAll<HTMLElement>('[style*="url("]').forEach((el) => {
              const m = el.style.backgroundImage.match(/url\(['"]?(.*?)['"]?\)/);
              if (m?.[1] && !m[1].startsWith('data:')) urls.add(m[1]);
            });
            // Extract external scripts and modulepreload resources (Framer / React / motion libraries)
            document.querySelectorAll('script[src], link[rel="modulepreload"], link[rel="preload"][as="script"]').forEach((el) => {
              const src = (el as HTMLScriptElement).src || el.getAttribute('href');
              if (src && !src.startsWith('data:') && !src.startsWith('blob:') && !src.includes('google-analytics') && !src.includes('gtag') && !src.includes('framer.com/edit')) {
                try {
                  urls.add(new URL(src, window.location.href).href);
                } catch {
                  urls.add(src);
                }
              }
            });
            return [...urls];
          });
        } catch {}

        domAssets.forEach((u) => allDiscoveredAssetUrls.add(u));

        // Extract stylesheets from this active DOM context
        try {
          const stylesOnPage = await page.evaluate(() => {
            const out: Array<{ type: 'inline' | 'link'; content?: string; href?: string }> = [];
            document.querySelectorAll<HTMLStyleElement>('style').forEach((s) => {
              if (s.textContent?.trim()) out.push({ type: 'inline', content: s.textContent });
            });
            document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]').forEach((l) => {
              if (l.href) out.push({ type: 'link', href: l.href });
            });
            return out;
          });
          for (const st of stylesOnPage) {
            if (st.type === 'inline' && st.content) {
              if (!collectedStylesheetData.some((s) => s.type === 'inline' && s.content === st.content)) {
                collectedStylesheetData.push(st);
              }
            } else if (st.type === 'link' && st.href) {
              if (!collectedStylesheetData.some((s) => s.type === 'link' && s.href === st.href)) {
                collectedStylesheetData.push(st);
              }
            }
          }
        } catch {}

        // Take screenshots on entry page and save to both directory targets
        if (isEntry) {
          log('Taking true responsive breakpoint screenshots of main page...');

          const takeBreakpointShot = async (label: 'desktop' | 'tablet' | 'mobile', width: number, height: number) => {
            const p1 = path.join(screensDir, `${label}.png`);
            const p2 = path.join(screensExportDir, `${label}.png`);

            try {
              await page.setViewportSize({ width, height });
              await page.waitForTimeout(300);

              await page.screenshot({ path: p1, fullPage: false, animations: 'disabled', scale: 'css', timeout: 10000 });
              if (fs.existsSync(p1) && fs.statSync(p1).size > 100) {
                fs.copyFileSync(p1, p2);
                log(`Screenshot OK (${label} ${width}x${height})`);
                return;
              }
            } catch (err) {
              const cleanMsg = stripAnsi((err as Error)?.message || String(err));
              log(`Warning: ${label} screenshot initial attempt failed (${cleanMsg}). Trying body locator fallback...`);
            }

            // Retry with body locator
            try {
              await page.locator('body').screenshot({ path: p1, animations: 'disabled', timeout: 5000 });
              if (fs.existsSync(p1) && fs.statSync(p1).size > 100) {
                fs.copyFileSync(p1, p2);
                log(`Screenshot OK via body locator (${label} ${width}x${height})`);
                return;
              }
            } catch {}

            // Fallback to desktop.png if desktop shot was taken
            const desktopFallback = path.join(screensDir, 'desktop.png');
            if (label !== 'desktop' && fs.existsSync(desktopFallback) && fs.statSync(desktopFallback).size > 100) {
              fs.copyFileSync(desktopFallback, p1);
              fs.copyFileSync(desktopFallback, p2);
              log(`Warning: ${label} screenshot failed — using desktop frame as fallback`);
            }
          };

          await takeBreakpointShot('desktop', 1440, 900);
          await takeBreakpointShot('tablet', 768, 1024);
          await takeBreakpointShot('mobile', 390, 844);
          await page.setViewportSize({ width: 1440, height: 900 });
        }
      } catch (err) {
        const crash = isBrowserCrashError(err);
        const tries = retryCounts.get(currentUrl) || 0;
        log(`Warning: Page crawl ${crash ? 'crash' : 'error'} for ${currentUrl}: ${err}`);

        // Only retry entry page or subpages if browser actually crashed.
        // Standard subpage timeouts are logged and skipped to save time budget.
        const allowRetry = isEntry ? tries < MAX_PAGE_ATTEMPTS : (crash && tries < 1);

        if (allowRetry) {
          retryCounts.set(currentUrl, tries + 1);
          pagesToCrawl.push(currentUrl);
          log(`[Retry ${tries + 1}] Re-queuing ${currentUrl} after ${crash ? 'browser crash' : 'crawl error'}...`);

          if (crash) {
            try { if (browser) await browser.close().catch(() => {}); } catch {}
            await initBrowserAndContext();
          }
        } else {
          log(`Skipping subpage ${currentUrl} after crawl ${crash ? 'crash' : 'timeout'}.`);
        }

        try {
          await page.evaluate(() => window.stop()).catch(() => {});
        } catch {}
      }
    }

    log(`Crawled ${capturedPages.length} pages total.`);

    // ── Extract stylesheets ─────────────────────────────────────────────
    log('Extracting stylesheets...');
    // Fallback: Also extract stylesheets from captured HTML files if missing
    for (const cp of capturedPages) {
      try {
        const html = fs.readFileSync(cp.rawHtmlPath, 'utf-8');
        const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
        let match;
        while ((match = styleRegex.exec(html)) !== null) {
          const content = match[1]?.trim();
          if (content && !collectedStylesheetData.some((s) => s.type === 'inline' && s.content === content)) {
            collectedStylesheetData.push({ type: 'inline', content });
          }
        }
        const linkRegex = /<link[^>]+rel=["']?stylesheet["']?[^>]*>/gi;
        while ((match = linkRegex.exec(html)) !== null) {
          const hrefMatch = match[0].match(/href=["']([^"']+)["']/i);
          if (hrefMatch?.[1]) {
            try {
              const absoluteHref = new URL(hrefMatch[1], cp.url).href;
              if (!collectedStylesheetData.some((s) => s.type === 'link' && s.href === absoluteHref)) {
                collectedStylesheetData.push({ type: 'link', href: absoluteHref });
              }
            } catch {}
          }
        }
      } catch {}

      // Universally discover all media assets (images, videos, fonts, icons) from all captured HTML pages
      try {
        const html = fs.readFileSync(cp.rawHtmlPath, 'utf-8');
        const assetSrcRegex = /(?:src|href|poster|data-background|data-bg|data-src|data-srcset)=["']([^"']+)["']/gi;
        let match;
        while ((match = assetSrcRegex.exec(html)) !== null) {
          const val = (match[1] || '').trim();
          if (!val || val.startsWith('data:') || val.startsWith('blob:') || val.startsWith('#') || val.startsWith('javascript:')) continue;
          if (/\.(png|jpe?g|gif|webp|avif|svg|ico|bmp|mp[34]|webm|ogg|mov|woff2?|ttf|otf|eot|pdf)($|\?|#)/i.test(val)) {
            try {
              const abs = new URL(val, cp.url).href;
              allDiscoveredAssetUrls.add(abs);
            } catch {}
          }
        }
      } catch {}
    }

    const cssPaths: string[] = [];
    let styleIdx = 1;
    for (const s of collectedStylesheetData) {
      if (s.type === 'inline' && s.content) {
        const p = path.join(stylesDir, `style_${styleIdx++}.css`);
        fs.writeFileSync(p, sanitizeCssText(s.content), 'utf-8');
        cssPaths.push(p);
      }
    }

    const externalStyles = collectedStylesheetData.filter((s): s is { type: 'link'; href: string } => s.type === 'link' && !!s.href);
    if (externalStyles.length > 0) {
      const fetchCssRecursively = async (cssUrl: string, depth = 0): Promise<string> => {
        if (depth > 5) return '';
        try {
          const assetSafety = await validateUrlForSsrfAsync(cssUrl);
          if (!assetSafety.valid) return '';
          const res = await context.request.get(cssUrl, { timeout: 8000 });
          if (!res.ok()) return '';
          let text = await res.text();

          // Match @import url("...") and @import "..."
          const importRegex = /@import\s+(?:url\(['"]?([^'"()]+)['"]?\)|['"]([^'"]+)['"]);?/gi;
          let match;
          const importsToFetch: Array<{ matchStr: string; subUrl: string }> = [];
          while ((match = importRegex.exec(text)) !== null) {
            const subPath = match[1] || match[2];
            if (subPath && !subPath.startsWith('data:')) {
              try {
                const subUrl = new URL(subPath, cssUrl).href;
                importsToFetch.push({ matchStr: match[0], subUrl });
              } catch {}
            }
          }

          for (const item of importsToFetch) {
            const subContent = await fetchCssRecursively(item.subUrl, depth + 1);
            if (subContent) {
              text = text.replace(item.matchStr, `/* @import ${item.subUrl} */\n${subContent}\n`);
            }
          }

          return text;
        } catch {
          return '';
        }
      };

      const extResults = await Promise.all(
        externalStyles.map(async (s) => fetchCssRecursively(s.href))
      );

      for (const cssText of extResults) {
        if (cssText) {
          const p = path.join(stylesDir, `style_${styleIdx++}.css`);
          fs.writeFileSync(p, sanitizeCssText(cssText), 'utf-8');
          cssPaths.push(p);
        }
      }
    }

    // Parse CSS for background image/font asset URLs
    const cssAssetUrls: string[] = [];
    for (const cssPath of cssPaths) {
      const css = fs.readFileSync(cssPath, 'utf-8');
      for (const m of css.matchAll(/url\(['"]?(.*?)['"]?\)/g)) {
        const u = m[1];
        if (u && !u.startsWith('data:')) {
          try { cssAssetUrls.push(new URL(u, url).href); } catch {}
        }
      }
    }

    // ── Download all assets (Concurrent pool) ─────────────────────────────
    // RC9 fix: Use normalizeAssetUrl (keeps CDN query strings) for dedup —
    // normalizeUrl would strip ?w=800&q=80 from Cloudinary/Imgix URLs and fetch
    // the wrong resource (wrong size / crop / format).
    // RC4 fix: Raised cap to 600. Assets are sorted by visual priority so images
    // and fonts always download first and scripts/videos only if cap permits.
    const rawMergedUrls = [
      ...allDiscoveredAssetUrls,
      ...cssAssetUrls,
      ...networkAssetUrls,
    ];

    // Deduplicate using normalizeAssetUrl (hash-only strip, preserves query string)
    const seenAssetUrls = new Set<string>();
    const mergedAssetUrls: string[] = [];
    for (const u of rawMergedUrls) {
      if (!u.startsWith('http://') && !u.startsWith('https://')) continue;
      const normed = normalizeAssetUrl(u);
      if (!seenAssetUrls.has(normed)) {
        seenAssetUrls.add(normed);
        mergedAssetUrls.push(u);
      }
    }

    // Sort by visual & interactive priority: fonts & scripts first (so typography, interactions & animations work), images next, video last
    const priorityOrder = (u: string): number => {
      const lower = u.toLowerCase().split('?')[0];
      if (lower.match(/\.(woff2?|ttf|otf|eot)/)) return 0;    // fonts — highest
      if (lower.match(/\.(m?js|wasm)/)) return 1;              // scripts, modules & animations — high priority
      if (lower.match(/\.(png|jpe?g|gif|webp|avif|svg|ico)/)) return 2; // images
      if (lower.match(/\.(mp4|webm|ogg|mov)/)) return 3;       // video
      return 2;
    };
    mergedAssetUrls.sort((a, b) => priorityOrder(a) - priorityOrder(b));

    const cappedAssetUrls = mergedAssetUrls.slice(0, 1500); // raised to 1500 to guarantee 100% replication of all scripts & assets

    log(`Downloading ${cappedAssetUrls.length} total assets in parallel (${mergedAssetUrls.length} discovered)...`);

    const ASSET_CONCURRENCY = 6;
    const downloadedManifestItems: Array<ExtractedAsset | null> = new Array(cappedAssetUrls.length).fill(null);

    let nextAssetIndex = 0;
    const assetWorkers = Array.from({ length: Math.min(ASSET_CONCURRENCY, cappedAssetUrls.length) }, async () => {
      while (nextAssetIndex < cappedAssetUrls.length) {
        const itemIdx = nextAssetIndex++;
        const assetUrl = cappedAssetUrls[itemIdx];
        const assetNumber = itemIdx + 1;

        try {
          // Assets are downloaded server-side (Node), so a malicious page could
          // otherwise point them at internal services. DNS-resolving SSRF check.
          const assetSafety = await validateUrlForSsrfAsync(assetUrl);
          if (!assetSafety.valid) {
            log(`[SSRF Guard] Skipped blocked asset URL: ${assetUrl} (${assetSafety.reason})`);
            continue;
          }
          const res = await context.request.get(assetUrl, {
            timeout: 6000,
            headers: { 'Accept': 'image/png,image/jpeg,image/gif,image/svg+xml,image/*;q=0.8,application/javascript,*/*;q=0.5' },
          });
          if (!res.ok()) continue;

          const body = await res.body();
          // Limit individual asset size to 35MB to prevent memory/disk exhaustion
          if (body.length > 35 * 1024 * 1024) {
            log(`[Resource Limit] Skipped oversized asset (${(body.length / 1024 / 1024).toFixed(1)} MB): ${assetUrl}`);
            continue;
          }

          const ct = res.headers()['content-type'] || '';
          const category = getAssetCategory(assetUrl, ct);
          const ext = guessExtension(assetUrl, ct);
          const filename = sanitizeFilename(assetUrl, assetNumber, ext, category);

          const catDir =
            category === 'fonts' ? fontsDir :
            category === 'icons' ? iconsDir :
            category === 'video' ? videoDir :
            category === 'scripts' ? assetsScriptsDir :
            imagesDir;

          const localPath = path.join(/* turbopackIgnore: true */ catDir, filename);
          const relPath   = path.relative(rawDir, localPath).replace(/\\/g, '/');

          fs.writeFileSync(localPath, body);
          downloadedManifestItems[itemIdx] = { originalUrl: assetUrl, category, localPath: relPath, filename };
        } catch {}
      }
    });

    await Promise.all(assetWorkers);

    const assetManifest: ExtractedAsset[] = downloadedManifestItems.filter(
      (item): item is ExtractedAsset => item !== null
    );

    fs.writeFileSync(path.join(rawDir, 'assets_manifest.json'), JSON.stringify(assetManifest, null, 2), 'utf-8');
    const primaryMeta = capturedPages[0]?.meta || { title: 'Exported Site', canonicalUrl: null, metaTags: [], jsonLd: [] };
    fs.writeFileSync(path.join(rawDir, 'meta.json'), JSON.stringify(primaryMeta, null, 2), 'utf-8');

    log(`Multi-page crawl complete. Captured ${capturedPages.length} pages (${capturedPages.map(p=>p.htmlFilename).join(', ')}) and ${assetManifest.length} assets.`);

    return {
      jobId,
      rawDir,
      baseUrl: normalizedEntryUrl,
      pages: capturedPages,
      cssPaths,
      scriptPaths: [],
      assetManifest,
      screenshotPaths: {
        desktop: path.join(screensDir, 'desktop.png'),
        tablet:  path.join(screensDir, 'tablet.png'),
        mobile:  path.join(screensDir, 'mobile.png'),
      },
      meta: primaryMeta,
    };
  } finally {
    await browser.close().catch(() => {});
  }
}
