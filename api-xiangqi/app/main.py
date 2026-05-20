"""Cờ Tướng Vương — FastAPI app.

Phase 2+3: REST + WebSocket + server-side validation + anti-cheat
+ rate limiting + tournaments + Google OAuth + email verification.

Sections:
  1. Setup (CORS, deps, rate limiting)
  2. Auth routes (register, login, logout, Google OAuth, email verify, password reset)
  3. Profile + games + elo + leaderboard
  4. Daily challenge + Super AI
  5. Custom rooms (challenges)
  6. Tournaments
  7. WebSocket: matchmaking, game sync (with server-side validation), chat
"""
from __future__ import annotations

import asyncio
import json
import logging
import re
import secrets
import time
import unicodedata
import urllib.parse
import uuid
from contextlib import asynccontextmanager
from datetime import date, datetime
from typing import Any

logger = logging.getLogger(__name__)

from fastapi import FastAPI, HTTPException, Request, WebSocket, WebSocketDisconnect, status, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, EmailStr

from . import auth, db, elo
from .rate_limit import (
    api_limiter, auth_limiter, move_limiter, ws_limiter, ws_connect_limiter,
    check_rate_limit, check_ws_rate, get_client_ip,
    login_failure_tracker, check_email_reset_rate,
)
from .anticheat import anticheat, check_elo_anomaly
from .tournaments import tournament_mgr, TournamentFormat, TournamentStatus
from . import email_service, oauth
from . import xiangqi_engine as engine
from . import audit

# ─────────────── App + CORS ───────────────


@asynccontextmanager
async def lifespan(app: FastAPI):
    db.get_conn()

    # Start periodic anticheat cleanup task
    async def cleanup_task():
        while True:
            try:
                await asyncio.sleep(300)  # Every 5 minutes
                anticheat._cleanup()
            except Exception as e:
                logger.error('[anticheat] cleanup task error: %s', e)

    cleanup_handle = asyncio.create_task(cleanup_task())
    logger.info('[xq] backend ready - Phase 3 + anticheat monitoring')

    try:
        yield
    finally:
        cleanup_handle.cancel()
        db.close_conn()
        logger.info('[xq] backend shutdown - database closed')


app = FastAPI(title='Cờ Tướng Vương Backend', version='0.3.0', lifespan=lifespan)

import os
# CORS: restrict to known origins. Default to localhost for dev
CORS_ORIGINS_STR = os.getenv('CORS_ORIGINS', 'http://localhost:3000,http://localhost:5173')
CORS_ORIGINS = [o.strip() for o in CORS_ORIGINS_STR.split(',') if o.strip()]

# Không cho phép wildcard khi credentials=True — sẽ bị browser block và tạo lỗ hổng CSRF
if '*' in CORS_ORIGINS:
    logger.error('CORS_ORIGINS chứa wildcard "*" với allow_credentials=True — không hợp lệ, xóa "*"')
    CORS_ORIGINS = [o for o in CORS_ORIGINS if o != '*']

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=['GET', 'POST', 'PATCH', 'DELETE', 'PUT'],
    allow_headers=['Content-Type', 'Authorization'],
)


# ─────────────── Rate limit middleware ───────────────


@app.middleware('http')
async def rate_limit_middleware(request: Request, call_next):
    ip = get_client_ip(request)
    path = request.url.path

    # Healthz is exempt
    if path == '/healthz':
        return await call_next(request)

    # Auth endpoints get stricter limits
    if path.startswith('/api/auth'):
        check_rate_limit(auth_limiter, f'auth:{ip}')
    else:
        check_rate_limit(api_limiter, f'api:{ip}')

    return await call_next(request)


@app.middleware('http')
async def audit_middleware(request: Request, call_next):
    """Log all API requests with timing."""
    ip = get_client_ip(request)
    path = request.url.path
    method = request.method
    user_id = None

    # Skip healthz and static assets from logging
    if path == '/healthz' or path.startswith('/static/'):
        return await call_next(request)

    # Try to extract user_id from token
    try:
        h = request.headers.get('authorization', '')
        import re as regex
        m = regex.match(r'^Bearer\s+(.+)$', h)
        if m:
            payload = auth.decode_jwt(m.group(1))
            if payload:
                user_id = int(payload.get('sub', 0))
    except Exception:
        pass

    # Time the request
    start = time.time()
    response = await call_next(request)
    elapsed_ms = (time.time() - start) * 1000

    # Add security headers
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'SAMEORIGIN'   # DENY quá strict cho game embed
    response.headers['X-XSS-Protection'] = '1; mode=block'
    response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
    response.headers['Referrer-Policy'] = 'no-referrer'  # Tránh lộ token reset qua Referer
    response.headers['Content-Security-Policy'] = (
        "default-src 'self'; "
        "connect-src 'self' wss:; "   # cho phép WebSocket
        "frame-ancestors 'self'"       # thay X-Frame-Options (CSP level 2+)
    )

    # Log the request
    audit.log_api_call(user_id, method, path, response.status_code, ip, elapsed_ms)

    return response


# ─────────────── Auth dependency ───────────────


def require_user(req: Request) -> dict[str, Any]:
    h = req.headers.get('authorization', '')
    m = re.match(r'^Bearer\s+(.+)$', h)
    if not m:
        raise HTTPException(401, 'no_token')
    payload = auth.decode_jwt(m.group(1))
    if not payload:
        raise HTTPException(401, 'invalid_token')
    user = auth.get_user_by_id(int(payload['sub']))
    if not user:
        raise HTTPException(401, 'user_not_found')
    return user


def optional_user(req: Request) -> dict[str, Any] | None:
    try:
        return require_user(req)
    except HTTPException:
        return None


# ═════════════════════════════════════════════
# ADMIN ENDPOINTS PATTERN
# ═════════════════════════════════════════════
# Use Depends(admin_required) to ensure endpoint requires admin role.
# This prevents accidentally leaving endpoints unprotected.
#
# Example:
#   @app.get('/api/admin/something')
#   async def admin_endpoint(user: dict = Depends(admin_required)):
#       # user is guaranteed admin here
# ═════════════════════════════════════════════


def admin_required(req: Request) -> dict[str, Any]:
    """Dependency: require admin user, raise 403 if not.

    Usage in endpoints:
        async def my_endpoint(user: dict = Depends(admin_required)):
            # user is guaranteed to be admin here
    """
    user = require_user(req)
    if not user.get('is_admin'):
        raise HTTPException(403, 'admin_only')
    return user


# ═════════════════════════════════════════════
# 1. AUTH
# ═════════════════════════════════════════════


class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    display_name: str = Field(min_length=1, max_length=24, alias='displayName')

    model_config = {'populate_by_name': True}


class LoginIn(BaseModel):
    email: EmailStr
    password: str


EMAIL_RX = re.compile(r'^[^@\s]+@[^@\s]+\.[^@\s]+$')


@app.post('/api/auth/register')
async def register(body: RegisterIn, req: Request):
    if not EMAIL_RX.match(body.email):
        audit.log_auth('register', body.email, False, get_client_ip(req), 'invalid_email')
        raise HTTPException(400, 'bad_email')
    if auth.get_user_by_email(body.email):
        audit.log_auth('register', body.email, False, get_client_ip(req), 'email_taken')
        raise HTTPException(409, 'email_taken')
    user_id = auth.create_user(body.email, body.password, body.display_name.strip())

    # Generate tokens (both legacy JWT for compatibility + new refresh token)
    device_id = req.headers.get('x-device-id')
    user_agent = req.headers.get('user-agent')
    tokens = auth.create_tokens(user_id, device_id, user_agent)

    # Send verification email
    email_service.request_email_verification(user_id)
    audit.log_auth('register', body.email, True, get_client_ip(req), f'user_id={user_id}')

    user = auth.get_user_by_id(user_id)
    return {
        'jwt': tokens['access_token'],  # Legacy JWT for backward compatibility
        'access_token': tokens['access_token'],
        'refresh_token': tokens['refresh_token'],
        'token_type': tokens['token_type'],
        'expires_in': tokens['expires_in'],
        'user': _public_user(user),
    }


