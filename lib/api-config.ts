/**
 * Utility for resolving backend API URLs.
 * When deployed on Netlify (Frontend) with Render (Backend), process.env.NEXT_PUBLIC_API_URL
 * or process.env.BACKEND_URL points to the Render service origin (https://site-compiler.onrender.com).
 * If running on localhost, it falls back to relative paths for 100% local execution.
 */

// Resolution order:
//   1. Explicit NEXT_PUBLIC_API_URL / BACKEND_URL override (optional)
//   2. Local dev (next dev, NODE_ENV=development): '' so routes run the job
//      processor in-process via dynamic import (uses local Playwright).
//   3. Production (NODE_ENV=production): the Render backend origin, so the
//      Netlify serverless functions always proxy — no dashboard env var needed.
export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.BACKEND_URL ||
  (process.env.NODE_ENV === 'development' ? '' : 'https://site-compiler.onrender.com')
).replace(/\/$/, '');

// The Render backend URL exposed to the browser.
// Used for export job creation only — bypasses Netlify's 10s serverless timeout.
// In local dev this is empty, so calls fall through to the relative /api proxy.
export const RENDER_BACKEND_URL = (
  process.env.NEXT_PUBLIC_RENDER_BACKEND_URL ||
  (process.env.NODE_ENV === 'development' ? '' : 'https://site-compiler.onrender.com')
).replace(/\/$/, '');

export function getApiUrl(path: string): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  // In the browser, always use relative paths (/api/...) so Next.js API routes on Netlify
  // proxy requests server-to-server to the Render backend, preventing CORS and direct fetch errors.
  if (typeof window !== 'undefined') {
    return cleanPath;
  }

  return API_BASE_URL ? `${API_BASE_URL}${cleanPath}` : cleanPath;
}

/**
 * Returns the direct Render backend URL for browser-side requests that must
 * bypass Netlify's 10-second serverless function timeout (e.g. export job creation).
 * Falls back to the relative Netlify proxy path when RENDER_BACKEND_URL is not set.
 */
export function getDirectBackendUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (RENDER_BACKEND_URL) {
    return `${RENDER_BACKEND_URL}${cleanPath}`;
  }
  // Local dev fallback: use relative path (Next.js dev server handles it in-process)
  return cleanPath;
}

export function isServerlessEnvironment(): boolean {
  return !!(process.env.NETLIFY || process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
}
