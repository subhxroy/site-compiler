/**
 * Utility for resolving backend API URLs.
 * When deployed on Netlify (Frontend) with Render (Backend), process.env.NEXT_PUBLIC_API_URL
 * points to the Render service origin (e.g., https://sitecompiler-backend.onrender.com).
 * If undefined, it falls back to relative paths for local full-stack execution.
 */

export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');

export function getApiUrl(path: string): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
}
