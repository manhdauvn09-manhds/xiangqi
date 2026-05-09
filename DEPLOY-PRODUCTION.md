# 🌍 Production Deployment Guide — xiangqi.games-core.com

## 📊 Server Architecture

Your production server (`root@62.238.28.106`) has an **existing Nginx setup** serving multiple domains:
- `zerocodefee.com` (Next.js on :3000)
- `minigames.allin1site.com` (Next.js on :3333)
- `allin1site.com` (Next.js on :3001)
- **xiangqi.games-core.com** ← NEW (Docker containers)

**Nginx handles SSL/TLS termination for all domains on shared ports 80/443.**

---

## 🏗️ Current Infrastructure

```
┌─ DOCKER CONTAINERS (Internal, localhost-only) ─────────┐
│                                                         │
│  xiangqi-api          xiangqi-frontend                │
│  :8787 (FastAPI)      :5500 (HTTP static)             │
│                                                         │
└─────────────────────────────────────────────────────────┘
         ↑                    ↑
         └────────┬──────────┘
                  │
        ┌─────────▼─────────┐
        │    Nginx (Host)   │
        │  Reverse Proxy    │
        │  :80/:443 (SSL)   │
        └────────┬──────────┘
                 │
    ┌────────────┴──────────────┐
    ↓                           ↓
Browser                   https://xiangqi.games-core.com
https://xiangqi.games-core.com/api
https://xiangqi.games-core.com/ws
```

---

## 🚀 Deployment Steps

### Step 1: First-Time Setup (One-time)

```powershell
cd E:\SourceCode\GAMES\xiangqi
.\deploy.ps1 -FirstSetup
```

**What happens:**
1. ✅ SSH to server
2. ✅ Clone git repo to `/opt/apps/xiangqi`
3. ✅ Generate JWT secret in `.env`
4. ✅ Build Docker image `xiangqi:prod`
5. ✅ Start 2 containers:
   - `xiangqi-api` (FastAPI on :8787)
   - `xiangqi-frontend` (HTTP server on :5500)
6. ✅ Copy Nginx config to `/etc/nginx/sites-available/xiangqi.games-core.com`
7. ✅ Enable site with symlink
8. ✅ Setup SSL certificate with Certbot

**After completion:**
- Check: `https://xiangqi.games-core.com` (should load)
- Check: `https://xiangqi.games-core.com/api/leaderboard` (should return JSON)

---

### Step 2: Deploy Changes (Repeat as needed)

```powershell
.\deploy.ps1 -Deploy
```

**Workflow:**
1. Commits all changes to git
2. Pushes to GitHub (`main` branch)
3. SSHes to server
4. `git pull` latest code
5. Rebuilds Docker image
6. Restarts containers
7. Health checks pass ✅
8. Live at `https://xiangqi.games-core.com`

---

### Step 3: Monitor Deployment

```powershell
.\deploy.ps1 -Status
```

Shows:
- Container status
- Recent logs
- API health check

---

## 🔧 Manual Server Operations

### SSH to Server

```bash
ssh root@62.238.28.106
cd /opt/apps/xiangqi
```

### View Logs

```bash
# API logs
docker logs xiangqi-api -f

# Frontend logs
docker logs xiangqi-frontend -f

# Nginx access logs
tail -f /var/log/nginx/xiangqi.games-core.com.access.log

# Nginx error logs
tail -f /var/log/nginx/xiangqi.games-core.com.error.log
```

### Container Management

```bash
# View running containers
docker ps

# View all containers
docker ps -a

# Restart containers
docker-compose -f docker-compose-prod.yml restart

# Stop containers (keep data)
docker-compose -f docker-compose-prod.yml down

# Start containers
docker-compose -f docker-compose-prod.yml up -d

# Full restart (clean)
docker-compose -f docker-compose-prod.yml down
docker-compose -f docker-compose-prod.yml up -d
```

### Nginx Management

```bash
# Test Nginx config
nginx -t

# Reload Nginx (apply config changes)
systemctl reload nginx

# Restart Nginx
systemctl restart nginx

# View Nginx status
systemctl status nginx

# View Nginx config
cat /etc/nginx/sites-available/xiangqi.games-core.com

# View Nginx enabled sites
ls -la /etc/nginx/sites-enabled/
```

### SSL Certificate Management

```bash
# View certificate info
certbot certificates

# Renew certificate (manual)
certbot renew

# View certificate expiry
openssl x509 -in /etc/letsencrypt/live/xiangqi.games-core.com/fullchain.pem -noout -dates

# Certbot auto-renewal is enabled via systemd timer
systemctl status certbot.timer
```

### Database

```bash
# Connect to SQLite
sqlite3 /opt/apps/xiangqi/data/xiangqi.db

# In sqlite3:
.tables                          # List tables
SELECT COUNT(*) FROM users;      # Count users
.dump                            # Dump all data
.exit                            # Exit

# Backup database
sqlite3 /opt/apps/xiangqi/data/xiangqi.db ".dump" > xiangqi-backup-$(date +%Y%m%d).sql
```

