# Cờ Tướng Vương — Deployment Guide

## 📋 Architecture

```
User Browser
    ↓
  HTTPS (port 443)
    ↓
Nginx (reverse proxy, static files, SSL termination)
    ↓
    ├→ / (static frontend from /app/fe)
    ├→ /api/* (FastAPI backend on :8787)
    └→ /ws (WebSocket on :8787)
```

---

## 🚀 Initial Setup on Server (root@62.238.28.106)

### 1. SSH into server
```bash
ssh root@62.238.28.106
```

### 2. Clone repository
```bash
cd /opt/apps
git clone https://github.com/manhdauvn09-manhds/xiangqi.git
cd xiangqi
```

### 3. Create .env file with JWT secret
```bash
cat > .env << EOF
XQ_JWT_SECRET=$(openssl rand -hex 32)
EOF
chmod 600 .env
```

### 4. Build Docker image
```bash
docker build -f Dockerfile.prod -t xiangqi:prod .
```

### 5. Start API container
```bash
docker-compose -f docker-compose-prod.yml up -d
```

### 6. Setup Nginx
```bash
# Copy nginx config
sudo cp nginx-prod.conf /etc/nginx/sites-available/xiangqi.games-core.com

# Enable site
sudo ln -s /etc/nginx/sites-available/xiangqi.games-core.com /etc/nginx/sites-enabled/

# Test config
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### 7. Setup SSL (Let's Encrypt)
```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Generate certificate
sudo certbot certonly --standalone -d xiangqi.games-core.com

# Certbot will auto-renewal via cron
```

### 8. Verify deployment
```bash
curl -I https://xiangqi.games-core.com/
curl https://xiangqi.games-core.com/api/leaderboard
```

---

## 📦 Subsequent Deployments

Use the PowerShell script: `deploy.ps1`

```powershell
.\deploy.ps1 -Deploy
```

This will:
1. Commit all changes to git
2. Push to GitHub
3. SSH to server
4. Pull latest code
5. Rebuild Docker image
6. Restart container
7. Health check

---

## 🔧 Server Commands

### View logs
```bash
docker-compose -f docker-compose-prod.yml logs -f
```

### Restart service
```bash
docker-compose -f docker-compose-prod.yml restart xiangqi-api
```

### Stop service
```bash
docker-compose -f docker-compose-prod.yml down
```

### View database
```bash
sqlite3 /opt/apps/xiangqi/data/xiangqi.db ".tables"
```

---

## 🛡️ Security Checklist

- [x] HTTPS/SSL enabled
- [x] CORS restricted to xiangqi.games-core.com
- [x] API only on localhost:8787 (nginx proxy)
- [x] JWT secret fixed in .env (not random)
- [x] Security headers in nginx config
- [x] Static files cached (30 days)
- [ ] Rate limiting enabled (see app/main.py)
- [ ] Email verification enabled (if applicable)
- [ ] Database backups automated

---

## 📝 Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `XQ_PORT` | 8787 | API port |
| `XQ_DB_PATH` | /data/xiangqi.db | SQLite location |
| `XQ_JWT_SECRET` | random | JWT signing key (⚠️ set this!) |
| `CORS_ORIGINS` | https://xiangqi.games-core.com | Allowed origins |

---

## 🔄 Auto-Renewal Setup

### SSL certificate auto-renewal
```bash
# Certbot already handles this via systemd timer
sudo systemctl status certbot.timer
```

### Database backups (optional)
```bash
# Add to crontab
0 2 * * * docker exec xiangqi-api sqlite3 /data/xiangqi.db ".dump" > /backups/xiangqi-$(date +\%Y\%m\%d).sql
```

---

## 🆘 Troubleshooting

### Nginx not serving frontend
```bash
sudo systemctl reload nginx
sudo tail -f /var/log/nginx/error.log
```

### API connection refused
```bash
docker-compose -f docker-compose-prod.yml logs xiangqi-api
curl http://localhost:8787/api/leaderboard
```

### SSL certificate expired
```bash
sudo certbot renew --force-renewal
```

---

## 📞 Monitoring

### Health check endpoint
```bash
curl https://xiangqi.games-core.com/api/leaderboard
```

### Docker health
```bash
docker ps --format "table {{.Names}}\t{{.Status}}"
```

---

**Deployment ready! 🚀**
