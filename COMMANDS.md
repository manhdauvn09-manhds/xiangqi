# 📋 Complete Command Reference

## 🖥️ Local Development (PowerShell)

```powershell
cd E:\SourceCode\GAMES\xiangqi

# ===== BUILD & RUN =====

.\build.ps1                    # Build + Run (default, all-in-one)
.\build.ps1 -BuildRun          # Explicit build + run
.\build.ps1 -Build             # Just build Docker image
.\build.ps1 -Run               # Just start (after already built)

# ===== MANAGE SERVICES =====

.\build.ps1 -Stop              # Stop all services
.\build.ps1 -Logs              # View logs (Ctrl+C to exit)
.\build.ps1 -Clean             # Remove images + containers + volumes

# ===== ACCESS SERVICES =====

# Open in browser:
# http://localhost:5500        # Frontend
# http://localhost:8787/api/*  # API endpoints

curl http://localhost:8787/api/leaderboard   # Test API
curl -w "\n%{http_code}\n" http://localhost:8787/api/leaderboard
```

---

## 🌍 Production Deployment (PowerShell)

```powershell
cd E:\SourceCode\GAMES\xiangqi

# ===== FIRST TIME ONLY =====

.\deploy.ps1 -FirstSetup       # Create entire server infrastructure
# Does:
#   1. SSH to root@62.238.28.106
#   2. Clone git repo to /opt/apps/xiangqi
#   3. Generate JWT secret in .env
#   4. Build Docker image
#   5. Start container + Nginx + SSL

# ===== EVERY DEPLOY =====

.\deploy.ps1 -Deploy           # Commit + Push + Deploy (DEFAULT)
.\deploy.ps1 -Deploy -Verbose  # With detailed output

# ===== VERIFY & TROUBLESHOOT =====

.\deploy.ps1 -Status           # Check server health + logs
.\deploy.ps1 -BuildLocal       # Test build locally before deploying
.\deploy.ps1 -BuildLocal -Verbose

# ===== OPTIONAL PARAMS =====

.\deploy.ps1 -FirstSetup -ServerUser root -ServerHost 62.238.28.106
.\deploy.ps1 -Deploy -ServerHost 62.238.28.106
```

---

## 🔐 Git Commands

```powershell
# ===== STATUS & HISTORY =====

git status                     # See what changed
git log --oneline              # Last 10 commits
git diff                       # Pending changes
git log -p -- xiangqi/         # Changes to frontend

# ===== MANUAL COMMITS (rarely needed, deploy.ps1 does this) =====

git add -A                     # Stage all files
git commit -m "Your message"   # Create commit
git push origin main           # Push to GitHub

# ===== BRANCHES =====

git branch                     # List branches
git checkout -b feature/xyz    # Create branch
git checkout main              # Switch back
git merge feature/xyz          # Merge changes
```

---

## 🐳 Docker Commands (Direct)

```bash
# ===== LOCAL =====

docker build -f Dockerfile -t xiangqi:dev .
docker-compose up -d
docker-compose logs -f
docker-compose down

# ===== PRODUCTION (on server) =====

docker build -f Dockerfile.prod -t xiangqi:prod .
docker-compose -f docker-compose-prod.yml up -d
docker-compose -f docker-compose-prod.yml logs xiangqi-api -f
docker-compose -f docker-compose-prod.yml down
docker ps
```

---

## 🌐 API Testing

```bash
# ===== LOCAL =====

curl http://localhost:8787/api/leaderboard
curl http://localhost:8787/api/me -H "Authorization: Bearer YOUR_TOKEN"

# ===== PRODUCTION =====

curl https://xiangqi.games-core.com/api/leaderboard
curl https://xiangqi.games-core.com/api/me -H "Authorization: Bearer YOUR_TOKEN"

# ===== WEBSOCKET =====

# Local: ws://localhost:8787/ws
# Production: wss://xiangqi.games-core.com/ws
```

---

## 🔧 Server Commands (SSH)