@app.post('/api/auth/login')
async def login(body: LoginIn, req: Request):
    # Kiểm tra account lockout trước khi query DB (tránh timing attack)
    if login_failure_tracker.is_locked(body.email):
        audit.log_auth('login', body.email, False, get_client_ip(req), 'account_locked')
        raise HTTPException(429, 'account_temporarily_locked')

    user = auth.get_user_by_email(body.email)
    if not user or not user.get('password_hash'):
        login_failure_tracker.record_failure(body.email)
        audit.log_auth('login', body.email, False, get_client_ip(req), 'invalid_credentials')
        raise HTTPException(401, 'bad_credentials')
    if not auth.verify_password(body.password, user['password_hash']):
        login_failure_tracker.record_failure(body.email)
        audit.log_auth('login', body.email, False, get_client_ip(req), 'password_mismatch')
        raise HTTPException(401, 'bad_credentials')

    # Đăng nhập thành công — xóa failure record
    login_failure_tracker.clear(body.email)

    # Generate tokens (both legacy JWT for compatibility + new refresh token)
    device_id = req.headers.get('x-device-id')
    user_agent = req.headers.get('user-agent')
    tokens = auth.create_tokens(user['id'], device_id, user_agent)

    db.execute('UPDATE users SET last_seen_at = ? WHERE id = ?', (int(time.time()), user['id']))
    audit.log_auth('login', body.email, True, get_client_ip(req), f'user_id={user["id"]}')

    return {
        'jwt': tokens['access_token'],  # Legacy JWT for backward compatibility
        'access_token': tokens['access_token'],
        'refresh_token': tokens['refresh_token'],
        'token_type': tokens['token_type'],
        'expires_in': tokens['expires_in'],
        'user': _public_user(user),
    }


# ── Refresh Token ──


class RefreshTokenIn(BaseModel):
    refresh_token: str


class RefreshTokenOut(BaseModel):
    access_token: str
    refresh_token: str | None = None  # Do not rotate for now
    token_type: str = 'Bearer'
    expires_in: int


@app.post('/api/auth/refresh', response_model=RefreshTokenOut)
async def refresh_token_endpoint(body: RefreshTokenIn, req: Request):
    """Use refresh token to get new access token."""
    device_id = req.headers.get('x-device-id')
    tokens = auth.refresh_access_token(body.refresh_token, device_id)

    if not tokens:
        raise HTTPException(401, 'invalid_refresh_token')

    return RefreshTokenOut(
        access_token=tokens['access_token'],
        refresh_token=None,  # Don't rotate refresh token
        token_type=tokens['token_type'],
        expires_in=tokens['expires_in'],
    )


@app.post('/api/auth/logout')
async def logout(body: RefreshTokenIn, req: Request):
    """Revoke refresh token (logout)."""
    user = require_user(req)
    auth.revoke_refresh_token(body.refresh_token)
    db.execute('UPDATE users SET last_seen_at = ? WHERE id = ?', (int(time.time()), user['id']))
    return {'ok': True}


@app.post('/api/auth/logout-all')
async def logout_all(req: Request):
    """Revoke all refresh tokens for this user (logout all devices)."""
    user = require_user(req)
    count = auth.revoke_user_tokens(user['id'])
    db.execute('UPDATE users SET last_seen_at = ? WHERE id = ?', (int(time.time()), user['id']))
    return {'ok': True, 'revoked': count}


# ── Google OAuth ──


class GoogleAuthIn(BaseModel):
    id_token: str


@app.get('/api/auth/google-client-id')
async def get_google_client_id():
    """Return Google OAuth client ID for frontend configuration.

    This endpoint allows the frontend to dynamically fetch the client ID
    instead of hardcoding it, improving security and supporting multiple
    deployment environments.
    """
    from app.oauth import GOOGLE_CLIENT_ID

    if not GOOGLE_CLIENT_ID:
        logger.warning('GOOGLE_CLIENT_ID not configured')
        raise HTTPException(500, 'Google OAuth not configured')

    return {'client_id': GOOGLE_CLIENT_ID}


@app.post('/api/auth/google')
async def google_auth(body: GoogleAuthIn, req: Request):
    """Login or register via Google ID token."""
    google_data = await oauth.verify_google_id_token(body.id_token)
    if not google_data:
        raise HTTPException(401, 'invalid_google_token')

    profile = oauth.google_user_to_profile(google_data)

    # Get device info for token tracking
    device_id = req.headers.get('x-device-id')
    user_agent = req.headers.get('user-agent')

    # Check if user exists by google_sub
    existing = db.fetch_one('SELECT * FROM users WHERE google_sub = ?', (profile['google_sub'],))
    if existing:
        user = dict(existing)
        tokens = auth.create_tokens(user['id'], device_id, user_agent)
        db.execute('UPDATE users SET last_seen_at = ? WHERE id = ?', (int(time.time()), user['id']))
        return {
            'jwt': tokens['access_token'],  # Legacy
            'access_token': tokens['access_token'],
            'refresh_token': tokens['refresh_token'],
            'token_type': tokens['token_type'],
            'expires_in': tokens['expires_in'],
            'user': _public_user(user),
            'isNew': False,
        }

    # Check if email is taken by password user → link accounts
    email_user = auth.get_user_by_email(profile['email'])
    if email_user:
        db.execute('UPDATE users SET google_sub = ?, avatar_url = COALESCE(avatar_url, ?) WHERE id = ?',
                   (profile['google_sub'], profile['avatar_url'], email_user['id']))
        tokens = auth.create_tokens(email_user['id'], device_id, user_agent)
        return {
            'jwt': tokens['access_token'],  # Legacy
            'access_token': tokens['access_token'],
            'refresh_token': tokens['refresh_token'],
            'token_type': tokens['token_type'],
            'expires_in': tokens['expires_in'],
            'user': _public_user(auth.get_user_by_id(email_user['id'])),
            'isNew': False,
        }

    # Create new user
    user_id = auth.create_user(
        email=profile['email'],
        password=None,
        display_name=profile['display_name'],
        google_sub=profile['google_sub'],
    )
    # Google email is already verified
    db.execute('UPDATE users SET email_verified = 1, avatar_url = ? WHERE id = ?',
               (profile['avatar_url'], user_id))
    tokens = auth.create_tokens(user_id, device_id, user_agent)
    return {
        'jwt': tokens['access_token'],  # Legacy
        'access_token': tokens['access_token'],
        'refresh_token': tokens['refresh_token'],
        'token_type': tokens['token_type'],
        'expires_in': tokens['expires_in'],
        'user': _public_user(auth.get_user_by_id(user_id)),
        'isNew': True,
    }


# ── Email Verification ──


@app.post('/api/auth/verify-email')
async def verify_email(req: Request):
    """Resend verification email. Rate limited per IP + per token store."""
    user = require_user(req)
    check_rate_limit(auth_limiter, get_client_ip(req))  # Rate limit HTTP level
    email_service.request_email_verification(user['id'])
    return {'ok': True, 'message': 'verification_email_sent'}


class VerifyTokenIn(BaseModel):
    token: str


@app.post('/api/auth/verify-email/confirm')
async def confirm_email(body: VerifyTokenIn):
    ok, msg = email_service.verify_email(body.token)
    if not ok:
        raise HTTPException(400, msg)
    return {'ok': True, 'message': msg}


# ── Password Reset ──


class ForgotPasswordIn(BaseModel):
    email: EmailStr


@app.post('/api/auth/forgot-password')
async def forgot_password(body: ForgotPasswordIn):
    """Send password reset email. Always returns OK to not leak emails."""
    # Rate limit per email: max 3 lần/giờ — tránh email bombing
    if not check_email_reset_rate(body.email):
        raise HTTPException(429, 'too_many_reset_requests')
    email_service.request_password_reset(body.email)
    return {'ok': True, 'message': 'reset_email_sent_if_exists'}


