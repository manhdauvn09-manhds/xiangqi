"""Auth: scrypt password hashing + JWT."""
import hashlib
import hmac
import logging
import os
import secrets
import sys
import time
from typing import Any

import jwt

from . import db

logger = logging.getLogger(__name__)

_jwt_secret_env = os.getenv('XQ_JWT_SECRET')
_is_production = os.getenv('XQ_ENV', '').lower() in ('production', 'prod')

if _is_production and not _jwt_secret_env:
    logger.critical('XQ_JWT_SECRET phải được set trong môi trường production. Dừng server.')
    sys.exit(1)

if not _jwt_secret_env:
    logger.warning('XQ_JWT_SECRET không được set — dùng secret ngẫu nhiên (chỉ hợp lệ cho dev/single-process)')

JWT_SECRET: str = _jwt_secret_env or secrets.token_hex(32)
JWT_TTL_DAYS = int(os.getenv('XQ_JWT_TTL_DAYS', '30'))
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
