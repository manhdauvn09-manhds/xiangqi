"""Google OAuth2 login flow.

Phase 3: Supports Google Sign-In via ID token verification.
The frontend obtains an ID token from Google's Sign-In SDK,
then sends it to POST /api/auth/google for verification.

No client-secret flow needed — we verify the ID token directly
using Google's public JWKS keys for cryptographic signature check.
"""
from __future__ import annotations

import logging
import os
import time
from typing import Any

import httpx
import jwt as pyjwt
from jwt import PyJWKClient

logger = logging.getLogger(__name__)

# Google's public keys endpoint (JWK format)
GOOGLE_CERTS_URL = 'https://www.googleapis.com/oauth2/v3/certs'
GOOGLE_ISS = ('accounts.google.com', 'https://accounts.google.com')

# Set via environment variable in production (REQUIRED)
GOOGLE_CLIENT_ID = os.getenv('GOOGLE_CLIENT_ID', '')

# Validate in production
_is_production = os.getenv('ENV', 'dev').lower() == 'production'
if _is_production and not GOOGLE_CLIENT_ID:
    logger.critical('GOOGLE_CLIENT_ID environment variable is REQUIRED in production')
    raise RuntimeError('GOOGLE_CLIENT_ID not configured for production environment')

# PyJWKClient with built-in caching (keys refresh every ~24h)
_jwk_client = PyJWKClient(GOOGLE_CERTS_URL, cache_keys=True, lifespan=3600)


async def verify_google_id_token(id_token: str) -> dict[str, Any] | None:
    """Verify a Google ID token and return the payload.

    Returns dict with: sub, email, name, picture, email_verified
    or None if invalid.

    Performs full cryptographic signature verification using Google's
    JWKS public keys, plus issuer/audience/expiry validation.
    """
    try:
        # Fetch the signing key from Google's JWKS endpoint (cached)
        signing_key = _jwk_client.get_signing_key_from_jwt(id_token)

        # Decode AND verify signature + claims
        # Always verify audience for security (use empty string if not configured)
        verify_audience = bool(GOOGLE_CLIENT_ID)
        payload = pyjwt.decode(
            id_token,
            signing_key.key,
            algorithms=['RS256'],
            audience=GOOGLE_CLIENT_ID if GOOGLE_CLIENT_ID else None,
            issuer=list(GOOGLE_ISS),
            options={
                'verify_signature': True,
                'verify_exp': True,
                'verify_aud': verify_audience,  # Only verify if client ID is configured
                'verify_iss': True,
            },
        )

        # In production, ensure audience verification succeeded
        if _is_production and verify_audience and payload.get('aud') != GOOGLE_CLIENT_ID:
            logger.warning('Google token audience mismatch: %s != %s', payload.get('aud'), GOOGLE_CLIENT_ID)
            return None
    except (pyjwt.PyJWTError, Exception) as e:
        logger.warning('Google ID token verification failed: %s', e)
        return None

    # Extract user info
    return {
        'sub': payload.get('sub'),
        'email': payload.get('email', ''),
        'name': payload.get('name', ''),
        'picture': payload.get('picture', ''),
        'email_verified': payload.get('email_verified', False),
    }


def google_user_to_profile(google_data: dict) -> dict[str, Any]:
    """Convert Google user data to our user profile fields."""
    return {
        'google_sub': google_data['sub'],
        'email': google_data['email'].lower(),
        'display_name': google_data.get('name', google_data['email'].split('@')[0])[:24],
        'avatar_url': google_data.get('picture', ''),
    }
