# 🚀 Xiangqi Deployment Verification Guide

## Summary

**Deployment Status: ✅ COMPLETE**

All code changes have been deployed to production. However, Cloudflare CDN may be serving cached responses. This guide shows how to verify and clear the cache.

---

## 📋 What Was Changed

### 1. **Puzzle Database** (`xiangqi/scripts/puzzles/bank.js`)
- ❌ Removed: 14 broken puzzles with invalid moves
- ✅ Added: 7 verified simple puzzles (p001-p007)
- All use consistent ICCS notation (0-9 ranks)

### 2. **Chess Daily Mode** (`xiangqi/scripts/ui/daily-chess-page.js`)
- ✅ Added: 7-tier progression system (Tân thủ → Đại kiện tướng)
- ✅ Added: Level progress bar with tier indicators
- ✅ Added: Tutorial modal with multiple sections
- ✅ Added: '?' button to replay tutorial

### 3. **Nginx Reverse Proxy**
- ✅ Fixed: Config now proxies to correct Docker containers
  - `/api/*` → xiangqi-api:8787
  - `/*` → xiangqi-frontend:5500
- ✅ Removed: Old containers (xq-nginx, xq-api)

---

## 🧪 Running Verification Tests

### Option A: Run Full Test Suite (Recommended)

```powershell
cd E:\SourceCode\GAMES\xiangqi
.\test-deployment.ps1
```

**What it tests:**
- ✅ Docker containers running
- ✅ Port bindings (8787, 5500)
- ✅ API endpoints responding
- ✅ Frontend files served correctly
- ✅ Tier system code present
- ✅ Puzzle data exists
- ✅ Nginx configuration
- ✅ Git status

### Option B: Manual Verification

#### Test 1: Check Docker Containers

```bash
ssh root@62.238.28.106 "docker ps --filter 'name=xiangqi-' --format 'table {{.Names}}\t{{.Status}}'"
```

Expected output:
```
CONTAINER ID   IMAGE              NAMES               STATUS
...            xiangqi:prod       xiangqi-api         Up X hours (healthy)
...            python:3.11-slim   xiangqi-frontend    Up X hours (healthy)
```

#### Test 2: Verify Tier System Code

```bash
ssh root@62.238.28.106 "grep -c 'const TIERS' /opt/apps/xiangqi/xiangqi/scripts/ui/daily-chess-page.js"
```

Expected: `1` (found)

#### Test 3: Check Puzzle Data

```bash
ssh root@62.238.28.106 "grep -o 'id: .p00[1-7]' /opt/apps/xiangqi/xiangqi/scripts/puzzles/bank.js | wc -l"
```

Expected: `7` puzzles

#### Test 4: Direct Server Access (Bypass Cloudflare)

```bash
curl -s -H "Host: xiangqi.games-core.com" https://62.238.28.106/scripts/ui/daily-chess-page.js --insecure | grep -c "TIERS"
```

Expected: `3` (TIERS found in code)

---

## 🔧 Clearing Cloudflare Cache

### Method 1: PowerShell Script (Automated)

```powershell
.\clear-cloudflare-cache.ps1 -APIToken "<your_cloudflare_api_token>"
```

Get your API token from: https://dash.cloudflare.com/profile/api-tokens

### Method 2: Manual (Cloudflare Dashboard)

1. Go to: https://dash.cloudflare.com
2. Select **xiangqi.games-core.com** zone
3. Navigate to **Caching → Purge Cache**
4. Click **Purge Everything**
5. Wait 30 seconds for cache to refresh

### Method 3: Using curl

```bash
curl -X POST "https://api.cloudflare.com/client/v4/zones/9f8c4e8b5d2a1c6e/purge_cache" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{
    "files": [
      "https://xiangqi.games-core.com/",
      "https://xiangqi.games-core.com/index.html",
      "https://xiangqi.games-core.com/scripts/ui/daily-chess-page.js",
      "https://xiangqi.games-core.com/scripts/puzzles/bank.js"
    ]
  }'
```

---

## ✅ Post-Deployment Verification

After clearing Cloudflare cache, verify these features are live:

