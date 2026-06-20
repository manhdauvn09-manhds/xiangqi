// Xiangqi Frontend — Phase 1 (Vite bundled entry point)
// Core infrastructure: SEO, monitoring, accessibility

// ============= CSS (imported first to prevent FOUC) =============
import './styles/main.css';

// ============= PHASE 1 MODULES =============
// SEO meta injection for dynamic player profiles and game cards
import { initMetaInjector } from './seo/meta-injector.js';

// Web Vitals collection (LCP, FID, CLS, TTFB, FCP) for performance analytics
import { initWebVitals } from './monitoring/web-vitals.js';

// Sentry error tracking and session replay (production only)
import { initSentry } from './monitoring/sentry-init.js';

// WCAG 2.1 AA accessibility features (keyboard nav, screen readers, motion preferences)
import { initA11y } from './a11y/wcag-init.js';

// ============= INITIALIZATION =============
async function initializePhase1() {
  // Initialize in order of priority (don't block each other)
  try {
    // 1. Accessibility (no async work, runs synchronously)
    initA11y();

    // 2. Sentry error tracking (synchronous, dev-safe)
    initSentry();

    // 3. SEO meta injection (async, safe to await)
    initMetaInjector();

    // 4. Web Vitals monitoring (async, doesn't block page render)
    await initWebVitals();

    console.log('[Phase 1] All modules initialized');
  } catch (err) {
    console.error('[Phase 1] Initialization error:', err);
  }
}

// Start initialization when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializePhase1);
} else {
  initializePhase1();
}
