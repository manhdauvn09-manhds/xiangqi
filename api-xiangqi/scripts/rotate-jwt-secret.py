#!/usr/bin/env python3
"""
JWT Secret Rotation Script
Run monthly: 0 2 1 * * python3 /path/to/rotate-jwt-secret.py

Rotates JWT secret and stores old keys for token validation grace period.
"""
import os
import secrets
import json
from datetime import datetime, timedelta
from pathlib import Path

SECRETS_FILE = Path('/app/data/jwt-secrets.json')
KEY_TTL_DAYS = 7  # Keep old keys for 7 days to allow token validation

def rotate_secret():
    """Rotate JWT secret and manage old keys."""

    # Load existing secrets
    secrets_data = {}
    if SECRETS_FILE.exists():
        with open(SECRETS_FILE, 'r') as f:
            secrets_data = json.load(f)

    # Generate new secret
    new_secret = secrets.token_hex(32)
    now = datetime.now().isoformat()

    # Rotate: current → previous, new → current
    if 'current' in secrets_data:
        secrets_data['previous'] = {
            'secret': secrets_data['current']['secret'],
            'created_at': secrets_data['current']['created_at'],
            'expires_at': (datetime.now() + timedelta(days=KEY_TTL_DAYS)).isoformat()
        }

    secrets_data['current'] = {
        'secret': new_secret,
        'created_at': now,
        'expires_at': (datetime.now() + timedelta(days=30)).isoformat()
    }

    # Clean up expired keys
    if 'previous' in secrets_data:
        if datetime.fromisoformat(secrets_data['previous']['expires_at']) < datetime.now():
            del secrets_data['previous']

    # Save securely
    SECRETS_FILE.write_text(json.dumps(secrets_data, indent=2))
    SECRETS_FILE.chmod(0o600)  # Read/write owner only

    print(f"✓ JWT Secret rotated at {now}")
    print(f"  Current:  {new_secret[:8]}...{new_secret[-8:]}")
    print(f"  Valid until: {secrets_data['current']['expires_at']}")

    # Log rotation
    with open('/app/data/audit.log', 'a') as log:
        log.write(f"{now} | WARNING | JWT_ROTATION | new_secret={new_secret[:8]}... | grace_period={KEY_TTL_DAYS}d\n")

if __name__ == '__main__':
    try:
        rotate_secret()
    except Exception as e:
        print(f"✗ Rotation failed: {e}")
        exit(1)
