# Phase 1 Deployment Guide

## Tóm Tắt
Phase 1 infrastructure hoàn thành và ready to deploy. Code đã được commit trên branch `feature/phase1-100x-improvement`.

## Bước Deploy (Manual SSH)

### 1. SSH vào server
```bash
ssh root@62.238.28.106
cd /opt/apps/xiangqi
```

### 2. Fetch latest code từ feature branch
```bash
git fetch origin feature/phase1-100x-improvement
git checkout feature/phase1-100x-improvement
git pull origin feature/phase1-100x-improvement
```

### 3. Build Docker image (Phase 1)
```bash
docker build -f Dockerfile.phase1 -t xiangqi:phase1 .
```

Lưu ý: Image size ~500MB, build time ~2-3 phút

### 4. Stop old container (nếu có)
```bash
docker stop xiangqi-api 2>/dev/null || true
docker rm xiangqi-api 2>/dev/null || true
```

### 5. Run new container
```bash
docker run -d \
  --name xiangqi-api \
  --restart always \
  -p 127.0.0.1:8787:8787 \
  -v xiangqi-data:/data \
  -e XQ_PORT=8787 \
  -e XQ_DB_PATH=/data/xiangqi.db \
  -e CORS_ORIGINS=https://xiangqi.games-core.com \
  -e PYTHONUNBUFFERED=1 \
  xiangqi:phase1
```

### 6. Verify deployment
```bash
# Wait 5 seconds for startup
sleep 5

# Check health
curl -s http://localhost:8787/api/health | jq .

# Check Web Vitals endpoint
curl -s http://localhost:8787/api/metrics/web-vitals/batch -X POST \
  -H "Content-Type: application/json" \
  -d '{"metrics": [], "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"}' | jq .

# Check SEO endpoint (will fallback if no player in DB)
curl -s http://localhost:8787/api/seo/player/1 | jq .
```

### 7. Restart Nginx (if needed)
```bash
systemctl reload nginx
```

## Phase 1 Components Deployed

| Component | Status | Purpose |
|-----------|--------|---------|
| **Frontend Build** | ✅ | Vite bundling (419KB gzip) |
| **SEO Meta Injection** | ✅ | Dynamic OG tags for players/games |
| **Web Vitals Collection** | ✅ | Performance monitoring (LCP, CLS, FID) |
| **Sentry Tracking** | ✅ | Error tracking (production only) |
| **WCAG Accessibility** | ✅ | Keyboard nav, screen readers |
| **API Endpoints** | ✅ | `/api/seo/*`, `/api/metrics/*` |

## Health Checks

After deployment, verify:

1. **Frontend loads**: `https://xiangqi.games-core.com/`
2. **API health**: `curl https://xiangqi.games-core.com/api/health`
3. **SEO meta tags**: Check `<meta property="og:title">` in page source
4. **Metrics endpoint**: POST to `/api/metrics/web-vitals/batch`

## Rollback (if needed)

```bash
# Revert to main branch
git checkout main
git pull origin main

# Rebuild with main
docker build -f Dockerfile.prod -t xiangqi:prod .

# Restart container
docker stop xiangqi-api
docker run -d --name xiangqi-api ... xiangqi:prod
```

## Performance Metrics to Monitor

After deployment, Phase 1 should provide:

- **Bundle Size**: 419KB → 129KB gzip (-70%)
- **LCP**: Monitor via `/api/metrics/dashboard`
- **CLS**: Real-time from Web Vitals collection
- **SEO**: Dynamic cards for player profiles, games
- **Accessibility**: WCAG 2.1 AA compliance (keyboard nav, screen readers)

## Troubleshooting

### Docker build fails
```bash
docker system prune -a  # Clean old images
docker build -f Dockerfile.phase1 -t xiangqi:phase1 .
```

### Port 8787 already in use
```bash
lsof -i :8787
kill -9 <PID>
```

### Database locked
SQLite WAL mode handles concurrent access. If issues:
```bash
docker exec xiangqi-api rm /data/xiangqi.db-shm /data/xiangqi.db-wal
```

## Next Steps

1. ✅ Deploy Phase 1 infrastructure
2. ⏳ Monitor Web Vitals for 24-48 hours
3. ⏳ Verify SEO cards work on social media
4. ⏳ Measure improvements vs baseline
5. ⏳ Plan Phase 2 (advanced features, optimizations)

---

**Status**: Ready for deployment
**Branch**: `feature/phase1-100x-improvement`
**Last Updated**: 2026-06-20
