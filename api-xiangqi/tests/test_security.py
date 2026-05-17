"""
Security verification tests — chạy bằng: python -m pytest tests/test_security.py -v
Không cần server chạy. Test logic thuần Python.
"""
import importlib
import ipaddress
import sys
import os
import time

# Thêm root vào path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import pytest


# ═══════════════════════════════════════════════════════════
# 1. JWT secret validation
# ═══════════════════════════════════════════════════════════

def test_jwt_secret_uses_random_in_dev(monkeypatch):
    """auth.py phải tạo random secret khi không set và không phải production."""
    monkeypatch.delenv('XQ_JWT_SECRET', raising=False)
    monkeypatch.delenv('XQ_ENV', raising=False)

    if 'app.auth' in sys.modules:
        del sys.modules['app.auth']

    import app.auth as auth_mod
    assert auth_mod.JWT_SECRET  # phải có secret (random)
    assert len(auth_mod.JWT_SECRET) >= 32


def test_jwt_secret_exits_in_production(monkeypatch):
    """auth.py phải sys.exit() khi XQ_ENV=production mà không có secret."""
    monkeypatch.setenv('XQ_ENV', 'production')
    monkeypatch.delenv('XQ_JWT_SECRET', raising=False)

    if 'app.auth' in sys.modules:
        del sys.modules['app.auth']

    with pytest.raises(SystemExit):
        import app.auth  # noqa


def test_jwt_secret_ok_in_production_when_set(monkeypatch):
    """auth.py không exit khi production VÀ có secret."""
    monkeypatch.setenv('XQ_ENV', 'production')
    monkeypatch.setenv('XQ_JWT_SECRET', 'a' * 32)

    if 'app.auth' in sys.modules:
        del sys.modules['app.auth']

    import app.auth as m  # noqa - should not exit
    assert m.JWT_SECRET == 'a' * 32


# ═══════════════════════════════════════════════════════════
# 2. Avatar URL validation
# ═══════════════════════════════════════════════════════════

def setup_main():
    """Import main module (cần auth không exit)."""
    import os; os.environ.setdefault('XQ_JWT_SECRET', 'test-secret-32chars-xxxxxxxxxx')
    os.environ.setdefault('XQ_ENV', 'dev')
    if 'app.auth' in sys.modules:
        del sys.modules['app.auth']
    if 'app.main' in sys.modules:
        del sys.modules['app.main']


def test_avatar_url_valid():
    setup_main()
    from app.main import _validate_avatar_url
    assert _validate_avatar_url('https://cdn.example.com/img.jpg') == 'https://cdn.example.com/img.jpg'
    assert _validate_avatar_url('http://example.com/a.png') is not None


def test_avatar_url_rejects_javascript():
    setup_main()
    from app.main import _validate_avatar_url
    assert _validate_avatar_url('javascript:alert(1)') is None
    assert _validate_avatar_url('JAVASCRIPT:alert(1)') is None


def test_avatar_url_rejects_data_uri():
    setup_main()
    from app.main import _validate_avatar_url
    assert _validate_avatar_url('data:text/html,<script>') is None


def test_avatar_url_rejects_ftp():
    setup_main()
    from app.main import _validate_avatar_url
    assert _validate_avatar_url('ftp://files.example.com/img') is None


def test_avatar_url_truncates_to_300():
    setup_main()
    from app.main import _validate_avatar_url
    long_url = 'https://example.com/' + 'a' * 400
    result = _validate_avatar_url(long_url)
    assert result is None or len(result) <= 300


# ═══════════════════════════════════════════════════════════
# 3. SQL whitelist — không dùng assert
# ═══════════════════════════════════════════════════════════

def test_patch_me_whitelist_no_assert():
    """Whitelist cần dùng raise HTTPException, không phải assert."""
    setup_main()
    import app.main as main_mod
    import ast, inspect

    src = inspect.getsource(main_mod.patch_me)
    tree = ast.parse(src)

    # Không được có assert trong patch_me
    for node in ast.walk(tree):
        assert not isinstance(node, ast.Assert), \
            "patch_me dùng assert — bị disable với python -O!"


def test_patch_whitelist_contains_only_safe_cols():
    setup_main()
    from app.main import _PATCH_ME_ALLOWED_COLS
    # Không được có cột nhạy cảm
    dangerous = {'password_hash', 'google_sub', 'email_verified', 'is_admin', 'id'}
    assert not dangerous.intersection(_PATCH_ME_ALLOWED_COLS), \
        f"Cột nguy hiểm trong whitelist: {dangerous & _PATCH_ME_ALLOWED_COLS}"


# ═══════════════════════════════════════════════════════════
# 4. Login failure tracker
# ═══════════════════════════════════════════════════════════

