// Web Vitals Collection — LCP, FID, CLS, TTFB
// Sends metrics to backend for analytics dashboard (Phase 1)

import { getCLS, getCWV, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

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

export function initWebVitals() {
  // Collect all Web Vitals metrics
  getCLS(recordMetric);
  getFID(recordMetric);
  getLCP(recordMetric);
  getCWV(recordMetric);
  getFCP(recordMetric);
  getTTFB(recordMetric);

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
