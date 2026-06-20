// Xiangqi Frontend — Phase 1 (Vite bundled entry point)
// This module loads Phase 1 infrastructure (monitoring, SEO, accessibility)
// Game logic remains in legacy scripts/main.js (loaded separately in index.html)

// ============= CSS (imported first to prevent FOUC) =============
import './styles/main.css';

// ============= PHASE 1 FEATURES =============
import { initWebVitals } from './monitoring/web-vitals.js';
import { initSentry } from './monitoring/sentry-init.js';
import { initMetaInjector } from './seo/meta-injector.js';
import { initA11y } from './a11y/wcag-init.js';

console.log('[Phase 1] Initializing infrastructure...');

// Initialize Phase 1 features
async function initPhase1() {
  if (import.meta.env.PROD) {
    try {
      initSentry();
      console.log('[Phase 1] Sentry initialized');
    } catch (e) {
      console.warn('[Phase 1] Sentry init failed:', e.message);
    }
  }

  try {
    await initWebVitals();
    console.log('[Phase 1] Web Vitals monitoring initialized');
  } catch (e) {
    console.warn('[Phase 1] Web Vitals init failed:', e.message);
  }

  try {
    initMetaInjector();
    console.log('[Phase 1] Dynamic meta tags initialized');
  } catch (e) {
    console.warn('[Phase 1] Meta injector init failed:', e.message);
  }

  try {
    initA11y();
    console.log('[Phase 1] Accessibility features initialized');
  } catch (e) {
    console.warn('[Phase 1] A11y init failed:', e.message);
  }

  // Service Worker registration
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    try {
      const reg = await navigator.serviceWorker.register('/service-worker.js', { scope: '/' });
      console.log('[Phase 1] Service Worker registered:', reg.scope);
    } catch (err) {
      console.warn('[Phase 1] Service Worker registration failed:', err);
    }
  }

  console.log('[Phase 1] Infrastructure loaded successfully ✅');
}

// Start initialization immediately
initPhase1().catch(err => console.error('[Phase 1] Initialization error:', err));
