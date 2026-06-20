// Sentry Integration — Error tracking and performance monitoring
// Phase 1: Production error tracking (development disabled)

import * as Sentry from '@sentry/browser';

export function initSentry() {
  // Only initialize in production
  if (import.meta.env.DEV) {
    console.log('Sentry disabled in development');
    return;
  }

  const SENTRY_DSN = document.querySelector('meta[name="sentry-dsn"]')?.content;

  if (!SENTRY_DSN) {
    console.warn('Sentry DSN not configured');
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: 'production',
    tracesSampleRate: 0.1, // 10% for performance monitoring
    profilesSampleRate: 0.1, // 10% for profiling
    integrations: [
      new Sentry.Replay({
        maskAllText: true, // Privacy: don't record user input
        blockAllMedia: true, // Privacy: don't record media
        maskAllInputs: true,
      }),
      new Sentry.CaptureConsole({
        levels: ['error', 'warn'],
      }),
    ],
    // Session Replay configuration
    replaysSessionSampleRate: 0.1, // 10% of sessions
    replaysOnErrorSampleRate: 1.0, // 100% for sessions with errors
    // Ignore certain errors
    beforeSend(event, hint) {
      // Ignore network errors from service worker
      if (event.exception) {
        const error = hint.originalException;
        if (error && error.message && error.message.includes('NetworkError')) {
          return null;
        }
      }
      return event;
    },
  });

  // Attach user context if authenticated
  try {
    const userJson = localStorage.getItem('xq_user');
    if (userJson) {
      const user = JSON.parse(userJson);
      Sentry.setUser({
        id: user.id,
        email: user.email,
        username: user.username,
      });
    }
  } catch (e) {
    console.debug('Could not set Sentry user context:', e);
  }

  // Attach game session context
  window.addEventListener('hashchange', () => {
    const hash = window.location.hash.slice(1).split('?')[0];
    Sentry.setTag('page', hash);
  });

  console.log('Sentry initialized');
}

// Capture exceptions manually
export function captureException(error, context = {}) {
  if (import.meta.env.DEV) {
    console.error('Exception captured:', error, context);
    return;
  }

  Sentry.captureException(error, {
    contexts: context,
  });
}

// Capture messages for debugging
export function captureMessage(message, level = 'info', context = {}) {
  if (import.meta.env.DEV) {
    console.log(`[${level}] ${message}`, context);
    return;
  }

  Sentry.captureMessage(message, level);
}

// Get Sentry instance for advanced usage
export function getSentry() {
  return Sentry;
}
