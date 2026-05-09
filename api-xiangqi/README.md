# Cờ Tướng Vương — Backend API (Phase 2)

FastAPI + SQLite + WebSocket. Chạy độc lập, không cần Docker.

## Cài đặt

```bash
cd subapp/games/api-xiangqi
pip install -r requirements.txt
```

## Chạy

```bash
python server.py
# hoặc
uvicorn app.main:app --reload --host 127.0.0.1 --port 8787
```

Server lắng nghe `http://127.0.0.1:8787`. WebSocket ở `ws://127.0.0.1:8787/ws`.

DB file: `data/xiangqi.db` (SQLite, tự tạo lần đầu chạy).

## Endpoints chính

| Method | Path | Auth | Mô tả |
|---|---|---|---|
| POST   | `/api/auth/register` | — | Đăng ký bằng email + password |
| POST   | `/api/auth/login`    | — | Login, trả JWT + refresh cookie |
| POST   | `/api/auth/refresh`  | cookie | Refresh JWT |
| POST   | `/api/auth/logout`   | bearer | Huỷ refresh |
| GET    | `/api/me`            | bearer | Profile + settings |
| PATCH  | `/api/me`            | bearer | Update profile/settings |
| GET    | `/api/games`         | bearer | Lịch sử ván của tôi |
| GET    | `/api/games/{id}`    | bearer | Chi tiết ván |
| POST   | `/api/games`         | bearer | Lưu ván (vs Bot, local, daily) |
| GET    | `/api/leaderboard`   | — | Top 100 toàn cầu |
| GET    | `/api/daily`         | — | Puzzle hôm nay |
| POST   | `/api/daily/attempt` | bearer | Nộp lời giải |
| GET    | `/api/super-ai/quota`| bearer | Lượt còn lại tuần này |
| POST   | `/api/super-ai/start`| bearer | Bắt đầu ván Siêu AI |
| POST   | `/api/challenges`    | bearer | Tạo phòng custom (password optional) |
| GET    | `/api/challenges/{code}` | — | Lookup phòng |
| POST   | `/api/challenges/{code}/join` | bearer | Vào phòng (password kiểm tra) |
| WS     | `/ws`                | bearer (qua msg `auth`) | Realtime: matchmaking, move, chat, presence |

## Frontend connection

Frontend mặc định gọi cùng origin. Đặt `<meta name="xq-api-base">` trong `index.html` để override:

```html
<meta name="xq-api-base" content="http://127.0.0.1:8787">
```

CORS cho phép origin trong env `CORS_ORIGINS` (mặc định `*` cho dev).

## Env vars (tuỳ chọn)

| Tên | Mặc định | Mô tả |
|---|---|---|
| `XQ_DB_PATH` | `./data/xiangqi.db` | Đường dẫn SQLite |
| `XQ_JWT_SECRET` | random mỗi lần boot | HMAC key cho JWT (đặt cố định ở prod!) |
| `XQ_JWT_TTL_DAYS` | 30 | TTL JWT |
| `XQ_PORT` | 8787 | HTTP port |
| `CORS_ORIGINS` | `*` | comma-separated origins |
