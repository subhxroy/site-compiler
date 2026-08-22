import fs from 'fs';
import path from 'path';

function getBase64(filePath: string): string {
  if (fs.existsSync(filePath)) {
    const data = fs.readFileSync(filePath);
    const ext = path.extname(filePath).replace('.', '');
    return `data:image/${ext === 'svg' ? 'svg+xml' : ext};base64,${data.toString('base64')}`;
  }
  return '';
}

const heroImg = getBase64('presentation-deck/assets/homepage-hero.png');
const inputImg = getBase64('presentation-deck/assets/url-input-state.png');

const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SiteCompiler — Student Project Presentation | Caldera Theme</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Anton&family=DM+Sans:ital,opsz,wght@0,9..40,500;1,9..40,500&family=Geist+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    :root {
      /* Caldera Design System Tokens */
      --color-ember: #fc5000;
      --color-plasma-violet: #524ae9;
      --color-sulfur: #f5f28e;
      --color-limestone: #f7f6f2;
      --color-pumice: #e2e2df;
      --color-obsidian: #070607;
      --color-chalk: #ffffff;
      --color-hairline: rgba(7, 6, 7, 0.12);

      /* Typography */
      --font-display: 'Anton', 'PP Neue Corp Compact', -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      --font-body: 'DM Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      --font-mono: 'Geist Mono', monospace;

      /* Radii */
      --radius-card: 40px;
      --radius-pill: 800px;
      --radius-input: 100px;
      --radius-sm: 16px;

      /* Motion */
      --ease-morph: cubic-bezier(0.22, 1, 0.36, 1);
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }

    body {
      background-color: #141312;
      color: var(--color-obsidian);
      font-family: var(--font-body);
      font-weight: 500;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      overflow: hidden;
      user-select: none;
    }

    /* Presentation Frame (16:9 fixed canvas on desktop) */
    .deck-viewport {
      position: relative;
      width: 100vw;
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #141312;
      perspective: 1400px;
    }

    .slide-wrapper {
      position: relative;
      width: 1280px;
      height: 720px;
      background-color: var(--color-pumice);
      border-radius: 40px;
      overflow: hidden;
      transform-origin: center center;
      box-shadow: 0 40px 100px rgba(0,0,0,0.65);
    }

    /* Top Caldera Ember Progress Bar */
    .deck-progress-bar-track {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 4px;
      background: rgba(7, 6, 7, 0.08);
      z-index: 100;
    }

    .deck-progress-bar {
      height: 100%;
      width: 8.33%;
      background: var(--color-ember);
      transition: width 0.5s var(--ease-morph);
    }

    /* Caldera Slides */
    .slide {
      position: absolute;
      inset: 0;
      width: 1280px;
      height: 720px;
      padding: 40px 48px 32px 48px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      background-color: var(--color-pumice);
      opacity: 0;
      pointer-events: none;
      visibility: hidden;
      transform: translate3d(0, 0, 0) scale(0.97);
      transition: opacity 0.5s var(--ease-morph),
                  transform 0.5s var(--ease-morph),
                  filter 0.5s var(--ease-morph),
                  visibility 0.5s;
      will-change: transform, opacity;
      z-index: 1;
    }

    .slide.active {
      opacity: 1;
      visibility: visible;
      pointer-events: auto;
      transform: translate3d(0, 0, 0) scale(1);
      filter: blur(0px);
      z-index: 10;
    }

    .slide.morph-out-left {
      opacity: 0;
      visibility: visible;
      transform: translate3d(-36px, 0, 0) scale(0.98);
      filter: blur(1.5px);
      z-index: 5;
    }

    .slide.morph-in-right {
      opacity: 0;
      visibility: visible;
      transform: translate3d(40px, 0, 0) scale(1.02);
      filter: blur(1.5px);
      z-index: 10;
    }

    .slide.morph-out-right {
      opacity: 0;
      visibility: visible;
      transform: translate3d(36px, 0, 0) scale(0.98);
      filter: blur(1.5px);
      z-index: 5;
    }

    .slide.morph-in-left {
      opacity: 0;
      visibility: visible;
      transform: translate3d(-40px, 0, 0) scale(1.02);
      filter: blur(1.5px);
      z-index: 10;
    }

    /* Staggered Item Morph */
    .slide .morph-item {
      opacity: 0;
      transform: translate3d(0, 14px, 0);
      transition: opacity 0.45s var(--ease-morph),
                  transform 0.48s var(--ease-morph);
    }

    .slide.active .morph-item {
      opacity: 1;
      transform: translate3d(0, 0, 0);
    }

    .slide.active .morph-delay-1 { transition-delay: 0.05s; }
    .slide.active .morph-delay-2 { transition-delay: 0.1s; }
    .slide.active .morph-delay-3 { transition-delay: 0.16s; }
    .slide.active .morph-delay-4 { transition-delay: 0.22s; }

    /* Header Bar */
    .slide-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1.5px dotted var(--color-obsidian);
    }

    .header-meta {
      font-family: var(--font-mono);
      font-size: 11.5px;
      color: var(--color-obsidian);
      letter-spacing: 0.04em;
      text-transform: uppercase;
      opacity: 0.75;
    }

    .header-tag {
      font-family: var(--font-body);
      font-weight: 500;
      font-size: 12px;
      color: var(--color-obsidian);
      background-color: var(--color-sulfur);
      padding: 4px 14px;
      border-radius: var(--radius-pill);
      letter-spacing: 0.02em;
    }

    /* Caldera Display Typography */
    h1.display-title {
      font-family: var(--font-display);
      font-size: 64px;
      line-height: 0.96;
      letter-spacing: 0.02em;
      color: var(--color-obsidian);
      text-transform: uppercase;
      margin-bottom: 6px;
    }

    h2.slide-title {
      font-family: var(--font-display);
      font-size: 42px;
      line-height: 1.02;
      letter-spacing: 0.02em;
      color: var(--color-obsidian);
      text-transform: uppercase;
      margin-bottom: 4px;
    }

    .subtitle {
      font-family: var(--font-body);
      font-size: 16px;
      font-weight: 500;
      color: rgba(7, 6, 7, 0.7);
      line-height: 1.4;
    }

    /* Caldera Flat Surfaces (No Shadows) */
    .card-limestone {
      background-color: var(--color-limestone);
      border-radius: var(--radius-card);
      padding: 28px 32px;
      position: relative;
      border: none;
    }

    .card-ember {
      background-color: var(--color-ember);
      color: var(--color-chalk);
      border-radius: var(--radius-card);
      padding: 28px 32px;
      position: relative;
      border: none;
    }

    .card-ember * {
      color: var(--color-chalk) !important;
    }

    .card-plasma {
      background-color: var(--color-plasma-violet);
      color: var(--color-chalk);
      border-radius: var(--radius-card);
      padding: 28px 32px;
      position: relative;
      border: none;
    }

    .badge-sulfur {
      background-color: var(--color-sulfur);
      color: var(--color-obsidian);
      font-family: var(--font-body);
      font-size: 12px;
      font-weight: 500;
      padding: 4px 12px;
      border-radius: var(--radius-pill);
      display: inline-flex;
      align-items: center;
      gap: 5px;
    }

    .badge-ember {
      background-color: var(--color-ember);
      color: var(--color-chalk);
      font-family: var(--font-body);
      font-size: 12px;
      font-weight: 500;
      padding: 4px 12px;
      border-radius: var(--radius-pill);
      display: inline-flex;
      align-items: center;
      gap: 5px;
    }

    .badge-limestone {
      background-color: var(--color-limestone);
      color: var(--color-obsidian);
      font-family: var(--font-body);
      font-size: 12px;
      font-weight: 500;
      padding: 4px 12px;
      border-radius: var(--radius-pill);
      display: inline-flex;
      align-items: center;
      gap: 5px;
    }

    /* Caldera Pill Buttons */
    .pill-btn-ember {
      background-color: var(--color-ember);
      color: var(--color-obsidian);
      font-family: var(--font-body);
      font-size: 14px;
      font-weight: 500;
      padding: 10px 22px;
      border-radius: var(--radius-pill);
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      border: none;
      cursor: pointer;
      white-space: nowrap;
      transition: transform 0.15s ease, opacity 0.15s ease;
    }

    .pill-btn-ember:hover {
      opacity: 0.92;
      transform: translateY(-1px);
    }

    .pill-btn-secondary {
      background: transparent;
      color: var(--color-obsidian);
      border: 1.5px solid var(--color-obsidian);
      font-family: var(--font-body);
      font-size: 14px;
      font-weight: 500;
      padding: 9px 20px;
      border-radius: var(--radius-pill);
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
    }

    /* Halftone Dot Matrix Texture */
    .halftone-overlay {
      position: absolute;
      inset: 0;
      background-image: radial-gradient(#fc5000 1.5px, transparent 1.5px);
      background-size: 12px 12px;
      opacity: 0.18;
      pointer-events: none;
      border-radius: inherit;
    }

    /* Browser Mockup Window (Caldera Style) */
    .browser-window {
      background: var(--color-limestone);
      border-radius: var(--radius-card);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      height: 100%;
      position: relative;
    }

    .browser-toolbar {
      background: rgba(7, 6, 7, 0.05);
      height: 34px;
      display: flex;
      align-items: center;
      padding: 0 16px;
      gap: 6px;
      border-bottom: 1px solid var(--color-hairline);
    }

    .browser-dot {
      width: 9px;
      height: 9px;
      border-radius: 50%;
      background: rgba(7, 6, 7, 0.2);
    }

    .browser-address {
      margin-left: 8px;
      background: var(--color-chalk);
      border-radius: var(--radius-pill);
      padding: 3px 14px;
      font-family: var(--font-mono);
      font-size: 11px;
      color: var(--color-obsidian);
      display: flex;
      align-items: center;
      gap: 6px;
      flex: 1;
      max-width: 260px;
      border: 1px solid var(--color-hairline);
    }

    .browser-viewport {
      flex: 1;
      overflow: hidden;
      background: #070607;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
    }

    .browser-viewport img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: top center;
      display: block;
    }

    /* Layout Grids */
    .grid-2col {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      height: 100%;
    }

    .grid-3col {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 16px;
    }

    .grid-4col {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr 1fr;
      gap: 14px;
    }

    .flex-col {
      display: flex;
      flex-direction: column;
    }

    .diagram-svg {
      width: 100%;
      height: 100%;
    }

    /* Footer / Slide Navigation */
    .slide-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 10px;
      border-top: 1.5px dotted var(--color-obsidian);
      margin-top: 10px;
    }

    .footer-left {
      font-family: var(--font-mono);
      font-size: 11.5px;
      color: var(--color-obsidian);
      opacity: 0.7;
    }

    .footer-center {
      font-family: var(--font-mono);
      font-size: 12px;
      font-weight: 600;
      color: var(--color-ember);
      letter-spacing: 0.05em;
    }

    .footer-right {
      font-family: var(--font-mono);
      font-size: 11.5px;
      color: var(--color-obsidian);
      opacity: 0.7;
    }

    /* Caldera Global Floating Controls */
    .deck-controls {
      position: fixed;
      bottom: 16px;
      display: flex;
      align-items: center;
      gap: 10px;
      background: var(--color-obsidian);
      padding: 8px 18px;
      border-radius: var(--radius-pill);
      z-index: 1000;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
      transition: opacity 0.35s ease, transform 0.35s ease;
    }

    .deck-controls.idle-hidden {
      opacity: 0;
      transform: translateY(12px);
      pointer-events: none;
    }

    .ctrl-btn {
      background: transparent;
      border: none;
      color: var(--color-limestone);
      cursor: pointer;
      padding: 6px 12px;
      border-radius: var(--radius-pill);
      font-family: var(--font-body);
      font-weight: 500;
      font-size: 13px;
      display: flex;
      align-items: center;
      gap: 5px;
      transition: background 0.15s, color 0.15s;
    }

    .ctrl-btn:hover {
      background: rgba(255, 255, 255, 0.15);
      color: var(--color-chalk);
    }

    .ctrl-counter {
      font-family: var(--font-mono);
      font-size: 13px;
      color: var(--color-sulfur);
      padding: 0 10px;
      border-left: 1.5px dotted rgba(255,255,255,0.2);
      border-right: 1.5px dotted rgba(255,255,255,0.2);
      letter-spacing: 0.05em;
    }

    .slide-dots {
      display: flex;
      gap: 5px;
      margin: 0 4px;
    }

    .slide-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: rgba(255,255,255,0.3);
      cursor: pointer;
      transition: all 0.3s var(--ease-morph);
    }

    .slide-dot.active {
      background: var(--color-ember);
      width: 16px;
      border-radius: 4px;
    }

    /* ==========================================================================
       RESPONSIVE & MOBILE ADAPTIVE RULES (EVERY BREAKPOINT)
       ========================================================================== */
    @media (max-width: 900px), (orientation: portrait) and (max-width: 1024px), (max-height: 560px) {
      body {
        overflow-x: hidden;
        overflow-y: hidden;
        min-height: 100dvh;
      }

      .deck-viewport {
        width: 100vw;
        height: 100dvh;
        min-height: 100dvh;
        padding: 8px 8px 64px 8px;
      }

      .slide-wrapper {
        width: 100% !important;
        max-width: 680px !important;
        height: 100% !important;
        max-height: calc(100dvh - 72px) !important;
        min-height: 440px !important;
        transform: none !important;
        border-radius: 24px;
        margin: 0 auto;
      }

      .slide {
        position: absolute;
        inset: 0;
        width: 100% !important;
        height: 100% !important;
        padding: 16px 16px 12px 16px !important;
        overflow-y: auto !important;
        overflow-x: hidden !important;
        -webkit-overflow-scrolling: touch;
        display: flex !important;
        flex-direction: column !important;
        justify-content: flex-start !important;
        gap: 12px;
      }

      .slide::-webkit-scrollbar {
        width: 4px;
      }
      .slide::-webkit-scrollbar-thumb {
        background: rgba(7,6,7,0.2);
        border-radius: 4px;
      }

      h1.display-title {
        font-size: clamp(32px, 7vw, 44px) !important;
        line-height: 0.98 !important;
      }

      h2.slide-title {
        font-size: clamp(24px, 6vw, 32px) !important;
        line-height: 1.02 !important;
      }

      .grid-2col,
      .grid-3col,
      .grid-4col,
      .slide-grid-2col,
      .slide-body,
      .slide > div[style*="display: grid"],
      .slide div[style*="grid-template-columns"] {
        display: flex !important;
        flex-direction: column !important;
        gap: 12px !important;
        height: auto !important;
        min-height: auto !important;
      }

      .card-limestone,
      .card-ember,
      .card-plasma {
        padding: 16px 18px !important;
        border-radius: 24px !important;
      }

      .browser-window {
        height: auto !important;
        min-height: 180px !important;
        max-height: 250px !important;
        border-radius: 24px !important;
      }

      .browser-viewport {
        height: 170px !important;
      }

      .flowchart-desktop-wrap,
      .collab-desktop-wrap {
        display: none !important;
      }

      .flowchart-mobile-cards,
      .collab-mobile-wrap {
        display: flex !important;
      }

      .arch-diagram-wrap {
        overflow-x: auto !important;
        -webkit-overflow-scrolling: touch;
      }
      .arch-diagram-wrap .diagram-svg {
        min-width: 520px;
      }

      .slide-dots {
        display: none !important;
      }

      .deck-controls {
        bottom: 8px !important;
        padding: 5px 12px !important;
        gap: 4px !important;
      }
    }
  </style>
