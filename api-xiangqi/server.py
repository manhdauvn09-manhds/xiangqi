"""Cờ Tướng Vương — backend entry point."""
import os
import uvicorn

if __name__ == '__main__':
    port = int(os.getenv('XQ_PORT', '8787'))
    uvicorn.run('app.main:app', host='0.0.0.0', port=port, reload=True)
