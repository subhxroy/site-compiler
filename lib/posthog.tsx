'use client';

import React, { useEffect } from 'react';
import posthog from 'posthog-js';

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

export function initPostHog() {
  if (typeof window !== 'undefined' && POSTHOG_KEY && !posthog.__loaded) {
    try {
      posthog.init(POSTHOG_KEY, {
        api_host: POSTHOG_HOST,
        person_profiles: 'identified_only',
        capture_pageview: true,
        capture_pageleave: true,
        loaded: (ph) => {
          if (process.env.NODE_ENV === 'development') {
            ph.debug();
          }
        },
      });
    } catch (err) {
      console.warn('[PostHog Init Warning]', err);
    }
  }
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initPostHog();
  }, []);

  return <>{children}</>;
}

// Track Analytics Events
export function trackEvent(eventName: string, properties?: Record<string, unknown>) {
  if (typeof window !== 'undefined' && posthog.__loaded) {
    try {
      posthog.capture(eventName, properties);
    } catch {}
  }
}

export function trackExportStart(url: string, format: string) {
  trackEvent('site_export_started', { targetUrl: url, format });
}

export function trackExportComplete(jobId: string, pageCount: number, zipSizeKb?: number) {
  trackEvent('site_export_completed', { jobId, pageCount, zipSizeKb });
}

export function trackPaymentSubmitted(jobId: string, amount: number) {
  trackEvent('payment_submitted', { jobId, amount });
}

export function trackZipDownloaded(jobId: string) {
  trackEvent('zip_downloaded', { jobId });
}
