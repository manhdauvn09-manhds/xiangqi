# ✅ Deployment Checklist

## Before First Deploy

- [ ] Clone repo: `git clone https://github.com/manhdauvn09-manhds/xiangqi.git`
- [ ] SSH key configured for root@62.238.28.106
- [ ] Docker Desktop installed on local PC
- [ ] PowerShell 7+ installed

## First-Time Setup (Do Once)

```powershell
.\deploy.ps1 -FirstSetup
```

Verifies:
- [ ] SSH connection to server works
- [ ] `/opt/apps/xiangqi` created
- [ ] Git repo cloned
- [ ] `.env` file with JWT secret created
- [ ] Docker image built
- [ ] Container started
- [ ] Nginx configured
- [ ] SSL certificate installed
- [ ] Service health check passed

## Before Each Deploy

- [ ] All code changes committed locally
- [ ] Tests passed locally (if applicable)
- [ ] Version number updated (if applicable)
- [ ] `.env.example` updated if new env vars added

## Deploy Command

```powershell
.\deploy.ps1 -Deploy
```

Automatically:
- [ ] Commits changes to git
- [ ] Pushes to GitHub
- [ ] Pulls on server
- [ ] Rebuilds Docker image
- [ ] Restarts container
- [ ] Health check passes

## Post-Deploy Verification

```powershell
# Check status
.\deploy.ps1 -Status

# Manual verification
curl https://xiangqi.games-core.com/api/leaderboard
# Should return HTTP 200

# Check container logs
ssh root@62.238.28.106
docker logs xiangqi-api -f
```

## Rollback (If Something Breaks)

```bash
# SSH to server
ssh root@62.238.28.106

# Revert to previous commit
cd /opt/apps/xiangqi
git log --oneline -5
git revert <commit-hash>

# Or stop container
docker-compose -f docker-compose-prod.yml down
```

---

**Before deploying to production, ensure you've tested locally with `.\build.ps1`**
