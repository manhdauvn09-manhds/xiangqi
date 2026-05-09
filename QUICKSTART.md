# ⚡ Cờ Tướng Vương — Quick Start (30 seconds)

## 🎮 Local Development

```powershell
cd E:\SourceCode\GAMES\xiangqi
.\build.ps1
```

→ **Open:** http://localhost:5500

---

## 🚀 Deploy to Production

### First Time (One-time setup)
```powershell
.\deploy.ps1 -FirstSetup
```

### Every Deploy (Push changes to server)
```powershell
.\deploy.ps1 -Deploy
```

→ **Live at:** https://xiangqi.games-core.com

---

## 📝 Make Changes

```powershell
# Edit files in:
# - xiangqi/           (frontend)
# - api-xiangqi/       (backend)

# Then deploy:
.\deploy.ps1 -Deploy
```

---

## 📊 Check Status

```powershell
.\deploy.ps1 -Status
# Shows: container status + API health + logs
```

---

## 🛑 Stop/Clean Up

```powershell
.\build.ps1 -Stop      # Local: Stop services
.\build.ps1 -Clean     # Local: Remove everything

# Remote: SSH and run:
docker-compose -f docker-compose-prod.yml down
```

---

## 🔗 API Documentation

**Prod:** `https://xiangqi.games-core.com/api`  
**Local:** `http://localhost:8787/api`

See [README.md](README.md) for full API docs.

---

## 📖 Documentation

- [SETUP.md](SETUP.md) — Complete setup guide
- [DEPLOY.md](DEPLOY.md) — Server operations
- [BUILD_GUIDE.md](BUILD_GUIDE.md) — Local development
- [README.md](README.md) — Project overview + API reference

---

**That's it! 🎉 Everything is automated.**
