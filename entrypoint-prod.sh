#!/bin/bash
# Cờ Tướng Vương — Production API-only entrypoint
# (Frontend served via nginx reverse proxy on host)

set -e

echo "[xiangqi] Starting API backend..."
cd /app/api

# Run with gunicorn for production (better than uvicorn alone)
exec python server.py
