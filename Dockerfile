# Multi-stage build for Cờ Tướng Vương

# ============= Stage 1: API Backend =============
FROM python:3.11-slim AS api-builder

WORKDIR /app/api

# Copy requirements
COPY api-xiangqi/requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy API source
COPY api-xiangqi/ .

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD python -c "import requests; requests.get('http://localhost:8787/api/leaderboard', timeout=5)"

# ============= Stage 2: Frontend (static) =============
FROM node:20-alpine AS fe-builder

WORKDIR /app/fe

# Copy frontend (no build needed for vanilla JS)
COPY xiangqi/ .

# ============= Stage 3: Runtime =============
FROM python:3.11-slim

# Install curl for health checks
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

# Setup API
WORKDIR /app/api
COPY --from=api-builder /app/api /app/api
RUN pip install --no-cache-dir -r requirements.txt

# Setup Frontend
WORKDIR /app/fe
COPY --from=fe-builder /app/fe /app/fe

# Expose ports
EXPOSE 8787 5500

# Set env defaults
ENV XQ_PORT=8787 \
    XQ_DB_PATH=/data/xiangqi.db \
    CORS_ORIGINS=* \
    PYTHONUNBUFFERED=1

# Create data volume
RUN mkdir -p /data

# Default: run both services
WORKDIR /app
COPY entrypoint.sh /app/
RUN chmod +x /app/entrypoint.sh

ENTRYPOINT ["/app/entrypoint.sh"]
