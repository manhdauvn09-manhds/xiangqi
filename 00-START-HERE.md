# 🎮 Cờ Tướng Vương — START HERE

**New to this project?** Read this file first (5 minutes).

---

## 🚀 What Is This?

Online Chinese chess (Xiangqi) with:
- 🤖 AI opponent (10 levels)
- 👥 Real-time multiplayer
- 🏆 ELO rating system
- 📱 Mobile-responsive
- 🔐 User authentication

**Live at:** https://xiangqi.games-core.com

---

## ⚡ 30-Second Setup

```powershell
cd E:\SourceCode\GAMES\xiangqi
.\build.ps1
```

→ Open http://localhost:5500

---

## 📚 Documentation

Read in this order:

### For Local Development
1. **[QUICKSTART.md](QUICKSTART.md)** — 30 seconds, basic commands
2. **[BUILD_GUIDE.md](BUILD_GUIDE.md)** — Local development details
3. **[COMMANDS.md](COMMANDS.md)** — All PowerShell commands

### For Production Deployment
1. **[SETUP.md](SETUP.md)** — Complete setup walkthrough
2. **[DEPLOY.md](DEPLOY.md)** — Server operations guide
3. **[DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)** — Pre/post deploy checklist
4. **[COMMANDS.md](COMMANDS.md)** — All commands (including server SSH)

### For Project Understanding
- **[README.md](README.md)** — Project overview + full API documentation
- **[xiangqi/docs/](xiangqi/docs/)** — Design documents, user manual

---

## 🎯 Quick Tasks

### "I want to code locally"

```powershell
.\build.ps1                    # Start everything
# Edit code in:
#   - xiangqi/          (frontend)
#   - api-xiangqi/      (backend)
# Browser F5 to reload
.\build.ps1 -Stop              # Stop when done
```

**Next:** Read [BUILD_GUIDE.md](BUILD_GUIDE.md)

---

### "I want to deploy to production"

First time only:
```powershell
.\deploy.ps1 -FirstSetup       # Create server infrastructure
```

Every deploy after:
```powershell
.\deploy.ps1 -Deploy           # Commit + push + deploy automatically
```

**Next:** Read [SETUP.md](SETUP.md) and [DEPLOY.md](DEPLOY.md)

---

### "I need to check server status"

```powershell
.\deploy.ps1 -Status           # Shows: container status + logs + health
```

**Next:** Read [DEPLOY.md](DEPLOY.md) for manual server commands

---

### "I forgot what commands do"

```powershell
.\build.ps1                    # Shows help menu
.\deploy.ps1                   # Shows help menu
```

Or see [COMMANDS.md](COMMANDS.md) for complete reference.

---

## 📁 Project Structure

```
E:\SourceCode\GAMES\xiangqi/
├── xiangqi/                    ← Frontend (vanilla JavaScript)
├── api-xiangqi/                ← Backend (FastAPI + SQLite)
├── Dockerfile                  ← Local dev Docker image
├── Dockerfile.prod             ← Production Docker image
├── docker-compose.yml          ← Local services
├── docker-compose-prod.yml     ← Production services
├── build.ps1                   ← Local build script
├── deploy.ps1                  ← Production deployment script
└── docs/                       ← Design documents, mockups
```

---

## 🔧 Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vanilla JavaScript, HTML5, CSS3 |
| Backend | FastAPI (Python) |
| Database | SQLite |
| Container | Docker + Docker Compose |
| Reverse Proxy | Nginx |
| SSL | Let's Encrypt |
| Deployment | PowerShell scripts |

---

## 🌐 Infrastructure

```
Local PC (Windows 11)
    ↓ git push
GitHub (manhdauvn09-manhds/xiangqi)
    ↓ git pull
Server (root@62.238.28.106)
    ├─ Docker Container
    │   └─ FastAPI API
    └─ Nginx (SSL/TLS)
        └─ https://xiangqi.games-core.com
```

---

## ✅ Checklist for New Developers

- [ ] Read this file (00-START-HERE.md)
- [ ] Read QUICKSTART.md or SETUP.md (depending on your need)
- [ ] Run `.\build.ps1` locally
- [ ] Open http://localhost:5500 in browser
- [ ] Explore the code:
  - [ ] xiangqi/index.html
  - [ ] xiangqi/scripts/main.js
  - [ ] api-xiangqi/app/main.py
- [ ] Stop with `.\build.ps1 -Stop`
- [ ] Read COMMANDS.md for reference

---

## 🆘 Need Help?

| Question | Answer |
|----------|--------|
| How do I start locally? | `.\build.ps1` then http://localhost:5500 |
| How do I deploy? | `.\deploy.ps1 -Deploy` |
| What commands exist? | See COMMANDS.md or run `.\build.ps1` |
| Where's the API docs? | README.md (API Documentation section) |
| How do I check production? | `.\deploy.ps1 -Status` |
| Where are the logs? | `.\build.ps1 -Logs` (local) or `.\deploy.ps1 -Status` (prod) |
| How do I undo a deploy? | See DEPLOY.md → Rollback section |

---

## 🎯 Typical Workflow

```powershell
# Day 1: Local development
.\build.ps1                          # Start services
# Edit code, test in browser
.\build.ps1 -Stop                    # Stop

# Day 2: Deploy to production
.\deploy.ps1 -Deploy                 # Everything automated
# Check at https://xiangqi.games-core.com

# Day 3: Check server
.\deploy.ps1 -Status                 # See logs & health
```

---

## 📖 Reading Order (Recommended)

1. ✅ **This file** (00-START-HERE.md) — 5 min
2. ⭐ **[QUICKSTART.md](QUICKSTART.md)** — 2 min (the bare essentials)
3. 📚 **[SETUP.md](SETUP.md)** — 20 min (comprehensive walkthrough)
4. 🔧 **[COMMANDS.md](COMMANDS.md)** — Reference (as needed)
5. 📊 **[README.md](README.md)** — Project details (as needed)

---

## 🚀 Next Step

👉 **Read [QUICKSTART.md](QUICKSTART.md) now** (30 seconds)

---

**Happy coding! 🎉**

For detailed questions, each documentation file has its own section.
