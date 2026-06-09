# Xiangqi — Project Knowledge

> ⚠️ **GROUND TRUTH (2026-06-09)** — single source of truth. Mọi file `.md`, `.html`,
> `.ps1` (`deploy.ps1`, `deploy-direct.ps1`, `test-deployment.ps1`, `00-START-HERE.md`,
> `DEPLOYMENT_*.md`, `FINAL_SUMMARY.txt`) còn nhắc `62.238.28.106`/`prod-106` là **phế liệu**
> (server đã xoá 2026-06-04). Folder `/opt/apps/xiangqi/` (frontend) và `/opt/xiangqi/` (api)
> trên mcp-80 nằm ở **2 chỗ KHÁC NHAU** trên server, đừng nhầm.

## Where things live

| Service | workDir trên server | Container | Port host | Public |
|---|---|---|---|---|
| xiangqi-api | `/opt/xiangqi` | `xq-api` | `9410` → 8787 | `https://xiangqi.games-core.com` (path `/api`) |
| xiangqi-frontend | `/opt/apps/xiangqi` | `xiangqi-frontend` | `9400` → 5500 | `https://xiangqi.games-core.com` |
| Server | `mcp-80` = `65.108.62.80` | | | |
| Branch | `master` (`gitPull: false`) | | | |
| SSL | LE wildcard `games-core-wildcard` | | | |

## Data

⚠️ **Xiangqi API dùng SQLite** (volume `xiangqi_xq-data` mount `/app/data`, chứa
`xiangqi.db` — users, elo, games, tournaments, chat). **KHÔNG rebuild image với
volume mới** → mất data.

API container có healthcheck `http://127.0.0.1:9410/api/health`.
Frontend container có healthcheck `http://127.0.0.1:9400/`.

## Deploy

```
MCP `deploy` { server_id: "mcp-80", app_id: "xiangqi-api" }      ← compose file: docker-compose.yml
MCP `deploy` { server_id: "mcp-80", app_id: "xiangqi-frontend" } ← compose file: docker-compose-prod.yml
```

Cả 2 KHÔNG tự git pull (gitPull=false) — push lên server bằng `write_file` hoặc owner copy/build.

## KHÔNG

- ❌ Chạy `deploy.ps1` / `deploy-direct.ps1` / `test-deployment.ps1` — tất cả trỏ server cũ.
- ❌ Start container nginx (host nginx đang giữ port 80/443).
- ❌ Đụng volume `xiangqi_xq-data` (mất account user).

## Phế liệu — ignore
```
00-START-HERE.md, COMMANDS.md, deploy.ps1, deploy-direct.ps1
DEPLOY-PRODUCTION.md, DEPLOYMENT_CHECKLIST.md, DEPLOYMENT_SUMMARY.md
DEPLOYMENT_VERIFICATION_GUIDE.md, FINAL_SUMMARY.txt
GAME_IMPROVEMENTS_VERIFICATION.md, SETUP.md
PROJECT_DOCUMENTATION.html, test-deployment.ps1
.claude/settings.local.json
```
