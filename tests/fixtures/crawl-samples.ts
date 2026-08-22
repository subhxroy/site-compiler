/**
 * Real-world crawled HTML benchmark fixtures for AST parsing and CSS consolidation testing.
 */

export const FRAMER_PORTFOLIO_FIXTURE = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Framer Dynamic Portfolio Benchmark</title>
  <style>
    :root { --framer-font-sans: 'Inter', sans-serif; --framer-bg: #0a0a0c; --framer-accent: #ff6363; }
    body { margin: 0; background: var(--framer-bg); color: #fff; font-family: var(--framer-font-sans); }
    .framer-hero { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 80vh; padding: 2rem; }
    .framer-title { font-size: 3.5rem; font-weight: 800; background: linear-gradient(135deg, #fff 0%, #a1a1aa 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .framer-badge { display: inline-flex; align-items: center; padding: 0.25rem 0.75rem; border-radius: 9999px; background: rgba(255,99,99,0.1); border: 1px solid rgba(255,99,99,0.2); color: var(--framer-accent); font-size: 0.75rem; }
    .framer-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem; max-width: 1200px; margin: 0 auto; padding: 2rem; }
    .framer-card { background: #121216; border: 1px solid #23232a; border-radius: 1rem; padding: 1.5rem; transition: transform 0.2s ease, border-color 0.2s ease; }
    .framer-card:hover { transform: translateY(-4px); border-color: var(--framer-accent); }
    .__framer-badge { position: fixed; bottom: 16px; right: 16px; z-index: 999; }
  </style>
</head>
<body>
  <div class="framer-hero">
    <div class="framer-badge">✨ Portfolio 2026</div>
    <h1 class="framer-title">Digital Craftsman & Architect</h1>
    <p class="framer-subtitle">Designing high-performance systems and interactive 3D web experiences.</p>
  </div>
  <div class="framer-grid">
    <div class="framer-card"><h3>Project Alpha</h3><p>Enterprise cloud monitoring platform with WebGL telemetry visualizations.</p></div>
    <div class="framer-card"><h3>Project Beta</h3><p>Real-time distributed vector search index with microsecond latency.</p></div>
    <div class="framer-card"><h3>Project Gamma</h3><p>Zero-knowledge cryptographic verification pipeline for asset transfer.</p></div>
    <div class="framer-card"><h3>Project Delta</h3><p>Autonomous agent orchestrator built for large-scale code synthesis.</p></div>
  </div>
  <div class="__framer-badge"><a href="https://framer.com">Made in Framer</a></div>
</body>
</html>
`;

export const WEBFLOW_SAAS_FIXTURE = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Webflow Enterprise SaaS Benchmark</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background-color: #0f1117; color: #e6edf3; }
    .w-nav { position: sticky; top: 0; background: rgba(15, 17, 23, 0.85); backdrop-filter: blur(12px); border-bottom: 1px solid #21262d; padding: 1rem 2rem; }
    .w-container { max-width: 1140px; margin: 0 auto; }
    .w-row { display: flex; flex-wrap: wrap; margin: -10px; }
    .w-col { flex: 1; padding: 10px; }
    .w-button { background: #ff6363; color: white; border-radius: 6px; padding: 10px 20px; font-weight: 600; text-decoration: none; display: inline-block; }
    .w-webflow-badge { display: block; }
  </style>
</head>
<body>
  <div class="w-nav">
    <div class="w-container"><strong>NextScale AI</strong></div>
  </div>
  <div class="w-container">
    <div class="w-row">
      <div class="w-col">
        <h1>Autonomous Operations Platform</h1>
        <p>Deploy AI infrastructure with automatic self-healing and load distribution.</p>
        <a href="#" class="w-button">Start Free Trial</a>
      </div>
      <div class="w-col">
        <div style="background:#161b22; border:1px solid #30363d; border-radius:8px; padding:20px;">
          <code>cluster.provision(region='us-east-1', instances=128)</code>
        </div>
      </div>
    </div>
  </div>
  <a class="w-webflow-badge" href="https://webflow.com">Powered by Webflow</a>
</body>
</html>
`;