class ResetPasswordIn(BaseModel):
    token: str
    new_password: str = Field(min_length=6, max_length=128)


@app.post('/api/auth/reset-password')
async def reset_password(body: ResetPasswordIn):
    ok, msg = email_service.reset_password(body.token, body.new_password)
    if not ok:
        raise HTTPException(400, msg)
    return {'ok': True, 'message': msg}


def _public_user(u: dict[str, Any]) -> dict[str, Any]:
    return {
        'id': u['id'],
        'email': u['email'],
        'displayName': u['display_name'],
        'lang': u['lang'],
        'theme': u['theme'],
        'avatarUrl': u.get('avatar_url'),
        'emailVerified': bool(u.get('email_verified', 0)),
        'hasGoogle': bool(u.get('google_sub')),
    }


# ═════════════════════════════════════════════
# 2. PROFILE / GAMES / ELO / LEADERBOARD
# ═════════════════════════════════════════════


@app.get('/api/me')
async def me(req: Request):
    user = require_user(req)
    elo_rows = db.query('SELECT * FROM elo_profiles WHERE user_id = ?', (user['id'],))
    elos = {r['variant']: dict(r) for r in elo_rows}
    return {'user': _public_user(user), 'elo': elos}


class PatchMe(BaseModel):
    display_name: str | None = Field(default=None, max_length=24)
    lang: str | None = None
    theme: str | None = None
    avatar_url: str | None = None


def _validate_avatar_url(url: str) -> str | None:
    """Chỉ cho phép http/https URL, max 300 chars. Trả None nếu không hợp lệ."""
    url = url.strip()[:300]
    try:
        parsed = urllib.parse.urlparse(url)
        if parsed.scheme not in ('http', 'https'):
            return None
        if not parsed.netloc:
            return None
        return url
    except Exception:
        return None


# Whitelist cột được phép update — tránh SQL injection qua field name động
_PATCH_ME_ALLOWED_COLS = {'display_name', 'lang', 'theme', 'avatar_url'}


@app.patch('/api/me')
async def patch_me(body: PatchMe, req: Request):
    user = require_user(req)
    updates: dict[str, object] = {}

    if body.display_name is not None:
        updates['display_name'] = body.display_name.strip()
    if body.lang in ('vi', 'en'):
        updates['lang'] = body.lang
    if body.theme in ('light', 'dark', 'auto'):
        updates['theme'] = body.theme
    if body.avatar_url is not None:
        valid_url = _validate_avatar_url(body.avatar_url)
        if valid_url is None:
            raise HTTPException(400, 'invalid_avatar_url')
        updates['avatar_url'] = valid_url

    if not updates:
        return {'ok': True}

    # Chỉ cho phép các cột trong whitelist — dùng raise thay assert (assert bị disable với -O)
    if not all(k in _PATCH_ME_ALLOWED_COLS for k in updates):
        raise HTTPException(400, 'invalid_field')
    set_clause = ', '.join(f'{col} = ?' for col in updates)
    params = list(updates.values()) + [user['id']]
    db.execute(f"UPDATE users SET {set_clause} WHERE id = ?", params)
    return {'ok': True, 'user': _public_user(auth.get_user_by_id(user['id']))}


class SaveGameIn(BaseModel):
    variant: str = Field(default='standard')
    mode: str
    user_side: str = Field(default='r')
    bot_level: int | None = None
    result: str
    reason: str | None = None
    moves: list[dict[str, Any]] = Field(default_factory=list)
    final_fen: str | None = None
    duration_ms: int | None = None
    blind_seed: str | None = None


@app.post('/api/games')
async def save_game(body: SaveGameIn, req: Request):
    user = require_user(req)
    gid = 'g_' + uuid.uuid4().hex[:12]
    is_red = body.user_side == 'r'
    db.execute(
        'INSERT INTO games (id, variant, mode, red_user_id, black_user_id, '
        'red_bot_level, black_bot_level, result, termination, moves_json, '
        'duration_ms, played_at, blind_seed, blind_seed_hash) '
        'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        (
            gid, body.variant, body.mode,
            user['id'] if is_red else None,
            user['id'] if not is_red else None,
            None if is_red else body.bot_level,
            body.bot_level if is_red else None,
            body.result, body.reason,
            json.dumps(body.moves, ensure_ascii=False),
            body.duration_ms, int(time.time()),
            body.blind_seed, _sha256_short(body.blind_seed) if body.blind_seed else None,
        )
    )
    delta = _update_user_stats(user['id'], body.variant, body.result, body.user_side)
    return {'ok': True, 'id': gid, 'eloDelta': delta}


def _update_user_stats(user_id: int, variant: str, result: str, user_side: str) -> int:
    row = db.fetch_one('SELECT * FROM elo_profiles WHERE user_id = ? AND variant = ?',
                       (user_id, variant))
    if not row:
        return 0
    is_red = user_side == 'r'
    won = (result == '1-0' and is_red) or (result == '0-1' and not is_red)
    lost = (result == '0-1' and is_red) or (result == '1-0' and not is_red)
    drew = result == '1/2-1/2'
    db.execute(
        'UPDATE elo_profiles SET '
        'games_played = games_played + 1, '
        'wins = wins + ?, losses = losses + ?, draws = draws + ? '
        'WHERE user_id = ? AND variant = ?',
        (1 if won else 0, 1 if lost else 0, 1 if drew else 0, user_id, variant)
    )
    return 0


@app.get('/api/games')
async def list_games(req: Request, limit: int = 50, cursor: str | None = None):
    user = require_user(req)
    sql = (
        'SELECT * FROM games WHERE (red_user_id = ? OR black_user_id = ?) '
        'ORDER BY played_at DESC LIMIT ?'
    )
    rows = db.query(sql, (user['id'], user['id'], min(limit, 200)))
    return [_serialize_game(dict(r), user['id']) for r in rows]


@app.get('/api/games/{game_id}')
async def get_game(game_id: str, req: Request):
    user = require_user(req)
    row = db.fetch_one('SELECT * FROM games WHERE id = ?', (game_id,))
    if not row:
        raise HTTPException(404, 'not_found')
    g = dict(row)
    if user['id'] not in (g.get('red_user_id'), g.get('black_user_id')):
        raise HTTPException(403, 'forbidden')
    return _serialize_game(g, user['id'])


def _serialize_game(g: dict, viewer_id: int) -> dict:
    user_side = 'r' if g.get('red_user_id') == viewer_id else 'b'
    return {
        'id': g['id'],
        'variant': g['variant'],
        'mode': g['mode'],
        'userSide': user_side,
        'botLevel': g.get('red_bot_level') or g.get('black_bot_level'),
        'result': g.get('result'),
        'reason': g.get('termination'),
        'moves': json.loads(g.get('moves_json') or '[]'),
        'duration_ms': g.get('duration_ms'),
        'playedAt': g['played_at'] * 1000,
    }


@app.get('/api/elo/{user_id}')
async def get_elo(user_id: int, variant: str = 'standard'):
    row = db.fetch_one('SELECT * FROM elo_profiles WHERE user_id = ? AND variant = ?',
                       (user_id, variant))
    if not row:
        return {'elo': elo.STARTING_ELO, 'gamesPlayed': 0, 'wins': 0, 'losses': 0, 'draws': 0,
                'rank': elo.get_rank(elo.STARTING_ELO)}
    p = dict(row)
    p['rank'] = elo.get_rank(p['elo'])
    return p


