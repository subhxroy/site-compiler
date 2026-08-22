/**
 * Utility for resolving backend API URLs.
 * Dynamically switches between local relative paths (when running locally)
 * and the live Render backend service (https://site-compiler.onrender.com)
 * when deployed online on Netlify, Vercel, or custom domains.
 */

export const DEFAULT_RENDER_BACKEND = 'https://site-compiler.onrender.com';

export function isServerlessEnvironment(): boolean {
  return !!(
    process.env.NETLIFY ||
    process.env.VERCEL ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.RENDER
  );
}

// Server-to-server proxy base URL
export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.BACKEND_URL ||
  process.env.API_BASE_URL ||
  (process.env.NODE_ENV === 'production' && (process.env.NETLIFY || process.env.VERCEL)
    ? DEFAULT_RENDER_BACKEND
    : '')
).replace(/\/$/, '');

// Browser-facing direct backend URL
export const RENDER_BACKEND_URL = (
  process.env.NEXT_PUBLIC_RENDER_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.BACKEND_URL ||
  ''
).replace(/\/$/, '');

export function getApiUrl(path: string): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  // In the browser, relative paths (/api/...) use same-origin proxy
  if (typeof window !== 'undefined') {
    return cleanPath;
  }

  return API_BASE_URL ? `${API_BASE_URL}${cleanPath}` : cleanPath;
}

/**
 * Returns the direct Render backend URL for browser-side requests that must
 * bypass Netlify/Vercel serverless function timeouts (e.g. export job creation, polling, preview).
 * Automatically resolves to the local path when on localhost, and to the Render backend when on live site.
 */
export function getDirectBackendUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  if (typeof window !== 'undefined') {
    const isLocalhost =
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname === '0.0.0.0';

    if (isLocalhost && !RENDER_BACKEND_URL) {
      return cleanPath;
    }

    const targetBackend = RENDER_BACKEND_URL || DEFAULT_RENDER_BACKEND;
    return `${targetBackend}${cleanPath}`;
  }

  if (RENDER_BACKEND_URL) {
    return `${RENDER_BACKEND_URL}${cleanPath}`;
  }

  return cleanPath;
}

/**
 * Checks if the current execution context is a local development / open-source instance.
 */
export function isLocalEnvironment(): boolean {
  if (typeof window !== 'undefined') {
    const h = window.location.hostname;
    return (
      h === 'localhost' ||
      h === '127.0.0.1' ||
      h === '0.0.0.0' ||
      h === '::1' ||
      process.env.NEXT_PUBLIC_ALLOW_FREE_EXPORTS === 'true' ||
      process.env.NEXT_PUBLIC_REQUIRE_AUTH === 'false'
    );
  }

  // Server-side detection
  const isCloudDeployment = !!(
    process.env.NETLIFY ||
    process.env.VERCEL ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    (process.env.RENDER && process.env.NODE_ENV === 'production')
  );

  return (
    !isCloudDeployment ||
    process.env.ALLOW_FREE_EXPORTS === 'true' ||
    process.env.NODE_ENV === 'development'
  );
}

/**
 * Determines whether the payment/approval gate should be bypassed (free export mode).
 */
export function isFreeExportEnabled(): boolean {
  if (process.env.ALLOW_FREE_EXPORTS === 'true' || process.env.NEXT_PUBLIC_ALLOW_FREE_EXPORTS === 'true') {
    return true;
  }
  if (process.env.DISABLE_PAYWALL === 'true' || process.env.NEXT_PUBLIC_DISABLE_PAYWALL === 'true') {
    return true;
  }
  return isLocalEnvironment();
}

