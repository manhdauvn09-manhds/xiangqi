# 🚀 Cờ Tướng Vương — Complete Setup Guide

## 📋 Overview

This guide covers:
1. ✅ Local development setup
2. ✅ Production server setup  
3. ✅ Automated deployment workflow
4. ✅ Git + Docker integration

---

## 🎯 Architecture

```
┌─────────────────────────────────────────────┐
│  Your Local PC (Windows 11)                 │
│  ├─ PowerShell scripts (build.ps1, deploy.ps1)
│  ├─ Docker Desktop
│  └─ Git / GitHub
└──────────────┬──────────────────────────────┘
               │ git push
               ↓
┌─────────────────────────────────────────────┐
│  GitHub (manhdauvn09-manhds/xiangqi)        │
└──────────────┬──────────────────────────────┘
               │ deploy.ps1 -Deploy (pulls + builds)
               ↓
┌──────────────────────────────────────────────┐
│  Production Server (root@62.238.28.106)      │
│  ├─ Docker container (xiangqi:prod)          │
│  ├─ FastAPI on :8787 (internal)              │
│  ├─ Nginx reverse proxy (port 443 SSL)       │
│  └─ SQLite database (/data/xiangqi.db)       │
└──────────────────────────────────────────────┘
               │
               ↓ HTTPS
┌──────────────────────────────────────────────┐
│  https://xiangqi.games-core.com              │
│  (frontend + API + WebSocket)                │
└──────────────────────────────────────────────┘
```

---

## 💻 Local Development

### Prerequisites

```powershell
# Check requirements
docker --version           # Docker Desktop (Windows 11 + WSL2)
git --version              # Git for Windows
pwsh --version             # PowerShell 7+
```

### Quick Start (5 minutes)

```powershell
cd E:\SourceCode\GAMES\xiangqi
.\build.ps1                # Builds and runs everything
```

**Access:**
- 🎮 Frontend: http://localhost:5500
- 🔧 API: http://localhost:8787  
- ⚡ WebSocket: ws://localhost:8787/ws

### Development Workflow

```powershell
# 1. Start services
.\build.ps1 -Run

# 2. Make code changes (edit files in xiangqi/ or api-xiangqi/)

# 3. Reload frontend (browser F5)
# 3. Restart API (Ctrl+C in terminal, then run again)

# 4. View logs
.\build.ps1 -Logs

# 5. Stop when done
.\build.ps1 -Stop
```

---

## 🌍 Production Deployment

### Step 1: First-Time Server Setup (Do Once)

This creates the entire infrastructure on your server:

```powershell
.\deploy.ps1 -FirstSetup
```

**What happens:**
1. SSH connects to root@62.238.28.106
2. Clones git repo to `/opt/apps/xiangqi`
3. Generates random JWT secret in `.env`
4. Builds Docker image (`xiangqi:prod`)
5. Starts API container
6. Configures Nginx reverse proxy
7. Sets up SSL with Let's Encrypt

**Check status after:**
```bash
# SSH to server manually
ssh root@62.238.28.106

# View container
docker ps

# Test API
curl http://localhost:8787/api/leaderboard
```

---

### Step 2: Subsequent Deployments

Every time you want to deploy changes:

```powershell
.\deploy.ps1 -Deploy
```

**Workflow:**
```
Local PC
  ├─ Commit all changes to git
  ├─ Push to GitHub (manhdauvn09-manhds/xiangqi)
  │
  └─ SSH to production server
     ├─ Git pull latest code
     ├─ Build new Docker image
     ├─ Restart container
     └─ Health check
```

**After deployment:**
- ✅ Live at https://xiangqi.games-core.com
- ✅ New code running
- ✅ Database persisted

---

## 📦 File Structure