@app.get('/api/leaderboard')
async def leaderboard(variant: str = 'standard', scope: str = 'global', limit: int = 100):
    sql = '''
      SELECT u.id, u.display_name, u.avatar_url, e.elo, e.games_played, e.wins, e.losses, e.draws
      FROM elo_profiles e
      JOIN users u ON u.id = e.user_id
      WHERE e.variant = ? AND e.games_played >= 5
      ORDER BY e.elo DESC
      LIMIT ?
    '''
    rows = db.query(sql, (variant, min(limit, 100)))
    out = []
    for i, r in enumerate(rows):
        d = dict(r)
        d['rank'] = i + 1
        d['rankName'] = elo.get_rank(d['elo'])
        out.append(d)
    return out


# ═════════════════════════════════════════════
# 3. DAILY CHALLENGE
# ═════════════════════════════════════════════

DAILY_PUZZLES = [
    {'id': 'p001', 'title_vi': 'Pháo Mã chiếu hết trong 2', 'title_en': 'Cannon-Horse mate in 2',
     'fen': '4k4/9/9/9/9/9/9/9/4N4/3RKR3 w - - 0 1', 'mate_in': 1},
    {'id': 'p002', 'title_vi': 'Pháo lá chiếu', 'title_en': 'Cannon discovered check',
     'fen': '3k5/9/9/9/9/9/9/4C4/9/4K4 w - - 0 1', 'mate_in': 1},
    {'id': 'p003', 'title_vi': 'Đôi Xe chiếu', 'title_en': 'Double rook mate',
     'fen': '4k4/9/9/9/9/9/9/4R4/9/4KR3 w - - 0 1', 'mate_in': 1},
    {'id': 'p004', 'title_vi': 'Mã Pháo phối hợp', 'title_en': 'Horse-Cannon combination',
     'fen': '3k5/4P4/9/9/9/9/9/9/9/4K4 w - - 0 1', 'mate_in': 1},
    {'id': 'p005', 'title_vi': 'Lộ Tướng đe doạ', 'title_en': 'Flying general threat',
     'fen': '4k4/4P4/9/9/9/9/9/9/9/3K5 w - - 0 1', 'mate_in': 1},
    {'id': 'p006', 'title_vi': 'Pháo Đôi Mã', 'title_en': 'Double cannon mate',
     'fen': '3k5/9/4C4/9/9/9/9/9/4C4/4K4 w - - 0 1', 'mate_in': 1},
    {'id': 'p007', 'title_vi': 'Xe + Mã chiếu hết', 'title_en': 'Rook + Horse checkmate',
     'fen': '3k5/9/4N4/9/9/9/9/9/9/4KR3 w - - 0 1', 'mate_in': 1},
]


@app.get('/api/daily')
async def daily(req: Request):
    today = date.today()
    seed = int(today.strftime('%Y%m%d'))
    p = DAILY_PUZZLES[seed % len(DAILY_PUZZLES)]
    user = optional_user(req)
    attempt = None
    if user:
        row = db.fetch_one(
            'SELECT * FROM daily_attempts WHERE user_id = ? AND date_key = ?',
            (user['id'], today.isoformat())
        )
        attempt = dict(row) if row else None
    return {'puzzle': {**p, 'date_key': today.isoformat()}, 'attempt': attempt}


class DailyAttemptIn(BaseModel):
    duration_ms: int
    solved: bool = True
    attempts: int = 1


@app.post('/api/daily/attempt')
async def daily_attempt(body: DailyAttemptIn, req: Request):
    user = require_user(req)
    today = date.today().isoformat()
    db.execute(
        'INSERT OR REPLACE INTO daily_attempts (user_id, date_key, solved, duration_ms, attempts) '
        'VALUES (?, ?, ?, ?, ?)',
        (user['id'], today, 1 if body.solved else 0, body.duration_ms, body.attempts),
    )
    return {'ok': True}


# ═════════════════════════════════════════════
# 4. SUPER AI QUOTA
# ═════════════════════════════════════════════

WEEKLY_QUOTA = 3


@app.get('/api/super-ai/quota')
async def super_ai_quota(req: Request):
    user = require_user(req)
    week = _iso_week()
    row = db.fetch_one(
        'SELECT used FROM super_ai_quota WHERE user_id = ? AND iso_week = ?',
        (user['id'], week)
    )
    used = row['used'] if row else 0
    return {'used': used, 'remaining': max(0, WEEKLY_QUOTA - used), 'isoWeek': week,
            'limit': WEEKLY_QUOTA}


@app.post('/api/super-ai/start')
async def super_ai_start(req: Request):
    user = require_user(req)
    week = _iso_week()
    row = db.fetch_one(
        'SELECT used FROM super_ai_quota WHERE user_id = ? AND iso_week = ?',
        (user['id'], week)
    )
    used = row['used'] if row else 0
    if used >= WEEKLY_QUOTA:
        raise HTTPException(429, 'quota_exceeded')
    if row:
        db.execute(
            'UPDATE super_ai_quota SET used = used + 1 WHERE user_id = ? AND iso_week = ?',
            (user['id'], week)
        )
    else:
        db.execute(
            'INSERT INTO super_ai_quota (user_id, iso_week, used) VALUES (?, ?, 1)',
            (user['id'], week)
        )
    return {'ok': True, 'used': used + 1, 'remaining': WEEKLY_QUOTA - used - 1}


def _iso_week() -> str:
    today = date.today()
    y, w, _ = today.isocalendar()
    return f'{y}-W{w:02d}'


# ═════════════════════════════════════════════
# 5. CUSTOM ROOMS (CHALLENGES)
# ═════════════════════════════════════════════


class CreateRoomIn(BaseModel):
    variant: str = 'standard'
    time_initial_ms: int = 600_000
    time_inc_ms: int = 5_000
    creator_side: str = 'r'
    password: str | None = None
    ttl_minutes: int = 15
    notes: str | None = None


CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'


def _gen_code(n: int = 6) -> str:
    return ''.join(secrets.choice(CODE_ALPHABET) for _ in range(n))


@app.post('/api/challenges')
async def create_room(body: CreateRoomIn, req: Request):
    user = require_user(req)
    if body.password and len(body.password) < 4:
        raise HTTPException(400, 'password_too_short')
    if body.creator_side not in ('r', 'b', 'random'):
        raise HTTPException(400, 'bad_side')
    if body.variant not in ('standard', 'blind'):
        raise HTTPException(400, 'bad_variant')
    if body.ttl_minutes not in (15, 30, 60, 180, 720, 1440):
        raise HTTPException(400, 'bad_ttl')

    for _ in range(20):
        code = _gen_code()
        if not db.fetch_one('SELECT 1 FROM challenges WHERE code = ?', (code,)):
            break
    else:
        raise HTTPException(500, 'code_collision')

    pw_hash = pw_salt = None
    if body.password:
        pw_salt = secrets.token_hex(8)
        pw_hash = auth.hash_password(body.password + ':' + pw_salt)

    expires_at = int(time.time()) + body.ttl_minutes * 60
    db.execute(
        'INSERT INTO challenges (code, creator_id, variant, time_initial_ms, time_inc_ms, '
        'creator_side, password_hash, password_salt, notes, created_at, expires_at) '
        'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        (code, user['id'], body.variant, body.time_initial_ms, body.time_inc_ms,
         body.creator_side, pw_hash, pw_salt, body.notes, int(time.time()), expires_at)
    )
    return {
        'code': code,
        'shareUrl': f'/games/xiangqi/#/join/{code}',
        'hasPassword': bool(pw_hash),
        'expiresAt': expires_at * 1000,
    }


@app.get('/api/challenges/{code}')
async def lookup_room(code: str):
    code = code.upper()
    row = db.fetch_one('SELECT * FROM challenges WHERE code = ?', (code,))
    if not row:
        raise HTTPException(404, 'not_found')
    r = dict(row)
    if r['expires_at'] < int(time.time()):
        raise HTTPException(410, 'expired')
    if r['joined_user_id']:
        raise HTTPException(409, 'occupied')
    creator = auth.get_user_by_id(r['creator_id'])
    return {
        'code': r['code'],
        'variant': r['variant'],
        'timeInitialMs': r['time_initial_ms'],
        'timeIncMs': r['time_inc_ms'],
        'hasPassword': bool(r['password_hash']),
        'creator': {
            'id': creator['id'],
            'displayName': creator['display_name'],
        } if creator else None,
        'notes': r['notes'],
        'expiresAt': r['expires_at'] * 1000,
    }


