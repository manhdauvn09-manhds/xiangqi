"""Email verification + password reset tokens.

Phase 3: Token-based email verification and password reset flow.
Uses in-memory token store (production should use Redis or DB).

IMPORTANT: In production, connect to a real SMTP service (SendGrid, SES, etc.)
This module provides the token management and verification logic.
The actual email sending is stubbed with console logging.
"""
from __future__ import annotations

import hashlib
import logging
import secrets
import time
from dataclasses import dataclass
from typing import Any

from . import auth, db

logger = logging.getLogger(__name__)

# Rate limit: mỗi user chỉ được tạo 1 token / 60 giây
_TOKEN_RATE_WINDOW = 60  # seconds

# ── Token Store ──────────────────────────

TOKEN_TTL_VERIFY = 3600 * 24      # 24 hours for email verification
TOKEN_TTL_RESET = 3600             # 1 hour for password reset


@dataclass
class Token:
    token: str
    user_id: int
    purpose: str      # 'verify' | 'reset'
    created_at: float
    ttl: int
    used: bool = False


class TokenStore:
    """In-memory token store. Production: use DB or Redis."""

    def __init__(self):
        self._tokens: dict[str, Token] = {}
        # Theo dõi thời điểm tạo token gần nhất theo user_id+purpose
        self._last_created: dict[tuple[int, str], float] = {}

    def create(self, user_id: int, purpose: str) -> str | None:
        """Create a new token. Returns raw token, hoặc None nếu rate limited."""
        key = (user_id, purpose)
        now = time.time()
        last = self._last_created.get(key, 0)
        if now - last < _TOKEN_RATE_WINDOW:
            logger.warning('Token rate limit: user_id=%s purpose=%s', user_id, purpose)
            return None  # Caller tự quyết định trả lỗi hay im lặng

        raw = secrets.token_urlsafe(32)
        hashed = self._hash(raw)
        ttl = TOKEN_TTL_VERIFY if purpose == 'verify' else TOKEN_TTL_RESET
        self._tokens[hashed] = Token(
            token=hashed, user_id=user_id, purpose=purpose,
            created_at=now, ttl=ttl,
        )
        self._last_created[key] = now
        self._cleanup()
        return raw

    def validate(self, raw_token: str, purpose: str) -> Token | None:
        """Validate a token. Returns Token if valid, None otherwise."""
        hashed = self._hash(raw_token)
        t = self._tokens.get(hashed)
        if not t:
            return None
        if t.purpose != purpose:
            return None
        if t.used:
            return None
        if time.time() - t.created_at > t.ttl:
            del self._tokens[hashed]
            return None
        return t

    def consume(self, raw_token: str, purpose: str) -> Token | None:
        """Validate and consume (mark as used). Returns Token or None."""
        t = self.validate(raw_token, purpose)
        if t:
            t.used = True
        return t

    def invalidate_user(self, user_id: int, purpose: str):
        """Invalidate all tokens for a user+purpose."""
        to_del = [k for k, t in self._tokens.items()
                  if t.user_id == user_id and t.purpose == purpose]
        for k in to_del:
            del self._tokens[k]

    def _hash(self, raw: str) -> str:
        return hashlib.sha256(raw.encode()).hexdigest()

    def _cleanup(self):
        """Remove expired tokens."""
        now = time.time()
        expired = [k for k, t in self._tokens.items()
                   if now - t.created_at > t.ttl or t.used]
        for k in expired:
            del self._tokens[k]


# ── Singleton ──
token_store = TokenStore()


# ═════════════════════════════════════════════
# Email sending (STUB — replace with real SMTP in production)
# ═════════════════════════════════════════════

def send_verification_email(email: str, token: str, base_url: str = ''):
    """Send email verification link. STUB: logs to console."""
    verify_url = f'{base_url}/games/xiangqi/#/verify?token={token}'
    logger.info('[email] VERIFICATION to %s — link: %s', email, verify_url)
    # In production: use aiosmtplib or httpx to call SendGrid/SES API


def send_password_reset_email(email: str, token: str, base_url: str = ''):
    """Send password reset link. STUB: logs to console."""
    reset_url = f'{base_url}/games/xiangqi/#/reset-password?token={token}'
    logger.info('[email] PASSWORD RESET to %s — link: %s', email, reset_url)


# ═════════════════════════════════════════════
# High-level flows
# ═════════════════════════════════════════════

def request_email_verification(user_id: int) -> str | None:
    """Create verification token and send email. Returns token (for testing), None nếu rate limited."""
    user = auth.get_user_by_id(user_id)
    if not user:
        return None
    # Invalidate old tokens
    token_store.invalidate_user(user_id, 'verify')
    raw = token_store.create(user_id, 'verify')
    if raw is None:
        return None  # Rate limited — caller im lặng để tránh lộ thông tin
    send_verification_email(user['email'], raw)
    return raw


def verify_email(raw_token: str) -> tuple[bool, str]:
    """Verify email with token. Returns (success, message)."""
    t = token_store.consume(raw_token, 'verify')
    if not t:
        return False, 'invalid_or_expired_token'
    # Mark user as verified
    db.execute(
        'UPDATE users SET email_verified = 1 WHERE id = ?', (t.user_id,)
    )
    return True, 'email_verified'


def request_password_reset(email: str) -> str | None:
    """Create reset token and send email. Returns token (for testing), None nếu not found / rate limited."""
    user = auth.get_user_by_email(email)
    if not user:
        return None  # Don't reveal if email exists
    token_store.invalidate_user(user['id'], 'reset')
    raw = token_store.create(user['id'], 'reset')
    if raw is None:
        return None  # Rate limited — im lặng để không lộ thông tin
    send_password_reset_email(email, raw)
    return raw


def reset_password(raw_token: str, new_password: str) -> tuple[bool, str]:
    """Reset password with token. Returns (success, message)."""
    if len(new_password) < 6:
        return False, 'password_too_short'
    t = token_store.consume(raw_token, 'reset')
    if not t:
        return False, 'invalid_or_expired_token'
    pw_hash = auth.hash_password(new_password)
    db.execute(
        'UPDATE users SET password_hash = ? WHERE id = ?',
        (pw_hash, t.user_id),
    )
    return True, 'password_reset'
