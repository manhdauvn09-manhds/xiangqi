# ♘ Cờ Tướng Vương — Xiangqi Online

Modern online Chinese chess with AI, ELO rating, tournaments, and real-time multiplayer.

- **Frontend**: Vanilla JavaScript + HTML/CSS (responsive, PWA-ready)
- **Backend**: FastAPI + SQLite + WebSocket
- **Deployment**: Docker + Nginx + Let's Encrypt

---

## 🎮 Features

- ♟️ Full xiangqi rules engine with move validation
- 🤖 10-level AI opponent (from beginner to super-grandmaster)
- 👥 Real-time multiplayer (WebSocket)
- 🏆 ELO rating system & leaderboard
- 📅 Daily puzzle challenges
- 🎭 Tournament system
- 💾 Game history & replay
- 🌙 Dark/Light themes
- 📱 Mobile-responsive
- 🔐 JWT authentication
- ⚡ Rate limiting & anti-cheat

---

## 📁 Project Structure

```
xiangqi/
├── api-xiangqi/              # FastAPI backend
│   ├── app/
│   │   ├── main.py          # FastAPI app + routes
│   │   ├── db.py            # SQLite database
│   │   ├── auth.py          # JWT authentication
│   │   ├── elo.py           # ELO rating system
│   │   ├── xiangqi_engine.py # Game logic
│   │   ├── anticheat.py      # Cheat detection
│   │   └── ...
│   ├── server.py            # Entry point
│   └── requirements.txt
│
├── xiangqi/                  # Frontend (vanilla JS)
│   ├── index.html           # Main app
│   ├── scripts/
│   │   ├── core/            # Board, pieces, rules
│   │   ├── ai/              # AI engine (Web Worker)
│   │   ├── net/             # API & WebSocket clients
│   │   ├── ui/              # UI controllers
│   │   └── main.js
│   ├── styles/              # CSS
│   └── docs/                # Documentation & mockups
│
├── Dockerfile               # Local development image
├── Dockerfile.prod          # Production image
├── docker-compose.yml       # Local compose
├── docker-compose-prod.yml  # Production compose
├── entrypoint.sh           # Dev entrypoint
├── entrypoint-prod.sh      # Prod entrypoint
├── nginx-prod.conf         # Nginx reverse proxy
│
├── build.ps1               # Local build script (PowerShell)
├── deploy.ps1              # Production deployment (PowerShell)
│
├── DEPLOY.md               # Deployment guide
├── BUILD_GUIDE.md          # Local build guide
├── .env.example            # Environment template
├── .gitignore              # Git ignore rules
└── README.md               # This file
```

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- Docker Desktop (Windows 11 with WSL2)
- PowerShell 7+ or Git Bash

### Build & Run
```powershell
cd xiangqi
.\build.ps1
```

Services will be available at:
- **Frontend**: http://localhost:5500
- **API**: http://localhost:8787
- **WebSocket**: ws://localhost:8787/ws

### Development Commands
```powershell
.\build.ps1 -Run         # Start services
.\build.ps1 -Stop        # Stop services
.\build.ps1 -Logs        # View logs
.\build.ps1 -Clean       # Remove images
```

See [BUILD_GUIDE.md](BUILD_GUIDE.md) for details.

---

## 📦 Production Deployment