class JoinRoomIn(BaseModel):
    password: str | None = None


@app.post('/api/challenges/{code}/join')
async def join_room(code: str, body: JoinRoomIn, req: Request):
    user = require_user(req)
    code = code.upper()
    row = db.fetch_one('SELECT * FROM challenges WHERE code = ?', (code,))
    if not row:
        raise HTTPException(404, 'not_found')
    r = dict(row)
    if r['expires_at'] < int(time.time()):
        raise HTTPException(410, 'expired')
    if r['joined_user_id']:
        raise HTTPException(409, 'occupied')
    if r['password_hash']:
        if not body.password:
            raise HTTPException(403, 'password_required')
        if not auth.verify_password(body.password + ':' + r['password_salt'], r['password_hash']):
            raise HTTPException(403, 'wrong_password')
    db.execute('UPDATE challenges SET joined_user_id = ? WHERE code = ?', (user['id'], code))
    return {'ok': True, 'code': code}


# ═════════════════════════════════════════════
# 6. TOURNAMENTS
# ═════════════════════════════════════════════


class CreateTournamentIn(BaseModel):
    name: str = Field(min_length=3, max_length=80)
    format: str = 'swiss'
    variant: str = 'standard'
    time_initial_ms: int = 600_000
    time_inc_ms: int = 5_000
    max_players: int = Field(default=64, ge=4, le=256)
    min_players: int = Field(default=4, ge=2)
    rounds: int = Field(default=0, ge=0, le=20)
    starts_in_minutes: int = Field(default=5, ge=1, le=10080)
    duration_minutes: int = Field(default=120, ge=30, le=1440)
    description: str = ''


@app.post('/api/tournaments')
async def create_tournament(body: CreateTournamentIn, req: Request):
    user = require_user(req)
    if body.format not in ('swiss', 'knockout', 'arena'):
        raise HTTPException(400, 'bad_format')
    if body.variant not in ('standard', 'blind'):
        raise HTTPException(400, 'bad_variant')
    starts_at = time.time() + body.starts_in_minutes * 60
    t = tournament_mgr.create(
        name=body.name, fmt=body.format, creator_id=user['id'],
        variant=body.variant, time_initial_ms=body.time_initial_ms,
        time_inc_ms=body.time_inc_ms, max_players=body.max_players,
        min_players=body.min_players, rounds=body.rounds,
        starts_at=starts_at, duration_minutes=body.duration_minutes,
        description=body.description,
    )
    return tournament_mgr.serialize(t)


@app.get('/api/tournaments')
async def list_tournaments(status: str | None = None):
    return tournament_mgr.list_all(status)


@app.get('/api/tournaments/{tid}')
async def get_tournament(tid: str):
    t = tournament_mgr.tournaments.get(tid)
    if not t:
        raise HTTPException(404, 'not_found')
    return tournament_mgr.serialize_detail(t)


@app.post('/api/tournaments/{tid}/join')
async def join_tournament(tid: str, req: Request):
    user = require_user(req)
    elo_row = db.fetch_one('SELECT elo FROM elo_profiles WHERE user_id = ? AND variant = ?',
                           (user['id'], 'standard'))
    user_elo = elo_row['elo'] if elo_row else elo.STARTING_ELO
    ok = tournament_mgr.join(tid, user['id'], user['display_name'], user_elo)
    if not ok:
        raise HTTPException(400, 'cannot_join')
    return {'ok': True}


@app.post('/api/tournaments/{tid}/leave')
async def leave_tournament(tid: str, req: Request):
    user = require_user(req)
    ok = tournament_mgr.leave(tid, user['id'])
    if not ok:
        raise HTTPException(400, 'cannot_leave')
    return {'ok': True}


@app.post('/api/tournaments/{tid}/start')
async def start_tournament(tid: str, req: Request):
    user = require_user(req)
    t = tournament_mgr.tournaments.get(tid)
    if not t:
        raise HTTPException(404, 'not_found')
    if t.creator_id != user['id']:
        raise HTTPException(403, 'not_creator')
    ok = tournament_mgr.start(tid)
    if not ok:
        raise HTTPException(400, 'cannot_start')
    return tournament_mgr.serialize_detail(t)


class ReportMatchIn(BaseModel):
    match_id: str
    result: str
    game_id: str | None = None


@app.post('/api/tournaments/{tid}/result')
async def report_match_result(tid: str, body: ReportMatchIn, req: Request):
    user = require_user(req)
    if body.result not in ('1-0', '0-1', '1/2-1/2'):
        raise HTTPException(400, 'bad_result')

    # Pass user_id to verify participant in match before accepting result
    ok = tournament_mgr.report_result(tid, body.match_id, body.result, body.game_id, user['id'])
    if not ok:
        # Log potential abuse
        audit.log_security_event('tournament_unauthorized_report', user['id'],
                                f'Tournament {tid}: match {body.match_id}')
        raise HTTPException(403, 'not_in_match')
    t = tournament_mgr.tournaments.get(tid)
    return tournament_mgr.serialize_detail(t)


@app.get('/api/tournaments/{tid}/standings')
async def tournament_standings(tid: str):
    return tournament_mgr.get_standings(tid)


# ═════════════════════════════════════════════
# 7. CHAT HISTORY
# ═════════════════════════════════════════════


@app.get('/api/games/{game_id}/chat')
async def get_chat_history(game_id: str, req: Request):
    """Get chat messages for a game."""
    user = require_user(req)
    g = db.fetch_one('SELECT * FROM games WHERE id = ?', (game_id,))
    if not g:
        raise HTTPException(404, 'not_found')
    g = dict(g)
    if user['id'] not in (g.get('red_user_id'), g.get('black_user_id')):
        raise HTTPException(403, 'forbidden')
    rows = db.query(
        'SELECT cm.*, u.display_name FROM chat_messages cm '
        'JOIN users u ON u.id = cm.sender_id '
        'WHERE cm.game_id = ? ORDER BY cm.sent_at ASC LIMIT 500',
        (game_id,)
    )
    return [
        {
            'id': r['id'],
            'sender': {'id': r['sender_id'], 'name': r['display_name']},
            'text': r['text'],
            'sentAt': r['sent_at'] * 1000,
            'flagged': bool(r['flagged']),
        }
        for r in rows
    ]


# ═════════════════════════════════════════════
# 8. ANTICHEAT REPORTS (admin)
# ═════════════════════════════════════════════


@app.get('/api/anticheat/reports')
async def get_anticheat_reports(user: dict = Depends(admin_required), limit: int = 50):
    """Get recent anti-cheat flagged reports (admin only)."""
    rows = db.query(
        'SELECT ar.*, u.display_name FROM anticheat_reports ar '
        'JOIN users u ON u.id = ar.user_id '
        'WHERE ar.flagged = 1 '
        'ORDER BY ar.created_at DESC LIMIT ?',
        (min(limit, 200),)
    )
    return [
        {
            'id': r['id'],
            'gameId': r['game_id'],
            'userId': r['user_id'],
            'displayName': r['display_name'],
            'suspicion': r['suspicion'],
            'reasons': json.loads(r['reasons'] or '[]'),
            'createdAt': r['created_at'] * 1000,
        }
        for r in rows
    ]


@app.get('/api/admin/chat/flagged')
async def get_flagged_messages(user: dict = Depends(admin_required), limit: int = 100):
    """Get recently flagged chat messages (admin only)."""
    rows = db.query(
        'SELECT cm.*, u.display_name, g.id as game_id FROM chat_messages cm '
        'JOIN users u ON u.id = cm.sender_id '
        'LEFT JOIN games g ON g.id = cm.game_id '
        'WHERE cm.flagged = 1 '
        'ORDER BY cm.sent_at DESC LIMIT ?',
        (min(limit, 500),)
    )
    return [
        {
            'id': r['id'],
            'gameId': r['game_id'],
            'sender': {'id': r['sender_id'], 'name': r['display_name']},
            'text': r['text'],
            'sentAt': r['sent_at'] * 1000,
        }
        for r in rows
    ]


