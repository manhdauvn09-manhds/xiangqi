"""Rate limiting middleware — in-memory token bucket per IP + per user.

Phase 3: Protects API from spam. Production should use Redis for persistence.
"""
from __future__ import annotations

import time
from collections import defaultdict
from typing import Any

from fastapi import Request, HTTPException


class _Bucket:
    __slots__ = ('tokens', 'last_refill')

    def __init__(self, capacity: float):
        self.tokens = capacity
        self.last_refill = time.monotonic()


class RateLimiter:
    """In-memory token bucket rate limiter."""

    def __init__(self, rate: float = 10.0, burst: int = 30, cleanup_interval: int = 300):
        """
        rate: tokens per second refill rate
        burst: max bucket capacity
        cleanup_interval: seconds between stale bucket cleanup
        """
        self.rate = rate
        self.burst = burst
        self.cleanup_interval = cleanup_interval
        self._buckets: dict[str, _Bucket] = {}
        self._last_cleanup = time.monotonic()

    def _get_bucket(self, key: str) -> _Bucket:
        if key not in self._buckets:
            self._buckets[key] = _Bucket(self.burst)
        return self._buckets[key]

    def _refill(self, bucket: _Bucket):
        now = time.monotonic()
        elapsed = now - bucket.last_refill
        bucket.tokens = min(self.burst, bucket.tokens + elapsed * self.rate)
        bucket.last_refill = now

    def allow(self, key: str, cost: float = 1.0) -> tuple[bool, float]:
        """Check if request is allowed. Returns (allowed, retry_after_seconds)."""
        self._maybe_cleanup()
        bucket = self._get_bucket(key)
        self._refill(bucket)
        if bucket.tokens >= cost:
            bucket.tokens -= cost
            return True, 0.0
        wait = (cost - bucket.tokens) / self.rate
        return False, wait

    def _maybe_cleanup(self):
        now = time.monotonic()
        if now - self._last_cleanup < self.cleanup_interval:
            return
        self._last_cleanup = now
        stale = [k for k, b in self._buckets.items()
                 if now - b.last_refill > self.cleanup_interval]
        for k in stale:
            del self._buckets[k]


# ── Singleton instances ──────────────────────────

# General API: 10 req/s, burst 30
api_limiter = RateLimiter(rate=10.0, burst=30)

# Auth endpoints: stricter — 3 req/s, burst 8
auth_limiter = RateLimiter(rate=3.0, burst=8)

# WebSocket messages: 20 msg/s, burst 50
ws_limiter = RateLimiter(rate=20.0, burst=50)

# Game moves: 5 moves/s (enough for fast play)
move_limiter = RateLimiter(rate=5.0, burst=10)


def get_client_ip(req: Request) -> str:
    """Extract client IP, respecting X-Forwarded-For in production."""
    forwarded = req.headers.get('x-forwarded-for')
    if forwarded:
        return forwarded.split(',')[0].strip()
    return req.client.host if req.client else '0.0.0.0'


def check_rate_limit(limiter: RateLimiter, key: str):
    """Raises 429 if rate limited."""
    allowed, retry_after = limiter.allow(key)
    if not allowed:
        raise HTTPException(
            status_code=429,
            detail={'error': 'rate_limited', 'retry_after': round(retry_after, 1)},
            headers={'Retry-After': str(int(retry_after) + 1)},
        )


def check_ws_rate(key: str, limiter: RateLimiter = ws_limiter) -> bool:
    """Check WebSocket message rate. Returns False if limited."""
    allowed, _ = limiter.allow(key)
    return allowed