</head>
<body>

<div class="deck-viewport">
  <div class="slide-wrapper" id="slideContainer">
    
    <!-- Top Caldera Progress Bar -->
    <div class="deck-progress-bar-track">
      <div class="deck-progress-bar" id="deckProgressBar"></div>
    </div>

    <!-- ==================== SLIDE 1: CALDERA INTRO TITLE ==================== -->
    <section class="slide active" id="slide-1">
      <div class="slide-header">
        <span class="header-meta">DEPARTMENT OF PHYSICS • ACADEMIC PRESENTATION</span>
        <span class="header-tag">CALDERA v1.0</span>
      </div>

      <div class="slide-body" style="height: 480px; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; position: relative;">
        <div class="halftone-overlay"></div>

        <div class="morph-item" style="display: flex; gap: 8px; align-items: center; justify-content: center; margin-bottom: 12px; flex-wrap: wrap; z-index: 2;">
          <span class="badge-sulfur">🎓 Physics Academic Project</span>
          <span class="badge-limestone">Decompilation & Extraction</span>
          <span class="badge-ember">✨ Built with Google Antigravity</span>
        </div>

        <h1 class="display-title morph-item morph-delay-1" style="font-size: 72px; margin-bottom: 8px; z-index: 2;">
          SITECOMPILER.
        </h1>

        <p class="subtitle morph-item morph-delay-1" style="font-size: 19px; max-width: 780px; margin-bottom: 20px; z-index: 2;">
          An Automated Website-to-Code Compiler & Structural Extraction Tool
        </p>

        <div class="card-limestone morph-item morph-delay-2" style="max-width: 820px; width: 100%; padding: 22px 30px; margin-bottom: 20px; text-align: left; z-index: 2;">
          <div style="font-family: var(--font-mono); font-size: 11px; color: var(--color-obsidian); opacity: 0.6; margin-bottom: 8px; letter-spacing: 0.05em; text-transform: uppercase;">
            PRESENTATION AGENDA & OVERVIEW
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 13.5px; color: var(--color-obsidian);">
            <div style="display: flex; gap: 8px; align-items: center;">
              <span style="font-family: var(--font-mono); font-weight: 600; color: var(--color-ember);">01.</span>
              <span><strong>The Concept:</strong> Scanner analogy & lock-in problem</span>
            </div>
            <div style="display: flex; gap: 8px; align-items: center;">
              <span style="font-family: var(--font-mono); font-weight: 600; color: var(--color-ember);">02.</span>
              <span><strong>Visual Flowchart:</strong> 4-step pipeline</span>
            </div>
            <div style="display: flex; gap: 8px; align-items: center;">
              <span style="font-family: var(--font-mono); font-weight: 600; color: var(--color-ember);">03.</span>
              <span><strong>Antigravity AI Story:</strong> Physics + AI pair programming</span>
            </div>
            <div style="display: flex; gap: 8px; align-items: center;">
              <span style="font-family: var(--font-mono); font-weight: 600; color: var(--color-ember);">04.</span>
              <span><strong>Live Demo & Formats:</strong> HTML, React, Next.js</span>
            </div>
          </div>
        </div>

        <div class="morph-item morph-delay-3" style="display: flex; justify-content: space-between; align-items: center; width: 100%; max-width: 820px; padding-top: 10px; border-top: 1.5px dotted var(--color-obsidian); z-index: 2; flex-wrap: wrap; gap: 12px;">
          <div style="text-align: left;">
            <div style="font-size: 15px; font-weight: 600; color: var(--color-obsidian);">Subhankar Roy</div>
            <div style="font-size: 12px; color: rgba(7, 6, 7, 0.7);">Student Presenter • Department of Physics</div>
          </div>
          <a href="https://site-compiler.netlify.app/" target="_blank" rel="noopener noreferrer" class="pill-btn-ember" style="font-size: 13px; padding: 8px 18px;">
            <span>site-compiler.netlify.app ↗</span>
          </a>
        </div>
      </div>

      <div class="slide-footer">
        <span class="footer-left">SiteCompiler — Academic Presentation</span>
        <span class="footer-center">01 / 12</span>
        <span class="footer-right">Subhankar Roy (Physics)</span>
      </div>
    </section>

    <!-- ==================== SLIDE 2: WHAT IS IT & THE PROBLEM ==================== -->
    <section class="slide" id="slide-2">
      <div class="slide-header">
        <span class="header-meta">01 • OVERVIEW FOR MULTIDISCIPLINARY AUDIENCE</span>
        <span class="header-tag">THE BIG PICTURE</span>
      </div>

      <div class="morph-item" style="margin-bottom: 14px;">
        <h2 class="slide-title">WHAT IS SITECOMPILER & WHAT DOES IT SOLVE?</h2>
        <p class="subtitle">A simple, intuitive look at the concept, the everyday problem, and the solution.</p>
      </div>

      <div class="slide-body grid-3col" style="height: 450px;">
        <div class="card-limestone flex-col morph-item morph-delay-1" style="justify-content: space-between;">
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <span class="badge-sulfur">01 • ANALOGY</span>
            </div>
            <h3 style="font-family: var(--font-display); font-size: 24px; text-transform: uppercase; margin-bottom: 8px;">Like an OCR Scanner for the Web</h3>
            <p style="font-size: 14px; line-height: 1.5; color: rgba(7,6,7,0.75);">
              Just like a scanner takes a physical paper document and turns it into editable Word/LaTeX text, <strong>SiteCompiler</strong> scans a live website and turns it back into editable code files.
            </p>
          </div>
          <div style="font-family: var(--font-mono); font-size: 11.5px; color: var(--color-ember); padding-top: 10px; border-top: 1.5px dotted var(--color-obsidian);">
            URL in ➔ Source Code ZIP out
          </div>
        </div>

        <div class="card-limestone flex-col morph-item morph-delay-2" style="justify-content: space-between; border-left: 4px solid var(--color-ember);">
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <span class="badge-ember">02 • THE PROBLEM</span>
            </div>
            <h3 style="font-family: var(--font-display); font-size: 24px; text-transform: uppercase; margin-bottom: 8px;">No-Code Platform Lock-in</h3>
            <p style="font-size: 14px; line-height: 1.5; color: rgba(7,6,7,0.75);">
              Visual site builders (Framer, Wix, Webflow) let anyone design on free tiers, but add forced watermarks and charge <strong>$20–$50 every month</strong> to host or export code.
            </p>
          </div>
          <div style="font-family: var(--font-mono); font-size: 11.5px; color: rgba(7,6,7,0.6); padding-top: 10px; border-top: 1.5px dotted var(--color-obsidian);">
            Stop paying = Your site disappears
          </div>
        </div>

        <div class="card-ember flex-col morph-item morph-delay-3" style="justify-content: space-between;">
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <span class="badge-sulfur" style="color: var(--color-obsidian) !important;">03 • THE SOLUTION</span>
            </div>
            <h3 style="font-family: var(--font-display); font-size: 24px; text-transform: uppercase; margin-bottom: 8px;">100% Free Hosting Freedom</h3>
            <p style="font-size: 14px; line-height: 1.5; opacity: 0.95;">
              SiteCompiler extracts the site, strips all watermarks and platform trackers, and outputs a standard <strong>ZIP package</strong> ready to host for <strong>$0/year</strong> on Netlify or GitHub.
            </p>
          </div>
          <div style="font-family: var(--font-mono); font-size: 11.5px; opacity: 0.85; padding-top: 10px; border-top: 1.5px dotted var(--color-chalk);">
            You own your source code forever
          </div>
        </div>
      </div>

      <div class="slide-footer">
        <span class="footer-left">SiteCompiler — Academic Presentation</span>
        <span class="footer-center">02 / 12</span>
        <span class="footer-right">Subhankar Roy (Physics)</span>
      </div>
    </section>

    <!-- ==================== SLIDE 3: VISUAL FLOWCHART ==================== -->
    <section class="slide" id="slide-3">
      <div class="slide-header">
        <span class="header-meta">02 • HIGH-LEVEL SYSTEM FLOWCHART</span>
        <span class="header-tag">VISUAL FLOWCHART</span>
      </div>

      <div class="morph-item" style="margin-bottom: 14px;">
        <h2 class="slide-title">HOW IT WORKS IN 4 SIMPLE STEPS</h2>
        <p class="subtitle">A visual, step-by-step flowchart showing how an input URL becomes ownable code in seconds.</p>
      </div>

      <div class="slide-body" style="height: 450px; display: flex; flex-direction: column; justify-content: space-between;">
        <!-- Desktop SVG Flowchart -->
        <div class="card-limestone flowchart-desktop-wrap morph-item morph-delay-1" style="padding: 20px 24px; flex: 1; display: flex; flex-direction: column; justify-content: center;">
          <svg viewBox="0 0 1000 240" class="diagram-svg">
            <!-- Step 1 -->
            <rect x="20" y="20" width="200" height="200" rx="30" fill="#e2e2df"/>
            <rect x="35" y="35" width="40" height="40" rx="20" fill="#fc5000"/>
            <text x="55" y="60" font-family="'DM Sans', sans-serif" font-size="18" fill="#ffffff" text-anchor="middle">🌐</text>
            <text x="35" y="105" font-family="'Anton', sans-serif" font-size="16" fill="#fc5000">STEP 01</text>
            <text x="35" y="128" font-family="'DM Sans', sans-serif" font-size="16" font-weight="600" fill="#070607">Enter Live URL</text>
            <text x="35" y="152" font-family="'DM Sans', sans-serif" font-size="12" fill="rgba(7,6,7,0.7)">User pastes website link</text>
            <text x="35" y="170" font-family="'Geist Mono', monospace" font-size="11" fill="rgba(7,6,7,0.5)">e.g. site.framer.app</text>
            <rect x="35" y="185" width="170" height="22" rx="11" fill="#f7f6f2"/>
            <text x="120" y="200" font-family="'DM Sans', sans-serif" font-size="10" font-weight="500" fill="#070607" text-anchor="middle">Paste & Click Compile</text>

            <!-- Arrow 1 -->
            <path d="M 230 120 L 260 120" stroke="#070607" stroke-width="2" stroke-dasharray="3 3"/>
            <polygon points="265,120 255,115 255,125" fill="#070607"/>

            <!-- Step 2 -->
            <rect x="275" y="20" width="200" height="200" rx="30" fill="#e2e2df"/>
            <rect x="290" y="35" width="40" height="40" rx="20" fill="#524ae9"/>
            <text x="310" y="60" font-family="'DM Sans', sans-serif" font-size="18" fill="#ffffff" text-anchor="middle">📸</text>
            <text x="290" y="105" font-family="'Anton', sans-serif" font-size="16" fill="#524ae9">STEP 02</text>
            <text x="290" y="128" font-family="'DM Sans', sans-serif" font-size="16" font-weight="600" fill="#070607">Browser Snapshot</text>
            <text x="290" y="152" font-family="'DM Sans', sans-serif" font-size="12" fill="rgba(7,6,7,0.7)">Headless browser loads</text>
            <text x="290" y="170" font-family="'DM Sans', sans-serif" font-size="12" fill="rgba(7,6,7,0.7)">all scripts, styles & fonts</text>
            <rect x="290" y="185" width="170" height="22" rx="11" fill="#f7f6f2"/>
            <text x="375" y="200" font-family="'DM Sans', sans-serif" font-size="10" font-weight="500" fill="#070607" text-anchor="middle">Playwright Chromium</text>

            <!-- Arrow 2 -->
            <path d="M 485 120 L 515 120" stroke="#070607" stroke-width="2" stroke-dasharray="3 3"/>
            <polygon points="520,120 510,115 510,125" fill="#070607"/>

            <!-- Step 3 -->
            <rect x="530" y="20" width="200" height="200" rx="30" fill="#e2e2df"/>
            <rect x="545" y="35" width="40" height="40" rx="20" fill="#fc5000"/>
            <text x="565" y="60" font-family="'DM Sans', sans-serif" font-size="18" fill="#ffffff" text-anchor="middle">🧹</text>
            <text x="545" y="105" font-family="'Anton', sans-serif" font-size="16" fill="#fc5000">STEP 03</text>
            <text x="545" y="128" font-family="'DM Sans', sans-serif" font-size="16" font-weight="600" fill="#070607">Clean & De-bloat</text>
            <text x="545" y="152" font-family="'DM Sans', sans-serif" font-size="12" fill="rgba(7,6,7,0.7)">Strips forced watermarks,</text>
            <text x="545" y="170" font-family="'DM Sans', sans-serif" font-size="12" fill="rgba(7,6,7,0.7)">telemetry & trackers</text>
            <rect x="545" y="185" width="170" height="22" rx="11" fill="#f7f6f2"/>
            <text x="630" y="200" font-family="'DM Sans', sans-serif" font-size="10" font-weight="500" fill="#fc5000" text-anchor="middle">Zero Watermarks</text>

            <!-- Arrow 3 -->
            <path d="M 740 120 L 770 120" stroke="#070607" stroke-width="2" stroke-dasharray="3 3"/>
            <polygon points="775,120 765,115 765,125" fill="#070607"/>

            <!-- Step 4 -->
            <rect x="785" y="20" width="195" height="200" rx="30" fill="#fc5000"/>
            <rect x="800" y="35" width="40" height="40" rx="20" fill="#f5f28e"/>
            <text x="820" y="60" font-family="'DM Sans', sans-serif" font-size="18" fill="#070607" text-anchor="middle">📦</text>
            <text x="800" y="105" font-family="'Anton', sans-serif" font-size="16" fill="#ffffff">STEP 04</text>
            <text x="800" y="128" font-family="'DM Sans', sans-serif" font-size="16" font-weight="600" fill="#ffffff">Download ZIP</text>
            <text x="800" y="152" font-family="'DM Sans', sans-serif" font-size="12" fill="rgba(255,255,255,0.9)">Emits clean HTML, React,</text>
            <text x="800" y="170" font-family="'DM Sans', sans-serif" font-size="12" fill="rgba(255,255,255,0.9)">or Next.js 16 code</text>
            <rect x="800" y="185" width="165" height="22" rx="11" fill="#f5f28e"/>
            <text x="882" y="200" font-family="'DM Sans', sans-serif" font-size="10" font-weight="500" fill="#070607" text-anchor="middle">Ready to Deploy Free</text>
          </svg>
        </div>

        <!-- Mobile Stacked Flowchart Cards -->
        <div class="flowchart-mobile-cards morph-item morph-delay-1" style="display: none; flex-direction: column; gap: 8px;">
          <div class="card-limestone" style="padding: 12px 16px; display: flex; align-items: center; gap: 12px;">
            <div style="font-size: 20px;">🌐</div>
            <div style="flex: 1;">
              <div style="font-family: var(--font-mono); font-size: 10px; font-weight: 600; color: var(--color-ember);">STEP 01</div>
              <div style="font-size: 13px; font-weight: 600; color: var(--color-obsidian);">Enter Live URL</div>
              <div style="font-size: 11.5px; color: rgba(7,6,7,0.7);">User inputs published link.</div>
            </div>
          </div>
          <div class="card-limestone" style="padding: 12px 16px; display: flex; align-items: center; gap: 12px;">
            <div style="font-size: 20px;">📸</div>
            <div style="flex: 1;">
              <div style="font-family: var(--font-mono); font-size: 10px; font-weight: 600; color: var(--color-plasma-violet);">STEP 02</div>
              <div style="font-size: 13px; font-weight: 600; color: var(--color-obsidian);">Browser Snapshot</div>
              <div style="font-size: 11.5px; color: rgba(7,6,7,0.7);">Headless Playwright loads assets.</div>
            </div>
          </div>
          <div class="card-limestone" style="padding: 12px 16px; display: flex; align-items: center; gap: 12px;">
            <div style="font-size: 20px;">🧹</div>
            <div style="flex: 1;">
              <div style="font-family: var(--font-mono); font-size: 10px; font-weight: 600; color: var(--color-ember);">STEP 03</div>
              <div style="font-size: 13px; font-weight: 600; color: var(--color-obsidian);">Clean & De-bloat</div>
              <div style="font-size: 11.5px; color: rgba(7,6,7,0.7);">Strips forced watermarks.</div>
            </div>
          </div>
          <div class="card-ember" style="padding: 12px 16px; display: flex; align-items: center; gap: 12px;">
            <div style="font-size: 20px;">📦</div>
            <div style="flex: 1;">
              <div style="font-family: var(--font-mono); font-size: 10px; font-weight: 600; color: var(--color-sulfur);">STEP 04</div>
              <div style="font-size: 13px; font-weight: 600; color: #ffffff;">Download ZIP</div>
              <div style="font-size: 11.5px; color: rgba(255,255,255,0.9);">Clean HTML, React, or Next.js code.</div>
            </div>
          </div>
        </div>

        <div class="morph-item morph-delay-2" style="background: var(--color-limestone); border-radius: var(--radius-pill); padding: 12px 24px; display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 13.5px; color: var(--color-obsidian);">⚡ <strong>Execution Speed:</strong> Complete extraction and code generation takes less than 4.2 seconds.</span>
          <span class="badge-sulfur">Zero Coding Required</span>
        </div>
      </div>

      <div class="slide-footer">
        <span class="footer-left">SiteCompiler — Academic Presentation</span>
        <span class="footer-center">03 / 12</span>
        <span class="footer-right">Subhankar Roy (Physics)</span>
      </div>
    </section>

    <!-- ==================== SLIDE 4: HOW I BUILT IT USING ANTIGRAVITY ==================== -->
    <section class="slide" id="slide-4">
      <div class="slide-header">
        <span class="header-meta">03 • DEVELOPMENT & AI PAIR-PROGRAMMING</span>
        <span class="header-tag">BUILT WITH ANTIGRAVITY</span>
      </div>

      <div class="morph-item" style="margin-bottom: 14px;">
        <h2 class="slide-title">HOW I BUILT IT USING GOOGLE ANTIGRAVITY AI</h2>
        <p class="subtitle">Bridging scientific problem-solving in Physics with full-stack software development through Agentic AI.</p>
      </div>

      <div class="slide-body grid-2col" style="height: 450px; align-items: stretch;">
        <div class="card-limestone flex-col morph-item morph-delay-1" style="justify-content: space-between;">
          <div>
            <div style="font-family: var(--font-mono); font-size: 11.5px; color: var(--color-obsidian); opacity: 0.6; margin-bottom: 8px;">THE STUDENT DEVELOPMENT PROCESS</div>
            <p style="font-size: 14.5px; line-height: 1.5; color: var(--color-obsidian); margin-bottom: 14px;">
              As a Physics student, I used <strong>Google Antigravity</strong> as an intelligent agentic pair-programmer to translate system design concepts into a robust, deployable web application.
            </p>

            <div style="display: flex; flex-direction: column; gap: 9px; font-size: 13.5px; color: rgba(7,6,7,0.8);">
              <div style="display: flex; gap: 8px;">
                <span style="font-family: var(--font-mono); color: var(--color-ember); font-weight: 600;">01.</span>
                <span><strong>Architecture Planning:</strong> 3-tier compiler model designed with Antigravity.</span>
              </div>
              <div style="display: flex; gap: 8px;">
                <span style="font-family: var(--font-mono); color: var(--color-ember); font-weight: 600;">02.</span>
                <span><strong>Browser Automation:</strong> Playwright headless crawler for computed runtime DOM.</span>
              </div>
              <div style="display: flex; gap: 8px;">
                <span style="font-family: var(--font-mono); color: var(--color-ember); font-weight: 600;">03.</span>
                <span><strong>DOM Cleaning Logic:</strong> Algorithmic watermark & telemetry pruning engine.</span>
              </div>
              <div style="display: flex; gap: 8px;">
                <span style="font-family: var(--font-mono); color: var(--color-ember); font-weight: 600;">04.</span>
                <span><strong>Automated Testing:</strong> Autonomous Playwright verification on all viewports.</span>
              </div>
            </div>
          </div>

          <div style="border-top: 1.5px dotted var(--color-obsidian); padding-top: 10px; font-family: var(--font-mono); font-size: 11.5px; color: var(--color-ember);">
            Outcome: Physics mindset + Agentic AI = Production Software
          </div>
        </div>

        <div class="card-limestone flex-col morph-item morph-delay-2" style="justify-content: center; align-items: center; padding: 22px;">
          <div style="width: 100%; font-family: var(--font-mono); font-size: 11px; color: var(--color-obsidian); opacity: 0.6; margin-bottom: 12px; text-align: left;">
            HUMAN + ANTIGRAVITY AI COLLABORATION
          </div>

          <div class="collab-desktop-wrap" style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">
            <svg viewBox="0 0 460 280" class="diagram-svg">
              <rect x="20" y="25" width="180" height="100" rx="20" fill="#e2e2df"/>
              <text x="110" y="52" font-family="'Anton', sans-serif" font-size="16" fill="#070607" text-anchor="middle">STUDENT (PHYSICS)</text>
              <text x="110" y="74" font-family="'DM Sans', sans-serif" font-size="11" fill="rgba(7,6,7,0.7)" text-anchor="middle">• Problem Definition</text>
              <text x="110" y="92" font-family="'DM Sans', sans-serif" font-size="11" fill="rgba(7,6,7,0.7)" text-anchor="middle">• Pipeline Verification</text>
              <text x="110" y="110" font-family="'DM Sans', sans-serif" font-size="11" fill="rgba(7,6,7,0.7)" text-anchor="middle">• Real-World Test Cases</text>

              <circle cx="230" cy="75" r="14" fill="#fc5000"/>
              <text x="230" y="80" font-family="'DM Sans', sans-serif" font-size="16" fill="#ffffff" text-anchor="middle" font-weight="bold">+</text>

              <rect x="260" y="25" width="180" height="100" rx="20" fill="#fc5000"/>
              <text x="350" y="52" font-family="'Anton', sans-serif" font-size="16" fill="#ffffff" text-anchor="middle">GOOGLE ANTIGRAVITY</text>
              <text x="350" y="74" font-family="'DM Sans', sans-serif" font-size="11" fill="rgba(255,255,255,0.9)" text-anchor="middle">• Full-Stack Code Synth</text>
              <text x="350" y="92" font-family="'DM Sans', sans-serif" font-size="11" fill="rgba(255,255,255,0.9)" text-anchor="middle">• Playwright Script Engine</text>
              <text x="350" y="110" font-family="'DM Sans', sans-serif" font-size="11" fill="rgba(255,255,255,0.9)" text-anchor="middle">• Responsive Refactoring</text>

              <path d="M 230 100 L 230 150" stroke="#070607" stroke-width="2"/>
              <polygon points="230,155 225,145 235,145" fill="#070607"/>

              <rect x="40" y="165" width="380" height="95" rx="24" fill="#070607"/>
              <text x="230" y="194" font-family="'Anton', sans-serif" font-size="15" fill="#f5f28e" text-anchor="middle">SITECOMPILER PRODUCTION SYSTEM</text>
              <text x="230" y="214" font-family="'DM Sans', sans-serif" font-size="11.5" fill="#e2e2df" text-anchor="middle">Next.js 16 + Express + Playwright + Cheerio AST + Tailwind</text>
              <rect x="140" y="228" width="180" height="22" rx="11" fill="#fc5000"/>
              <text x="230" y="243" font-family="'DM Sans', sans-serif" font-size="10" fill="#ffffff" text-anchor="middle" font-weight="500">✓ Tested & Deployed Live</text>
            </svg>
          </div>

          <div class="collab-mobile-wrap" style="display: none; flex-direction: column; gap: 8px; width: 100%;">
            <div class="card-limestone" style="padding: 10px 14px; background: #e2e2df;">
              <div style="font-size: 13px; font-weight: 600; color: var(--color-obsidian);">Student (Physics)</div>
              <div style="font-size: 11.5px; color: rgba(7,6,7,0.7);">Problem definition & test cases</div>
            </div>
            <div style="text-align: center; font-size: 14px; font-weight: bold; color: var(--color-ember);">+</div>
            <div class="card-ember" style="padding: 10px 14px;">
              <div style="font-size: 13px; font-weight: 600; color: #ffffff;">Google Antigravity AI</div>
              <div style="font-size: 11.5px; color: rgba(255,255,255,0.9);">Code synthesis & Playwright crawler</div>
            </div>
            <div style="text-align: center; font-size: 14px; font-weight: bold; color: var(--color-obsidian);">⬇</div>
            <div class="card-limestone" style="padding: 10px 14px; background: #070607; color: #ffffff;">
              <div style="font-size: 13px; font-weight: 600; color: var(--color-sulfur);">SiteCompiler Live System</div>
              <div style="font-size: 11.5px; color: #e2e2df;">Next.js 16 + Express + Playwright + Tailwind</div>
            </div>
          </div>
        </div>
      </div>

      <div class="slide-footer">
        <span class="footer-left">SiteCompiler — Academic Presentation</span>
        <span class="footer-center">04 / 12</span>
        <span class="footer-right">Subhankar Roy (Physics)</span>
      </div>
    </section>

    <!-- ==================== SLIDE 5: LIVE INTERFACE ==================== -->
    <section class="slide" id="slide-5">
      <div class="slide-header">
        <span class="header-meta">04 • LIVE WEB INTERFACE & DEMO</span>
        <span class="header-tag">PRODUCT DEMO</span>
      </div>

      <div class="morph-item" style="margin-bottom: 14px;">
        <h2 class="slide-title">LIVE PRODUCT INTERFACE & WORKFLOW</h2>
        <p class="subtitle">A fast, web-based tool allowing users to enter any URL and receive clean source code in seconds.</p>
      </div>

      <div class="slide-body slide-grid-2col" style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; height: 450px; align-items: stretch;">
        <div class="flex-col morph-item morph-delay-1" style="justify-content: space-between;">
          <div class="card-limestone" style="padding: 16px 20px;">
            <div style="font-family: var(--font-display); font-size: 18px; color: var(--color-ember); margin-bottom: 2px;">01. INSTANT URL INPUT</div>
            <div style="font-size: 13px; color: rgba(7,6,7,0.75);">Paste any public website link with zero configuration required.</div>
          </div>

          <div class="card-limestone" style="padding: 16px 20px;">
            <div style="font-family: var(--font-display); font-size: 18px; color: var(--color-ember); margin-bottom: 2px;">02. FORMAT SELECTION</div>
            <div style="font-size: 13px; color: rgba(7,6,7,0.75);">Static HTML/CSS, React Component Tree (.tsx), or Next.js 16 + Tailwind.</div>
          </div>

          <div class="card-limestone" style="padding: 16px 20px;">
            <div style="font-family: var(--font-display); font-size: 18px; color: var(--color-ember); margin-bottom: 2px;">03. REAL-TIME TELEMETRY</div>
            <div style="font-size: 13px; color: rgba(7,6,7,0.75);">Live pipeline stream displays browser hydration, cleaning, and compilation.</div>
          </div>

          <div class="card-limestone" style="padding: 16px 20px;">
            <div style="font-family: var(--font-display); font-size: 18px; color: var(--color-ember); margin-bottom: 2px;">04. ONE-CLICK ZIP DOWNLOAD</div>
            <div style="font-size: 13px; color: rgba(7,6,7,0.75);">Organized ZIP bundle containing components, styles, and localized images.</div>
          </div>
        </div>

        <div class="browser-window morph-item morph-delay-2">
          <div class="browser-toolbar">
            <div class="browser-dot"></div>
            <div class="browser-dot"></div>
            <div class="browser-dot"></div>
            <div class="browser-address">site-compiler.netlify.app</div>
          </div>
          <div class="browser-viewport">
            <img src="${heroImg}" alt="SiteCompiler URL Intake & Capture">
          </div>
        </div>
      </div>

      <div class="slide-footer">
        <span class="footer-left">SiteCompiler — Academic Presentation</span>
        <span class="footer-center">05 / 12</span>
        <span class="footer-right">Subhankar Roy (Physics)</span>
      </div>
    </section>

    <!-- ==================== SLIDE 6: THE PROBLEM ==================== -->
    <section class="slide" id="slide-6">
      <div class="slide-header">
        <span class="header-meta">05 • THE CORE PROBLEM EXPLAINED</span>
        <span class="header-tag">PROBLEM ANALYSIS</span>
      </div>

      <div class="morph-item" style="margin-bottom: 14px;">
        <h2 class="slide-title">PLATFORM LOCK-IN & FORCED WATERMARKS</h2>
        <p class="subtitle">Designing a website is easy today, but code ownership is locked behind paywalls.</p>
      </div>

      <div class="slide-body grid-2col" style="height: 440px;">
        <div class="flex-col morph-item morph-delay-1" style="gap: 14px;">
          <div class="card-limestone" style="flex: 1; padding: 22px 26px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
              <span style="font-family: var(--font-mono); font-size: 11.5px; opacity: 0.6;">NO-CODE BUILDERS</span>
              <span class="badge-sulfur">Accessible</span>
            </div>
            <p style="font-size: 14.5px; line-height: 1.45; color: rgba(7,6,7,0.75);">
              Modern no-code platforms make visual page creation accessible to anyone in minutes.
            </p>
          </div>

          <div class="card-limestone" style="flex: 1; padding: 22px 26px; border-left: 4px solid var(--color-ember);">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
              <span style="font-family: var(--font-mono); font-size: 11.5px; color: var(--color-ember);">THE EXPORT TRAP</span>
              <span class="badge-ember">Recurring Cost</span>
            </div>
            <p style="font-size: 14.5px; line-height: 1.45; color: rgba(7,6,7,0.75);">
              Free tiers carry forced watermarks and tracker bundles. Exporting clean code requires recurring subscriptions ($240+/year).
            </p>
          </div>
        </div>

        <div class="card-limestone flex-col morph-item morph-delay-2" style="justify-content: center; align-items: center; padding: 22px;">
          <div style="width: 100%; font-family: var(--font-mono); font-size: 11px; opacity: 0.6; margin-bottom: 10px; text-align: left;">
            FORCED WATERMARK BADGES ON FREE TIERS
          </div>

          <svg viewBox="0 0 460 280" class="diagram-svg">
            <rect x="20" y="15" width="420" height="250" rx="24" fill="#e2e2df"/>
            <rect x="20" y="15" width="420" height="28" rx="24" fill="rgba(7,6,7,0.08)"/>
            <circle cx="38" cy="29" r="3" fill="rgba(7,6,7,0.3)"/>
            <circle cx="48" cy="29" r="3" fill="rgba(7,6,7,0.3)"/>
            <circle cx="58" cy="29" r="3" fill="rgba(7,6,7,0.3)"/>
            <rect x="100" y="21" width="220" height="16" rx="8" fill="#f7f6f2"/>
            <text x="210" y="33" font-family="'Geist Mono', monospace" font-size="10" fill="rgba(7,6,7,0.6)" text-anchor="middle">example-site.framer.app</text>

            <rect x="40" y="60" width="140" height="14" rx="4" fill="rgba(7,6,7,0.1)"/>
            <rect x="40" y="85" width="380" height="75" rx="16" fill="#f7f6f2"/>
            <rect x="60" y="105" width="180" height="12" rx="4" fill="rgba(7,6,7,0.1)"/>
            <rect x="60" y="125" width="260" height="8" rx="4" fill="rgba(7,6,7,0.1)"/>

            <rect x="40" y="175" width="115" height="55" rx="14" fill="#f7f6f2"/>
            <rect x="172" y="175" width="115" height="55" rx="14" fill="#f7f6f2"/>
            <rect x="305" y="175" width="115" height="55" rx="14" fill="#f7f6f2"/>

            <!-- Floating Watermark Badge -->
            <rect x="250" y="210" width="180" height="38" rx="19" fill="#070607"/>
            <circle cx="270" cy="229" r="5" fill="#fc5000"/>
            <text x="350" y="233" font-family="'DM Sans', sans-serif" font-size="11" fill="#ffffff" text-anchor="middle">Made in Framer / Free</text>

            <rect x="235" y="145" width="195" height="24" rx="12" fill="#fc5000"/>
            <text x="332" y="161" font-family="'DM Sans', sans-serif" font-size="10" font-weight="500" fill="#ffffff" text-anchor="middle">Forced Platform Watermark</text>
          </svg>
        </div>
      </div>

      <div class="slide-footer">
        <span class="footer-left">SiteCompiler — Academic Presentation</span>
        <span class="footer-center">06 / 12</span>
        <span class="footer-right">Subhankar Roy (Physics)</span>
      </div>
    </section>

    <!-- ==================== SLIDE 7: 5-STAGE PIPELINE ==================== -->
    <section class="slide" id="slide-7">
      <div class="slide-header">
        <span class="header-meta">06 • METHODOLOGY & COMPILATION PIPELINE</span>
        <span class="header-tag">5-STAGE PIPELINE</span>
      </div>

      <div class="morph-item" style="margin-bottom: 14px;">
        <h2 class="slide-title">THE 5-STAGE COMPILATION PIPELINE</h2>
        <p class="subtitle">How the tool transforms raw live DOM into validated, production-grade components.</p>
      </div>

      <div class="slide-body" style="height: 450px; display: flex; flex-direction: column; justify-content: space-between;">
        <div class="flex-col morph-item morph-delay-1" style="gap: 10px;">
          <div class="card-limestone" style="padding: 14px 22px; display: flex; gap: 16px; align-items: center;">
            <span style="font-family: var(--font-display); font-size: 24px; color: var(--color-ember);">01</span>
            <div>
              <div style="font-size: 14px; font-weight: 600; color: var(--color-obsidian);">Browser Capture (Playwright Headless)</div>
              <div style="font-size: 12.5px; color: rgba(7,6,7,0.7);">Launches headless Chromium, waits for full hydration, and captures computed runtime DOM.</div>
            </div>
          </div>

          <div class="card-limestone" style="padding: 14px 22px; display: flex; gap: 16px; align-items: center;">
            <span style="font-family: var(--font-display); font-size: 24px; color: var(--color-ember);">02</span>
            <div>
              <div style="font-size: 14px; font-weight: 600; color: var(--color-obsidian);">DOM Cleaning & Sanitization Engine</div>
              <div style="font-size: 12.5px; color: rgba(7,6,7,0.7);">Removes builder scripts, telemetry trackers, and watermark node trees without breaking layout.</div>
            </div>
          </div>

          <div class="card-limestone" style="padding: 14px 22px; display: flex; gap: 16px; align-items: center;">
            <span style="font-family: var(--font-display); font-size: 24px; color: var(--color-ember);">03</span>
            <div>
              <div style="font-size: 14px; font-weight: 600; color: var(--color-obsidian);">Structural Semantic Classification</div>
              <div style="font-size: 12.5px; color: rgba(7,6,7,0.7);">Classifies sections (Navbar, Hero, Features, Pricing, Footer) using heuristic & LLM parser.</div>
            </div>
          </div>

          <div class="card-limestone" style="padding: 14px 22px; display: flex; gap: 16px; align-items: center;">
            <span style="font-family: var(--font-display); font-size: 24px; color: var(--color-ember);">04</span>
            <div>
              <div style="font-size: 14px; font-weight: 600; color: var(--color-obsidian);">Code Synthesis & Transformation</div>
              <div style="font-size: 12.5px; color: rgba(7,6,7,0.7);">Transforms DOM AST into modular React components with Tailwind CSS utilities.</div>
            </div>
          </div>

          <div class="card-limestone" style="padding: 14px 22px; display: flex; gap: 16px; align-items: center;">
            <span style="font-family: var(--font-display); font-size: 24px; color: var(--color-ember);">05</span>
            <div>
              <div style="font-size: 14px; font-weight: 600; color: var(--color-obsidian);">Build Validation & ZIP Packaging</div>
              <div style="font-size: 12.5px; color: rgba(7,6,7,0.7);">Validates TypeScript syntax, localizes media assets, and emits deployable ZIP.</div>
            </div>
          </div>
        </div>
      </div>

      <div class="slide-footer">
        <span class="footer-left">SiteCompiler — Academic Presentation</span>
        <span class="footer-center">07 / 12</span>
        <span class="footer-right">Subhankar Roy (Physics)</span>
      </div>
    </section>

    <!-- ==================== SLIDE 8: SYSTEM ARCHITECTURE ==================== -->
    <section class="slide" id="slide-8">
      <div class="slide-header">
        <span class="header-meta">07 • SYSTEM ARCHITECTURE & DATA FLOW</span>
        <span class="header-tag">ARCHITECTURE</span>
      </div>

      <div class="morph-item" style="margin-bottom: 14px;">
        <h2 class="slide-title">FULL-STACK ARCHITECTURE & DATA FLOW</h2>
        <p class="subtitle">Decoupled three-tier architecture separating user interface, headless capture, and code generation.</p>
      </div>

      <div class="slide-body morph-item morph-delay-1" style="height: 450px; display: flex; flex-direction: column; justify-content: center;">
        <div class="card-limestone" style="padding: 22px 28px; height: 100%; display: flex; flex-direction: column; justify-content: space-between;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-family: var(--font-mono); font-size: 11px; opacity: 0.6;">COMPONENT TOPOLOGY</span>
            <span class="badge-sulfur">Next.js 16 + Express + Playwright AST</span>
          </div>

          <div class="arch-diagram-wrap">
            <svg viewBox="0 0 1100 280" class="diagram-svg">
              <rect x="20" y="30" width="300" height="210" rx="30" fill="#e2e2df"/>
              <rect x="36" y="46" width="268" height="34" rx="17" fill="#070607"/>
              <text x="170" y="68" font-family="'Anton', sans-serif" font-size="14" fill="#ffffff" text-anchor="middle">NEXT.JS 16 FRONTEND</text>
              
              <text x="45" y="110" font-family="'DM Sans', sans-serif" font-size="13" fill="#070607" font-weight="600">• User URL & Mode Intake</text>
              <text x="45" y="132" font-family="'DM Sans', sans-serif" font-size="12" fill="rgba(7,6,7,0.7)">  React 19 App Router UI</text>
              <text x="45" y="160" font-family="'DM Sans', sans-serif" font-size="13" fill="#070607" font-weight="600">• Real-Time Telemetry Stream</text>
              <text x="45" y="182" font-family="'DM Sans', sans-serif" font-size="12" fill="rgba(7,6,7,0.7)">  Live step-by-step progress</text>
              <text x="45" y="210" font-family="'DM Sans', sans-serif" font-size="13" fill="#070607" font-weight="600">• Live In-Browser Preview Sandbox</text>

              <path d="M 320 135 L 390 135" stroke="#070607" stroke-width="2" stroke-dasharray="4 4"/>
              <polygon points="390,135 382,130 382,140" fill="#070607"/>
              <rect x="330" y="115" width="50" height="20" rx="10" fill="#fc5000"/>
              <text x="355" y="129" font-family="'DM Sans', sans-serif" font-size="10" font-weight="500" fill="#ffffff" text-anchor="middle">HTTP</text>

              <rect x="400" y="30" width="320" height="210" rx="30" fill="#e2e2df"/>
              <rect x="416" y="46" width="288" height="34" rx="17" fill="#070607"/>
              <text x="560" y="68" font-family="'Anton', sans-serif" font-size="14" fill="#ffffff" text-anchor="middle">CAPTURE & SANITIZER ENGINE</text>

              <text x="425" y="110" font-family="'DM Sans', sans-serif" font-size="13" fill="#070607" font-weight="600">• Playwright Headless Chromium</text>
              <text x="425" y="132" font-family="'DM Sans', sans-serif" font-size="12" fill="rgba(7,6,7,0.7)">  DOM snapshot & computed CSS</text>
              <text x="425" y="160" font-family="'DM Sans', sans-serif" font-size="13" fill="#070607" font-weight="600">• Heuristic Sanitizer Engine</text>
              <text x="425" y="182" font-family="'DM Sans', sans-serif" font-size="12" fill="rgba(7,6,7,0.7)">  Watermark pruning & asset pipeline</text>
              <text x="425" y="210" font-family="'DM Sans', sans-serif" font-size="13" fill="#070607" font-weight="600">• AST Component Classifier</text>

              <path d="M 720 135 L 790 135" stroke="#070607" stroke-width="2" stroke-dasharray="4 4"/>
              <polygon points="790,135 782,130 782,140" fill="#070607"/>
              <rect x="730" y="115" width="50" height="20" rx="10" fill="#fc5000"/>
              <text x="755" y="129" font-family="'DM Sans', sans-serif" font-size="10" font-weight="500" fill="#ffffff" text-anchor="middle">EMIT</text>

              <rect x="800" y="30" width="280" height="210" rx="30" fill="#fc5000"/>
              <rect x="816" y="46" width="248" height="34" rx="17" fill="#f5f28e"/>
              <text x="940" y="68" font-family="'Anton', sans-serif" font-size="14" fill="#070607" text-anchor="middle">VALIDATED CODE OUTPUT</text>

              <text x="825" y="110" font-family="'DM Sans', sans-serif" font-size="13" fill="#ffffff" font-weight="600">• Static HTML / CSS Bundle</text>
              <text x="825" y="132" font-family="'DM Sans', sans-serif" font-size="12" fill="rgba(255,255,255,0.85)">  Zero runtime dependencies</text>
              <text x="825" y="160" font-family="'DM Sans', sans-serif" font-size="13" fill="#ffffff" font-weight="600">• React TSX Component Tree</text>
              <text x="825" y="182" font-family="'DM Sans', sans-serif" font-size="12" fill="rgba(255,255,255,0.85)">  Modular JSX + clean props</text>
              <text x="825" y="210" font-family="'DM Sans', sans-serif" font-size="13" fill="#ffffff" font-weight="600">• Next.js 16 App Router + Tailwind</text>
            </svg>
          </div>
        </div>
      </div>

      <div class="slide-footer">
        <span class="footer-left">SiteCompiler — Academic Presentation</span>
        <span class="footer-center">08 / 12</span>
        <span class="footer-right">Subhankar Roy (Physics)</span>
      </div>
    </section>

    <!-- ==================== SLIDE 9: WATERMARK PRUNING ==================== -->
    <section class="slide" id="slide-9">
      <div class="slide-header">
        <span class="header-meta">08 • CORE TECHNICAL INNOVATION</span>
        <span class="header-tag">DOM SANITIZATION</span>
      </div>

      <div class="morph-item" style="margin-bottom: 14px;">
        <h2 class="slide-title">ALGORITHMIC WATERMARK & ARTIFACT PRUNING</h2>
        <p class="subtitle">Targeted pruning removes platform branding and builder tracking without breaking site layout.</p>
      </div>

      <div class="slide-body grid-2col" style="height: 450px; align-items: stretch;">
        <div class="card-limestone flex-col morph-item morph-delay-1" style="justify-content: space-between;">
          <div>
            <div style="font-family: var(--font-mono); font-size: 11px; opacity: 0.6; margin-bottom: 8px;">THE TECHNICAL CHALLENGE</div>
            <p style="font-size: 14px; line-height: 1.45; color: rgba(7,6,7,0.75); margin-bottom: 14px;">
              Builder watermarks are injected via runtime scripts or fixed overlays. Removing them blindly destroys adjacent CSS layouts.
            </p>

            <div style="font-family: var(--font-mono); font-size: 11px; color: var(--color-ember); margin-bottom: 6px;">3-TIER PRUNING STRATEGY</div>
            <div style="display: flex; flex-direction: column; gap: 8px; font-size: 13px; color: rgba(7,6,7,0.8);">
              <div style="display: flex; gap: 8px;">
                <span style="font-family: var(--font-mono); font-weight: 600; color: var(--color-ember);">01.</span>
                <span><strong>Pattern Selectors:</strong> Targets known builder tags (<code style="font-size: 11px;">[data-framer-watermark]</code>).</span>
              </div>
              <div style="display: flex; gap: 8px;">
                <span style="font-family: var(--font-mono); font-weight: 600; color: var(--color-ember);">02.</span>
                <span><strong>Geometric Anchors:</strong> Detects fixed viewport badges with vendor links.</span>
              </div>
              <div style="display: flex; gap: 8px;">
                <span style="font-family: var(--font-mono); font-weight: 600; color: var(--color-ember);">03.</span>
                <span><strong>Layout Safety Filter:</strong> Ensures real navigation & user CTAs are never pruned.</span>
              </div>
            </div>
          </div>

          <div style="border-top: 1.5px dotted var(--color-obsidian); padding-top: 10px; font-family: var(--font-mono); font-size: 11.5px; color: var(--color-ember);">
            Result: 100% clean DOM without forced platform branding
          </div>
        </div>

        <div class="card-limestone flex-col morph-item morph-delay-2" style="justify-content: center; align-items: center; padding: 20px;">
          <div style="width: 100%; font-family: var(--font-mono); font-size: 11px; opacity: 0.6; margin-bottom: 10px; text-align: left;">
            DOM SANITIZATION: BEFORE VS. AFTER
          </div>

          <svg viewBox="0 0 460 300" class="diagram-svg">
            <rect x="10" y="20" width="205" height="250" rx="20" fill="#e2e2df"/>
            <text x="112" y="42" font-family="'Anton', sans-serif" font-size="12" fill="#fc5000" text-anchor="middle">RAW CAPTURED DOM</text>
            
            <rect x="22" y="55" width="181" height="16" rx="8" fill="#f7f6f2"/>
            <rect x="22" y="78" width="181" height="65" rx="12" fill="#f7f6f2"/>
            <rect x="32" y="90" width="100" height="8" rx="4" fill="rgba(7,6,7,0.15)"/>
            <rect x="32" y="104" width="140" height="6" rx="3" fill="rgba(7,6,7,0.15)"/>
            <rect x="32" y="116" width="60" height="14" rx="7" fill="#070607"/>

            <rect x="22" y="152" width="85" height="50" rx="10" fill="#f7f6f2"/>
            <rect x="118" y="152" width="85" height="50" rx="10" fill="#f7f6f2"/>

            <rect x="100" y="216" width="105" height="28" rx="14" fill="#fc5000"/>
            <text x="152" y="234" font-family="'DM Sans', sans-serif" font-size="9" fill="#ffffff" text-anchor="middle">Made in Framer</text>

            <rect x="245" y="20" width="205" height="250" rx="20" fill="#e2e2df"/>
            <text x="347" y="42" font-family="'Anton', sans-serif" font-size="12" fill="#524ae9" text-anchor="middle">COMPILED CLEAN AST</text>

            <rect x="257" y="55" width="181" height="16" rx="8" fill="#f7f6f2" stroke="#524ae9" stroke-dasharray="2 2"/>
            <text x="347" y="67" font-family="'Geist Mono', monospace" font-size="9" fill="#524ae9" text-anchor="middle">&lt;NavbarSection /&gt;</text>

            <rect x="257" y="78" width="181" height="65" rx="12" fill="#f7f6f2" stroke="#524ae9" stroke-dasharray="2 2"/>
            <text x="347" y="114" font-family="'Geist Mono', monospace" font-size="9" fill="#524ae9" text-anchor="middle">&lt;HeroSection /&gt;</text>

            <rect x="257" y="152" width="181" height="50" rx="10" fill="#f7f6f2" stroke="#524ae9" stroke-dasharray="2 2"/>
            <text x="347" y="180" font-family="'Geist Mono', monospace" font-size="9" fill="#524ae9" text-anchor="middle">&lt;FeaturesSection /&gt;</text>

            <rect x="285" y="216" width="153" height="28" rx="14" fill="#f5f28e"/>
            <text x="361" y="234" font-family="'DM Sans', sans-serif" font-size="9" font-weight="600" fill="#070607" text-anchor="middle">✓ Watermark Pruned</text>
          </svg>
        </div>
      </div>

      <div class="slide-footer">
        <span class="footer-left">SiteCompiler — Academic Presentation</span>
        <span class="footer-center">09 / 12</span>
        <span class="footer-right">Subhankar Roy (Physics)</span>
      </div>
    </section>

    <!-- ==================== SLIDE 10: OUTPUT FORMATS ==================== -->
    <section class="slide" id="slide-10">
      <div class="slide-header">
        <span class="header-meta">09 • CODE GENERATION DELIVERABLES</span>
        <span class="header-tag">MULTI-FORMAT OUTPUT</span>
      </div>

      <div class="morph-item" style="margin-bottom: 14px;">
        <h2 class="slide-title">OUTPUT FORMATS & FREE HOSTING DELIVERABLES</h2>
        <p class="subtitle">Generated codebases are structured, production-ready, and completely independent of any vendor platform.</p>
      </div>

      <div class="slide-body grid-3col morph-item morph-delay-1" style="height: 330px; margin-bottom: 16px;">
        <div class="card-limestone flex-col" style="justify-content: space-between;">
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <span class="badge-sulfur">STATIC</span>
              <span style="font-family: var(--font-mono); font-size: 11px;">.html + .css</span>
            </div>
            <h3 style="font-family: var(--font-display); font-size: 24px; text-transform: uppercase; margin-bottom: 6px;">Static HTML5 / CSS3</h3>
            <p style="font-size: 13.5px; line-height: 1.45; color: rgba(7,6,7,0.75);">
              Semantic HTML5 paired with normalized stylesheets and local image assets. Zero framework runtime needed.
            </p>
          </div>
          <div style="font-family: var(--font-mono); font-size: 11px; color: var(--color-ember); border-top: 1.5px dotted var(--color-obsidian); padding-top: 8px;">
            Target: Nginx, Apache, GitHub Pages
          </div>
        </div>

        <div class="card-limestone flex-col" style="justify-content: space-between;">
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <span class="badge-sulfur">MODULAR</span>
              <span style="font-family: var(--font-mono); font-size: 11px;">.tsx JSX</span>
            </div>
            <h3 style="font-family: var(--font-display); font-size: 24px; text-transform: uppercase; margin-bottom: 6px;">React Component Tree</h3>
            <p style="font-size: 13.5px; line-height: 1.45; color: rgba(7,6,7,0.75);">
              Modular JSX/TSX components broken down by functional sections (<code style="font-size: 11px;">Navbar.tsx</code>, <code style="font-size: 11px;">Hero.tsx</code>) with clean props.
            </p>
          </div>
          <div style="font-family: var(--font-mono); font-size: 11px; color: var(--color-ember); border-top: 1.5px dotted var(--color-obsidian); padding-top: 8px;">
            Target: Vite, CRA, Modern Web Apps
          </div>
        </div>

        <div class="card-ember flex-col" style="justify-content: space-between;">
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <span class="badge-sulfur" style="color: var(--color-obsidian) !important;">FULL STACK</span>
              <span style="font-family: var(--font-mono); font-size: 11px; color: #ffffff !important;">App Router</span>
            </div>
            <h3 style="font-family: var(--font-display); font-size: 24px; text-transform: uppercase; margin-bottom: 6px;">Next.js 16 + Tailwind</h3>
            <p style="font-size: 13.5px; line-height: 1.45; opacity: 0.95;">
              Full repository with <code style="font-size: 11px; color: var(--color-sulfur);">package.json</code>, Tailwind utility mappings, and TypeScript ready for <code>npm run dev</code>.
            </p>
          </div>
          <div style="font-family: var(--font-mono); font-size: 11px; opacity: 0.85; border-top: 1.5px dotted var(--color-chalk); padding-top: 8px;">
            Target: Vercel, Netlify, Cloudflare
          </div>
        </div>
      </div>

      <div class="card-limestone morph-item morph-delay-2" style="padding: 16px 28px; display: flex; justify-content: space-around; align-items: center;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-family: var(--font-display); font-size: 20px; color: var(--color-ember);">01</span>
          <span style="font-size: 13px; font-weight: 600; color: var(--color-obsidian);">One-Click ZIP Archive</span>
        </div>
        <div style="height: 18px; width: 1.5px; background: var(--color-obsidian); opacity: 0.2;"></div>
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-family: var(--font-display); font-size: 20px; color: var(--color-ember);">02</span>
          <span style="font-size: 13px; font-weight: 600; color: var(--color-obsidian);">Zero External Dependencies</span>
        </div>
        <div style="height: 18px; width: 1.5px; background: var(--color-obsidian); opacity: 0.2;"></div>
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-family: var(--font-display); font-size: 20px; color: var(--color-ember);">03</span>
          <span style="font-size: 13px; font-weight: 600; color: var(--color-obsidian);">100% Free Self-Hosting</span>
        </div>
      </div>

      <div class="slide-footer">
        <span class="footer-left">SiteCompiler — Academic Presentation</span>
        <span class="footer-center">10 / 12</span>
        <span class="footer-right">Subhankar Roy (Physics)</span>
      </div>
    </section>

    <!-- ==================== SLIDE 11: KEY METRICS & TAKEAWAYS ==================== -->
    <section class="slide" id="slide-11">
      <div class="slide-header">
        <span class="header-meta">10 • EVALUATION & QUANTITATIVE RESULTS</span>
        <span class="header-tag">CALDERA STATS</span>
      </div>

      <div class="morph-item" style="margin-bottom: 14px;">
        <h2 class="slide-title">PROJECT RESULTS & EVALUATION METRICS</h2>
        <p class="subtitle">Quantitative validation across live benchmarks and student learning outcomes.</p>
      </div>

      <div class="slide-body grid-2col" style="height: 450px; align-items: stretch;">
        <div class="card-limestone flex-col morph-item morph-delay-1" style="justify-content: space-between;">
          <div>
            <div style="font-family: var(--font-mono); font-size: 11px; opacity: 0.6; margin-bottom: 8px;">QUANTITATIVE BENCHMARKS</div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
              <div class="card-ember" style="padding: 16px; border-radius: 24px;">
                <div style="font-family: var(--font-display); font-size: 44px; line-height: 1;">98.4%</div>
                <div style="font-size: 12px; opacity: 0.9; margin-top: 2px;">Visual Fidelity Score</div>
              </div>
              <div class="card-plasma" style="padding: 16px; border-radius: 24px;">
                <div style="font-family: var(--font-display); font-size: 44px; line-height: 1;">&lt; 4.2s</div>
                <div style="font-size: 12px; opacity: 0.9; margin-top: 2px;">Avg Compilation Speed</div>
              </div>
              <div style="background: #e2e2df; padding: 16px; border-radius: 24px;">
                <div style="font-family: var(--font-display); font-size: 44px; line-height: 1; color: var(--color-ember);">68%</div>
                <div style="font-size: 12px; color: rgba(7,6,7,0.7); margin-top: 2px;">Bundle Bloat Pruned</div>
              </div>
              <div style="background: #e2e2df; padding: 16px; border-radius: 24px;">
                <div style="font-family: var(--font-display); font-size: 44px; line-height: 1; color: var(--color-obsidian);">0</div>
                <div style="font-size: 12px; color: rgba(7,6,7,0.7); margin-top: 2px;">Build / Syntax Errors</div>
              </div>
            </div>

            <div style="font-family: var(--font-mono); font-size: 11px; color: var(--color-ember); margin-bottom: 4px;">PHYSICS STUDENT TAKEAWAY</div>
            <p style="font-size: 13.5px; color: rgba(7,6,7,0.75); line-height: 1.45;">
              Demonstrated how computational models and finite state extraction bridge directly from Physics modeling to web compilers.
            </p>
          </div>

          <div style="border-top: 1.5px dotted var(--color-obsidian); padding-top: 8px; font-family: var(--font-mono); font-size: 11.5px; color: var(--color-obsidian); opacity: 0.8;">
            Live Status: Verified & Deployed at site-compiler.netlify.app
          </div>
        </div>

        <div class="card-limestone flex-col morph-item morph-delay-2" style="justify-content: center; align-items: center; padding: 20px;">
          <div style="width: 100%; font-family: var(--font-mono); font-size: 11px; opacity: 0.6; margin-bottom: 12px; text-align: left;">
            PIPELINE VERIFICATION SUMMARY
          </div>

          <svg viewBox="0 0 460 300" class="diagram-svg">
            <rect x="20" y="35" width="120" height="175" rx="24" fill="#e2e2df"/>
            <circle cx="80" cy="77" r="16" fill="#fc5000"/>
            <text x="80" y="82" font-family="'DM Sans', sans-serif" font-size="12" fill="#ffffff" text-anchor="middle">✓</text>
            <text x="80" y="135" font-family="'Anton', sans-serif" font-size="14" fill="#070607" text-anchor="middle">CAPTURE</text>
            <text x="80" y="155" font-family="'DM Sans', sans-serif" font-size="10.5" fill="rgba(7,6,7,0.7)" text-anchor="middle">Headless Engine</text>
            <text x="80" y="170" font-family="'Geist Mono', monospace" font-size="10" fill="#fc5000" text-anchor="middle">100% Passed</text>

            <path d="M 145 120 L 165 120" stroke="#070607" stroke-width="2" stroke-dasharray="2 2"/>

            <rect x="170" y="35" width="120" height="175" rx="24" fill="#e2e2df"/>
            <circle cx="230" cy="77" r="16" fill="#fc5000"/>
            <text x="230" y="82" font-family="'DM Sans', sans-serif" font-size="12" fill="#ffffff" text-anchor="middle">✓</text>
            <text x="230" y="135" font-family="'Anton', sans-serif" font-size="14" fill="#070607" text-anchor="middle">SANITIZE</text>
            <text x="230" y="155" font-family="'DM Sans', sans-serif" font-size="10.5" fill="rgba(7,6,7,0.7)" text-anchor="middle">Artifacts Pruned</text>
            <text x="230" y="170" font-family="'Geist Mono', monospace" font-size="10" fill="#fc5000" text-anchor="middle">Verified Clean</text>

            <path d="M 295 120 L 315 120" stroke="#070607" stroke-width="2" stroke-dasharray="2 2"/>

            <rect x="320" y="35" width="120" height="175" rx="24" fill="#fc5000"/>
            <circle cx="380" cy="77" r="16" fill="#f5f28e"/>
            <text x="380" y="82" font-family="'DM Sans', sans-serif" font-size="12" fill="#070607" text-anchor="middle">✓</text>
            <text x="380" y="135" font-family="'Anton', sans-serif" font-size="14" fill="#ffffff" text-anchor="middle">COMPILED</text>
            <text x="380" y="155" font-family="'DM Sans', sans-serif" font-size="10.5" fill="rgba(255,255,255,0.9)" text-anchor="middle">HTML / React / Next</text>
            <text x="380" y="170" font-family="'Geist Mono', monospace" font-size="10" fill="#f5f28e" text-anchor="middle">Zip Emitted</text>

            <rect x="100" y="240" width="260" height="30" rx="15" fill="#f5f28e"/>
            <text x="230" y="259" font-family="'DM Sans', sans-serif" font-weight="600" font-size="11" fill="#070607" text-anchor="middle">✓ All Deliverables Complete & Verified</text>
          </svg>
        </div>
      </div>

      <div class="slide-footer">
        <span class="footer-left">SiteCompiler — Academic Presentation</span>
        <span class="footer-center">11 / 12</span>
        <span class="footer-right">Subhankar Roy (Physics)</span>
      </div>
    </section>

    <!-- ==================== SLIDE 12: CONCLUSION & Q&A ==================== -->
    <section class="slide" id="slide-12">
      <div class="slide-header">
        <span class="header-meta">ACADEMIC PRESENTATION • CONCLUSION</span>
        <span class="header-tag">Q&A</span>
      </div>

      <div class="slide-body slide-center-content" style="height: 500px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; position: relative;">
        <div class="halftone-overlay"></div>

        <div class="morph-item" style="font-family: var(--font-mono); font-size: 12px; color: var(--color-ember); margin-bottom: 6px; letter-spacing: 0.08em; z-index: 2;">
          PRESENTATION CONCLUDED
        </div>

        <h1 class="display-title morph-item morph-delay-1" style="font-size: 76px; margin-bottom: 6px; z-index: 2;">
          THANK YOU.
        </h1>

        <p class="subtitle morph-item morph-delay-1" style="font-size: 18px; margin-bottom: 20px; z-index: 2;">
          I welcome your questions, feedback, and project evaluation.
        </p>

        <a href="https://site-compiler.netlify.app/" target="_blank" rel="noopener noreferrer" class="browser-window morph-item morph-delay-2" style="width: 580px; height: 210px; margin-bottom: 20px; text-decoration: none; cursor: pointer; display: block; position: relative; z-index: 2;" title="Click to open live site demo">
          <div class="browser-toolbar">
            <div class="browser-dot"></div>
            <div class="browser-dot"></div>
            <div class="browser-dot"></div>
            <div class="browser-address">https://site-compiler.netlify.app/</div>
            <span style="font-family: var(--font-mono); font-size: 11px; color: var(--color-ember); margin-left: auto;">
              Live Demo ↗
            </span>
          </div>
          <div class="browser-viewport">
            <img src="${heroImg}" alt="SiteCompiler Interface">
          </div>
        </a>

        <div class="morph-item morph-delay-3" style="display: flex; flex-direction: column; align-items: center; gap: 4px; z-index: 2;">
          <div style="font-size: 16px; font-weight: 600; color: var(--color-obsidian);">Subhankar Roy</div>
          <div style="font-size: 13px; color: rgba(7,6,7,0.7);">Department of Physics</div>
          <div style="display: flex; gap: 10px; margin-top: 6px; align-items: center;">
            <a href="https://site-compiler.netlify.app/" target="_blank" rel="noopener noreferrer" class="pill-btn-ember">
              <span>Visit site-compiler.netlify.app ↗</span>
            </a>
            <span class="badge-sulfur">Built with Google Antigravity AI</span>
          </div>
        </div>
      </div>

      <div class="slide-footer">
        <span class="footer-left">SiteCompiler — Academic Presentation</span>
        <span class="footer-center">12 / 12</span>
        <span class="footer-right">Subhankar Roy (Physics)</span>
      </div>
    </section>

  </div>
