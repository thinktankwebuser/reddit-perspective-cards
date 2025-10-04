/**
 * Sentry Error Monitoring Configuration
 * Client-side error tracking for production
 */

import * as Sentry from '@sentry/nextjs';

export function initSentry() {
  if (process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

      // Performance monitoring
      tracesSampleRate: 0.1, // 10% of transactions for performance

      // Error filtering
      ignoreErrors: [
        // Browser extensions
        'top.GLOBALS',
        'chrome-extension://',
        // Network errors that are not actionable
        'NetworkError',
        'Failed to fetch',
      ],

      // Release tracking
      release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
      environment: process.env.NEXT_PUBLIC_VERCEL_ENV || 'development',
    });
  }
}

export { Sentry };
