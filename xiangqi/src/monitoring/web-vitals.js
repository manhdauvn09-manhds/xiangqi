// Web Vitals Collection — LCP, FID, CLS, TTFB
// Sends metrics to backend for analytics dashboard (Phase 1)

// Lazy-load web-vitals to handle missing dependency gracefully
let metrics_module = null;
let getCLS, getCWV, getFID, getFCP, getLCP, getTTFB;

async function loadWebVitals() {
  if (metrics_module) return metrics_module;

  try {
    metrics_module = await import('web-vitals');
    ({ getCLS, getCWV, getFID, getFCP, getLCP, getTTFB } = metrics_module);
    console.log('[Phase 1] Web Vitals module loaded');
    return metrics_module;
  } catch (e) {
    console.warn('[Phase 1] web-vitals module not available, metrics disabled:', e.message);
    // Fallback: provide no-op functions
    getCLS = getCWV = getFID = getFCP = getLCP = getTTFB = (cb) => cb({
      name: 'unavailable',
      value: 0,
      rating: 'unknown',
      delta: 0,
      id: 'stub',
    });
  }
}

const API_BASE = document.querySelector('meta[name="xq-api-base"]')?.content || 'https://xiangqi.games-core.com';
const BATCH_SIZE = 5;
const SEND_INTERVAL = 5000; // ms

let metricsBatch = [];
let sendTimer = null;

async function sendMetrics() {
  if (metricsBatch.length === 0) return;

  const batch = [...metricsBatch];
  metricsBatch = [];

  try {
    const response = await fetch(`${API_BASE}/api/metrics/web-vitals/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        metrics: batch,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        page: window.location.pathname + window.location.hash,
      }),
    });

    if (!response.ok) {
      console.warn('Failed to send Web Vitals metrics:', response.status);
    }
  } catch (err) {
    console.error('Error sending Web Vitals metrics:', err);
    // Re-queue metrics for retry
    metricsBatch.unshift(...batch);
  }
}

function scheduleSend() {
  if (sendTimer) clearTimeout(sendTimer);

  if (metricsBatch.length >= BATCH_SIZE) {
    sendMetrics();
  } else {
    sendTimer = setTimeout(sendMetrics, SEND_INTERVAL);
  }
}

function recordMetric(metric) {
  // Sanitize metric
  const cleanMetric = {
    name: metric.name,
    value: Math.round(metric.value * 100) / 100, // Round to 2 decimals
    rating: metric.rating || 'unknown',
    delta: Math.round(metric.delta * 100) / 100,
    id: metric.id,
    timestamp: new Date().toISOString(),
  };

  metricsBatch.push(cleanMetric);

  // Log to console in dev
  if (import.meta.env.DEV) {
    console.log(`[Web Vitals] ${metric.name}: ${metric.value.toFixed(2)}ms (${metric.rating})`);
  }

  scheduleSend();
}

export async function initWebVitals() {
  // Load web-vitals module first
  await loadWebVitals();

  // Collect all Web Vitals metrics (now safe to call)
  if (getCLS) getCLS(recordMetric);
  if (getFID) getFID(recordMetric);
  if (getLCP) getLCP(recordMetric);
  if (getCWV) getCWV(recordMetric);
  if (getFCP) getFCP(recordMetric);
  if (getTTFB) getTTFB(recordMetric);

  // Send remaining metrics on page unload
  window.addEventListener('beforeunload', () => {
    if (metricsBatch.length > 0) {
      // Use sendBeacon for unload (more reliable than fetch)
      if (navigator.sendBeacon) {
        navigator.sendBeacon(
          `${API_BASE}/api/metrics/web-vitals/batch`,
          JSON.stringify({
            metrics: metricsBatch,
            timestamp: new Date().toISOString(),
            page: window.location.pathname + window.location.hash,
          })
        );
      }
    }
  });

  console.log('Web Vitals monitoring initialized');
}

// Expose for manual metric recording
export function recordCustomMetric(name, value) {
  recordMetric({
    name,
    value,
    rating: value > 2500 ? 'poor' : value > 1000 ? 'needs-improvement' : 'good',
    delta: 0,
    id: `${name}-${Date.now()}`,
  });
}

// Get current metrics batch (for testing/debugging)
export function getCurrentMetrics() {
  return [...metricsBatch];
}