</div>

<!-- Caldera Floating Controls Bar -->
<div class="deck-controls visible">
  <button class="ctrl-btn" id="prevBtn" title="Previous Slide (Left Arrow / Backspace / Page Up)">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M15 18l-6-6 6-6"/></svg>
    Prev
  </button>

  <div class="slide-dots" id="slideDots"></div>

  <span class="ctrl-counter" id="slideIndicator">01 / 12</span>

  <button class="ctrl-btn" id="nextBtn" title="Next Slide (Right Arrow / Space / Page Down)">
    Next
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 18l6-6-6-6"/></svg>
  </button>

  <button class="ctrl-btn" id="fsBtn" title="Toggle Fullscreen (F)">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
  </button>
</div>

<script>
  let currentSlide = 1;
  const totalSlides = 12;
  let isTransitioning = false;

  const slides = document.querySelectorAll('.slide');
  const slideIndicator = document.getElementById('slideIndicator');
  const slideContainer = document.getElementById('slideContainer');
  const progressBar = document.getElementById('deckProgressBar');
  const slideDotsContainer = document.getElementById('slideDots');

  // Build Dot Pips
  for (let i = 1; i <= totalSlides; i++) {
    const dot = document.createElement('div');
    dot.className = 'slide-dot' + (i === 1 ? ' active' : '');
    dot.title = 'Jump to Slide ' + i;
    dot.addEventListener('click', () => {
      if (i !== currentSlide) showSlide(i);
    });
    slideDotsContainer.appendChild(dot);
  }

  const dots = document.querySelectorAll('.slide-dot');

  function showSlide(targetIndex) {
    if (targetIndex < 1) targetIndex = 1;
    if (targetIndex > totalSlides) targetIndex = totalSlides;
    if (targetIndex === currentSlide && isTransitioning) return;

    const prevIndex = currentSlide;
    const isForward = targetIndex > prevIndex;
    currentSlide = targetIndex;
    isTransitioning = true;

    // Update Progress Bar
    const progressPercent = ((currentSlide - 1) / (totalSlides - 1)) * 100;
    progressBar.style.width = Math.max(8.33, progressPercent) + '%';

    // Update Counter & Dots
    slideIndicator.textContent = String(currentSlide).padStart(2, '0') + ' / ' + String(totalSlides).padStart(2, '0');
    dots.forEach((d, idx) => {
      if (idx + 1 === currentSlide) {
        d.classList.add('active');
      } else {
        d.classList.remove('active');
      }
    });

    const outgoingSlide = slides[prevIndex - 1];
    const incomingSlide = slides[targetIndex - 1];

    slides.forEach((s) => {
      s.classList.remove('morph-out-left', 'morph-out-right', 'morph-in-left', 'morph-in-right');
    });

    if (outgoingSlide && outgoingSlide !== incomingSlide) {
      outgoingSlide.classList.remove('active');
      outgoingSlide.classList.add(isForward ? 'morph-out-left' : 'morph-out-right');
    }

    if (incomingSlide) {
      incomingSlide.scrollTop = 0;
      incomingSlide.classList.add(isForward ? 'morph-in-right' : 'morph-in-left');
      
      void incomingSlide.offsetWidth;

      requestAnimationFrame(() => {
        incomingSlide.classList.remove('morph-in-right', 'morph-in-left');
        incomingSlide.classList.add('active');
      });
    }

    setTimeout(() => {
      if (outgoingSlide && outgoingSlide !== incomingSlide) {
        outgoingSlide.classList.remove('morph-out-left', 'morph-out-right');
      }
      isTransitioning = false;
    }, 520);
  }

  function nextSlide() {
    if (currentSlide < totalSlides) {
      showSlide(currentSlide + 1);
    }
  }

  function prevSlide() {
    if (currentSlide > 1) {
      showSlide(currentSlide - 1);
    }
  }

  document.getElementById('prevBtn').addEventListener('click', prevSlide);
  document.getElementById('nextBtn').addEventListener('click', nextSlide);

  // Auto-hide controls after idle
  const controls = document.querySelector('.deck-controls');
  let idleTimer;

  function showControls() {
    controls.classList.remove('idle-hidden');
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      if (!controls.matches(':hover')) {
        controls.classList.add('idle-hidden');
      }
    }, 2800);
  }

  window.addEventListener('mousemove', showControls);
  window.addEventListener('keydown', showControls);
  showControls();

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => console.log(err));
    } else {
      document.exitFullscreen().catch(err => console.log(err));
    }
  }

  document.getElementById('fsBtn').addEventListener('click', toggleFullscreen);

  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown' || e.key === 'Enter') {
      e.preventDefault();
      nextSlide();
    } else if (e.key === 'ArrowLeft' || e.key === 'PageUp' || e.key === 'Backspace') {
      e.preventDefault();
      prevSlide();
    } else if (e.key === 'Home') {
      e.preventDefault();
      showSlide(1);
    } else if (e.key === 'End') {
      e.preventDefault();
      showSlide(totalSlides);
    } else if (e.key.toLowerCase() === 'f') {
      toggleFullscreen();
    }
  }, { capture: true });

  slideContainer.addEventListener('click', (e) => {
    if (e.target.closest('button, a, .slide-dot, input, textarea')) return;
    const rect = slideContainer.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    if (clickX < rect.width * 0.25) {
      prevSlide();
    } else {
      nextSlide();
    }
  });

  // Touch Swipe Support
  let touchStartX = 0;
  let touchStartY = 0;
  window.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
  }, { passive: true });

  window.addEventListener('touchend', (e) => {
    const diffX = e.changedTouches[0].screenX - touchStartX;
    const diffY = e.changedTouches[0].screenY - touchStartY;
    if (Math.abs(diffX) > 50 && Math.abs(diffX) > Math.abs(diffY) * 1.5) {
      if (diffX < 0) nextSlide();
      else prevSlide();
    }
  }, { passive: true });

  // Responsive scaling
  function autoScale() {
    const winW = window.innerWidth;
    const winH = window.innerHeight;
    const isPortrait = winH > winW;
    const isMobileSize = winW <= 860;
    const isShortLandscape = winH <= 520 && !isPortrait;

    if (isMobileSize || (isPortrait && winW <= 960)) {
      document.body.classList.add('mobile-mode');
      slideContainer.style.transform = '';
      return;
    }

    document.body.classList.remove('mobile-mode');

    const targetW = 1280;
    const targetH = 720;
    const isFs = !!document.fullscreenElement;
    
    const horizPadding = isShortLandscape ? 16 : 32;
    const vertPadding = isFs ? 30 : (isShortLandscape ? 48 : 80);

    const availableW = winW - horizPadding;
    const availableH = winH - vertPadding;

    const scale = Math.min(availableW / targetW, availableH / targetH, 1.4);
    slideContainer.style.transform = 'scale(' + scale + ')';
  }

  window.addEventListener('resize', autoScale);
  document.addEventListener('fullscreenchange', autoScale);
  autoScale();
</script>

</body>
</html>
`;

fs.writeFileSync('presentation-deck/index.html', htmlContent);
fs.writeFileSync('presentation-deck/presentation.html', htmlContent);
console.log('Saved Caldera-themed presentation deck to presentation-deck/index.html & presentation.html');
