"""Audit logging — track all API actions for security."""
import json
import logging
import time
from datetime import datetime
from typing import Any

# Setup audit logger with file rotation
audit_logger = logging.getLogger('audit')
audit_logger.setLevel(logging.INFO)

# Create handler with timestamp
handler = logging.FileHandler('data/audit.log')
formatter = logging.Formatter(
    '%(asctime)s | %(levelname)s | %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
handler.setFormatter(formatter)
audit_logger.addHandler(handler)


def log_auth(action: str, email: str, success: bool, ip: str, details: str = ''):
    """Log authentication attempt."""
    result = 'SUCCESS' if success else 'FAILED'
    msg = f'AUTH [{result}] {action} | email={email} | ip={ip}'
    if details:
        msg += f' | {details}'
    audit_logger.info(msg)


def log_api_call(user_id: int | None, method: str, path: str, status: int, ip: str, response_time_ms: float):
    """Log API call."""
    user_str = f'user_id={user_id}' if user_id else 'anonymous'
    msg = f'API {method} {path} | {status} | {user_str} | ip={ip} | {response_time_ms:.1f}ms'
    audit_logger.info(msg)


def log_game_action(user_id: int, action: str, game_id: str, details: str = ''):
    """Log game actions (move, join, leave, etc)."""
    msg = f'GAME {action} | user_id={user_id} | game_id={game_id}'
    if details:
        msg += f' | {details}'
    audit_logger.info(msg)


def log_security_event(event_type: str, user_id: int | None, details: str):
    """Log security events (rate limit, invalid token, etc)."""
    user_str = f'user_id={user_id}' if user_id else 'unknown'
    msg = f'SECURITY [{event_type}] {user_str} | {details}'
    audit_logger.warning(msg)


def log_database_error(query: str, error: str):
    """Log database errors."""
    msg = f'DB_ERROR | query={query[:60]} | error={error}'
    audit_logger.error(msg)
