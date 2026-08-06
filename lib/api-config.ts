/**
 * Utility for resolving backend API URLs.
 * When deployed on Netlify (Frontend) with Render (Backend), process.env.NEXT_PUBLIC_API_URL
 * or process.env.BACKEND_URL points to the Render service origin (e.g., https://sitecompiler-backend.onrender.com).
 * If undefined or running on localhost, it falls back to relative paths for local full-stack execution.
 */

export const API_BASE_URL = (
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

  // On localhost, always use relative paths so exports run 100% locally
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return cleanPath;
  }

  return API_BASE_URL ? `${API_BASE_URL}${cleanPath}` : cleanPath;
}

export function isServerlessEnvironment(): boolean {
  return !!(process.env.NETLIFY || process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
}
