# Web Vitals Monitoring — Phase 1
# Collects Core Web Vitals metrics from client for analytics dashboard

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel

from . import db


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
    userAgent: Optional[str] = None  # sendBeacon (on unload) omits this
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


def _now_ms() -> int:
    return int(datetime.utcnow().timestamp() * 1000)


def _cutoff_ms(hours: int) -> int:
    return _now_ms() - hours * 3600 * 1000


async def log_web_vitals_batch(batch: WebVitalsBatch, request=None) -> dict:
    """
    Log a batch of Web Vitals metrics to the database (persists across restarts).

    Used by frontend to send Core Web Vitals:
    - LCP (Largest Contentful Paint) — target < 2.5s
    - FID (First Input Delay) — target < 100ms
    - CLS (Cumulative Layout Shift) — target < 0.1
    - TTFB (Time to First Byte) — target < 600ms
    - FCP (First Contentful Paint) — target < 1.8s
    """
    remote_addr = request.client.host if request and request.client else 'unknown'
    now = _now_ms()

    rows = [
        (
            m.name,
            m.value,
            m.rating,
            m.delta,
            m.id,
            batch.page,
            batch.userAgent,
            remote_addr,
            now,
        )
        for m in batch.metrics
    ]

    if rows:
        db.execute_many(
            """INSERT INTO web_vitals
               (name, value, rating, delta, metric_id, page, user_agent, remote_addr, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            rows,
        )

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
    empty = {
        'lcp': {'p50': 0, 'p75': 0, 'p95': 0, 'count': 0},
        'fid': {'p50': 0, 'p75': 0, 'p95': 0, 'count': 0},
        'cls': {'p50': 0, 'p75': 0, 'p95': 0, 'count': 0},
        'ttfb': {'p50': 0, 'p75': 0, 'p95': 0, 'count': 0},
        'fcp': {'p50': 0, 'p75': 0, 'p95': 0, 'count': 0},
    }

    rows = db.query(
        "SELECT name, value FROM web_vitals WHERE created_at >= ?",
        (_cutoff_ms(hours),),
    )
    if not rows:
        return empty

    # Group by metric name
    by_metric = {}
    for r in rows:
        by_metric.setdefault(r['name'], []).append(r['value'])

    # Calculate percentiles
    def percentile(data, p):
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

    # Fill in any metrics with no data so the dashboard shape is stable
    for key, val in empty.items():
        result.setdefault(key, val)

    return result


async def get_web_vitals_by_page(page: str, hours: int = 24) -> dict:
    """Get Web Vitals metrics filtered by page."""
    rows = db.query(
        """SELECT name, value, rating, delta, metric_id, page, created_at
           FROM web_vitals
           WHERE page = ? AND created_at >= ?
           ORDER BY created_at DESC""",
        (page, _cutoff_ms(hours)),
        limit=100,
    )

    if not rows:
        return {'page': page, 'metrics': []}

    return {
        'page': page,
        'count': len(rows),
        'metrics': [dict(r) for r in rows],
    }


async def get_web_vitals_health_score(hours: int = 24) -> dict:
    """
    Calculate overall Web Vitals health score (0-100).
    Based on percentage of sessions with "good" ratings.
    """
    rows = db.query(
        "SELECT rating FROM web_vitals WHERE created_at >= ?",
        (_cutoff_ms(hours),),
    )
    if not rows:
        return {'score': 0, 'status': 'no-data'}

    good = sum(1 for r in rows if r['rating'] == 'good')
    poor = sum(1 for r in rows if r['rating'] == 'poor')
    total = len(rows)

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
