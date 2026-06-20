# Web Vitals Monitoring — Phase 1
# Collects Core Web Vitals metrics from client for analytics dashboard

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel


class WebVitalMetric(BaseModel):
    name: str  # "LCP", "FID", "CLS", "TTFB", "FCP"
    value: float  # milliseconds or unitless
    rating: str  # "good", "needs-improvement", "poor"
    delta: Optional[float] = None
    id: str
    timestamp: str


class WebVitalsBatch(BaseModel):
    metrics: List[WebVitalMetric]
    timestamp: str
    userAgent: str
    page: str


class WebVitalsSummary(BaseModel):
    """Summary statistics for Web Vitals over a time period."""
    name: str
    p50: float  # 50th percentile
    p75: float  # 75th percentile
    p95: float  # 95th percentile
    count: int
    rating_good: int
    rating_needs_improvement: int
    rating_poor: int


# In-memory storage for demo (replace with database in production)
metrics_storage = []


async def log_web_vitals_batch(batch: WebVitalsBatch, request=None) -> dict:
    """
    Log a batch of Web Vitals metrics.

    Used by frontend to send Core Web Vitals:
    - LCP (Largest Contentful Paint) — target < 2.5s
    - FID (First Input Delay) — target < 100ms
    - CLS (Cumulative Layout Shift) — target < 0.1
    - TTFB (Time to First Byte) — target < 600ms
    - FCP (First Contentful Paint) — target < 1.8s
    """
    # Store metrics (would be saved to database in production)
    metrics_storage.extend([
        {
            **metric.dict(),
            'stored_at': datetime.utcnow().isoformat(),
            'user_agent': batch.userAgent,
            'page': batch.page,
            'remote_addr': request.client.host if request else 'unknown',
        }
        for metric in batch.metrics
    ])

    return {
        'status': 'ok',
        'count': len(batch.metrics),
        'timestamp': datetime.utcnow().isoformat(),
    }


async def get_web_vitals_dashboard(hours: int = 24) -> dict:
    """
    Get Web Vitals summary for the last N hours.
    Returns percentile metrics for dashboard display.
    """
    if not metrics_storage:
        return {
            'lcp': {'p50': 0, 'p75': 0, 'p95': 0, 'count': 0},
            'fid': {'p50': 0, 'p75': 0, 'p95': 0, 'count': 0},
            'cls': {'p50': 0, 'p75': 0, 'p95': 0, 'count': 0},
            'ttfb': {'p50': 0, 'p75': 0, 'p95': 0, 'count': 0},
            'fcp': {'p50': 0, 'p75': 0, 'p95': 0, 'count': 0},
        }

    # Group by metric name
    by_metric = {}
    for m in metrics_storage:
        name = m['name']
        if name not in by_metric:
            by_metric[name] = []
        by_metric[name].append(m['value'])

    # Calculate percentiles
    def percentile(data, p):
        """Calculate pth percentile."""
        if not data:
            return 0
        sorted_data = sorted(data)
        index = int(len(sorted_data) * (p / 100))
        return sorted_data[min(index, len(sorted_data) - 1)]

    result = {}
    for metric_name, values in by_metric.items():
        result[metric_name.lower()] = {
            'p50': round(percentile(values, 50), 2),
            'p75': round(percentile(values, 75), 2),
            'p95': round(percentile(values, 95), 2),
            'count': len(values),
            'good': sum(1 for v in values if (metric_name == 'CLS' and v < 0.1) or (v < 2500)),
            'needs_improvement': 0,  # Simplified
        }

    return result


async def get_web_vitals_by_page(page: str, hours: int = 24) -> dict:
    """Get Web Vitals metrics filtered by page."""
    page_metrics = [m for m in metrics_storage if m['page'] == page]

    if not page_metrics:
        return {'page': page, 'metrics': []}

    return {
        'page': page,
        'count': len(page_metrics),
        'metrics': page_metrics[-100:],  # Return last 100
    }


async def get_web_vitals_health_score() -> dict:
    """
    Calculate overall Web Vitals health score (0-100).
    Based on percentage of sessions with "good" ratings.
    """
    if not metrics_storage:
        return {'score': 0, 'status': 'no-data'}

    # Count good/needs-improvement/poor ratings
    good = sum(1 for m in metrics_storage if m['rating'] == 'good')
    poor = sum(1 for m in metrics_storage if m['rating'] == 'poor')
    total = len(metrics_storage)

    # Simple scoring: (good - poor*2) / total * 100
    score = max(0, min(100, (good - poor * 2) / total * 100))

    if score >= 80:
        status = 'excellent'
    elif score >= 60:
        status = 'good'
    elif score >= 40:
        status = 'needs-improvement'
    else:
        status = 'poor'

    return {
        'score': round(score, 2),
        'status': status,
        'good': good,
        'poor': poor,
        'total': total,
        'timestamp': datetime.utcnow().isoformat(),
    }


# Helper to check Core Web Vitals thresholds
THRESHOLDS = {
    'LCP': (2500, 4000),  # (good, needs-improvement) in ms
    'FID': (100, 300),
    'CLS': (0.1, 0.25),
    'TTFB': (600, 1200),
    'FCP': (1800, 3000),
}


def get_metric_rating(metric_name: str, value: float) -> str:
    """Determine if a metric value is good/needs-improvement/poor."""
    if metric_name not in THRESHOLDS:
        return 'unknown'

    good_threshold, improvement_threshold = THRESHOLDS[metric_name]

    if value <= good_threshold:
        return 'good'
    elif value <= improvement_threshold:
        return 'needs-improvement'
    else:
        return 'poor'