### Prerequisites
- Server: Linux (Ubuntu 20.04+)
- Docker + Docker Compose
- Nginx
- SSL certificate (Let's Encrypt)
- SSH access

### Initial Setup (First Time Only)
```powershell
.\deploy.ps1 -FirstSetup
```

This will:
1. Clone repo to `/opt/apps/xiangqi`
2. Generate JWT secret
3. Build Docker image
4. Start API container
5. Configure Nginx reverse proxy
6. Setup SSL with Let's Encrypt

### Subsequent Deployments
```powershell
.\deploy.ps1 -Deploy
```

This will:
1. Commit local changes to git
2. Push to GitHub
3. SSH to server
4. Pull latest code
5. Rebuild Docker image
6. Restart container
7. Run health checks

See [DEPLOY.md](DEPLOY.md) for detailed server commands.

---

## 🔑 Environment Variables

| Variable | Example | Purpose |
|----------|---------|---------|
| `XQ_PORT` | 8787 | API port |
| `XQ_DB_PATH` | /data/xiangqi.db | SQLite location |
| `XQ_JWT_SECRET` | (random 64 hex chars) | JWT signing key |
| `CORS_ORIGINS` | https://xiangqi.games-core.com | Allowed origins |

Create `.env` from `.env.example`:
```bash
cp .env.example .env
# Edit .env with actual values
```

---

## 🔌 API Documentation

Base URL: `https://xiangqi.games-core.com/api` (production) or `http://localhost:8787/api` (local)

### Authentication Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | — | Register new user |
| POST | `/auth/login` | — | Login, get JWT |
| POST | `/auth/refresh` | cookie | Refresh token |
| POST | `/auth/logout` | bearer | Revoke token |

### Game Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/games` | bearer | My games history |
| GET | `/games/{id}` | bearer | Game details |
| POST | `/games` | bearer | Save game |
| GET | `/leaderboard` | — | Top 100 players |
| GET | `/daily` | — | Today's puzzle |
| POST | `/daily/attempt` | bearer | Submit solution |

### WebSocket

Connect: `ws://localhost:8787/ws`

Messages:
- `{"type":"auth","token":"..."}` — Authenticate
- `{"type":"matchmake"}` — Find opponent
- `{"type":"move","from":[0,0],"to":[0,1]}` — Make move
- `{"type":"chat","msg":"hello"}` — Chat

See `xiangqi/scripts/net/ws-client.js` for full protocol.

---

## 🧪 Testing

### API Health Check
```bash
curl https://xiangqi.games-core.com/api/leaderboard
```

### Frontend Load
Open in browser: https://xiangqi.games-core.com

### WebSocket Test
```javascript
const ws = new WebSocket('ws://localhost:8787/ws');
ws.onopen = () => ws.send(JSON.stringify({type:'auth',token:'your-jwt'}));
```

---

## 🛡️ Security

- ✓ HTTPS/TLS enforced (nginx)
- ✓ JWT bearer tokens (no session cookies exposed)
- ✓ CORS restricted to domain
- ✓ Rate limiting (10 req/min per IP)
- ✓ Move validation server-side (anti-cheat)
- ✓ Security headers (CSP, HSTS, etc.)
- ✓ Input validation & sanitization
- ✓ SQL injection prevention (SQLite parameterized queries)

---

## 📊 Database

SQLite database: `/data/xiangqi.db`

Tables:
- `users` — Player accounts
- `games` — Game records
- `moves` — Move history
- `daily_puzzles` — Daily challenges
- `tournaments` — Tournament data

Backup:
```bash
sqlite3 data/xiangqi.db ".dump" > backup-$(date +%Y%m%d).sql
```

---

## 🐛 Troubleshooting

### Local development
- **Port already in use**: `netstat -ano | findstr :5500`
- **Docker build fails**: `docker build --no-cache -f Dockerfile.prod .`
- **Services not connecting**: Check `index.html` meta tag `xq-api-base`

### Production
- **SSL certificate expired**: `certbot renew`
- **API not responding**: `docker logs xiangqi-api`
- **Nginx not proxying**: `nginx -t` then `systemctl reload nginx`

See logs:
```bash
docker-compose -f docker-compose-prod.yml logs -f xiangqi-api
```

---

## 📝 Git Workflow

### Commit and deploy
```powershell
# Make local changes
.\deploy.ps1 -Deploy      # Commits, pushes, deploys automatically
```

### Manual git
```bash
git add .
git commit -m "Your message"
git push origin main
```

Repository: https://github.com/manhdauvn09-manhds/xiangqi.git

---

## 📄 License

(Add your license here)

---

## 👨‍💻 Author

**ManhDS** — manhdauvn09@gmail.com

---

**Status**: 🟢 Live on https://xiangqi.games-core.com
