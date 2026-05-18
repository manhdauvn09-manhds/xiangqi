"""Cờ Tướng Vương — backend entry point.

Dev: On first run, generates `.env.local.jwt-secret` for consistent tokens across restarts.
Prod: Set XQ_JWT_SECRET environment variable (required).

WebSocket Configuration:
- ws_max_size: Maximum message size in bytes (default 16KB, configurable via XQ_WS_MAX_SIZE)
- Oversized messages cause connection closure with code 4002
"""
import os
import uvicorn

if __name__ == '__main__':
    port = int(os.getenv('XQ_PORT', '8787'))
    # Production: disable reload, set to False
    # Dev: set env var XQ_RELOAD=true to enable reload
    reload = os.getenv('XQ_RELOAD', '').lower() == 'true'

    # WebSocket message size limit (default 16KB, configurable via env var)
    # Prevents memory exhaustion attacks by limiting buffered message size
    ws_max_size = int(os.getenv('XQ_WS_MAX_SIZE', '16384'))  # 16 KB default

    uvicorn.run(
        'app.main:app',
        host='0.0.0.0',
        port=port,
        reload=reload,
        timeout_keep_alive=30,
        ws_max_size=ws_max_size,  # Enforce at transport level
    )