@app.get('/api/admin/anticheat/stats')
async def get_anticheat_stats(user: dict = Depends(admin_required)):
    """Get anticheat engine memory stats (admin only)."""
    return anticheat.get_stats()


@app.get('/api/admin/audit-logs')
async def get_audit_logs(
    user: dict = Depends(admin_required),
    limit: int = 100,
    event_type: str | None = None,
    user_id: int | None = None,
):
    """Get audit logs (admin only).

    Args:
        limit: Max logs to return (default 100, max 500)
        event_type: Filter by event type (e.g., 'tournament_unauthorized_report')
        user_id: Filter by user ID
    """
    limit = min(limit, 500)

    query = 'SELECT id, event_type, user_id, details, created_at FROM audit_logs WHERE 1=1'
    params = []

    if event_type:
        query += ' AND event_type = ?'
        params.append(event_type)

    if user_id:
        query += ' AND user_id = ?'
        params.append(user_id)

    query += ' ORDER BY created_at DESC LIMIT ?'
    params.append(limit)

    rows = db.fetch_all(query, params)

    return [
        {
            'id': r['id'],
            'eventType': r['event_type'],
            'userId': r['user_id'],
            'details': r['details'],
            'createdAt': r['created_at'] * 1000,
        }
        for r in rows
    ]


# ═════════════════════════════════════════════
# 9. WEBSOCKET — matchmaking + game sync + chat
#    Phase 3: server-side move validation + anti-cheat
# ═════════════════════════════════════════════


class WSConn:
    def __init__(self, ws: WebSocket, user_id: int):
        self.ws = ws
        self.user_id = user_id
        self.user = auth.get_user_by_id(user_id)
        self.queue_mode: str | None = None
        self.game_id: str | None = None


CONNS: dict[int, WSConn] = {}
QUEUE: dict[str, list[int]] = {}
GAMES: dict[str, dict[str, Any]] = {}


async def _send(uid: int, msg: dict):
    c = CONNS.get(uid)
    if c:
        try:
            await c.ws.send_text(json.dumps(msg, ensure_ascii=False))
        except Exception:
            pass


async def _try_match(mode_key: str):
    q = QUEUE.setdefault(mode_key, [])
    if len(q) < 2:
        return
    a, b = q.pop(0), q.pop(0)
    gid = 'g_live_' + uuid.uuid4().hex[:12]
    variant = mode_key.split(':')[0]

    # Create server-side board for validation
    board = engine.from_fen(engine.INITIAL_FEN, variant)

    GAMES[gid] = {
        'id': gid,
        'red': a,
        'black': b,
        'variant': variant,
        'side': 'r',
        'moves': [],
        'board': board,       # server-side board state
        'move_times': {},     # uid → [timestamps] for anti-cheat
        'last_move_at': {a: time.time(), b: time.time()},
        'created_at': time.time(),
    }
    if (ca := CONNS.get(a)): ca.game_id = gid
    if (cb := CONNS.get(b)): cb.game_id = gid

    # Start anti-cheat tracking
    anticheat.start_game(gid, a, b)

    a_user = auth.get_user_by_id(a)
    b_user = auth.get_user_by_id(b)
    await _send(a, {'type': 'queue.matched', 'gameId': gid, 'side': 'r',
                    'opponent': {'id': b, 'displayName': b_user['display_name'] if b_user else '?'},
                    'variant': variant})
    await _send(b, {'type': 'queue.matched', 'gameId': gid, 'side': 'b',
                    'opponent': {'id': a, 'displayName': a_user['display_name'] if a_user else '?'},
                    'variant': variant})


# Enhanced profanity list with word boundaries
PROFANITY = {
    # English
    'fuck', 'fucking', 'fucked', 'fucker',
    'shit', 'shitty',
    'bitch', 'bitchy',
    'asshole', 'asshat',
    'bastard',
    'dumbass', 'dipshit',
    'motherfucker', 'motherfucking',
    'cunt',
    'damn', 'damned',
    'piss', 'pissed',
    'cock', 'cocksucker',
    'whore', 'slut',
    'retard', 'retarded',
    'faggot',
    'nigger',

    # Vietnamese
    'đm', 'đmm',  # Shortened "đổ mẹ" (derogatory)
    'clm', 'cl',  # "cái lồn mẹ" or shortened (vulgar)
    'đcm',        # "đi chết mẹ" (derogatory)
    'ngu',        # Stupid (mild)
    'đần',        # Stupid (mild)
    'óc',         # Retarded, dumb
    'khốn',       # Wretch
    'tả tơi',     # Wretch
    'con chó',    # Son of a bitch (literally)
}


def _normalize_unicode(text: str) -> str:
    """Normalize unicode to catch bypasses with diacritics, zero-width chars, etc.

    - NFD decomposition: "é" → "e" + combining accent
    - Remove combining marks (accents, diacritics)
    - Remove zero-width characters
    - Remove right-to-left marks
    """
    # NFD decomposition
    text = unicodedata.normalize('NFD', text)
    # Remove combining marks (accents, diacritics)
    text = ''.join(c for c in text if unicodedata.category(c) != 'Mn')
    # Remove zero-width characters (zero-width joiner, zero-width space, etc.)
    text = text.replace('​', '').replace('‌', '').replace('‍', '')
    # Remove right-to-left marks
    text = text.replace('‮', '').replace('‭', '')
    return text


def _profanity_filter(text: str) -> str:
    """Filter profanity with word boundaries + unicode normalization.

    Multiple detection layers:
    1. Word boundary matching on normalized text (catches most bypasses)
    2. Spaced/zero-width evasion detection (flags for moderation)
    """
    if not text:
        return text

    original = text
    normalized_lower = _normalize_unicode(text.lower())
    filtered = text
    modified = False

    # Layer 1: Word boundary matching on normalized text
    for word in PROFANITY:
        # Use word boundaries: \b matches between word chars and non-word chars
        pattern = r'\b' + re.escape(word) + r'\b'
        if re.search(pattern, normalized_lower, re.IGNORECASE):
            replacement = '*' * len(word)
            # Replace in original text to preserve case/accents
            filtered = re.sub(pattern, replacement, filtered, flags=re.IGNORECASE)
            modified = True

    # Layer 2: Catch spacing/zero-width evasion: "f u c k" or "f‌u‌c‌k"
    # Remove spaces and zero-width chars, check again
    spaced_normalized = re.sub(r'[\s​‌‍]+', '', normalized_lower)
    for word in PROFANITY:
        if word in spaced_normalized:
            # Mark as modified (don't filter spaced version, just flag)
            logger.debug('[chat] Detected spaced/zero-width profanity attempt: %s', text[:50])
            modified = True
            break

    return filtered if modified else text


