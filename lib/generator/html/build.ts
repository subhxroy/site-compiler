import * as fs from 'fs';
import * as path from 'path';
import { cleanDom } from '../../parser/dom-cleaner';
import { parseAndConsolidateCss } from '../../parser/css-parser';
import { processAssets } from '../../parser/asset-pipeline';
import { PageCaptured } from '../../crawler/types';

export interface BuildHtmlOptions {
  jobId: string;
  baseUrl: string;
  pages?: PageCaptured[];
}

export interface BuildHtmlResult {
  outputDir: string;
  indexHtmlPath: string;
  stylesCssPath: string;
  scriptJsPath: string;
  assetCount: number;
  cleanedHtml: string;
  pageCount: number;
}

const FRAMER_FONT_CSS = `
  <link rel="preconnect" href="https://api.fontshare.com">
  <link rel="stylesheet" href="https://api.fontshare.com/v2/css?f[]=archivo@400,500,600,700&display=swap">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap">
`;

// ────────────────────────────────────────────────────────────────────────────
// CRITICAL OVERRIDE CSS — minimal, surgical, and non-destructive.
// We ONLY fix elements that are definitively broken in a static export.
// We deliberately avoid blanket rules that could override correct positioning.
// ────────────────────────────────────────────────────────────────────────────
const CRITICAL_OVERRIDE_CSS = `
<style id="sitecompiler-critical">
  /* Smooth scroll */
  html { scroll-behavior: smooth; }

  /* Prevent horizontal overflow while preserving fixed/sticky elements */
  html, body { overflow-x: clip !important; }

  /* ── Framer appear-animation: reveal hidden initial states ── */
  /* These are SSR placeholder states that Framer Motion animates away.
     Without the React runtime they stay hidden. We reveal them statically.
     IMPORTANT: Exclude center-hinted elements — they need their translateX(-50%)
     preserved for correct navbar centering. */
  [data-framer-appear-id]:not([data-framer-layout-hint-center-x]) {
    opacity: 1 !important;
    transform: none !important;
    filter: none !important;
    visibility: visible !important;
  }
  /* Center-hinted elements: reveal opacity but preserve transform for centering */
  [data-framer-appear-id][data-framer-layout-hint-center-x] {
    opacity: 1 !important;
    filter: none !important;
    visibility: visible !important;
  }

  /* ── Framer centered floating navbar / pill elements ──
     Framer uses transform:translateX(-50%) + JS-injected left:50% + position:fixed
     for centering floating elements. In static export the JS never sets position/left,
     so the element appears offset. We restore it here.
     data-framer-layout-hint-center-x="true" is the canonical Framer center marker. */
  [data-framer-layout-hint-center-x="true"] {
    position: fixed !important;
    top: 20px !important;
    left: 50% !important;
    z-index: 9999 !important;
    /* The existing style="transform: translateX(-50%)" on the element handles horizontal centering */
  }

  /* The ssr-variant wrapper that holds the navbar should not create layout space */
  .ssr-variant:has([data-framer-layout-hint-center-x]) {
    pointer-events: none;
    height: 0 !important;
    overflow: visible !important;
  }
  .ssr-variant:has([data-framer-layout-hint-center-x]) > * {
    pointer-events: auto;
  }

  /* ── Framer word-by-word text reveal (opacity: 0.001 start state) ── */
  span[style*="opacity: 0.001"],
  span[style*="opacity:0.001"] {
    opacity: 1 !important;
    transform: none !important;
    filter: none !important;
  }

  /* ── Universal site headers — WordPress / Webflow / Wix / Squarespace ── */
  header.site-header,
  header.header,
  .site-header,
  .masthead,
  nav.site-navigation,
  nav.main-navigation,
  nav.navbar,
  .w-nav,
  .c-navbar,
  header[id*="header"],
  header[id*="masthead"],
  .sticky-nav,
  .navbar-fixed-top,
  .nav-fixed {
    position: sticky !important;
    top: 0 !important;
    z-index: 9999 !important;
  }

  /* ── Webflow navbar ── */
  [data-wf-page] nav,
  [data-w-id] nav {
    position: sticky !important;
    top: 0 !important;
    z-index: 9999 !important;
  }

  /* ── Framer editor overlays (strip) ── */
  #__framer-editorbar,
  [id*="editor-bar"],
  [class*="editorbar"],
  .__framer-inspector { display: none !important; }

  /* ── Framer background noise overlay containers ──
     These use a fixed noise texture at very low opacity. Keep them decorative only. */
  div[style*="background-image"][style*="opacity:0.04"],
  div[style*="background-image"][style*="opacity: 0.04"] {
    position: fixed !important;
    top: 0 !important; left: 0 !important;
    width: 100vw !important; height: 100vh !important;
    pointer-events: none !important;
    z-index: -1 !important;
    overflow: hidden !important;
  }

  /* ── Scroll-reveal: initial states for IntersectionObserver script ──
     Elements with translateY initial state (Framer / AOS / GSAP pattern) */
  [data-sitecompiler-reveal] {
    opacity: 0;
    transform: translateY(24px);
    transition: opacity 0.6s ease, transform 0.6s ease;
  }
  [data-sitecompiler-reveal="visible"] {
    opacity: 1;
    transform: none;
  }
</style>
`;

