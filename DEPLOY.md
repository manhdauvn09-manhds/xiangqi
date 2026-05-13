# Deployment Instructions - Layout Fix (bd8f97c)

## Changes Made
- Fixed modal layout bug where game board disappeared after modal closed
- Changed gameContent display from 'flex' to 'contents' (unwraps CSS Grid layout)
- Added explicit CSS rule for .xq-game-content
- Modified files: xiangqi/scripts/main.js, xiangqi/styles/ui.css

## Deployment Steps

### On Server (xiangqi.games-core.com)

```bash
# 1. Navigate to xiangqi directory
cd /root/xiangqi

# 2. Pull latest changes from git
git pull origin main

# 3. Verify changes were pulled
git log --oneline -n 1

# 4. Restart docker-compose services (uses docker-compose-prod.yml)
docker-compose -f docker-compose-prod.yml down
docker-compose -f docker-compose-prod.yml up -d

# 5. Verify services are running
docker-compose ps

# 6. Check frontend health
curl -s http://localhost:5500 | head -20

# 7. Check API health
curl -s http://localhost:8787/api/leaderboard | jq '.' | head -10

# 8. Reload Nginx (do not restart - other domains on server!)
sudo nginx -t && sudo systemctl reload nginx

# 9. Verify deployment
curl -I https://xiangqi.games-core.com/index.html
```

## Verification Checklist
- [ ] `docker-compose ps` shows 2 containers running (xiangqi-api, xiangqi-frontend)
- [ ] Frontend accessible: curl shows HTML response
- [ ] API healthy: curl returns JSON (not 500 error)
- [ ] Nginx reloaded: no errors in systemctl reload
- [ ] Manual test: https://xiangqi.games-core.com loads
- [ ] Game modal closes properly when clicking "Hủy" or "Bắt đầu"
- [ ] Game board displays after modal closes
- [ ] Layout looks correct (not broken/missing board)

## Safety Notes
⚠️ IMPORTANT:
- Only reload Nginx (systemctl reload), do NOT restart it!
- This change only affects xiangqi.games-core.com
- No changes to API endpoints, database, or environment variables
- Frontend files mounted as read-only in Docker
- Other services/domains on the server are NOT affected

## Rollback (if needed)
```bash
cd /root/xiangqi
git revert HEAD
docker-compose -f docker-compose-prod.yml restart xiangqi-frontend
# Verify with curl http://localhost:5500
sudo systemctl reload nginx
```

## Commit Details
- Commit: bd8f97c
- Author: Claude
- Message: fix: resolve modal layout bug with display: contents
- Files: xiangqi/scripts/main.js, xiangqi/styles/ui.css
