# Cờ Tướng Vương — Docker Build Guide

## 📋 Prerequisites

- **Docker Desktop** (Windows 11 với WSL2)
- **PowerShell 7+** (hoặc PowerShell 5.1 từ Windows)

### Verify installations:
```powershell
docker --version
docker-compose --version
```

---

## 🚀 Quick Start

### 1. Build + Run (Default)
```powershell
cd E:\SourceCode\GAMES\xiangqi
.\build.ps1
```

Dòng lệnh này sẽ:
- ✓ Build Docker image (`xiangqi:latest`)
- ✓ Start 2 services (API + Frontend)
- ✓ Health check & show status

### 2. Access
- **Frontend**: http://localhost:5500
- **API**: http://localhost:8787
- **WebSocket**: ws://localhost:8787/ws

---

## 📦 Available Commands

| Command | Mô tả |
|---------|-------|
| `.\build.ps1` | Build + Run (default) |
| `.\build.ps1 -Build` | Chỉ build image |
| `.\build.ps1 -Run` | Chỉ start services |
| `.\build.ps1 -Stop` | Dừng services |
| `.\build.ps1 -Logs` | Xem logs realtime |
| `.\build.ps1 -Clean` | Xóa image + container |
| `.\build.ps1 -BuildRun` | Build + Run (explicit) |

---

## 📝 Project Structure

```
xiangqi/
├── Dockerfile           # Multi-stage build (API + FE)
├── docker-compose.yml   # Service orchestration
├── entrypoint.sh        # Multi-service launcher
├── build.ps1            # PowerShell build script
├── BUILD_GUIDE.md       # This file
│
├── api-xiangqi/         # FastAPI backend
│   ├── app/
│   │   ├── main.py      # FastAPI app
│   │   ├── db.py
│   │   ├── auth.py
│   │   └── ... (other modules)
│   ├── server.py        # Entry point
│   └── requirements.txt
│
└── xiangqi/             # Frontend (vanilla JS)
    ├── index.html       # Main page
    ├── scripts/         # JS modules
    ├── styles/          # CSS
    └── docs/            # Mockups
```

---

## 🔌 Connection Verification

### Frontend → API
FE tự động detect API từ meta tag:
```html
<meta name="xq-api-base" content="http://127.0.0.1:8787">
```

Nếu FE chạy ở port khác, chỉnh `index.html`:
```html
<meta name="xq-api-base" content="http://API_HOST:8787">
```

### API Configuration
```env
XQ_PORT=8787                    # API port
XQ_DB_PATH=/data/xiangqi.db     # SQLite location (persisted)
CORS_ORIGINS=*                  # Allow all origins for dev
```

---

## 📊 Container Status

### Check running containers:
```powershell
docker ps
# Hoặc
docker-compose -f .\docker-compose.yml ps
```

### View logs:
```powershell
.\build.ps1 -Logs
```

### Health check:
```powershell
curl http://localhost:8787/api/leaderboard
```

---

## 💾 Data Persistence

Database (`xiangqi.db`) được lưu trong Docker volume:
```
xiangqi-data:/data
```

Data được giữ ngay cả khi container stop:
```powershell
docker-compose down              # Stop but keep data
docker-compose down -v           # Remove data too
```

---

## 🛠️ Troubleshooting

### Container fails to start
```powershell
.\build.ps1 -Logs
# Check for Python errors
```

### API not responding
```powershell
curl http://localhost:8787/api/leaderboard
# If 404 or timeout, check API logs
.\build.ps1 -Logs
```

### Port already in use
```powershell
# Find process using port 8787
netstat -ano | findstr :8787
# Kill it or change port in docker-compose.yml
```

### Permission denied on entrypoint.sh
If Docker can't execute shell script:
1. Ensure Docker Desktop has proper permissions
2. Rebuild: `.\build.ps1 -Clean` then `.\build.ps1`

---

## 🐳 Manual Docker Commands

```powershell
# Build
docker build -t xiangqi:latest .

# Run
docker run -d -p 8787:8787 -p 5500:5500 --name xiangqi-game xiangqi:latest

# Logs
docker logs -f xiangqi-game

# Stop
docker stop xiangqi-game

# Remove
docker rm xiangqi-game
```

---

## 📌 Production Notes

### Before deploying to production:

1. **Set XQ_JWT_SECRET** (prevent random JWT each boot):
   ```yaml
   environment:
     - XQ_JWT_SECRET=your-fixed-secret-key
   ```

2. **Restrict CORS** for security:
   ```yaml
   environment:
     - CORS_ORIGINS=https://yourdomain.com
   ```

3. **Use persistent volume** (not local):
   ```yaml
   volumes:
     - external-data:/data
   ```

4. **Add nginx reverse proxy** if needed (see `api-xiangqi/nginx.conf`)

---

## 📞 Support

For issues:
1. Check logs: `.\build.ps1 -Logs`
2. Rebuild from scratch: `.\build.ps1 -Clean` → `.\build.ps1`
3. Verify folder structure matches this guide

---

**Happy gaming! 🎮**