@app.websocket('/ws')
async def ws_endpoint(ws: WebSocket):
    """WebSocket endpoint with message size limits and rate limiting.

    Size limits:
    - Uvicorn enforces ws_max_size (default 16KB, configurable via XQ_WS_MAX_SIZE env var)
    - Server-side check for defense in depth (also 16KB)
    - Oversized messages logged and rejected with 'message_too_large' error

    Rate limiting:
    - Connection rate: max 2 conn/s, burst 5 (per IP)
    - Message rate: max 20 msg/s, burst 50 (per user)
    """
    # Rate limit WebSocket connections per IP before accepting (max 2 conn/s, burst 5)
    # This prevents connection flooding/DoS attacks
    ip = get_client_ip(ws.scope if hasattr(ws, 'scope') else ws)
    try:
        check_rate_limit(ws_connect_limiter, f'ws_connect:{ip}')
    except HTTPException as e:
        await ws.close(code=4029, reason='Too many connection attempts')
        return

    await ws.accept()
    conn: WSConn | None = None
    try:
        # Auth handshake — with size limit enforced at transport level
        try:
            first = await asyncio.wait_for(ws.receive_text(), timeout=10.0)
        except Exception as e:
            # Uvicorn raises WebSocketDisconnect if message exceeds ws_max_size
            audit.log_security_event('ws_oversized', None, f'Message exceeded max size during handshake: {e}')
            await ws.close(code=4002, reason='Message too large')
            return

        msg = json.loads(first)
        if msg.get('type') != 'auth':
            await ws.close(code=4001)
            return
        payload = auth.decode_jwt(msg.get('token', ''))
        if not payload:
            await ws.send_text(json.dumps({'type': 'error', 'code': 'invalid_token'}))
            await ws.close(code=4001)
            return
        user_id = int(payload['sub'])
        user = auth.get_user_by_id(user_id)
        if not user:
            await ws.close(code=4001)
            return
        conn = WSConn(ws, user_id)
        if user_id in CONNS:
            try: await CONNS[user_id].ws.close(code=4002)
            except Exception: pass
        CONNS[user_id] = conn
        await ws.send_text(json.dumps({'type': 'ready', 'user': _public_user(user)}))

        while True:
            try:
                raw = await ws.receive_text()
            except Exception as e:
                # Catch oversized or malformed messages from transport layer
                if conn:
                    audit.log_security_event('ws_error', conn.user_id, f'WebSocket error: {e}')
                break

            # Additional check for defense in depth (match Uvicorn limit of 16KB)
            if len(raw) > 16_384:
                audit.log_security_event('ws_oversized', user_id, f'Message: {len(raw)} bytes')
                await _send(user_id, {'type': 'error', 'code': 'message_too_large'})
                continue

            # Rate limit WebSocket messages
            if not check_ws_rate(f'ws:{user_id}'):
                audit.log_security_event('ws_rate_limit', user_id, 'WebSocket rate limit exceeded')
                await _send(user_id, {'type': 'error', 'code': 'rate_limited'})
                continue

            try:
                m = json.loads(raw)
            except Exception:
                audit.log_security_event('ws_invalid_json', user_id, 'Invalid JSON received on WebSocket')
                continue

            # Validate message structure
            if not isinstance(m, dict) or 'type' not in m:
                audit.log_security_event('ws_invalid_msg', user_id, 'Missing type field in WebSocket message')
                continue

            t = m.get('type')

            # Validate type is a string
            if not isinstance(t, str) or len(t) > 32:
                audit.log_security_event('ws_invalid_type', user_id, f'Invalid message type: {t}')
                continue

            # Validate gameId và các string field không vượt quá giới hạn
            raw_game_id = m.get('gameId')
            if raw_game_id is not None and (not isinstance(raw_game_id, str) or len(raw_game_id) > 64):
                await _send(user_id, {'type': 'error', 'code': 'invalid_game_id'})
                continue

            if t == 'queue.join':
                variant = m.get('variant', 'standard')
                time_ctrl = m.get('time', '10+5')
                # Giới hạn độ dài để tránh memory bloat trong QUEUE dict
                if not isinstance(variant, str) or len(variant) > 32:
                    continue
                if not isinstance(time_ctrl, str) or len(time_ctrl) > 16:
                    continue
                key = f"{variant}:{time_ctrl}"
                conn.queue_mode = key
                q = QUEUE.setdefault(key, [])
                if user_id not in q:
                    q.append(user_id)
                await _send(user_id, {'type': 'queue.joined', 'mode': key, 'position': len(q)})
                await _try_match(key)

            elif t == 'queue.leave':
                if conn.queue_mode and conn.queue_mode in QUEUE:
                    try: QUEUE[conn.queue_mode].remove(user_id)
                    except ValueError: pass
                conn.queue_mode = None
                await _send(user_id, {'type': 'queue.left'})

            elif t == 'game.move':
                gid = m.get('gameId') or conn.game_id
                g = GAMES.get(gid)
                if not g:
                    await _send(user_id, {'type': 'error', 'code': 'no_game'}); continue

                # Rate limit moves
                if not check_ws_rate(f'move:{user_id}', move_limiter):
                    await _send(user_id, {'type': 'error', 'code': 'move_rate_limited'}); continue

                # Verify it's this player's turn
                expected_uid = g['red'] if g['side'] == 'r' else g['black']
                if user_id != expected_uid:
                    await _send(user_id, {'type': 'error', 'code': 'not_your_turn'}); continue

                # ── SERVER-SIDE MOVE VALIDATION ──
                move_data = m.get('move', {})
                # Validate cấu trúc move_data trước khi dùng (tránh KeyError crash)
                if (not isinstance(move_data, dict)
                        or not isinstance(move_data.get('from'), dict)
                        or not isinstance(move_data.get('to'), dict)
                        or 'file' not in move_data['from'] or 'rank' not in move_data['from']
                        or 'file' not in move_data['to']   or 'rank' not in move_data['to']):
                    await _send(user_id, {'type': 'error', 'code': 'invalid_move_format'})
                    continue
                board = g['board']
                ok, err = engine.validate_move(board, move_data)
                if not ok:
                    await _send(user_id, {'type': 'error', 'code': 'illegal_move', 'detail': err})
                    # Log suspicious illegal move attempts
                    logger.warning('[anticheat] ILLEGAL move uid=%s game=%s: %s', user_id, gid, err)
                    continue

                # Record move timing for anti-cheat
                now = time.time()
                move_time_ms = (now - g['last_move_at'].get(user_id, now)) * 1000
                g['last_move_at'][user_id] = now
                anticheat.record_move(gid, user_id, move_time_ms)

                # Apply the validated move on server board
                move = engine._mk(
                    move_data['from']['file'], move_data['from']['rank'],
                    move_data['to']['file'], move_data['to']['rank'],
                )
                engine.apply_move(board, move)

                # Forward to opponent
                opp = g['black'] if user_id == g['red'] else g['red']
                g['moves'].append({'side': g['side'], 'move': move_data, 'ts': now})
                g['side'] = 'b' if g['side'] == 'r' else 'r'

                await _send(opp, {'type': 'game.moved', 'gameId': gid, 'move': move_data})

                # ── SERVER-SIDE game result detection ──
                result = engine.detect_game_result(board)
                if result['ended']:
                    res_str = '1-0' if result['winner'] == 'r' else (
                        '0-1' if result['winner'] == 'b' else '1/2-1/2')
                    for uid in (g['red'], g['black']):
                        await _send(uid, {
                            'type': 'game.ended', 'gameId': gid,
                            'result': res_str, 'reason': result['reason'],
                            'serverDetected': True,
                        })
                    _archive_live_game(g, winner=result['winner'], reason=result['reason'])

            elif t == 'game.resign':
                gid = m.get('gameId') or conn.game_id
                g = GAMES.get(gid)
                if not g: continue
                winner = 'b' if user_id == g['red'] else 'r'
                opp = g['black'] if user_id == g['red'] else g['red']
                await _send(opp, {'type': 'game.ended', 'gameId': gid,
                                  'result': '0-1' if winner == 'b' else '1-0',
                                  'reason': 'resign'})
                await _send(user_id, {'type': 'game.ended', 'gameId': gid,
                                      'result': '0-1' if winner == 'b' else '1-0',
                                      'reason': 'resign'})
                _archive_live_game(g, winner=winner, reason='resign')

            elif t == 'game.draw_offer':
                gid = m.get('gameId') or conn.game_id
                g = GAMES.get(gid)
                if not g: continue
                opp = g['black'] if user_id == g['red'] else g['red']
                await _send(opp, {'type': 'game.draw_offered', 'gameId': gid, 'by': user_id})

            elif t == 'game.draw_response':
                gid = m.get('gameId') or conn.game_id
                g = GAMES.get(gid)
                if not g: continue
                accept = bool(m.get('accept'))
                opp = g['black'] if user_id == g['red'] else g['red']
                if accept:
                    await _send(opp, {'type': 'game.ended', 'gameId': gid,
                                      'result': '1/2-1/2', 'reason': 'agreed_draw'})
                    await _send(user_id, {'type': 'game.ended', 'gameId': gid,
                                          'result': '1/2-1/2', 'reason': 'agreed_draw'})
                    _archive_live_game(g, winner=None, reason='agreed_draw')
                else:
                    await _send(opp, {'type': 'game.draw_declined', 'gameId': gid})

            elif t == 'chat.send':
                gid = m.get('gameId') or conn.game_id
                g = GAMES.get(gid)
                if not g: continue
                text = (m.get('text') or '')[:500].strip()
                if not text: continue

                clean = _profanity_filter(text)
                flagged = 1 if clean != text else 0

                # Also check for spaced evasion (flag even if not filtered)
                if not flagged:
                    spaced_normalized = re.sub(r'[\s​‌‍]+', '',
                                              _normalize_unicode(text.lower()))
                    for word in PROFANITY:
                        if word in spaced_normalized:
                            flagged = 1
                            break

                opp = g['black'] if user_id == g['red'] else g['red']
                db.execute(
                    'INSERT INTO chat_messages (game_id, sender_id, text, sent_at, flagged) '
                    'VALUES (?, ?, ?, ?, ?)',
                    (gid, user_id, clean, int(time.time()), flagged)
                )

                # Log flagged messages for moderation
                if flagged:
                    audit.log_security_event('chat_profanity', user_id, f'Game {gid}')

                payload = {'type': 'chat.message', 'gameId': gid,
                           'sender': {'id': user_id, 'name': conn.user['display_name']},
                           'text': clean, 'sentAt': int(time.time() * 1000)}
                await _send(opp, payload)
                await _send(user_id, payload)

            elif t == 'chat.typing':
                gid = m.get('gameId') or conn.game_id
                g = GAMES.get(gid)
                if not g: continue
                opp = g['black'] if user_id == g['red'] else g['red']
                await _send(opp, {'type': 'chat.typing', 'sender': user_id, 'on': bool(m.get('on'))})

            elif t == 'presence.heartbeat':
                pass

            elif t == 'game.end':
                # Client reports end — server verifies via board state
                gid = m.get('gameId') or conn.game_id
                g = GAMES.get(gid)
                if not g: continue
                # Double-check with server board
                board = g['board']
                result = engine.detect_game_result(board)
                if result['ended']:
                    _archive_live_game(g, winner=result['winner'], reason=result['reason'])
                else:
                    # Client claims game ended but server disagrees — log
                    logger.warning('[anticheat] Client claimed game.end but server disagrees: %s', gid)
                    await _send(user_id, {'type': 'error', 'code': 'game_not_ended'})

    except WebSocketDisconnect:
        pass
    except asyncio.TimeoutError:
        try: await ws.close(code=4003)
        except: pass
    except Exception as ex:
        logger.exception('[ws] unhandled error: %s', ex)
        try: await ws.close()
        except: pass
    finally:
        if conn:
            CONNS.pop(conn.user_id, None)
            if conn.queue_mode and conn.queue_mode in QUEUE:
                try: QUEUE[conn.queue_mode].remove(conn.user_id)
                except ValueError: pass
            # If player disconnects during game, auto-resign
            if conn.game_id and conn.game_id in GAMES:
                g = GAMES[conn.game_id]
                winner = 'b' if conn.user_id == g['red'] else 'r'
                opp = g['black'] if conn.user_id == g['red'] else g['red']
                await _send(opp, {'type': 'game.ended', 'gameId': conn.game_id,
                                  'result': '1-0' if winner == 'r' else '0-1',
                                  'reason': 'disconnect'})
                _archive_live_game(g, winner=winner, reason='disconnect')


