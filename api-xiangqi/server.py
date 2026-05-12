"""Cờ Tướng Vương — backend entry point."""
import os
import uvicorn

if __name__ == '__main__':
    port = int(os.getenv('XQ_PORT', '8787'))
    # Production: disable reload, set to False
    # Dev: set env var XQ_RELOAD=true to enable reload
    reload = os.getenv('XQ_RELOAD', '').lower() == 'true'
    uvicorn.run('app.main:app', host='0.0.0.0', port=port, reload=reload, timeout_keep_alive=30)