```
xiangqi/
├── 🎮 Frontend
│   └── xiangqi/
│       ├── index.html          ← Meta tag sets API: https://xiangqi.games-core.com/api
│       ├── scripts/            ← JS modules (board, AI, API client, UI)
│       └── styles/             ← CSS (responsive, dark/light theme)
│
├── 🔧 Backend
│   └── api-xiangqi/
│       ├── app/main.py         ← FastAPI routes
│       ├── app/db.py           ← SQLite database
│       ├── app/auth.py         ← JWT authentication
│       ├── app/xiangqi_engine.py ← Game logic
│       └── requirements.txt
│
├── 🐳 Docker
│   ├── Dockerfile              ← Local dev image (includes both FE + API)
│   ├── Dockerfile.prod         ← Production image (API only, FE served by nginx)
│   ├── docker-compose.yml      ← Local services
│   ├── docker-compose-prod.yml ← Production services
│   ├── entrypoint.sh           ← Dev startup script
│   ├── entrypoint-prod.sh      ← Prod startup script
│   └── nginx-prod.conf         ← Nginx reverse proxy config
│
├── 🚀 Deployment Scripts (PowerShell)
│   ├── build.ps1               ← Local: ./build.ps1 (no flags = build+run)
│   └── deploy.ps1              ← Production: .\deploy.ps1 -Deploy
│
├── 📖 Documentation
│   ├── README.md               ← Project overview
│   ├── BUILD_GUIDE.md          ← Local development
│   ├── DEPLOY.md               ← Server operations
│   ├── SETUP.md                ← This file
│   └── .env.example            ← Environment template
│
└── 🔒 Configuration
    ├── .gitignore              ← Files not tracked by git
    ├── .env                    ← Local env vars (git-ignored)
    └── (on server: /opt/apps/xiangqi/.env)
```

---

## 🔐 Environment Variables

### Local Development (`.env`)
```bash
XQ_PORT=8787
XQ_DB_PATH=./data/xiangqi.db
CORS_ORIGINS=*                           # Allow all for dev
PYTHONUNBUFFERED=1
```

### Production (on server in `/opt/apps/xiangqi/.env`)
```bash
XQ_PORT=8787
XQ_DB_PATH=/data/xiangqi.db
XQ_JWT_SECRET=<random 64-hex from -FirstSetup>
CORS_ORIGINS=https://xiangqi.games-core.com
PYTHONUNBUFFERED=1
```

---

## 🔌 API Connection Configuration

### Frontend → API (Local vs Production)

**Local (`xiangqi/index.html`):**
```html
<meta name="xq-api-base" content="http://127.0.0.1:8787">
```

**Production (`xiangqi/index.html`):**
```html
<meta name="xq-api-base" content="https://xiangqi.games-core.com/api">
```

✅ **Already configured** for production. Frontend automatically detects from meta tag.

---

## 🛠️ PowerShell Commands

### Local Development

```powershell
cd E:\SourceCode\GAMES\xiangqi

# Build + Run (default, all-in-one)
.\build.ps1

# Just build
.\build.ps1 -Build

# Just start (after already built)
.\build.ps1 -Run

# Stop services
.\build.ps1 -Stop

# View logs
.\build.ps1 -Logs

# Clean up (remove images + containers)
.\build.ps1 -Clean
```

### Production Deployment

```powershell
cd E:\SourceCode\GAMES\xiangqi

# First time only: Set up entire server infrastructure
.\deploy.ps1 -FirstSetup

# Every deploy: Commit + Push + Pull + Build + Restart
.\deploy.ps1 -Deploy

# Test build locally first
.\deploy.ps1 -BuildLocal

# Check server status
.\deploy.ps1 -Status
```

---

## 🔄 Git Workflow

### Local Commits

All changes are tracked automatically:

```powershell
# Option 1: Automatic via deploy.ps1
.\deploy.ps1 -Deploy       # Auto-commits with timestamp

# Option 2: Manual
git add .
git commit -m "Your message"
git push origin main
```

### Viewing History

```bash
git log --oneline         # Last 10 commits
git log -p -- xiangqi/    # Changes to frontend
git log -p -- api-xiangqi/  # Changes to API
```

---

## 🧪 Testing & Verification

