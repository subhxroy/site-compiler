/**
 * Utility for resolving backend API URLs.
 * When deployed on Netlify (Frontend) with Render (Backend), process.env.NEXT_PUBLIC_API_URL
 * or process.env.BACKEND_URL points to the Render service origin (e.g., https://sitecompiler-backend.onrender.com).
 * If undefined, it falls back to relative paths for local full-stack execution.
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
  return `${API_BASE_URL}${cleanPath}`;
}

export function isServerlessEnvironment(): boolean {
  return !!(process.env.NETLIFY || process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
}