// ────────────────────────────────────────────────────────────────────────────
// ANIMATION SHIM — Universal v3.0
// Handles: Framer, Webflow, WordPress (AOS), Wix, Squarespace, custom JS
// Restores: scroll-reveal, hover effects, responsive breakpoints, mobile nav,
//           sticky header, parallax, counter animations, marquee scroll
// ────────────────────────────────────────────────────────────────────────────
const ANIMATION_SHIM_JS = `
/**
 * SiteCompiler Universal Animation Shim — v3.0
 * Replaces framework runtime for exported static HTML.
 * Works with: Framer, Webflow, WordPress, Wix, Squarespace, custom sites.
 */
(function () {
  'use strict';

  /* ── 1. Responsive breakpoint classes (Framer SSR) ── */
  function applyBreakpoints() {
    var w = window.innerWidth;
    // Framer uses hash-based hidden class variants
    var framerHash = w >= 1280 ? '1y5deqo' : w >= 810 ? '1gqtqv1' : 'eh3b30';
    document.querySelectorAll('[class*="hidden-"]').forEach(function (el) {
      el.style.display = el.className.includes('hidden-' + framerHash) ? 'none' : '';
    });
    document.querySelectorAll('.ssr-variant').forEach(function (el) {
      // Don't hide ssr-variant wrappers that contain fixed navbars
      if (el.querySelector('[data-framer-layout-hint-center-x]')) return;
      el.style.display = el.classList.contains('hidden-' + framerHash) ? 'none' : '';
    });

    // Webflow responsive show/hide
    document.querySelectorAll('[class*="hide-on-"][class*="screen"]').forEach(function (el) {
      var classes = el.className || '';
      if ((w < 768 && classes.includes('hide-on-mobile')) ||
          (w >= 768 && w < 992 && classes.includes('hide-on-tablet')) ||
          (w >= 992 && classes.includes('hide-on-desktop'))) {
        el.style.display = 'none';
      } else {
        el.style.display = '';
      }
    });
  }

  /* ── 2. Universal Scroll-Reveal (IntersectionObserver) ── */
  function initScrollReveal() {
    var TRANSITION = 'opacity 0.65s cubic-bezier(0.23,1,0.32,1), transform 0.65s cubic-bezier(0.23,1,0.32,1), filter 0.65s ease';
    var elements = [];
    var seen = new Set();

    // Collect all candidates that are in a "hidden initial" state
    // EXCLUDE center-hinted elements (Framer navbars) — they need translateX(-50%) preserved
    var candidates = document.querySelectorAll(
      '[data-framer-appear-id]:not([data-framer-layout-hint-center-x]), ' +
      '[data-aos], ' +
      '[data-sal], ' +
      '[data-animate], ' +
      '[data-animation], ' +
      '.aos-init:not(.aos-animate), ' +
      '.sal-animate, ' +
      '.animated:not(.fadeIn):not(.slideIn)'
    );

    candidates.forEach(function (el) {
      if (!seen.has(el)) {
        seen.add(el);
        elements.push(el);
      }
    });

    // Also reveal inline-style translateY initial states (Framer pattern)
    // But skip center-hinted elements (navbars)
    document.querySelectorAll('[style]').forEach(function (el) {
      if (el.getAttribute('data-framer-layout-hint-center-x')) return;
      var s = el.getAttribute('style') || '';
      if ((s.includes('translateY(20px)') || s.includes('translateY(10px)') ||
           s.includes('translateY(40px)') || s.includes('translateY(30px)') ||
           s.includes('translateY(60px)')) && !seen.has(el)) {
        seen.add(el);
        elements.push(el);
      }
    });

    if (!elements.length) return;

    if (!('IntersectionObserver' in window)) {
      elements.forEach(function (el) {
        el.style.opacity = '1';
        if (!el.getAttribute('data-framer-layout-hint-center-x')) {
          el.style.transform = 'none';
        }
        el.style.filter = 'none';
        el.classList.add('aos-animate');
      });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var el = entry.target;
          el.style.transition = TRANSITION;
          el.style.opacity = '1';
          if (!el.getAttribute('data-framer-layout-hint-center-x')) {
            el.style.transform = 'none';
          }
          el.style.filter = 'none';
          el.classList.add('aos-animate');
          el.setAttribute('data-sitecompiler-reveal', 'visible');
          io.unobserve(el);
        }
      });
    }, { threshold: 0.06, rootMargin: '0px 0px -30px 0px' });

    elements.forEach(function (el) {
      if (window.getComputedStyle(el).opacity === '0' ||
          (el.style.opacity && parseFloat(el.style.opacity) < 0.01)) {
        io.observe(el);
      } else {
        // Already visible — show immediately
        el.style.opacity = '1';
        if (!el.getAttribute('data-framer-layout-hint-center-x')) {
          el.style.transform = 'none';
        }
        el.classList.add('aos-animate');
      }
    });
  }

  /* ── 3. Scroll-colour text animation (Framer quote / reveal sections) ── */
  function initScrollColourText() {
    var words = document.querySelectorAll(
      '[style*="will-change:color"][style*="rgba(0, 0, 0, 0.1)"],' +
      '[style*="will-change: color"][style*="rgba(0, 0, 0, 0.1)"],' +
      '[style*="will-change:color"][style*="rgba(255,255,255,0.1)"]'
    );
    if (!words.length) return;
    var wordArray = Array.from(words);
    function onScroll() {
      var viewH = window.innerHeight;
      wordArray.forEach(function (span) {
        var rect = span.getBoundingClientRect();
        var progress = 1 - Math.max(0, rect.top / (viewH * 0.75));
        var color = progress >= 1 ? span.getAttribute('data-reveal-color') || 'rgb(17,17,17)' : 'rgba(0,0,0,0.08)';
        span.style.color = color;
      });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ── 4. Smooth anchor scroll ── */
  function initAnchorScroll() {
    document.querySelectorAll('a[href*="#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var href = a.getAttribute('href') || '';
        var hash = href.includes('#') ? '#' + href.split('#').pop() : '';
        if (!hash || hash === '#') return;
        var target;
        try { target = document.querySelector(hash); } catch (err) {}
        if (target) {
          e.preventDefault();
          var top = target.getBoundingClientRect().top + window.scrollY - 80;
          window.scrollTo({ top: top, behavior: 'smooth' });
        }
      });
    });
  }

  /* ── 5. Universal card / item hover effects ── */
  function initCardHovers() {
    var selectors = [
      '[data-framer-name*="Card"]',
      '[data-framer-name*="Item"]',
      '[data-framer-name*="Project"]',
      '.w-dyn-item',
      '.card',
      '[class*="card"]',
    ];
    var hoverEls = new Set();
    selectors.forEach(function (sel) {
      try {
        document.querySelectorAll(sel).forEach(function (el) {
          if (!hoverEls.has(el)) {
            hoverEls.add(el);
            el.style.transition = 'transform 0.3s ease, box-shadow 0.3s ease';
            el.addEventListener('mouseenter', function () {
              el.style.transform = 'translateY(-4px) scale(1.005)';
              el.style.boxShadow = '0 16px 48px rgba(0,0,0,0.12)';
            });
            el.addEventListener('mouseleave', function () {
              el.style.transform = '';
              el.style.boxShadow = '';
            });
          }
        });
      } catch (e) {}
    });
  }

  /* ── 6. Mobile navigation toggle ── */
  function initMobileNav() {
    // Common mobile hamburger patterns
    var toggleSelectors = [
      '.menu-toggle', '.hamburger', '.nav-toggle', '.mobile-menu-toggle',
      '[data-nav-toggle]', '.w-nav-button', '[class*="hamburger"]',
      '[aria-label*="menu"]', '[aria-label*="Menu"]',
      '[data-framer-name*="Menu"]', '[data-framer-name*="Hamburger"]',
    ];
    var menuSelectors = [
      '.mobile-menu', '.nav-menu', '.main-menu', '.site-menu',
      '.w-nav-menu', '#mobile-menu', '[class*="mobile-nav"]',
      '[data-framer-name*="Mobile Menu"]',
    ];

    toggleSelectors.forEach(function (sel) {
      document.querySelectorAll(sel).forEach(function (btn) {
        btn.addEventListener('click', function () {
          menuSelectors.forEach(function (ms) {
            document.querySelectorAll(ms).forEach(function (menu) {
              var isOpen = menu.classList.contains('is-open') ||
                           menu.style.display === 'block' ||
                           menu.getAttribute('aria-expanded') === 'true';
              if (isOpen) {
                menu.classList.remove('is-open');
                menu.style.display = '';
                menu.setAttribute('aria-expanded', 'false');
              } else {
                menu.classList.add('is-open');
                menu.style.display = 'block';
                menu.setAttribute('aria-expanded', 'true');
              }
            });
          });
        });
      });
    });
  }

  /* ── 7. Sticky header on scroll ── */
  function initStickyHeader() {
    var header = document.querySelector(
      'header.site-header, header.header, .site-header, .masthead, ' +
      'nav.main-navigation, nav.navbar, .w-nav, header[id*="header"]'
    );
    if (!header) return;
    var orig = header.style.cssText;
    window.addEventListener('scroll', function () {
      if (window.scrollY > 50) {
        header.classList.add('is-scrolled');
        header.style.boxShadow = '0 2px 20px rgba(0,0,0,0.1)';
      } else {
        header.classList.remove('is-scrolled');
        header.style.boxShadow = '';
      }
    }, { passive: true });
  }

  /* ── 8. Scroll-linked counter animation ── */
  function initCounters() {
    var counters = document.querySelectorAll('[data-counter], [class*="counter"], .count-up');
    counters.forEach(function (el) {
      var target = parseInt(el.textContent || '0', 10);
      if (!target) return;
      el.textContent = '0';
      var observer = new IntersectionObserver(function (entries) {
        if (!entries[0].isIntersecting) return;
        observer.disconnect();
        var start = 0;
        var step = target / 60;
        var timer = setInterval(function () {
          start += step;
          if (start >= target) { clearInterval(timer); el.textContent = target.toString(); }
          else { el.textContent = Math.floor(start).toString(); }
        }, 16);
      }, { threshold: 0.5 });
      observer.observe(el);
    });
  }

  /* ── 9. Parallax scroll on hero sections ── */
  function initParallax() {
    var parallaxEls = document.querySelectorAll('[data-parallax], [class*="parallax"]');
    if (!parallaxEls.length) return;
    window.addEventListener('scroll', function () {
      var sy = window.scrollY;
      parallaxEls.forEach(function (el) {
        var speed = parseFloat(el.getAttribute('data-parallax-speed') || '0.3');
        el.style.transform = 'translateY(' + (sy * speed) + 'px)';
      });
    }, { passive: true });
  }

  /* ── 10. Framer avatar scale on scroll ── */
  function initFramerAvatar() {
    var back = document.querySelector('[data-framer-name="Avatar - Back"]');
    var front = document.querySelector('[data-framer-name="Avatar - Front"]');
    if (back) back.style.display = 'none';
    if (front) {
      front.style.transform = 'none';
      front.style.opacity = '1';
      window.addEventListener('scroll', function () {
        var scale = Math.min(1, 0.5 + window.scrollY / 1000);
        front.style.transform = 'scale(' + scale.toFixed(3) + ')';
      }, { passive: true });
    }
  }

  /* ── 11. Marquee / infinite scroll text ── */
  function initMarquee() {
    var marquees = document.querySelectorAll('[class*="marquee"], [data-marquee]');
    marquees.forEach(function (el) {
      if (el.getAttribute('data-marquee-init')) return;
      el.setAttribute('data-marquee-init', '1');
      var speed = parseFloat(el.getAttribute('data-speed') || '30');
      var inner = el.children[0];
      if (!inner) return;
      var pos = 0;
      var width = inner.scrollWidth / 2;
      function tick() {
        pos -= speed / 60;
        if (Math.abs(pos) >= width) pos = 0;
        inner.style.transform = 'translateX(' + pos + 'px)';
        requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });
  }

  /* ── 12. Lightbox / gallery (Webflow / generic) ── */
  function initLightbox() {
    var triggers = document.querySelectorAll('[data-lightbox], .w-lightbox');
    if (!triggers.length) return;
    var overlay = document.createElement('div');
    overlay.id = 'sitecompiler-lb';
    overlay.style.cssText = 'display:none;position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,0.92);cursor:pointer;align-items:center;justify-content:center;';
    var img = document.createElement('img');
    img.style.cssText = 'max-width:90vw;max-height:90vh;object-fit:contain;border-radius:8px;';
    overlay.appendChild(img);
    document.body.appendChild(overlay);
    triggers.forEach(function (el) {
      el.style.cursor = 'pointer';
      el.addEventListener('click', function (e) {
        var src = el.getAttribute('data-lightbox') ||
                  (el.querySelector('img') && el.querySelector('img').src);
        if (!src) return;
        img.src = src;
        overlay.style.display = 'flex';
        e.preventDefault();
      });
    });
    overlay.addEventListener('click', function () { overlay.style.display = 'none'; });
  }

  /* ── Bootstrap ── */
  function init() {
    applyBreakpoints();
    initFramerAvatar();
    initScrollReveal();
    initScrollColourText();
    initAnchorScroll();
    initCardHovers();
    initMobileNav();
    initStickyHeader();
    initCounters();
    initParallax();
    initMarquee();
    initLightbox();

    // Re-run scroll reveal after images load (layout shifts)
    window.addEventListener('load', function () {
      setTimeout(initScrollReveal, 300);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  window.addEventListener('resize', applyBreakpoints, { passive: true });
})();
`;

