#!/bin/bash
# Cờ Tướng Vương — Multi-service entrypoint

set -e

echo "[xiangqi] Starting services..."

# Start API backend in background
echo "[xiangqi] Starting FastAPI backend on :8787..."
cd /app/api
python server.py &
API_PID=$!

# Wait for API to be ready
echo "[xiangqi] Waiting for API to be ready..."
for i in {1..30}; do
  if curl -sf http://localhost:8787/api/leaderboard > /dev/null 2>&1; then
    echo "[xiangqi] API is ready!"
    break
  fi
  echo "[xiangqi] Attempt $i/30..."
  sleep 1
done

# Start frontend static server
echo "[xiangqi] Starting frontend on :5500..."
cd /app/fe
python -m http.server 5500 --bind 0.0.0.0 &
FE_PID=$!

echo ""
echo "╔════════════════════════════════════════╗"
echo "║  Cờ Tướng Vương — Docker Running       ║"
echo "║  🎮 Frontend:  http://localhost:5500   ║"
echo "║  🔧 API:       http://localhost:8787   ║"
echo "║  ⚡ WebSocket: ws://localhost:8787/ws  ║"
echo "╚════════════════════════════════════════╝"
echo ""

# Wait for signals
trap 'kill $API_PID $FE_PID 2>/dev/null' SIGTERM SIGINT
wait $API_PID $FE_PID
