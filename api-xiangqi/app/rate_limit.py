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

# Per-email password reset: max 3 lần / giờ
_email_reset_limiter = RateLimiter(rate=1/1200.0, burst=3)  # 1 token/20 phút, burst 3


def check_email_reset_rate(email: str) -> bool:
    """Trả False nếu email đã vượt giới hạn yêu cầu reset password (3 lần/giờ)."""
    allowed, _ = _email_reset_limiter.allow(f'reset:{email.lower()}')
    return allowed


# ── Per-account login failure tracker ──────────────────────

_LOGIN_MAX_FAILURES = 5
_LOGIN_LOCKOUT_SECONDS = 15 * 60  # 15 phút


class _LoginFailureTracker:
    """Track số lần đăng nhập thất bại theo email. Lock sau N lần trong cửa sổ thời gian."""

    def __init__(self):
        # email_lower → (count, first_failure_ts)
        self._failures: dict[str, tuple[int, float]] = {}

    def is_locked(self, email: str) -> bool:
        """Trả True nếu account đang bị tạm khóa."""
        key = email.lower()
        entry = self._failures.get(key)
        if not entry:
            return False
        count, first_ts = entry
        if time.monotonic() - first_ts > _LOGIN_LOCKOUT_SECONDS:
            # Cửa sổ đã hết — reset
            del self._failures[key]
            return False
        return count >= _LOGIN_MAX_FAILURES

    def record_failure(self, email: str) -> None:
        """Ghi nhận thất bại. Không gọi khi đăng nhập thành công."""
        key = email.lower()
        now = time.monotonic()
        entry = self._failures.get(key)
        if not entry or now - entry[1] > _LOGIN_LOCKOUT_SECONDS:
            self._failures[key] = (1, now)
        else:
            self._failures[key] = (entry[0] + 1, entry[1])

    def clear(self, email: str) -> None:
        """Xóa failure record khi đăng nhập thành công."""
        self._failures.pop(email.lower(), None)


login_failure_tracker = _LoginFailureTracker()


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