### Local Testing

```powershell
# After .\build.ps1
curl http://localhost:8787/api/leaderboard
# Should return HTTP 200
```

### Production Testing

```powershell
.\deploy.ps1 -Status
# Checks:
# - SSH connectivity
# - Docker container status
# - API health (https://xiangqi.games-core.com/api/leaderboard)
```

### Manual Server Tests

```bash
# SSH to server
ssh root@62.238.28.106

# View API logs
docker logs xiangqi-api -f

# Test API internally
curl http://localhost:8787/api/leaderboard

# Test via Nginx
curl https://xiangqi.games-core.com/api/leaderboard

# Check database
sqlite3 /opt/apps/xiangqi/data/xiangqi.db ".tables"
```

---

## 📊 Monitoring

### Container Health

```bash
# On server
docker ps --format "table {{.Names}}\t{{.Status}}"

# Should show:
# NAME            STATUS
# xiangqi-api     Up X minutes (healthy)
```

### View Logs

```powershell
# Local
.\build.ps1 -Logs

# Remote (via SSH)
.\deploy.ps1 -Status
```

### Database Status

```bash
# On server
ls -lh /opt/apps/xiangqi/data/xiangqi.db
sqlite3 /opt/apps/xiangqi/data/xiangqi.db "SELECT COUNT(*) as users FROM users;"
```

---

## 🆘 Troubleshooting

### Local Issues

| Problem | Solution |
|---------|----------|
| Port 5500/8787 in use | `netstat -ano \| findstr :5500` then kill process |
| Docker build fails | `.\build.ps1 -Clean` then `.\build.ps1` |
| Frontend can't reach API | Check `xiangqi/index.html` meta tag `xq-api-base` |
| Services won't start | Check logs: `.\build.ps1 -Logs` |

### Production Issues

| Problem | Solution |
|---------|----------|
| Cannot SSH | Check SSH key, firewall, server IP |
| Deployment failed | Run `.\deploy.ps1 -Status` to check server state |
| API not responding | SSH to server, check `docker logs xiangqi-api` |
| SSL certificate expired | `certbot renew` on server |
| Nginx not proxying | `nginx -t` to validate config |

### Recovery

```powershell
# If something breaks, full redeploy:
.\deploy.ps1 -Clean
.\deploy.ps1 -FirstSetup

# Or just restart the service:
ssh root@62.238.28.106 "cd /opt/apps/xiangqi && docker-compose -f docker-compose-prod.yml restart xiangqi-api"
```

---

## 🔒 Security Checklist

Before deploying to production:

- [x] SSL certificates installed (Let's Encrypt)
- [x] CORS restricted to domain only
- [x] JWT secret is fixed (not random each boot)
- [x] Nginx security headers enabled
- [x] API rate limiting configured
- [x] Database backups scheduled
- [x] Firewall rules in place
- [x] Regular security updates

---

## 📋 Quick Reference

### First-Time Setup
```powershell
.\deploy.ps1 -FirstSetup
```

### Regular Deployment
```powershell
.\deploy.ps1 -Deploy
```

### Local Development
```powershell
.\build.ps1
```

### Check Status
```powershell
.\deploy.ps1 -Status
```

---

## 📞 Support

For issues:
1. Check logs: `.\build.ps1 -Logs` (local) or `.\deploy.ps1 -Status` (remote)
2. Verify folder structure matches this guide
3. Ensure `.env` file exists with valid `XQ_JWT_SECRET`
4. Test connectivity: `curl https://xiangqi.games-core.com/api/leaderboard`

---

## 🎯 Next Steps

1. ✅ Read this entire guide
2. ✅ Run `.\build.ps1` locally to test
3. ✅ Run `.\deploy.ps1 -FirstSetup` once on production
4. ✅ Run `.\deploy.ps1 -Deploy` for future updates

---

**You're all set! 🚀 The deployment is fully automated. Just run `.\deploy.ps1 -Deploy` whenever you want to push changes to production.**