```bash
# ===== CONNECT TO SERVER =====

ssh root@62.238.28.106
cd /opt/apps/xiangqi

# ===== VIEW LOGS =====

docker logs xiangqi-api -f              # API logs
docker-compose logs -f                  # All services
tail -f /var/log/nginx/error.log        # Nginx errors
tail -f /var/log/nginx/access.log       # Nginx requests

# ===== MANAGE SERVICE =====

docker-compose ps                       # Container status
docker-compose restart xiangqi-api      # Restart API
docker-compose down && docker-compose up -d  # Full restart

# ===== DATABASE =====

sqlite3 /opt/apps/xiangqi/data/xiangqi.db
  .tables                    # List tables
  SELECT COUNT(*) FROM users;  # Count users
  .dump                      # Export all data
  .exit                      # Exit

# ===== SSL CERTIFICATE =====

certbot renew --dry-run      # Test renewal
certbot renew                # Renew certificate
systemctl reload nginx        # Reload after cert update

# ===== FILE MANAGEMENT =====

ls -lh data/xiangqi.db       # Check DB size
du -sh /opt/apps/xiangqi     # Directory size
df -h                        # Disk space
```

---

## 📊 Monitoring & Debugging

```powershell
# ===== LOCAL LOGS =====

.\build.ps1 -Logs            # All services

# ===== REMOTE STATUS =====

.\deploy.ps1 -Status         # Server health + logs

# ===== HEALTH CHECKS =====

curl http://localhost:5500              # Frontend accessible
curl http://localhost:8787/api/leaderboard  # API responds
curl https://xiangqi.games-core.com     # HTTPS works
```

---

## 🆘 Recovery Commands

```bash
# ===== RESET EVERYTHING (USE WITH CAUTION) =====

# On server:
cd /opt/apps/xiangqi
docker-compose down -v         # Remove containers + volumes
rm -rf data/xiangqi.db         # Delete database
docker build -f Dockerfile.prod -t xiangqi:prod .
docker-compose -f docker-compose-prod.yml up -d

# ===== ROLLBACK =====

git log --oneline              # Find previous commit
git revert <commit-hash>       # Revert changes
git push origin main           # Push revert

# Then redeploy:
.\deploy.ps1 -Deploy

# ===== RESTART NGINX =====

sudo nginx -t                  # Test config
sudo systemctl reload nginx    # Reload
sudo systemctl restart nginx   # Full restart
```

---

## 📝 Configuration Commands

```bash
# ===== UPDATE ENVIRONMENT =====

# On server:
cd /opt/apps/xiangqi
nano .env                      # Edit env vars

# Then restart:
docker-compose -f docker-compose-prod.yml restart xiangqi-api

# ===== UPDATE NGINX CONFIG =====

sudo nano /etc/nginx/sites-available/xiangqi.games-core.com
sudo nginx -t                  # Validate
sudo systemctl reload nginx    # Apply
```

---

## 🔄 CI/CD Integration Examples

```powershell
# ===== AUTOMATED DEPLOY ON GIT PUSH =====

# Could be set up with GitHub Actions, but for now:
.\deploy.ps1 -Deploy           # Manual trigger

# ===== SCHEDULE DEPLOYMENTS =====

# Using Windows Task Scheduler:
# Create task to run: powershell -File "E:\SourceCode\GAMES\xiangqi\deploy.ps1" -Deploy
# Schedule: Daily at 2 AM
```

---

## 📚 Quick Reference by Use Case

### "I just edited some code"
```powershell
.\deploy.ps1 -Deploy        # Commits + pushes + deploys automatically
```

### "I want to test locally first"
```powershell
.\build.ps1                 # Start local
# Test in browser at http://localhost:5500
.\build.ps1 -Stop           # Stop when done
.\deploy.ps1 -Deploy        # Then deploy to production
```

### "Something broke on production"
```powershell
.\deploy.ps1 -Status        # Check what's wrong
# Fix the code locally
.\deploy.ps1 -Deploy        # Deploy fix
```

### "I want to see server logs"
```powershell
.\deploy.ps1 -Status        # Shows recent logs
```

### "I need to backup the database"
```bash
ssh root@62.238.28.106
sqlite3 /opt/apps/xiangqi/data/xiangqi.db ".dump" > backup.sql
# Download backup locally via SCP
```

---

## 🎯 Daily Workflow

```powershell
# 1. Start day
.\build.ps1                 # Start local environment

# 2. Make changes
# Edit xiangqi/ or api-xiangqi/ as needed
# Browser F5 to reload
# Or stop/restart API container

# 3. Test thoroughly
# Access http://localhost:5500
# Test all features

# 4. End of day - deploy to production
.\build.ps1 -Stop           # Stop local
.\deploy.ps1 -Deploy        # Commit + push + deploy
# Wait for "✅ Deployment successful!"

# 5. Verify
.\deploy.ps1 -Status        # Check production health
curl https://xiangqi.games-core.com/api/leaderboard
```

---

**All commands are in PowerShell on Windows 11. Adjust for Linux/Mac as needed.**