def test_login_tracker_locks_after_5_failures():
    from app.rate_limit import _LoginFailureTracker
    t = _LoginFailureTracker()
    email = 'attacker@evil.com'
    assert not t.is_locked(email)
    for _ in range(5):
        t.record_failure(email)
    assert t.is_locked(email), 'Phải bị lock sau 5 lần thất bại'


def test_login_tracker_clears_on_success():
    from app.rate_limit import _LoginFailureTracker
    t = _LoginFailureTracker()
    email = 'user@example.com'
    for _ in range(5):
        t.record_failure(email)
    assert t.is_locked(email)
    t.clear(email)
    assert not t.is_locked(email), 'Phải mở khóa sau login thành công'


def test_login_tracker_resets_after_window(monkeypatch):
    """Sau khi lockout window hết, account được mở khóa."""
    from app import rate_limit as rl
    t = rl._LoginFailureTracker()
    email = 'test@example.com'

    # Giả lập 5 failures và vượt thời gian lockout
    import time as _time
    original = _time.monotonic
    fake_now = [0.0]
    monkeypatch.setattr('app.rate_limit.time', type('T', (), {
        'monotonic': staticmethod(lambda: fake_now[0])
    })())

    t2 = rl._LoginFailureTracker()
    for _ in range(5):
        t2.record_failure(email)
    assert t2.is_locked(email)

    fake_now[0] = rl._LOGIN_LOCKOUT_SECONDS + 1
    assert not t2.is_locked(email), 'Phải mở khóa sau window hết'


# ═══════════════════════════════════════════════════════════
# 5. Email reset rate limit
# ═══════════════════════════════════════════════════════════

def test_email_reset_rate_limit():
    """Max 3 lần/giờ per email."""
    from app.rate_limit import RateLimiter
    # Tạo limiter mới để test độc lập
    limiter = RateLimiter(rate=1/1200.0, burst=3)
    email = 'victim@example.com'
    key = f'reset:{email}'

    results = [limiter.allow(key)[0] for _ in range(4)]
    assert results[:3] == [True, True, True], 'Ba lần đầu phải OK'
    assert results[3] == False, 'Lần thứ 4 phải bị chặn'


# ═══════════════════════════════════════════════════════════
# 6. Token store rate limit per-user
# ═══════════════════════════════════════════════════════════

def test_token_store_rate_limit():
    """1 token/60s per user+purpose."""
    from app.email_service import TokenStore
    store = TokenStore()
    t1 = store.create(42, 'reset')
    assert t1 is not None, 'Lần đầu phải thành công'
    t2 = store.create(42, 'reset')
    assert t2 is None, 'Lần thứ 2 trong 60s phải bị rate limit'


def test_token_store_different_users_independent():
    """Hai user khác nhau không ảnh hưởng nhau."""
    from app.email_service import TokenStore
    store = TokenStore()
    t1 = store.create(1, 'reset')
    t2 = store.create(2, 'reset')  # user khác
    assert t1 is not None
    assert t2 is not None, 'User khác không bị ảnh hưởng rate limit'


def test_token_store_different_purposes_independent():
    """Cùng user nhưng purpose khác không bị block."""
    from app.email_service import TokenStore
    store = TokenStore()
    t1 = store.create(10, 'reset')
    t2 = store.create(10, 'verify')  # purpose khác
    assert t1 is not None
    assert t2 is not None, 'Purpose khác không bị block'


# ═══════════════════════════════════════════════════════════
# 7. Cloudflare IP verification
# ═══════════════════════════════════════════════════════════

def test_cloudflare_ip_detection():
    from app.rate_limit import _is_cloudflare_ip
    # IP trong range Cloudflare
    assert _is_cloudflare_ip('104.16.1.1') is True
    assert _is_cloudflare_ip('172.64.0.1') is True
    # IP không phải Cloudflare
    assert _is_cloudflare_ip('8.8.8.8') is False
    assert _is_cloudflare_ip('192.168.1.1') is False
    assert _is_cloudflare_ip('invalid') is False


# ═══════════════════════════════════════════════════════════
# 8. Audit log rotation
# ═══════════════════════════════════════════════════════════

def test_audit_uses_rotating_handler():
    """audit.py phải dùng RotatingFileHandler, không phải FileHandler thường."""
    import logging.handlers
    from app import audit
    handlers = audit.audit_logger.handlers
    assert any(isinstance(h, logging.handlers.RotatingFileHandler) for h in handlers), \
        'audit_logger phải có RotatingFileHandler'

    # Kiểm tra maxBytes = 10MB
    rh = next(h for h in handlers if isinstance(h, logging.handlers.RotatingFileHandler))
    assert rh.maxBytes == 10 * 1024 * 1024, f'maxBytes phải là 10MB, got {rh.maxBytes}'
    assert rh.backupCount == 10, f'backupCount phải là 10, got {rh.backupCount}'


