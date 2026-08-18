import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    debug: false,
    environment: process.env.NODE_ENV || 'development',
    ignoreErrors: [
      'Database is closing',
      'Database is closing/hidden',
      'The database connection is closing',
      /Database is closing/i,
      /closing\/hidden/i,
      'ResizeObserver loop limit exceeded',
      'Network request failed',
    ],
  });
}