### Feature 1: Tier System
- [ ] Visit: https://xiangqi.games-core.com/daily-chess
- [ ] See tier badge in header (e.g., "🎓 Lv 1 · Tân thủ")
- [ ] See progress bar below header
- [ ] Click '?' button to view tutorial

### Feature 2: Tutorial Modal
- [ ] Modal appears with 4 tabs:
  - How to Play
  - 100 Levels & Tiers
  - Controls
  - Daily Streak

### Feature 3: Puzzles
- [ ] Puzzle loads without errors
- [ ] Solution moves work correctly
- [ ] All 7 puzzles accessible (p001-p007)

### Feature 4: API Health
- [ ] Test: https://xiangqi.games-core.com/api/leaderboard
- [ ] Should return JSON array (even if empty)
- [ ] HTTP 200 response code

---

## 🐛 Troubleshooting

### Issue: Still seeing old files after clearing cache

**Solution:**
1. Hard refresh browser: `Ctrl+Shift+Del` (Clear browsing data)
2. Or use private/incognito window
3. Wait 5 minutes for CDN to fully refresh
4. Check file directly: `curl https://62.238.28.106/... --insecure`

### Issue: API returning errors

**Check logs:**
```bash
ssh root@62.238.28.106 "docker logs xiangqi-api | tail -50"
```

### Issue: 404 on frontend files

**Verify Python server:**
```bash
ssh root@62.238.28.106 "curl http://127.0.0.1:5500/index.html"
```

Should return HTML content.

### Issue: Nginx not proxying correctly

**Test upstream:**
```bash
ssh root@62.238.28.106 "curl http://127.0.0.1:8787/api/leaderboard"
ssh root@62.238.28.106 "curl http://127.0.0.1:5500/"
```

Both should respond with content.

---

## 📊 Deployment Metrics

| Component | Status | Notes |
|-----------|--------|-------|
| **Code Commit** | ✅ | Commit: 46458cb |
| **Git Push** | ✅ | Pushed to origin/main |
| **Server Pull** | ✅ | Code synced on server |
| **Docker Build** | ✅ | Image: xiangqi:prod built |
| **Containers** | ✅ | xiangqi-api + xiangqi-frontend running |
| **Port Bindings** | ✅ | 8787 (API), 5500 (Frontend) |
| **Nginx Config** | ✅ | Updated, reloaded |
| **Old Containers** | ✅ | xq-nginx, xq-api removed |
| **API Responding** | ✅ | /api/leaderboard working |
| **Frontend Files** | ✅ | Served by Python server |
| **Tier System Code** | ✅ | TIERS array present |
| **Puzzle Data** | ✅ | 7 verified puzzles deployed |
| **Cloudflare Cache** | ⚠️ | May need manual purge |

---

## 🔄 Next Steps

### Immediate (After Cache Clear)
1. [ ] Run verification tests
2. [ ] Clear Cloudflare cache
3. [ ] Test features in browser
4. [ ] Verify API endpoints

### Follow-up
1. [ ] Monitor server logs for errors
2. [ ] Test with real users
3. [ ] Gather feedback on tier system
4. [ ] Monitor performance metrics

---

## 📞 Support

If issues arise:

1. **Check Docker logs:**
   ```bash
   ssh root@62.238.28.106 "docker logs xiangqi-api"
   ```

2. **Check Nginx logs:**
   ```bash
   ssh root@62.238.28.106 "tail -100 /var/log/nginx/xiangqi.games-core.com.error.log"
   ```

3. **Verify file on disk:**
   ```bash
   ssh root@62.238.28.106 "ls -la /opt/apps/xiangqi/xiangqi/scripts/ui/daily-chess-page.js"
   ```

4. **Test origin server directly:**
   ```bash
   curl -H "Host: xiangqi.games-core.com" https://62.238.28.106/ --insecure
   ```

---

## 📝 Deployment Timeline

- **10:04** - Git commit (puzzle fixes) + push
- **10:04** - Server git pull
- **10:10** - Docker build complete
- **10:10** - Services restarted
- **14:23** - Nginx config fixed
- **14:50** - Verification tests created
- **14:56** - Document created

---

**Last Updated:** 2026-05-17 14:56 UTC
**Status:** ✅ Ready for Testing
