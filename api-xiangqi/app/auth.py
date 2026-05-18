"""Auth: scrypt password hashing + JWT."""
import hashlib
import hmac
import logging
import os
import secrets
import sys
import time
from pathlib import Path
from typing import Any

import jwt

from . import db

logger = logging.getLogger(__name__)

# JWT Secret initialization (with file-based persistence for dev consistency)
_JWT_SECRET_FILE = Path(os.getenv('XQ_JWT_SECRET_FILE', './.env.local.jwt-secret'))

def _get_or_create_jwt_secret() -> str:
    """Get JWT secret from env var, file, or create new file (dev only).

    Priority:
    1. XQ_JWT_SECRET environment variable (production)
    2. Secret file .env.local.jwt-secret (dev persistence)
    3. Generate new secret and save to file (dev only)
    4. Exit if production and no secret configured
    """
    # Priority 1: Environment variable
    if env_secret := os.getenv('XQ_JWT_SECRET'):
        return env_secret

    _is_production = os.getenv('XQ_ENV', '').lower() in ('production', 'prod')

    # Priority 2: Secret file (for dev consistency across restarts)
    if _JWT_SECRET_FILE.exists():
        secret = _JWT_SECRET_FILE.read_text().strip()
        logger.info('[auth] Loaded JWT secret from file: %s', _JWT_SECRET_FILE)
        return secret

    # Priority 3: Generate new secret and save (dev only)
    if not _is_production:
        secret = secrets.token_hex(32)
        _JWT_SECRET_FILE.parent.mkdir(parents=True, exist_ok=True)
        _JWT_SECRET_FILE.write_text(secret)
        _JWT_SECRET_FILE.chmod(0o600)  # Read-only to owner
        logger.info('[auth] Generated new JWT secret to %s (enable multi-process dev)', _JWT_SECRET_FILE)
        return secret

    # No secret found in production
    logger.critical('[auth] XQ_JWT_SECRET must be set in production')
    sys.exit(1)

JWT_SECRET: str = _get_or_create_jwt_secret()
JWT_TTL_DAYS = int(os.getenv('XQ_JWT_TTL_DAYS', '30'))  # Legacy: used for backward compatibility
JWT_TTL_SECONDS = int(os.getenv('XQ_JWT_TTL_SECONDS', '3600'))  # 1 hour for refresh token flow
REFRESH_TOKEN_TTL_DAYS = int(os.getenv('XQ_REFRESH_TTL_DAYS', '7'))  # 7 days for refresh tokens
JWT_ALG = 'HS256'

# Scrypt params (n=16384, r=8, p=1, dklen=64) — chuẩn dev, đủ mạnh
SCRYPT_N = 2 ** 14
SCRYPT_R = 8
SCRYPT_P = 1
SCRYPT_DKLEN = 64


def hash_password(plain: str) -> str:
    """Trả về string `scrypt$N$R$P$salt_hex$key_hex`."""
    salt = secrets.token_bytes(16)
    key = hashlib.scrypt(plain.encode('utf-8'), salt=salt,
                         n=SCRYPT_N, r=SCRYPT_R, p=SCRYPT_P, dklen=SCRYPT_DKLEN)
    return f'scrypt${SCRYPT_N}${SCRYPT_R}${SCRYPT_P}${salt.hex()}${key.hex()}'


def verify_password(plain: str, encoded: str) -> bool:
    try:
        algo, n, r, p, salt_hex, key_hex = encoded.split('$')
        if algo != 'scrypt':
            return False
        salt = bytes.fromhex(salt_hex)
        expected = bytes.fromhex(key_hex)
        actual = hashlib.scrypt(plain.encode('utf-8'), salt=salt,
                                n=int(n), r=int(r), p=int(p), dklen=len(expected))
        return hmac.compare_digest(actual, expected)
    except Exception:
        return False


def create_jwt(user_id: int, extra: dict[str, Any] | None = None) -> str:
    now = int(time.time())
    payload = {
        'sub': str(user_id),
        'iat': now,
        'exp': now + JWT_TTL_DAYS * 86400,
    }
    if extra:
        payload.update(extra)
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


def decode_jwt(token: str) -> dict[str, Any] | None:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
    except jwt.PyJWTError:
        return None


