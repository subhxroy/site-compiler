export function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  try {
    return JSON.stringify(err);
  } catch {
    return 'Unknown error';
  }
}

// Secret-shaped tokens that must never surface in job errors / logs.
const SECRET_PATTERNS: RegExp[] = [
  /\bsk-ant-[A-Za-z0-9_-]{10,}/g,
  /\bAIza[0-9A-Za-z_-]{20,}\b/g,
  /\bBearer\s+[A-Za-z0-9._~+/=-]{20,}/gi,
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g, // JWT
];

/**
 * Strip anything that looks like a credential or secret from a message that
 * may end up in a job's public `error` field or server logs. Falls back to a
 * generic message if nothing usable remains.
 */
export function sanitizeErrorMessage(msg: unknown): string {
  let s = String(msg || 'Unknown error').slice(0, 2000);
  for (const re of SECRET_PATTERNS) s = s.replace(re, '[redacted]');
  for (const key of [
    'ANTHROPIC_API_KEY',
    'ANTHROPIC_AUTH_TOKEN',
    'ADMIN_BYPASS_SECRET',
    'BACKEND_ADMIN_SECRET',
    'FIREBASE_SERVICE_ACCOUNT_KEY',
  ]) {
    const value = process.env[key];
    if (value && s.includes(value)) s = s.split(value).join(`[${key} redacted]`);
  }
  return s.trim().slice(0, 2000) || 'Unknown error';
}
