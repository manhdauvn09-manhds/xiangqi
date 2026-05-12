"""HTTP client with security settings (timeouts, limits)."""
import httpx

# Global timeout configuration (seconds)
DEFAULT_TIMEOUT = httpx.Timeout(
    timeout=30.0,  # Total request timeout
    connect=10.0,  # Connection establishment
    read=30.0,     # Reading response
    write=10.0,    # Writing request
)

# Limits for large requests
LIMITS = httpx.Limits(
    max_connections=100,
    max_keepalive_connections=20,
)


def get_client() -> httpx.Client:
    """Get an httpx client with timeout and limits."""
    return httpx.Client(timeout=DEFAULT_TIMEOUT, limits=LIMITS)


async def get_async_client() -> httpx.AsyncClient:
    """Get an async httpx client with timeout and limits."""
    return httpx.AsyncClient(timeout=DEFAULT_TIMEOUT, limits=LIMITS)
