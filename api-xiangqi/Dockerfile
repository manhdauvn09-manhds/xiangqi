# Cờ Tướng Vương — Production Dockerfile
# Multi-stage build for minimal image size

FROM python:3.12-slim AS base

WORKDIR /app

# Install system deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for layer caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create data directory for SQLite
RUN mkdir -p /app/data

# Non-root user
RUN useradd -m -s /bin/bash appuser && chown -R appuser:appuser /app
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8787/healthz || exit 1

EXPOSE 8787

# Environment variables (override in docker-compose or k8s)
ENV XQ_DB_PATH=/app/data/xiangqi.db
ENV CORS_ORIGINS=*
ENV XQ_JWT_SECRET=change-me-in-production

CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8787"]