def _archive_live_game(g: dict, winner: str | None, reason: str):
    """Save live game to DB, update ELO, run anti-cheat analysis."""
    gid = g['id']
    if gid not in GAMES:
        return
    if winner is None:
        result = '1/2-1/2'
    else:
        result = '1-0' if winner == 'r' else '0-1'

    # ELO update
    red_id, black_id = g['red'], g['black']
    red_p = db.fetch_one('SELECT * FROM elo_profiles WHERE user_id = ? AND variant = ?', (red_id, g['variant']))
    blk_p = db.fetch_one('SELECT * FROM elo_profiles WHERE user_id = ? AND variant = ?', (black_id, g['variant']))
    red_elo_before = red_p['elo'] if red_p else elo.STARTING_ELO
    blk_elo_before = blk_p['elo'] if blk_p else elo.STARTING_ELO
    d_red = d_blk = 0
    if red_p and blk_p:
        red_elo, blk_elo = red_p['elo'], blk_p['elo']
        red_score = 1.0 if winner == 'r' else (0.5 if winner is None else 0.0)
        blk_score = 1.0 - red_score
        new_red, d_red, _ = elo.update_elo(red_elo, blk_elo, red_score, red_p['games_played'])
        new_blk, d_blk, _ = elo.update_elo(blk_elo, red_elo, blk_score, blk_p['games_played'])
        db.execute(
            'UPDATE elo_profiles SET elo = ?, peak_elo = MAX(peak_elo, ?), games_played = games_played + 1, '
            'wins = wins + ?, losses = losses + ?, draws = draws + ? WHERE user_id = ? AND variant = ?',
            (new_red, new_red, 1 if winner == 'r' else 0, 1 if winner == 'b' else 0,
             1 if winner is None else 0, red_id, g['variant'])
        )
        db.execute(
            'UPDATE elo_profiles SET elo = ?, peak_elo = MAX(peak_elo, ?), games_played = games_played + 1, '
            'wins = wins + ?, losses = losses + ?, draws = draws + ? WHERE user_id = ? AND variant = ?',
            (new_blk, new_blk, 1 if winner == 'b' else 0, 1 if winner == 'r' else 0,
             1 if winner is None else 0, black_id, g['variant'])
        )

    # Save game
    db.execute(
        'INSERT OR REPLACE INTO games (id, variant, mode, red_user_id, black_user_id, '
        'result, termination, moves_json, played_at, red_elo_before, black_elo_before, '
        'red_elo_delta, black_elo_delta) '
        'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        (gid, g['variant'], 'ranked', red_id, black_id, result, reason,
         json.dumps(g['moves'], ensure_ascii=False), int(g['created_at']),
         red_elo_before, blk_elo_before, d_red, d_blk)
    )

    # Anti-cheat analysis
    ac_results = anticheat.analyze_game(gid)
    for uid, ac in ac_results.items():
        if ac['flagged']:
            db.execute(
                'INSERT INTO anticheat_reports (game_id, user_id, suspicion, reasons, flagged, created_at) '
                'VALUES (?, ?, ?, ?, 1, ?)',
                (gid, uid, ac['suspicion_score'], json.dumps(ac['reasons']), int(time.time()))
            )
            logger.warning('[anticheat] FLAGGED user=%s game=%s score=%s reasons=%s',
                           uid, gid, ac['suspicion_score'], ac['reasons'])
    anticheat.end_game(gid)

    GAMES.pop(gid, None)


def _sha256_short(s: str) -> str:
    import hashlib
    return hashlib.sha256(s.encode()).hexdigest()[:16]


# ═════════════════════════════════════════════
# Health
# ═════════════════════════════════════════════


@app.get('/healthz')
async def health():
    return {
        'ok': True,
        'version': '0.3.0',
        'phase': 3,
        'time': int(time.time()),
        'connected_users': len(CONNS),
        'active_games': len(GAMES),
        'queues': {k: len(v) for k, v in QUEUE.items()},
        'tournaments': len(tournament_mgr.tournaments),
    }
