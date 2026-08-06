import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { URL } from 'url';
import { CaptureOptions, CaptureResult, ExtractedAsset, ExtractedMeta, PageCaptured } from './types';

// ── Helpers ───────────────────────────────────────────────────────────────────

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

function sanitizeFilename(urlStr: string, index: number, defaultExt: string): string {
  try {
    const parsed = new URL(urlStr);
    let basename = path.basename(parsed.pathname).split('?')[0].split('#')[0];
    if (!basename.includes('.')) {
      basename = `asset_${index}${defaultExt}`;
    } else {
      basename = `${index}_${basename.replace(/[^a-zA-Z0-9_.-]/g, '_')}`;
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
    let p = u.pathname.replace(/\/$/, '');
    if (!p || p === '' || p === '/' || isEntry) return 'index.html';
    const clean = p.replace(/^\//, '').replace(/\//g, '_').replace(/[^a-zA-Z0-9_.-]/g, '');
    return clean.endsWith('.html') ? clean : `${clean}.html`;
  } catch {
    return isEntry ? 'index.html' : 'page.html';
  }
}

function getAssetCategory(urlStr: string, contentType?: string): 'images' | 'fonts' | 'icons' | 'video' {
  const u = urlStr.toLowerCase().split('?')[0];
  const ct = (contentType || '').toLowerCase();

  if (u.match(/\.(woff2?|ttf|otf|eot)/) || ct.includes('font')) return 'fonts';
  if (u.match(/\.(mp4|webm|ogg|mov|avi)/) || ct.includes('video')) return 'video';
  if (u.match(/\.(ico|svg)/) || ct.includes('icon') || ct.includes('svg')) return 'icons';
  return 'images';
}

function guessExtension(urlStr: string, contentType?: string): string {
  const u = urlStr.toLowerCase().split('?')[0];
  const extMatch = u.match(/\.(jpe?g|png|gif|webp|avif|svg|ico|woff2?|ttf|otf|eot|mp4|webm|ogg|css|js)(\?|$)/);
  if (extMatch) return `.${extMatch[1]}`;
  const ct = (contentType || '').split(';')[0].trim();
  const ctMap: Record<string, string> = {
    'image/jpeg': '.jpg', 'image/png': '.png', 'image/gif': '.gif',
    'image/webp': '.webp', 'image/avif': '.avif', 'image/svg+xml': '.svg',
    'image/x-icon': '.ico', 'font/woff2': '.woff2', 'font/woff': '.woff',
    'font/ttf': '.ttf', 'video/mp4': '.mp4', 'video/webm': '.webm',
    'text/css': '.css', 'application/javascript': '.js',
  };
  return ctMap[ct] || '.bin';
}

// ── Multi-page crawler ────────────────────────────────────────────────────────

export async function captureSite(options: CaptureOptions): Promise<CaptureResult> {
  const { jobId, url, maxPages = 15, debug = false, onProgress } = options;

  const normalizedEntryUrl = normalizeUrl(url);
  const entryUrlParsed = new URL(normalizedEntryUrl);
  const targetHost = entryUrlParsed.hostname;

  const log = (msg: string) => {
    console.log(`[Job ${jobId}] ${msg}`);
    if (onProgress) onProgress(msg);
  };

  log(`Starting multi-page capture for: ${normalizedEntryUrl} (max ${maxPages} pages)`);

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
  const screensDir  = path.join(/* turbopackIgnore: true */ rawDir, 'screenshots');

  for (const d of [exportsDir, rawDir, pagesRawDir, stylesDir, scriptsDir, assetsDir, imagesDir, fontsDir, iconsDir, videoDir, screensDir]) {
    fs.mkdirSync(d, { recursive: true });
  }

  // ── Launch browser ──────────────────────────────────────────────────────
  const containerArgs = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--disable-gpu',
    '--disable-blink-features=AutomationControlled',
  ];

  let browser;
  try {
    browser = await chromium.launch({
      headless: !debug,
      args: containerArgs,
    });
  } catch (launchErr: any) {
    log(`[Browser Launch Warning] Standard launch failed: ${launchErr.message}. Attempting fallback launch...`);
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
  }
  const context = await browser.newContext({
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
  // Spoof navigator properties to avoid bot detection
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3] });
  });

  const page = await context.newPage();

  // Track network assets
  const networkAssetUrls = new Set<string>();
  page.on('response', (resp) => {
    const reqUrl = resp.url();
    const ct = resp.headers()['content-type'] || '';
    if (ct.startsWith('image/') || ct.startsWith('font/') || ct.includes('video/') || ct.includes('svg')) {
      networkAssetUrls.add(reqUrl);
    }
  });

  const pagesToCrawl: string[] = [normalizedEntryUrl];
  const visitedUrls = new Set<string>();
  const capturedPages: PageCaptured[] = [];
  const allDiscoveredAssetUrls = new Set<string>();

  try {
    let pageCount = 0;

    while (pagesToCrawl.length > 0 && pageCount < maxPages) {
      const rawCurrentUrl = pagesToCrawl.shift()!;
      const currentUrl = normalizeUrl(rawCurrentUrl);

      if (visitedUrls.has(currentUrl)) continue;
      visitedUrls.add(currentUrl);
      pageCount++;

      const isEntry = currentUrl === normalizedEntryUrl || pageCount === 1;
      log(`Crawling page ${pageCount}/${maxPages}: ${currentUrl}`);

      try {
        await page.goto(currentUrl, { waitUntil: 'domcontentloaded', timeout: 40000 });
        // Wait for network to settle (Framer loads chunks asynchronously)
        try { await page.waitForLoadState('networkidle', { timeout: 12000 }); } catch {}

        // ── Dismiss cookie/GDPR banners before scrolling ──────────────────
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
            if (await btn.isVisible({ timeout: 800 })) {
              await btn.click({ timeout: 800 });
              await page.waitForTimeout(300);
              break;
            }
          } catch {}
        }

        // ── Multi-pass scroll to fully hydrate React/Framer components ────
        await page.evaluate(async () => {
          const getH = () => Math.max(
            document.body.scrollHeight,
            document.documentElement.scrollHeight
          );
          // First pass: fast scroll to trigger lazy images & React hydration
          for (let y = 0; y < getH(); y += 400) {
            window.scrollTo({ top: y, behavior: 'instant' });
            await new Promise((r) => setTimeout(r, 80));
          }
          await new Promise((r) => setTimeout(r, 600));
          // Second pass: slower scroll to trigger IntersectionObserver thresholds
          window.scrollTo(0, 0);
          await new Promise((r) => setTimeout(r, 200));
          for (let y = 0; y < getH(); y += 200) {
            window.scrollTo({ top: y, behavior: 'instant' });
            await new Promise((r) => setTimeout(r, 50));
          }
          await new Promise((r) => setTimeout(r, 800));
          // Return to top so captured HTML reflects scroll-position: 0
          window.scrollTo(0, 0);
          await new Promise((r) => setTimeout(r, 300));
        });

        // Extra wait for React state reconciliation & dynamic content
        await page.waitForTimeout(800);

        // Extract internal links for subpage crawling
        const internalLinks: string[] = await page.evaluate((targetHost) => {
          const links = new Set<string>();
          const anchors = document.querySelectorAll('a[href]');
          anchors.forEach((el) => {
            try {
              const a = el as HTMLAnchorElement;
              const hrefProp = a.href;
              if (!hrefProp || hrefProp.startsWith('javascript:') || hrefProp.startsWith('mailto:') || hrefProp.startsWith('tel:')) return;
              if (a.hostname === targetHost && (a.protocol === 'http:' || a.protocol === 'https:')) {
                let p = a.pathname || '/';
                if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
                const norm = `${a.protocol}//${a.host}${p}`;
                links.add(norm);
              }
            } catch {}
          });
          return [...links];
        }, targetHost);

        log(`Discovered ${internalLinks.length} internal links on ${currentUrl}: ${JSON.stringify(internalLinks)}`);

        for (const rawLink of internalLinks) {
          const link = normalizeUrl(rawLink);
          if (!visitedUrls.has(link) && !pagesToCrawl.includes(link)) {
            if (!link.match(/\.(png|jpg|jpeg|gif|webp|svg|pdf|zip|mp4|css|js)($|\?)/i)) {
              pagesToCrawl.push(link);
              log(`Queued subpage: ${link}`);
            }
          }
        }

        // Capture page DOM HTML
        const pageHtml = await page.content();
        const htmlFilename = urlToHtmlFilename(currentUrl, isEntry);
        const rawHtmlPath = path.join(pagesRawDir, htmlFilename);
        fs.writeFileSync(rawHtmlPath, pageHtml, 'utf-8');

        if (isEntry) {
          fs.writeFileSync(path.join(rawDir, 'page.html'), pageHtml, 'utf-8');
        }

        // Extract Page Metadata
        const meta: ExtractedMeta = await page.evaluate(() => {
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

        capturedPages.push({
          url: currentUrl,
          pathname: new URL(currentUrl).pathname,
          title: meta.title || currentUrl,
          htmlFilename,
          rawHtmlPath,
          meta,
        });

        // Collect DOM assets from this page
        const domAssets: string[] = await page.evaluate(() => {
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
          return [...urls];
        });

        domAssets.forEach((u) => allDiscoveredAssetUrls.add(u));

        // Take screenshots on entry page
        if (isEntry) {
          log('Taking viewport screenshots of main page...');
          const screenshotPaths = {
            desktop: path.join(screensDir, 'desktop.png'),
            tablet:  path.join(screensDir, 'tablet.png'),
            mobile:  path.join(screensDir, 'mobile.png'),
          };
          for (const [name, size] of [
            ['desktop', { width: 1440, height: 900 }],
            ['tablet',  { width: 768,  height: 1024 }],
            ['mobile',  { width: 390,  height: 844  }],
          ] as const) {
            await page.setViewportSize(size);
            await page.waitForTimeout(200);
            await page.screenshot({
              path: screenshotPaths[name as keyof typeof screenshotPaths],
              fullPage: true,
            });
          }
        }
      } catch (err) {
        log(`Warning: Failed to crawl page ${currentUrl}: ${err}`);
      }
    }

    log(`Crawled ${capturedPages.length} pages total.`);

    // ── Extract stylesheets ─────────────────────────────────────────────
    log('Extracting stylesheets...');
    const stylesheetData = await page.evaluate(() => {
      const out: Array<{ type: 'inline' | 'link'; content?: string; href?: string }> = [];
      document.querySelectorAll<HTMLStyleElement>('style').forEach((s) => {
        if (s.textContent?.trim()) out.push({ type: 'inline', content: s.textContent });
      });
      document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]').forEach((l) => {
        if (l.href) out.push({ type: 'link', href: l.href });
      });
      return out;
    });

    const cssPaths: string[] = [];
    let styleIdx = 1;
    for (const s of stylesheetData) {
      if (s.type === 'inline' && s.content) {
        const p = path.join(stylesDir, `style_${styleIdx++}.css`);
        fs.writeFileSync(p, s.content, 'utf-8');
        cssPaths.push(p);
      } else if (s.type === 'link' && s.href) {
        try {
          const res = await context.request.get(s.href, { timeout: 15000 });
          if (res.ok()) {
            const p = path.join(stylesDir, `style_${styleIdx++}.css`);
            fs.writeFileSync(p, await res.text(), 'utf-8');
            cssPaths.push(p);
          }
        } catch {}
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

    // ── Download all assets ────────────────────────────────────────────────
    const mergedAssetUrls = [
      ...new Set([
        ...allDiscoveredAssetUrls,
        ...cssAssetUrls,
        ...networkAssetUrls,
      ]),
    ].filter((u) => u.startsWith('http://') || u.startsWith('https://'));

    log(`Downloading ${mergedAssetUrls.length} total assets...`);

    const assetManifest: ExtractedAsset[] = [];
    let assetCounter = 1;

    for (const assetUrl of mergedAssetUrls) {
      try {
        const res = await context.request.get(assetUrl, { timeout: 15000 });
        if (!res.ok()) continue;

        const ct = res.headers()['content-type'] || '';
        const category = getAssetCategory(assetUrl, ct);
        const ext = guessExtension(assetUrl, ct);
        const filename = sanitizeFilename(assetUrl, assetCounter++, ext);

        const catDir =
          category === 'fonts' ? fontsDir :
          category === 'icons' ? iconsDir :
          category === 'video' ? videoDir :
          imagesDir;

        const localPath = path.join(/* turbopackIgnore: true */ catDir, filename);
        const relPath   = path.relative(rawDir, localPath).replace(/\\/g, '/');

        fs.writeFileSync(localPath, await res.body());
        assetManifest.push({ originalUrl: assetUrl, category, localPath: relPath, filename });
      } catch {}
    }

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
    await browser.close();
  }
}