---

## 📋 Port Mapping Reference

| Service | Internal Port | External | Notes |
|---------|---------------|----------|-------|
| API | :8787 | Nginx → HTTPS | FastAPI backend |
| Frontend | :5500 | Nginx → HTTPS | Static HTTP server |
| Nginx | 80, 443 | Public | Reverse proxy, SSL/TLS |

**All internal ports are `localhost`-only. Nginx handles all external traffic.**

---

## 🔐 SSL Certificate Details

### Current Status
```bash
ssh root@62.238.28.106
certbot certificates
```

Expected output:
```
xiangqi.games-core.com
  Path: /etc/letsencrypt/live/xiangqi.games-core.com
  Expiry: (date in ~89 days)
```

### Auto-Renewal
- Certbot timer runs daily
- Certs auto-renew 30 days before expiry
- Nginx auto-reloads after renewal

### Manual Renewal
```bash
certbot renew
# Then reload nginx:
systemctl reload nginx
```

---

## 🆘 Troubleshooting

### API not responding

```bash
ssh root@62.238.28.106

# Check API container
docker logs xiangqi-api

# Test API internally
curl http://localhost:8787/api/leaderboard

# Check Nginx proxy
curl https://xiangqi.games-core.com/api/leaderboard
```

### Frontend not loading

```bash
# Check frontend container
docker logs xiangqi-frontend

# Test internally
curl http://localhost:5500

# Check Nginx logs
tail -f /var/log/nginx/xiangqi.games-core.com.error.log
```

### Nginx not proxying

```bash
# Check Nginx config
nginx -t

# If config OK, reload:
systemctl reload nginx

# View config:
cat /etc/nginx/sites-available/xiangqi.games-core.com
```

### SSL certificate issues

```bash
# Check certificate
openssl x509 -in /etc/letsencrypt/live/xiangqi.games-core.com/fullchain.pem -noout -dates

# If expired or missing:
certbot certonly -d xiangqi.games-core.com

# Then reload nginx:
systemctl reload nginx
```

### Container won't start

```bash
# Check error messages
docker-compose -f docker-compose-prod.yml logs

# Try full restart
docker-compose -f docker-compose-prod.yml down
docker-compose -f docker-compose-prod.yml up -d

# Check Docker daemon
docker ps
```

---

## 📊 Health Check Endpoints

Test these to verify deployment:

```bash
# API leaderboard (always available)
curl https://xiangqi.games-core.com/api/leaderboard

# Frontend homepage
curl https://xiangqi.games-core.com/

# From local PC
.\deploy.ps1 -Status
```

Expected responses:
- API: HTTP 200, JSON response
- Frontend: HTTP 200, HTML page
- Status: Shows container health + logs

---

## 🔄 Git & Version Control

### View deployment history

```bash
cd /opt/apps/xiangqi
git log --oneline -10
```

### Rollback to previous version

```bash
cd /opt/apps/xiangqi

# Find commit to revert to
git log --oneline

# Revert
git revert <commit-hash>
git push origin main

# Then redeploy
cd /home/user/path/to/local/xiangqi
.\deploy.ps1 -Deploy
```

### Check what changed

```bash
cd /opt/apps/xiangqi
git diff HEAD~1 HEAD
git show <commit-hash>
```

---

## 📈 Monitoring

### Disk Space

```bash
df -h /opt/apps/xiangqi
du -sh /opt/apps/xiangqi
```

### Container Resource Usage

```bash
docker stats
```

### Database Size

```bash
ls -lh /opt/apps/xiangqi/data/xiangqi.db
```

### Logs Size

```bash
du -sh /var/log/nginx/
du -sh /opt/apps/xiangqi/xiangqi-logs/
```

---

## 🛡️ Security Checklist

- [x] SSL/TLS enabled (Let's Encrypt)
- [x] CORS restricted to domain
- [x] JWT secret stored in `.env` (not in code)
- [x] API only on localhost (Nginx proxies)
- [x] Security headers configured in Nginx
- [x] Rate limiting configured in API
- [ ] Database backups automated (optional)
- [ ] Log rotation configured (optional)
- [ ] Firewall rules in place (optional)

---

## 📞 Support

### Common Issues

| Issue | Solution |
|-------|----------|
| API timeout | Check `docker logs xiangqi-api` |
| Frontend blank | Check `docker logs xiangqi-frontend` |
| 502 Bad Gateway | Nginx can't reach container, check localhost:8787 |
| 404 Not Found | Frontend routing issue, check Nginx config |
| SSL cert expired | `certbot renew` + `systemctl reload nginx` |
| Container won't restart | Check disk space: `df -h` |

---

**Production deployment is fully automated via `.\deploy.ps1`**

All infrastructure changes go through git → GitHub → server pull → rebuild → verify.

Enjoy your live xiangqi.games-core.com! 🚀