export async function buildHtmlExport(options: BuildHtmlOptions): Promise<BuildHtmlResult> {
  const { jobId, baseUrl, pages = [] } = options;

  const exportsDir = path.resolve(/* turbopackIgnore: true */ process.cwd(), 'exports', jobId);
  const rawDir = path.join(exportsDir, 'raw');
  const outputDir = path.join(exportsDir, 'output', 'html-export');

  fs.mkdirSync(outputDir, { recursive: true });

  // 1. Process Assets
  const assetMap = processAssets(rawDir, outputDir);
  const assetCount = Object.keys(assetMap).length;

  // 2. Parse & Consolidate CSS
  const stylesDir = path.join(rawDir, 'styles');
  const cssFiles = fs.existsSync(stylesDir)
    ? fs.readdirSync(stylesDir).map((f) => path.join(stylesDir, f))
    : [];

  const { consolidatedCss } = parseAndConsolidateCss(cssFiles, assetMap, baseUrl);
  const stylesCssPath = path.join(outputDir, 'styles.css');
  fs.writeFileSync(stylesCssPath, consolidatedCss, 'utf-8');

  // 3. Write script.js animation shim
  const scriptJsPath = path.join(outputDir, 'script.js');
  fs.writeFileSync(scriptJsPath, ANIMATION_SHIM_JS, 'utf-8');

  // 4. Build all pages
  const pagesToProcess = pages.length > 0 ? pages : [{
    url: baseUrl,
    pathname: '/',
    title: 'Exported Site',
    htmlFilename: 'index.html',
    rawHtmlPath: path.join(rawDir, 'page.html'),
    meta: { title: 'Exported Site', canonicalUrl: null, metaTags: [], jsonLd: [] }
  }];

  let primaryCleanedHtml = '';
  let primaryIndexHtmlPath = path.join(outputDir, 'index.html');

  for (const pageItem of pagesToProcess) {
    // Support both pages-dir and legacy single-file raw paths
    const pagesRawDir = path.join(rawDir, 'pages');
    const candidatePaths = [
      pageItem.rawHtmlPath,
      path.join(pagesRawDir, pageItem.htmlFilename),
      path.join(rawDir, 'page.html'),
    ];

    const rawHtmlPath = candidatePaths.find(p => fs.existsSync(p));
    if (!rawHtmlPath) continue;

    const rawHtml = fs.readFileSync(rawHtmlPath, 'utf-8');
    const { $ } = cleanDom(rawHtml, assetMap, baseUrl, pagesToProcess, pageItem.htmlFilename);

    // ── Head cleanup ──
    // Remove only external stylesheets (we bundle them into styles.css)
    // Keep inline <style> tags — they contain CSS custom properties and critical site tokens
    $('link[rel="stylesheet"]').remove();

    // Remove editor overlays
    $('#__framer-editorbar').remove();
    $('[id*="editor-bar"]').remove();
    $('.__framer-inspector').remove();

    // Remove social tracking pixels and beacons (not analytics scripts — those were already removed)
    $('img[src*="facebook.com/tr"]').remove();
    $('img[src*="google-analytics"]').remove();

    // ── Inject fonts, critical CSS, and consolidated styles ──
    $('head').append(FRAMER_FONT_CSS);
    $('head').append(CRITICAL_OVERRIDE_CSS);
    $('head').append('  <link rel="stylesheet" href="./styles.css">\n');

    // ── Inject animation shim ──
    $('body').append('  <script src="./script.js"></script>\n');

    const destPath = path.join(outputDir, pageItem.htmlFilename);
    fs.writeFileSync(destPath, $.html(), 'utf-8');

    if (pageItem.htmlFilename === 'index.html') {
      primaryCleanedHtml = $.html();
      primaryIndexHtmlPath = destPath;
    }
  }

  return {
    outputDir,
    indexHtmlPath: primaryIndexHtmlPath,
    stylesCssPath,
    scriptJsPath,
    assetCount,
    cleanedHtml: primaryCleanedHtml,
    pageCount: pagesToProcess.length,
  };
}
