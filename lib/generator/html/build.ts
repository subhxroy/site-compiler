import * as fs from 'fs';
import * as path from 'path';
import { cleanDom } from '../../parser/dom-cleaner';
import { parseAndConsolidateCss } from '../../parser/css-parser';
import { processAssets } from '../../parser/asset-pipeline';
import { PageCaptured } from '../../crawler/types';
import { tagEditableNodes } from '../../model/node-tagger';
import { extractSiteModel, type SiteModel } from '../../model/extract-model';
import { generateStandaloneEditorHtml, type EditorPageItem } from './editor-template';

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

// NOTE: Framer sites embed exact @font-face rules (Inter, Archivo, Clash Grotesk, etc.) in an
// inline <style data-framer-font-css> block that the crawler captures verbatim inside the raw HTML.
// We deliberately do NOT inject any generic Google Fonts / fontshare fallback links — doing so
// would load wrong URL formats, wrong weight subsets, and would miss fonts like "Clash Grotesk"
// that are not available on public CDNs at all. The inline block is already preserved as-is.
// const FRAMER_FONT_CSS = ''; // intentionally removed

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

  /* ── Framer appear-animation: reveal hidden initial states ──
     IMPORTANT: We ONLY reveal opacity/visibility/filter here.
     We deliberately do NOT reset transform, because Framer uses transform
     for both animations AND layout positioning (e.g. translate(-50%,-50%) for
     centering, scale() for sizing hero images). Resetting transform blanket
     breaks the layout of positioned elements. */
  [data-framer-appear-id] {
    opacity: 1 !important;
    visibility: visible !important;
  }

  /* ── Framer word-by-word text reveal (opacity: 0.001 start state) ── */
  span[style*="opacity: 0.001"],
  span[style*="opacity:0.001"] {
    opacity: 1 !important;
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

  /* ── GSAP / Framework main container initial state normalization ── */
  main, #main, .main-bg {
    opacity: 1 !important;
    visibility: visible !important;
    transform: none !important;
  }

  /* ── GSAP ScrollSmoother / LocomotiveScroll static normalization ── */
  #smooth-wrapper {
    position: static !important;
    inset: auto !important;
    width: 100% !important;
    height: auto !important;
    overflow: visible !important;
  }
  #smooth-content {
    position: static !important;
    transform: none !important;
    translate: none !important;
    rotate: none !important;
    scale: none !important;
    width: 100% !important;
    overflow: visible !important;
  }

  /* ── Bootstrap navbar horizontal flex normalization for desktop ── */
  nav.navbar {
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    width: 100% !important;
  }
  nav.navbar .container,
  nav.navbar .container-fluid {
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    width: 100% !important;
  }
  @media (min-width: 992px) {
    .navbar-expand-lg .navbar-collapse {
      display: flex !important;
      flex-basis: auto !important;
      align-items: center !important;
      justify-content: center !important;
    }
    .navbar-expand-lg .navbar-nav {
      display: flex !important;
      flex-direction: row !important;
      align-items: center !important;
      gap: 2rem !important;
      margin: 0 auto !important;
    }
    .navbar-toggler {
      display: none !important;
    }
  }

  /* ── Creative navbar rolling text & marquee ── */
  .rolling-text {
    display: inline-block !important;
    position: relative !important;
    height: 1.4em !important;
    line-height: 1.4em !important;
    overflow: hidden !important;
    vertical-align: middle !important;
  }
  .rolling-text .block {
    display: flex !important;
    height: 1.4em !important;
    line-height: 1.4em !important;
    align-items: center !important;
    transition: transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94) !important;
  }
  .rolling-text .block:last-child {
    position: absolute !important;
    top: 100% !important;
    left: 0 !important;
    width: 100% !important;
  }
  .nav-link:hover .rolling-text .block,
  .rolling-text:hover .block {
    transform: translateY(-100%) !important;
  }

  /* ── Scroll-reveal: initial states for IntersectionObserver script ── */
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

  // ── Defensive polyfill for template scripts referencing missing progress-wrap SVG path ──
  if (!document.querySelector('.progress-wrap')) {
    var dummyWrap = document.createElement('div');
    dummyWrap.className = 'progress-wrap';
    dummyWrap.style.display = 'none';
    dummyWrap.innerHTML = '<svg><path d="M0,0"></path></svg>';
    if (document.body) {
      document.body.appendChild(dummyWrap);
    } else {
      window.addEventListener('DOMContentLoaded', function () {
        if (document.body) document.body.appendChild(dummyWrap);
      });
    }
  }

  /* ── 1. Responsive breakpoint classes (Framer SSR) ── */
  // Read breakpoint hashes dynamically from the Framer-generated CSS block.
  // Framer embeds media queries like @media(min-width: 1280px){.hidden-HASH{display:none!important}}
  // in a <style data-framer-breakpoint-css> tag. We parse those hashes at runtime
  // so the shim stays correct across Framer republishes (hashes change per build).
  var _framerBreakpointHashes = null;
  function getFramerHashes() {
    if (_framerBreakpointHashes) return _framerBreakpointHashes;
    var bpStyle = document.querySelector('style[data-framer-breakpoint-css]');
    var desktopHash = '', tabletHash = '', mobileHash = '';
    if (bpStyle && bpStyle.textContent) {
      var txt = bpStyle.textContent;
      // Desktop: min-width: 1280px
      var dm = txt.match(/@media\s*\(\s*min-width:\s*1280px\s*\)\s*\{\s*\.hidden-([a-z0-9]+)/);
      if (dm) desktopHash = dm[1];
      // Tablet: min-width 810px and max-width 1279px
      var tm = txt.match(/@media\s*\(\s*min-width:\s*810px\s*\)[^{]*\{\s*\.hidden-([a-z0-9]+)/);
      if (tm) tabletHash = tm[1];
      // Mobile: max-width 809px
      var mm = txt.match(/@media\s*\(\s*max-width:\s*809\.?\d*px\s*\)\s*\{\s*\.hidden-([a-z0-9]+)/);
      if (mm) mobileHash = mm[1];
    }
    // Fallbacks to known defaults if CSS block not found
    _framerBreakpointHashes = {
      desktop: desktopHash || '1y5deqo',
      tablet:  tabletHash  || '1gqtqv1',
      mobile:  mobileHash  || 'eh3b30'
    };
    return _framerBreakpointHashes;
  }

  function applyBreakpoints() {
    var w = window.innerWidth;
    var hashes = getFramerHashes();
    // Active hash = the breakpoint the current viewport falls into
    var activeHash = w >= 1280 ? hashes.desktop : w >= 810 ? hashes.tablet : hashes.mobile;
    document.querySelectorAll('[class*="hidden-"]').forEach(function (el) {
      el.style.display = el.className.includes('hidden-' + activeHash) ? 'none' : '';
    });
    document.querySelectorAll('.ssr-variant').forEach(function (el) {
      // Don't hide ssr-variant wrappers that contain fixed navbars
      if (el.querySelector('[data-framer-layout-hint-center-x]')) return;
      el.style.display = el.classList.contains('hidden-' + activeHash) ? 'none' : '';
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
  // Determines if an element's transform is an animation initial state vs a layout transform.
  // Framer animation initial states are typically translateY(N px) with N > 0, or scale(< 1)
  // combined with opacity: 0. Layout transforms (translate(-50%,-50%), etc.) are preserved.
  function isAnimationTransform(style) {
    if (!style) return false;
    // Pure translateY offset (slide-in animation state)
    if (/translateY\(([1-9]|[1-9]\d)px\)/.test(style)) return true;
    // opacity near 0 + any transform = animation initial state
    if (/opacity:\s*0(\.0+)?[;\s"']/.test(style) && /transform:/.test(style)) return true;
    return false;
  }

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

    // Also include inline-style animation initial states (translateY + opacity:0 pattern)
    // But skip center-hinted elements (navbars) and layout-positioned elements
    document.querySelectorAll('[style]').forEach(function (el) {
      if (el.getAttribute('data-framer-layout-hint-center-x')) return;
      var s = el.getAttribute('style') || '';
      if (isAnimationTransform(s) && !seen.has(el)) {
        seen.add(el);
        elements.push(el);
      }
    });

    if (!elements.length) return;

    function revealEl(el) {
      el.style.opacity = '1';
      var sFilter = el.style.filter || '';
      if (/blur/.test(sFilter)) {
        var cleanFilter = sFilter.replace(/blur\([^)]*\)/g, '').trim();
        el.style.filter = cleanFilter || '';
      }
      el.classList.add('aos-animate');
      el.setAttribute('data-sitecompiler-reveal', 'visible');
      // Only reset transform if it looks like an animation initial state,
      // NOT if it's a layout-critical transform (translate(-50%), scale for sizing, etc.)
      var s = el.getAttribute('style') || '';
      if (isAnimationTransform(s) && !el.getAttribute('data-framer-layout-hint-center-x') && !el.matches('[data-framer-name*="Avatar"], [data-framer-name*="avatar"], [data-framer-name*="Photo"], [data-framer-name*="Portrait"], [class*="avatar"]')) {
        el.style.transform = 'none';
      }
    }

    if (!('IntersectionObserver' in window)) {
      elements.forEach(revealEl);
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var el = entry.target;
          el.style.transition = TRANSITION;
          revealEl(el);
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
        revealEl(el);
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

  /* ── 10. Framer avatar 60fps smooth grayscale-to-color & scale scroll engine ── */
  function initFramerAvatar() {
    var avatarSelectors = [
      '[data-framer-name="Avatar - Back"]',
      '[data-framer-name="Avatar - Front"]',
      '[data-framer-name*="Avatar Back"]',
      '[data-framer-name*="Avatar Front"]',
      '[data-framer-name="Avatar Wrap"] img',
      '[data-framer-name="Sticky Avatar Wrap"] img',
      '[data-framer-name*="Avatar"] img',
      '[data-framer-name*="avatar"] img',
      '[data-framer-name*="Hero"] img',
      '[data-framer-name*="Portrait"] img',
      '[data-framer-name*="Photo"] img',
      '.framer-avatar',
      '[class*="avatar"] img'
    ];

    var avatarNodes = [];
    var seen = new Set();
    avatarSelectors.forEach(function (sel) {
      document.querySelectorAll(sel).forEach(function (node) {
        if (!seen.has(node)) {
          seen.add(node);
          avatarNodes.push(node);
        }
      });
    });

    if (!avatarNodes.length) return;

    var currentY = -1;
    var targetY = 0;
    var ticking = false;

    function onScroll() {
      targetY = window.scrollY || window.pageYOffset || 0;
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(render);
      }
    }

    function render() {
      if (currentY === -1) {
        currentY = targetY;
      } else {
        // Smooth lerp (linear interpolation with damping) for ultra-fluid 60fps animation
        currentY += (targetY - currentY) * 0.14;
      }

      // Scroll progress from 0 (at top of page) to 1 (scrolled 380px)
      var scrollDist = Math.max(0, currentY);
      var progress = Math.min(1, scrollDist / 380);

      // Smooth cubic ease-out curve
      var ease = 1 - Math.pow(1 - progress, 2.5);

      // 1. Grayscale & Contrast: 100% grayscale at top -> 0% (vibrant color & glow) as you scroll
      var grayscaleVal = (1 - ease) * 100;
      var contrastVal = 1 + (1 - ease) * 0.08;
      var brightnessVal = 0.92 + ease * 0.08;
      var filterStyle = grayscaleVal > 0.5
        ? 'grayscale(' + grayscaleVal.toFixed(1) + '%) contrast(' + contrastVal.toFixed(2) + ') brightness(' + brightnessVal.toFixed(2) + ')'
        : 'none';

      // 2. Scale: starts at 0.75 and scales up smoothly to 1.0
      var scaleVal = 0.75 + ease * 0.25;

      avatarNodes.forEach(function (el) {
        el.style.filter = filterStyle;
        el.style.transform = 'perspective(1200px) scale(' + scaleVal.toFixed(4) + ')';
        el.style.opacity = '1';
        el.style.willChange = 'transform, filter';
      });

      if (Math.abs(targetY - currentY) > 0.2) {
        requestAnimationFrame(render);
      } else {
        currentY = targetY;
        ticking = false;
      }
    }

    // Set initial black & white filter immediately on page load
    render();

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
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

  /* ── 13. Autonomous 3D Carousel / Perspective Cylinder Engine ── */
  function init3DCarouselAndSlider() {
    var circles = document.querySelectorAll(
      '[data-framer-name="Circle"], [data-framer-name="Slider"], [data-framer-name*="Carousel"], [data-framer-name*="3D"]'
    );
    circles.forEach(function (circle) {
      if (circle.getAttribute('data-3d-init')) return;
      circle.setAttribute('data-3d-init', '1');

      var isDragging = false;
      var startX = 0;
      var currentRotation = 0;
      var autoRotateSpeed = 0.15;
      var autoRotate = true;
      var resumeTimer = null;

      function updateTransform() {
        circle.style.transform = 'perspective(1200px) rotateY(' + currentRotation.toFixed(2) + 'deg)';
      }

      function tick() {
        if (autoRotate && !isDragging) {
          currentRotation = (currentRotation + autoRotateSpeed) % 360;
          updateTransform();
        }
        requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);

      var parentContainer = circle.parentElement || circle;
      parentContainer.style.cursor = 'grab';

      parentContainer.addEventListener('pointerdown', function (e) {
        isDragging = true;
        startX = e.clientX;
        autoRotate = false;
        parentContainer.style.cursor = 'grabbing';
        if (resumeTimer) clearTimeout(resumeTimer);
      });

      window.addEventListener('pointermove', function (e) {
        if (!isDragging) return;
        var dx = e.clientX - startX;
        startX = e.clientX;
        currentRotation += dx * 0.35;
        updateTransform();
      });

      window.addEventListener('pointerup', function () {
        if (!isDragging) return;
        isDragging = false;
        parentContainer.style.cursor = 'grab';
        resumeTimer = setTimeout(function () { autoRotate = true; }, 2500);
      });

      parentContainer.addEventListener('mouseenter', function () {
        autoRotate = false;
      });

      parentContainer.addEventListener('mouseleave', function () {
        if (!isDragging) autoRotate = true;
      });
    });
  }

  /* ── Bootstrap ── */
  function init() {
    applyBreakpoints();
    initFramerAvatar();
    init3DCarouselAndSlider();
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
    pagesToProcess = [{
      url: baseUrl,
      pathname: '/',
      title: 'Exported Site',
      htmlFilename: 'index.html',
      rawHtmlPath: path.join(rawDir, 'page.html'),
      meta: { title: 'Exported Site', canonicalUrl: null, metaTags: [], jsonLd: [] }
    }];
  }

  let primaryCleanedHtml = '';
  let primaryIndexHtmlPath = path.join(outputDir, 'index.html');
  const scTaggedDir = path.join(outputDir, '.sc-tagged');
  fs.mkdirSync(scTaggedDir, { recursive: true });

  const aggregatedNodes: SiteModel['nodes'] = {};

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
    const { $ } = cleanDom(rawHtml, assetMap, baseUrl, pagesToProcess);

    // ── Tag editable nodes with deterministic data-sc-id ──
    tagEditableNodes($);

    // Extract site model nodes for this page
    const pageModel = extractSiteModel($);
    Object.assign(aggregatedNodes, pageModel.nodes);

    // Save immutable tagged raw page copy for point-patching
    fs.writeFileSync(path.join(scTaggedDir, pageItem.htmlFilename), $.html(), 'utf-8');

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
    // Note: Framer font @font-face rules are already embedded in the
    // captured inline <style data-framer-font-css> block — no injection needed.
    $('head').append(CRITICAL_OVERRIDE_CSS);
    $('head').append('  <link rel="stylesheet" href="./styles.css">\n');

    // ── Inject animation shim ──
    $('body').append('  <script src="./script.js"></script>\n');

    // Character-exact HTML serialization preserves token spacing without destructive multi-line indentation
    const htmlCode = $.html();

    const destPath = path.join(outputDir, pageItem.htmlFilename);
    fs.writeFileSync(destPath, htmlCode, 'utf-8');

    if (pageItem.htmlFilename === 'index.html') {
      primaryCleanedHtml = htmlCode;
      primaryIndexHtmlPath = destPath;
    }
  }

  // Write site-model.json at root of html-export
  const siteModel: SiteModel = {
    version: 1,
    nodes: aggregatedNodes,
  };
  fs.writeFileSync(path.join(outputDir, 'site-model.json'), JSON.stringify(siteModel, null, 2), 'utf-8');

  // Generate Standalone Visual Content CMS (editor.html) in output directory
  const editorPages: EditorPageItem[] = pagesToProcess.map((p) => ({
    htmlFilename: p.htmlFilename,
    title: p.title || p.htmlFilename,
  }));
  const editorHtml = generateStandaloneEditorHtml(editorPages);
  fs.writeFileSync(path.join(outputDir, 'editor.html'), editorHtml, 'utf-8');

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