def create_tokens(user_id: int, device_id: str | None = None, user_agent: str | None = None) -> dict[str, Any]:
    """Create access JWT + refresh token. Returns dict with access/refresh tokens.

    Args:
        user_id: User ID to encode in tokens
        device_id: Optional device fingerprint for multi-device tracking
        user_agent: Optional browser/client info for audit

    Returns:
        {
            'access_token': str,     # Short-lived JWT (1 hour)
            'refresh_token': str,    # Long-lived refresh token (7 days)
            'token_type': 'Bearer',
            'expires_in': int,       # Access token TTL in seconds
        }
    """
    now = int(time.time())

    # Access token (short-lived, 1 hour)
    access_payload = {
        'sub': str(user_id),
        'iat': now,
        'exp': now + JWT_TTL_SECONDS,
        'type': 'access',
    }
    access_token = jwt.encode(access_payload, JWT_SECRET, algorithm=JWT_ALG)

    # Refresh token (long-lived, 7 days)
    refresh_raw = secrets.token_urlsafe(32)
    refresh_hash = hashlib.sha256(refresh_raw.encode()).hexdigest()

    # Store in DB
    try:
        db.execute(
            'INSERT INTO refresh_tokens (user_id, token_hash, device_id, user_agent, issued_at, expires_at) '
            'VALUES (?, ?, ?, ?, ?, ?)',
            (user_id, refresh_hash, device_id, user_agent,
             now, now + REFRESH_TOKEN_TTL_DAYS * 86400)
        )
    except Exception as e:
        logger.error('[auth] Failed to persist refresh token: %s', e)
        # Continue anyway — token is still valid in memory

    return {
        'access_token': access_token,
        'refresh_token': refresh_raw,
        'token_type': 'Bearer',
        'expires_in': JWT_TTL_SECONDS,
    }


def refresh_access_token(refresh_raw: str, device_id: str | None = None) -> dict[str, Any] | None:
    """Exchange refresh token for new access token.

    Args:
        refresh_raw: Raw refresh token from client
        device_id: Optional device fingerprint for multi-device tracking

    Returns:
        Same dict as create_tokens, or None if invalid/expired/revoked
    """
    refresh_hash = hashlib.sha256(refresh_raw.encode()).hexdigest()

    try:
        row = db.fetch_one(
            'SELECT user_id FROM refresh_tokens '
            'WHERE token_hash = ? AND expires_at > ? AND revoked_at IS NULL',
            (refresh_hash, int(time.time()))
        )
    except Exception as e:
        logger.error('[auth] Error looking up refresh token: %s', e)
        return None

    if not row:
        return None  # Invalid, expired, or revoked

    user_id = row['user_id']

    # Update last_used_at
    try:
        db.execute(
            'UPDATE refresh_tokens SET last_used_at = ? WHERE token_hash = ?',
            (int(time.time()), refresh_hash)
        )
    except Exception as e:
        logger.warning('[auth] Failed to update refresh token last_used: %s', e)

    # Return new access token (do NOT rotate refresh token for now)
    return create_tokens(user_id, device_id)


def revoke_refresh_token(refresh_raw: str) -> bool:
    """Revoke a specific refresh token (for logout).

    Args:
        refresh_raw: Raw refresh token to revoke

    Returns:
        True if revoked, False if not found
    """
    refresh_hash = hashlib.sha256(refresh_raw.encode()).hexdigest()
    try:
        db.execute(
            'UPDATE refresh_tokens SET revoked_at = ? WHERE token_hash = ?',
            (int(time.time()), refresh_hash)
        )
        return True
    except Exception as e:
        logger.error('[auth] Failed to revoke refresh token: %s', e)
        return False


def revoke_user_tokens(user_id: int) -> int:
    """Revoke all refresh tokens for a user (force logout all devices).

    Args:
        user_id: User ID whose tokens to revoke

    Returns:
        Count of tokens revoked
    """
    now = int(time.time())
    try:
        db.execute(
            'UPDATE refresh_tokens SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL',
            (now, user_id)
        )
        # Return count
        row = db.fetch_one(
            'SELECT COUNT(*) as count FROM refresh_tokens WHERE user_id = ? AND revoked_at = ?',
            (user_id, now)
        )
        return row['count'] if row else 0
    except Exception as e:
        logger.error('[auth] Failed to revoke user tokens: %s', e)
        return 0


def get_user_by_email(email: str) -> dict[str, Any] | None:
    row = db.fetch_one('SELECT * FROM users WHERE email = ?', (email.lower(),))
    return dict(row) if row else None


def get_user_by_id(user_id: int) -> dict[str, Any] | None:
    row = db.fetch_one('SELECT * FROM users WHERE id = ?', (user_id,))
    return dict(row) if row else None


def create_user(email: str, password: str | None, display_name: str,
                google_sub: str | None = None) -> int:
    pw_hash = hash_password(password) if password else None
    user_id = db.execute(
        'INSERT INTO users (email, display_name, password_hash, google_sub, created_at) '
        'VALUES (?, ?, ?, ?, ?)',
        (email.lower(), display_name, pw_hash, google_sub, int(time.time())),
    )
    # Tạo elo profile mặc định cho cả 2 variant
    for variant in ('standard', 'blind'):
        db.execute(
            'INSERT OR IGNORE INTO elo_profiles (user_id, variant) VALUES (?, ?)',
            (user_id, variant),
        )
    return user_id