# ═══════════════════════════════════════════════════════════
# 9. Security headers
# ═══════════════════════════════════════════════════════════

def test_security_headers_include_referrer_policy():
    """audit_middleware phải set Referrer-Policy: no-referrer."""
    setup_main()
    import inspect, app.main as m
    # Headers được set trong audit_middleware, không phải rate_limit_middleware
    src = inspect.getsource(m.audit_middleware)
    assert 'Referrer-Policy' in src, 'Thiếu Referrer-Policy header trong audit_middleware'
    assert 'no-referrer' in src


def test_xframe_options_is_sameorigin():
    """X-Frame-Options phải là SAMEORIGIN."""
    setup_main()
    import inspect, app.main as m
    src = inspect.getsource(m.audit_middleware)
    assert 'SAMEORIGIN' in src, 'X-Frame-Options phải là SAMEORIGIN, không phải DENY'
    assert "'DENY'" not in src and '"DENY"' not in src


# ═══════════════════════════════════════════════════════════
# 10. Anticheat memory cap
# ═══════════════════════════════════════════════════════════

def test_anticheat_hard_cap():
    """Anticheat không vượt quá MAX_COUNT entries."""
    from app.anticheat import AntiCheatEngine, _PROFILE_MAX_COUNT
    ac = AntiCheatEngine()
    # Thêm nhiều hơn giới hạn
    for i in range(_PROFILE_MAX_COUNT + 50):
        ac._profiles[f'game_{i}'] = {}
        ac._created_at[f'game_{i}'] = 0.0  # đặt ts=0 để cleanup dọn ngay

    ac._cleanup()
    assert len(ac._profiles) <= _PROFILE_MAX_COUNT, \
        f'Profiles vượt cap: {len(ac._profiles)} > {_PROFILE_MAX_COUNT}'


def test_anticheat_cleanup_expired():
    """Anticheat dọn profile hết hạn theo thời gian."""
    from app.anticheat import AntiCheatEngine, _PROFILE_MAX_AGE_SECONDS
    import time
    ac = AntiCheatEngine()
    ac._profiles['old_game'] = {1: None, 2: None}
    # Đặt timestamp đủ cũ để bị dọn
    ac._created_at['old_game'] = time.monotonic() - _PROFILE_MAX_AGE_SECONDS - 1
    ac._cleanup()
    assert 'old_game' not in ac._profiles, 'Profile cũ phải bị dọn'
    assert 'old_game' not in ac._created_at


def test_anticheat_end_game_cleans_created_at():
    """end_game() phải xóa cả _created_at."""
    from app.anticheat import AntiCheatEngine
    ac = AntiCheatEngine()
    ac.start_game('g99', 1, 2)
    assert 'g99' in ac._created_at
    ac.end_game('g99')
    assert 'g99' not in ac._profiles
    assert 'g99' not in ac._created_at


# ═══════════════════════════════════════════════════════════
# 11. WebSocket move_data validation (logic check)
# ═══════════════════════════════════════════════════════════

def test_move_data_validation_logic():
    """Kiểm tra điều kiện validate move_data đúng."""
    def is_valid_move_data(move_data):
        return (isinstance(move_data, dict)
                and isinstance(move_data.get('from'), dict)
                and isinstance(move_data.get('to'), dict)
                and 'file' in move_data['from'] and 'rank' in move_data['from']
                and 'file' in move_data['to']   and 'rank' in move_data['to'])

    assert is_valid_move_data({'from': {'file': 4, 'rank': 0}, 'to': {'file': 4, 'rank': 5}})
    assert not is_valid_move_data({})
    assert not is_valid_move_data({'from': 'e2', 'to': 'e4'})  # string thay dict
    assert not is_valid_move_data({'from': {'file': 0}, 'to': {'file': 0, 'rank': 0}})  # thiếu rank
    assert not is_valid_move_data(None)
    assert not is_valid_move_data('invalid')


if __name__ == '__main__':
    # Chạy trực tiếp không cần pytest
    import traceback
    tests = [v for k, v in list(globals().items()) if k.startswith('test_')]
    passed = failed = 0
    for fn in tests:
        try:
            # Bỏ qua test cần monkeypatch khi chạy trực tiếp
            if 'monkeypatch' in fn.__code__.co_varnames:
                print(f'  SKIP (cần monkeypatch): {fn.__name__}')
                continue
            fn()
            print(f'  ✅ {fn.__name__}')
            passed += 1
        except Exception as e:
            print(f'  ❌ {fn.__name__}: {e}')
            traceback.print_exc()
            failed += 1
    print(f'\n{passed} passed, {failed} failed')
