# Cờ Tướng Vương — Tài liệu Thiết kế

> **Mã game**: `xiangqi`
> **Ngày tạo**: 2026-05-08
> **Trạng thái**: Design draft — chưa code
> **Vị trí**: `games/xiangqi/` (theo chuẩn `subapp/games`)

---

## 1. Tóm tắt sản phẩm

Cờ Tướng Vương là game cờ tướng web hiện đại, một trang, chơi được trên cả desktop và mobile. Hỗ trợ:

- **Đối kháng online** (PvP) với matchmaking theo ELO + chơi với bạn qua mã phòng.
- **Đấu Bot** với 10 cấp độ AI, level 10 suy nghĩ sâu 5–6 nước (tương đương Cao Thủ ~2400 ELO).
- **Hai biến thể**: Cờ Tướng Ngửa (chuẩn) và Cờ Tướng Úp (lật quân).
- **Hệ thống ELO + xếp hạng**: 9 cấp bậc từ Tập Sự đến Tông Sư.
- **Lịch sử & Replay**: tua lại từng nước, phân tích, học hỏi.
- **Giải đấu / Thách đấu / Daily Challenge** với người thật, bot thường, và Siêu AI.

Thiết kế hiện đại, dark mode chủ đạo, accent đỏ-vàng truyền thống cờ tướng, glass-morphism, animation mượt.

---

## 2. Đối tượng người dùng

| Persona | Mô tả | Mục tiêu chính |
|---|---|---|
| Người mới (Tập Sự) | Chưa biết luật hoặc mới chơi vài ván | Tutorial, vs Bot lv1–3, gợi ý nước đi |
| Người chơi giải trí | Biết luật, chơi vài ván/tuần | Quick play, daily challenge, mobile |
| Người chơi nghiêm túc | Cày ELO, học khai cuộc | Ranked, replay, vs Bot lv7–10, giải đấu |
| Cao thủ | ELO 2000+ | Vs Siêu AI, giải lớn, phân tích sâu |

---

## 3. Phạm vi tính năng (MVP → Full)

### MVP (Phase 1)
- Bàn cờ Ngửa, luật chuẩn, chống chiếu, tự phát hiện chiếu hết / hết nước / hoà.
- Local 2-player (cùng máy) + vs Bot lv1–5.
- ELO local (lưu `localStorage`).
- Lịch sử ván (lưu local), replay từng nước.
- Responsive UI, theme tối.

### Phase 2 — Online & AI mạnh
- Đăng nhập (Google SSO theo chuẩn `game-platform.js`).
- Matchmaking online qua WebSocket.
- Bot lv6–10 với opening book + transposition table.
- Đồng bộ ELO, lịch sử lên backend.

### Phase 3 — Biến thể & Cộng đồng
- Cờ Tướng Úp (Banqi-style).
- Giải đấu, thách đấu mã phòng, daily challenge.
- Bảng xếp hạng global + theo tuần.
- Chế độ Siêu AI (level 11–12, suy nghĩ tối đa 30s/nước).

### Phase 4 — Học liệu
- Puzzle (chiếu hết trong N nước).
- Phân tích bằng AI (gợi ý nước đi tốt hơn trong replay).
- Khoá học khai cuộc cơ bản (Pháo Đầu, Bình Phong Mã…).

---

## 4. Các biến thể game

### 4.1. Cờ Tướng Ngửa (Standard Xiangqi)
Luật cờ tướng quốc tế chuẩn — bàn 9×10, sông giữa hàng 4–5, cung 3×3 hai đầu. Quân: 1 Tướng, 2 Sĩ, 2 Tượng, 2 Mã, 2 Xe, 2 Pháo, 5 Tốt mỗi bên.

Áp dụng các luật:
- Chiếu tướng / chiếu hết.
- Cấm chiếu lặp lại 3 lần (Tam điệp bại — bên chiếu thua).
- Cấm bắt đôi cố định lặp lại.
- Hai Tướng không nhìn thẳng nhau (Lộ Tướng).
- Hoà do 60 nước không bắt quân hoặc thoả thuận.

### 4.2. Cờ Tướng Úp (Banqi / Blind Xiangqi) — Đã chốt
Biến thể giải trí phổ biến ở Việt Nam và Đông Nam Á.

**Luật áp dụng trong game (chốt v1)**:
- Tất cả 30 quân (trừ 2 Tướng) được **xáo ngẫu nhiên hoàn toàn**, đặt úp xuống ở 30 ô gốc theo bố trí cờ ngửa.
- 2 Tướng (Đỏ + Đen) **không bị xáo**, giữ nguyên ở cung — luôn công khai từ đầu ván.
- Seed xáo:
  - Sinh bằng `crypto.getRandomValues(new Uint32Array(2))` ở **server** (backend).
  - Hash SHA-256 của seed được công bố cho cả hai bên ngay đầu ván (commit).
  - Sau khi ván kết thúc, server reveal seed gốc — cả hai bên có thể tự xáo lại để verify (audit, chống tố cáo gian lận).
- Khi đến lượt, người chơi có 2 lựa chọn:
  1. **Lật** một quân úp bất kỳ trên bàn — quân lật ra đứng yên, hiện rõ chủng loại + màu. Quyền sở hữu = màu lật ra (nếu lật trúng quân Đỏ thì là quân Đỏ, dù bạn cầm Đen).
  2. **Đi** một quân đã lật của mình theo luật cờ tướng chuẩn.
- Animation flip 3D 0.4s khi lật quân.
- Áp dụng luật: chiếu hết, lộ tướng, tam điệp bại, 60 nước không bắt quân.
- Mục tiêu: **chiếu hết Tướng đối phương**.

> Chi tiết user-facing: xem `USER_MANUAL.md` mục 6.

---

## 5. Hệ thống AI — 10 cấp độ

### 5.1. Kiến trúc engine

```
┌──────────────────────────────────────────────┐
│  Web Worker: ai-engine.worker.js             │
│  ┌────────────────────────────────────────┐  │
│  │ 1. Move generator  (pseudo-legal moves)│  │
│  │ 2. Legal filter    (lọc nước phạm luật)│  │
│  │ 3. Evaluator       (cho điểm thế cờ)   │  │
│  │ 4. Search          (minimax + α-β)     │  │
│  │ 5. Opening book    (~400 thế khai cuộc)│  │
│  │ 6. Transposition   (Zobrist hash)      │  │
│  └────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
         ▲ postMessage         ▼ postMessage
┌──────────────────────────────────────────────┐
│   Main thread: UI render, không bị block     │
└──────────────────────────────────────────────┘
```

### 5.2. Bảng cấu hình theo level

| Lv | Tên | Depth | Tính năng | Time/nước | ELO ước tính |
|----|-----|-------|-----------|-----------|--------------|
| 1  | Tập Sự       | 1   | Ngẫu nhiên + ưu tiên ăn quân                     | <100ms  | ~600  |
| 2  | Tân Binh     | 2   | Material eval (giá trị quân)                      | <200ms  | ~800  |
| 3  | Sơ Cấp       | 2   | + Bonus vị trí (PST cơ bản)                       | <300ms  | ~1000 |
| 4  | Trung Cấp    | 3   | Minimax + α-β + đe dọa Tướng                      | <500ms  | ~1200 |
| 5  | Khá          | 3   | + Killer move + history heuristic                 | <700ms  | ~1400 |
| 6  | Giỏi         | 4   | + Transposition table (Zobrist 64-bit)            | <1.5s   | ~1600 |
| 7  | Cao Thủ      | 4   | + Opening book 400 biến                           | <2s     | ~1800 |
| 8  | Đại Sư       | 5   | + Iterative deepening + quiescence search         | <4s     | ~2000 |
| 9  | Tông Sư      | 5   | + Endgame heuristics + cờ tàn tablebase đơn giản  | <6s     | ~2200 |
| 10 | Siêu AI      | 5–6 | Toàn bộ + extension khi chiếu, search 6 nếu < 8s  | <10s    | ~2400 |

> **Ghi chú Lv10**: search depth động — bắt đầu depth 5, nếu còn budget thì đào sâu depth 6 ở các nước ứng cử (PV nodes). Có check extension (+1 ply khi đang bị chiếu) và recapture extension.

### 5.3. Hàm đánh giá (evaluator)

Tổng điểm = Material + PST + King safety + Mobility + Pawn structure + Threats.

Giá trị quân (centipawn):

| Quân | Tướng | Sĩ | Tượng | Mã | Xe | Pháo | Tốt (chưa qua sông) | Tốt (qua sông) |
|---|---|---|---|---|---|---|---|---|
| Điểm | ∞ | 200 | 200 | 400 | 900 | 450 | 100 | 200 |

PST (piece-square table) cho mỗi loại quân — bảng 9×10, lưu trong `engine/pst.js`.

### 5.4. Modal cấu hình AI

Khi chọn "Đấu Bot", mở modal cho phép tinh chỉnh:

- **Cấp độ** (1–10): slider có preview ELO ước tính.
- **Cá tính** (Personality): Tấn công / Phòng thủ / Cân bằng — thay đổi trọng số PST.
- **Phong cách khai cuộc** (Lv7+): Pháo Đầu / Bình Phong Mã / Tiên Nhân Chỉ Lộ / Ngẫu nhiên.
- **Time control**: Tức thời / Suy nghĩ chậm (cho phép bot dùng tối đa thời gian theo bảng 5.2).
- **Hint**: Bật/tắt gợi ý nước đi cho người chơi (chỉ off-ranked).

Mockup: `docs/mockups/ai-modal.html`.

---

## 6. Hệ thống ELO & Xếp hạng

### 6.1. Công thức ELO chuẩn

```
E_a = 1 / (1 + 10^((R_b - R_a) / 400))
R_a' = R_a + K * (S_a - E_a)
```

Trong đó `S_a` ∈ {0, 0.5, 1} là kết quả ván (thua / hoà / thắng).

K-factor:
- Người mới (<30 ván xếp hạng): **K = 40**
- Bình thường (ELO < 2200): **K = 24**
- Master (ELO ≥ 2200): **K = 16**

### 6.2. ELO khởi điểm
Mặc định **1200** (đã chốt). 10 ván Ranked đầu là "ván xếp hạng" với K=40 — ELO biến động lớn, hiển thị nhãn "Đang xác định trình độ" thay vì con số chính xác.

### 6.3. Cấp bậc (rank)

| Rank | ELO | Icon | Màu |
|---|---|---|---|
| Tập Sự       | < 1000   | 🪵 | #8B7355 |
| Tân Binh     | 1000–1199 | 🥉 | #B87333 |
| Đồng         | 1200–1399 | 🟫 | #CD7F32 |
| Bạc          | 1400–1599 | 🥈 | #C0C0C0 |
| Vàng         | 1600–1799 | 🥇 | #FFD700 |
| Bạch Kim     | 1800–1999 | 💎 | #00E5FF |
| Cao Thủ      | 2000–2199 | 🛡️ | #B388FF |
| Đại Sư       | 2200–2399 | ⚔️ | #FF6B9D |
| Tông Sư      | 2400+     | 👑 | #FF1744 |

ELO chỉ tăng/giảm trong **chế độ Ranked**. Đấu vs Bot, Custom, Daily không ảnh hưởng ELO.

### 6.4. Bảng xếp hạng

- **Global** — Top 100 toàn cầu.
- **Tuần này** — reset thứ Hai 00:00 UTC+7.
- **Bạn bè** — top trong friends list.

---

## 7. Lịch sử & Replay

### 7.1. Lưu trữ ván cờ
Mỗi ván lưu **PGN-Xiangqi format** (giống ICCS notation):

```json
{
  "id": "g_a8f3...",
  "mode": "ranked",
  "variant": "standard",
  "playedAt": "2026-05-08T10:23:11Z",
  "red":   { "id": "u123", "name": "ManhDS", "elo": 1432, "rank": "Bạc" },
  "black": { "id": "bot10", "name": "Siêu AI", "elo": 2400, "rank": "Tông Sư" },
  "result": "1-0",
  "termination": "checkmate",
  "duration_ms": 612340,
  "moves": [
    { "n": 1, "ply": 0, "side": "r", "from": "h2", "to": "e2", "piece": "C", "san": "炮二平五", "ts": 1820 },
    ...
  ],
  "eloDelta": { "red": +18, "black": -18 }
}
```

### 7.2. Trình replay

- Thanh trượt timeline + nút Prev / Play / Next / Speed (0.5x, 1x, 2x, 4x).
- Highlight ô vừa di chuyển + ô bị ăn (animation pulse).
- Mỗi nước hiển thị nốt thời gian suy nghĩ.
- (Phase 4) Nút "Phân tích nước này" — gọi AI Lv9 đánh giá, gợi ý nước hay hơn.
- Auto-bookmark các "nước sai" (eval drop > 200cp) để dễ xem lại.

Mockup: `docs/mockups/replay.html`.

---

## 8. Giải đấu, Thách đấu, Challenge

### 8.1. Giải đấu (Tournament)
- **Swiss 5 vòng** (mặc định) — pairing tự động theo ELO.
- **Knockout 8 / 16 / 32 người** — bracket.
- **Arena** — 1 giờ, ai thắng nhiều ván nhất ăn cup.

Phần thưởng: cup ảo, badge, +ELO bonus, hiển thị trên profile.

### 8.2. Thách đấu (Challenge)
- **Mã phòng 6 ký tự** — gửi cho bạn, vào chơi 1-1.
- Có thể custom: time control, biến thể (ngửa/úp), bên cầm Đỏ.

### 8.3. Daily Challenge
- 1 vị trí khó / ngày — thử chiếu hết trong N nước.
- Cùng câu đố cho tất cả người chơi → so sánh số nước, thời gian.
- Streak ngày — duy trì để nhận badge.

### 8.3.1. Tạo phòng — chi tiết kỹ thuật

**Mã phòng**:
- 6 ký tự, ký tự an toàn `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (loại bỏ I/O/0/1 dễ nhầm).
- Server retry sinh nếu trùng (xác suất collision rất thấp).
- Hiển thị uppercase, không phân biệt hoa/thường khi user nhập.

**Time control — preset gợi ý**:
| Preset | Khởi điểm | Increment |
|---|---|---|
| ⚡ Bullet 1+0 | 60 giây | 0 |
| ⚡ Bullet 2+1 | 2 phút | 1s |
| 🔥 Blitz 3+2 | 3 phút | 2s |
| 🔥 Blitz 5+0 | 5 phút | 0 |
| 🎯 Rapid 10+5 (mặc định) | 10 phút | 5s |
| 🎯 Rapid 15+10 | 15 phút | 10s |
| ♟ Classical 30+30 | 30 phút | 30s |
| ♾ Không giờ | — | — |
| ⚙ Tuỳ chỉnh | slider 30s–60p | slider 0–60s |

**Mật khẩu** (đã chốt):
- **Optional, mặc định trống** — phòng public ai có mã đều vào được.
- Nếu đặt: tối thiểu 4 ký tự, tối đa 32, không giới hạn ký tự đặc biệt.
- Hash bằng Argon2id (cùng config với password user nhưng `t=2, m=16MB` cho nhẹ).
- Server `POST /api/challenges/:code/join` verify hash, sai → 403 + đếm số lần sai (5 lần/phút khoá IP 10 phút).
- UI ở phòng nhập sai sẽ shake + đỏ + thông báo "Sai mật khẩu, còn N lần thử".

**Bên cầm Đỏ**:
- Tôi cầm Đỏ (đi trước).
- Tôi cầm Đen (đối phương đi trước).
- Random — server quyết định khi đối thủ vào.

**TTL phòng (tự huỷ nếu không có người vào)**:
- 15 phút (mặc định)
- 30 phút
- 1 giờ
- 24 giờ (tối đa)

Phòng tự xoá khỏi DB sau `expires_at` qua cron 5 phút/lần. Sau khi có người vào và ván bắt đầu, `expires_at` không còn ý nghĩa.

**Chia sẻ**:
- Sau khi tạo, hiện mã + 3 nút: 📋 Copy, 🔗 Copy link (`/games/xiangqi/#/join/CODE`), 📱 QR code.
- Link kèm code nhưng KHÔNG bao giờ kèm password — đối thủ nhập tay.

### 8.4. Đấu với Siêu AI
- Mỗi tài khoản có **3 lượt thách Siêu AI / tuần**.
- Thắng được +50 ELO bonus, badge "Đả bại Siêu AI".
- Hoà được +20.

Mockup: `docs/mockups/tournament.html`.

---

## 9. Kiến trúc kỹ thuật

### 9.1. Cấu trúc thư mục đề xuất

```
games/xiangqi/
├── index.html                 # Entry point
├── docs/                      # Tài liệu này
│   ├── DESIGN.md
│   ├── FUNCTION_LIST.md
│   ├── USER_MANUAL.md
│   └── mockups/
├── styles/
│   ├── theme.css              # Variables, dark theme
│   ├── board.css              # Bàn cờ, quân
│   ├── ui.css                 # Modal, button, panel
│   └── animations.css
├── scripts/
│   ├── main.js                # Bootstrap
│   ├── core/
│   │   ├── board.js           # State + render
│   │   ├── rules.js           # Luật cờ
│   │   ├── moves.js           # Sinh nước, kiểm tra
│   │   ├── notation.js        # ICCS / WXF / PGN
│   │   └── zobrist.js         # Hash khoá thế cờ
│   ├── ai/
│   │   ├── ai.worker.js       # Web Worker AI engine
│   │   ├── eval.js            # Hàm đánh giá
│   │   ├── search.js          # Minimax + α-β + iterative deep
│   │   ├── tt.js              # Transposition table
│   │   ├── pst.js             # Piece-square tables
│   │   └── openings/
│   │       ├── pao_dau.json
│   │       ├── binh_phong_ma.json
│   │       └── tien_nhan_chi_lo.json
│   ├── ui/
│   │   ├── home.js
│   │   ├── game.js
│   │   ├── replay.js
│   │   ├── history.js
│   │   ├── leaderboard.js
│   │   ├── tournament.js
│   │   ├── ai-modal.js
│   │   └── toast.js
│   ├── net/
│   │   ├── ws-client.js       # WebSocket realtime
│   │   ├── api.js             # REST wrapper
│   │   └── matchmaker.js
│   ├── storage/
│   │   ├── local.js           # localStorage
│   │   └── sync.js            # đồng bộ backend
│   ├── elo/
│   │   └── elo.js
│   └── variants/
│       ├── standard.js        # cờ ngửa
│       └── blind.js           # cờ úp
└── assets/
    ├── pieces/                # SVG quân cờ (red/black, ngửa/úp)
    ├── sounds/                # mp3 ngắn: move, capture, check, win
    └── icons/
```

### 9.2. Sơ đồ trạng thái client

```
┌─────────┐   start    ┌─────────┐   match    ┌──────────┐
│  HOME   │──────────▶│ MATCHING │──────────▶│ IN_GAME  │
└─────────┘            └─────────┘            └────┬─────┘
     ▲                                              │ result
     │                  ┌─────────┐                 ▼
     │  ◀───────────────│ REPLAY  │◀──────────┌───────────┐
     │                  └─────────┘            │  RESULT   │
     │                                          └─────┬─────┘
     └──────────────────────────────────────────────  │
                                                      ▼ rematch
```

### 9.3. Backend — dựng mới hoàn toàn (đã chốt)

Stack đề xuất:

- **Runtime**: Node.js 20+ (TypeScript) hoặc Python 3.12 (FastAPI). Chọn Node để tái sử dụng module `rules.js` server-side, tránh viết engine 2 lần.
- **DB**: PostgreSQL 16 (chính) + Redis 7 (cache + matchmaking queue + Pub/Sub cho WebSocket fan-out).
- **WebSocket**: native `ws` (Node) hoặc `uvicorn[ws]` (Python). Cluster scale qua Redis Pub/Sub.
- **Auth**: Email + mật khẩu (Argon2id) **hoặc** Google OAuth — người dùng chọn. Token dạng JWT (HS256) TTL 30 ngày + refresh token httpOnly cookie.
- **Anti-abuse**: rate limit qua `redis-cell`, captcha v3 cho đăng ký/đăng nhập.

#### 9.3.1. Schema DB chính (PostgreSQL)

```sql
-- Người dùng
CREATE TABLE users (
  id            BIGSERIAL PRIMARY KEY,
  email         CITEXT UNIQUE NOT NULL,
  display_name  TEXT NOT NULL,
  password_hash TEXT,                                -- NULL nếu chỉ login Google
  google_sub    TEXT UNIQUE,
  avatar_url    TEXT,
  lang          TEXT NOT NULL DEFAULT 'vi',          -- 'vi' | 'en'
  theme         TEXT NOT NULL DEFAULT 'auto',        -- 'light' | 'dark' | 'auto'
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at  TIMESTAMPTZ
);

-- Hồ sơ ELO (1 row / user / variant)
CREATE TABLE elo_profiles (
  user_id       BIGINT REFERENCES users(id) ON DELETE CASCADE,
  variant       TEXT NOT NULL,                       -- 'standard' | 'blind'
  elo           INTEGER NOT NULL DEFAULT 1200,
  peak_elo      INTEGER NOT NULL DEFAULT 1200,
  games_played  INTEGER NOT NULL DEFAULT 0,
  wins          INTEGER NOT NULL DEFAULT 0,
  losses        INTEGER NOT NULL DEFAULT 0,
  draws         INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, variant)
);

-- Ván cờ
CREATE TABLE games (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant        TEXT NOT NULL,
  mode           TEXT NOT NULL,                      -- 'ranked'|'quick'|'custom'|'bot'|'daily'|'tournament'|'super_ai'
  red_user_id    BIGINT REFERENCES users(id),
  black_user_id  BIGINT REFERENCES users(id),
  red_bot_level  SMALLINT,                           -- 1..10 nếu là bot
  black_bot_level SMALLINT,
  result         TEXT,                               -- '1-0'|'0-1'|'1/2-1/2'|NULL khi đang chơi
  termination    TEXT,                               -- 'checkmate'|'resign'|'timeout'|'agreed_draw'|'60_move'|'threefold'|'perpetual'|'disconnect'
  pgn            TEXT NOT NULL,                      -- PGN-Xiangqi đầy đủ
  start_fen      TEXT,                               -- với cờ úp: FEN sau khi xáo
  blind_seed_hash TEXT,                              -- SHA256(seed) commit ban đầu
  blind_seed     TEXT,                               -- reveal sau ván
  time_control   TEXT NOT NULL,                      -- '10+5'
  duration_ms    INTEGER,
  red_elo_before INTEGER, black_elo_before INTEGER,
  red_elo_delta  INTEGER, black_elo_delta INTEGER,
  played_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  tournament_id  UUID REFERENCES tournaments(id)
);
CREATE INDEX idx_games_user ON games(red_user_id, played_at DESC);
CREATE INDEX idx_games_user_b ON games(black_user_id, played_at DESC);

-- Phòng custom (mã 6 ký tự, có thể đặt mật khẩu)
CREATE TABLE challenges (
  code             CHAR(6) PRIMARY KEY,
  creator_id       BIGINT REFERENCES users(id),
  variant          TEXT NOT NULL,                       -- 'standard' | 'blind'
  time_initial_ms  INTEGER NOT NULL,                    -- ví dụ 600_000 cho 10 phút
  time_inc_ms      INTEGER NOT NULL DEFAULT 0,          -- increment mỗi nước
  creator_side     TEXT NOT NULL,                       -- 'red' | 'black' | 'random'
  password_hash    TEXT,                                -- NULL = phòng public, có hash = cần password
  password_salt    TEXT,                                -- salt riêng cho phòng (Argon2id light)
  rated            BOOLEAN NOT NULL DEFAULT false,      -- v1: luôn false (custom = off-ranked)
  notes            TEXT,                                -- ghi chú creator (≤200 ký tự)
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at       TIMESTAMPTZ NOT NULL,                -- 15p / 30p / 1h / 24h tuỳ chọn
  joined_user_id   BIGINT REFERENCES users(id),         -- ai đã vào (NULL nếu chưa)
  game_id          UUID                                 -- gán khi ván bắt đầu
);
CREATE INDEX idx_challenges_creator ON challenges(creator_id, created_at DESC);
CREATE INDEX idx_challenges_expires ON challenges(expires_at);                -- TTL cleanup

-- Giải đấu
CREATE TABLE tournaments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  format       TEXT NOT NULL,                        -- 'swiss' | 'knockout' | 'arena'
  variant      TEXT, time_control TEXT,
  starts_at    TIMESTAMPTZ NOT NULL,
  ends_at      TIMESTAMPTZ,
  state        TEXT NOT NULL DEFAULT 'upcoming',     -- 'upcoming'|'live'|'finished'
  config       JSONB
);

CREATE TABLE tournament_players (
  tournament_id UUID REFERENCES tournaments(id),
  user_id       BIGINT REFERENCES users(id),
  score         REAL NOT NULL DEFAULT 0,
  rank          INTEGER,
  PRIMARY KEY (tournament_id, user_id)
);

-- Daily challenge
CREATE TABLE daily_puzzles (
  date         DATE PRIMARY KEY,
  fen          TEXT NOT NULL,
  solution     TEXT[] NOT NULL,                      -- chuỗi nước đúng (nhánh chính)
  mate_in      SMALLINT NOT NULL
);

CREATE TABLE daily_attempts (
  user_id      BIGINT REFERENCES users(id),
  date         DATE,
  solved       BOOLEAN NOT NULL DEFAULT false,
  duration_ms  INTEGER,
  attempts     SMALLINT NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, date)
);

-- Lượt thách Siêu AI
CREATE TABLE super_ai_quota (
  user_id      BIGINT REFERENCES users(id),
  iso_week     TEXT,                                 -- '2026-W19'
  used         SMALLINT NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, iso_week)
);

-- Chat lưu trữ (giữ 30 ngày)
CREATE TABLE chat_messages (
  id           BIGSERIAL PRIMARY KEY,
  game_id      UUID REFERENCES games(id) ON DELETE CASCADE,
  sender_id    BIGINT REFERENCES users(id),
  text         TEXT NOT NULL,
  sent_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  flagged      BOOLEAN NOT NULL DEFAULT false
);
CREATE INDEX idx_chat_game ON chat_messages(game_id, sent_at);
```

#### 9.3.2. REST endpoints

| Method | Path | Mô tả |
|---|---|---|
| `POST` | `/api/auth/register` | Email + password + display_name (Argon2id, captcha bắt buộc) |
| `POST` | `/api/auth/login` | Email + password → JWT + refresh cookie |
| `POST` | `/api/auth/google` | OAuth code → JWT |
| `POST` | `/api/auth/refresh` | refresh cookie → JWT mới |
| `POST` | `/api/auth/logout` | Huỷ refresh token |
| `GET`  | `/api/me` | Profile + settings (lang, theme, notifications) |
| `PATCH`| `/api/me` | Update settings (lang, theme, display_name, avatar) |
| `GET`  | `/api/users/:id` | Public profile của user khác |
| `GET`  | `/api/elo/:userId?variant=standard` | ELO + stats |
| `GET`  | `/api/games?cursor=&limit=20&filter=` | Lịch sử ván (của me) |
| `GET`  | `/api/games/:id` | Chi tiết ván + chat history |
| `POST` | `/api/games` | (server-only — không gọi từ client) |
| `GET`  | `/api/leaderboard?scope=global\|week\|friends&variant=` | BXH |
| `GET`  | `/api/tournaments?state=live\|upcoming` | List giải |
| `POST` | `/api/tournaments/:id/join` | Đăng ký |
| `GET`  | `/api/tournaments/:id` | Detail + bracket / pairings |
| `POST` | `/api/challenges` | Tạo phòng custom → trả `{code, expiresAt, hasPassword}`. Body: `{variant, timeInitialMs, timeIncMs, creatorSide, password?, ttlMinutes, notes?}` |
| `GET`  | `/api/challenges/:code` | Lookup phòng (chưa cần auth) → trả `{variant, time, creator:{id,name,elo}, hasPassword, expiresAt}`. Không bao giờ trả password hash. |
| `POST` | `/api/challenges/:code/join` | Vào phòng. Body: `{password?}`. Server verify hash → trả `{gameId}` để client connect WS. Sai pass = 403. Hết hạn = 410. Đầy = 409. |
| `DELETE`| `/api/challenges/:code` | Huỷ phòng (chỉ creator, khi chưa có người vào) |
| `GET`  | `/api/challenges/mine` | Liệt kê phòng đang mở của tôi |
| `GET`  | `/api/daily` | Puzzle hôm nay |
| `POST` | `/api/daily/attempt` | Submit lời giải |
| `GET`  | `/api/super-ai/quota` | Lượt còn lại tuần này |
| `POST` | `/api/super-ai/start` | Bắt đầu ván (kiểm quota) |
| `POST` | `/api/report` | Tố cáo người chơi (gian lận, ngôn từ) |

Mọi endpoint trừ `/auth/*` yêu cầu `Authorization: Bearer <jwt>`.

#### 9.3.3. WebSocket protocol (`/ws`)

Ngay sau khi connect, client gửi `{type:"auth", token:"<jwt>"}`. Server trả `{type:"ready"}`.

**Client → Server**
```ts
| { type:"queue.join", mode, variant, time }
| { type:"queue.leave" }
| { type:"game.move", gameId, from, to, reveal? }     // reveal cho cờ úp
| { type:"game.resign", gameId }
| { type:"game.draw_offer", gameId }
| { type:"game.draw_response", gameId, accept:bool }
| { type:"game.takeback_request", gameId }            // chỉ vs Bot/Custom
| { type:"chat.send", gameId, text }
| { type:"chat.typing", gameId, on:bool }
| { type:"presence.heartbeat" }                       // mỗi 25s
```

**Server → Client**
```ts
| { type:"queue.matched", gameId, opponent }
| { type:"game.state", gameId, fen, side, clocks, lastMove }
| { type:"game.moved", gameId, move, fen, clocks, check?, mate? }
| { type:"game.ended", gameId, result, termination, eloDelta }
| { type:"game.draw_offered", gameId, by }
| { type:"chat.message", gameId, sender, text, sentAt }
| { type:"chat.typing", gameId, sender, on }
| { type:"presence.update", userId, online }
| { type:"error", code, message }
```

#### 9.3.4. Chống gian lận
- Server **re-validate mọi nước** qua module `rules.js` (chia sẻ giữa client + server, chạy Node).
- Engine usage detection: tính match-rate với engine reference (chính engine Lv9 của ta), flag soft nếu > 92% trong > 30 ván Ranked, đẩy queue review thủ công.
- Rate limit: 1 ván ranked đang chơi / user. 60 nước/phút (chống bot client). 30 chat msg/phút.
- Disconnect grace: 30s không tính thua, sau đó tiêu hao đồng hồ thật.
- Clock drift: server là source of truth, mỗi nước payload có `serverTimeMs`, client chỉ smoothing.

#### 9.3.5. Chat moderation (đi kèm chat realtime — quyết định chốt)
- Filter từ ngữ thô tục Việt + Anh ở server trước khi broadcast.
- Tự động ẩn message bị filter, gửi `{type:"chat.blocked", reason}` về sender.
- Nếu user nhận ≥ 3 báo cáo trong 7 ngày → mute chat 24h.
- Người dùng có thể tắt chat ván hiện tại bằng nút 🔕 (vẫn nhận được broadcast result/draw_offer).
- Tin nhắn lưu 30 ngày để moderation xem lại, sau đó xoá.

---

## 10. Thiết kế hình ảnh & tương tác

### 10.1. Hệ màu

```css
--bg-deep:     #0a0e1a;
--bg-surface:  #131a2b;
--bg-elevated: #1c2540;
--accent-red:  #e63946;   /* phe Đỏ, accent chính */
--accent-gold: #f4c430;   /* highlight, win */
--accent-jade: #06d6a0;   /* phe Đen (xanh ngọc — không dùng đỏ-xanh dễ nhầm) */
--text:        #e9ecef;
--text-mute:   #8a93a8;
--border:      rgba(255,255,255,0.08);
--glass:       rgba(255,255,255,0.04);
```

> Phe Đen vẽ bằng tông xanh ngọc / xám đậm, không dùng đen tuyền — dễ thấy trên nền tối.

### 10.2. Bàn cờ
- Render bằng **SVG** — sắc nét mọi DPI, dễ animate, không cần canvas redraw mỗi frame.
- Quân là `<g>` SVG có `<text>` chữ Hán + viền.
- Sông giữa có chữ "楚 河 漢 界" mờ.
- Cung có dấu chéo X.
- Highlights: ô vừa đi (gold glow), ô khả dĩ (jade dot), ô bị chiếu (red pulse).

### 10.3. Animation
- Di chuyển quân: 220ms ease-out, có shadow drop.
- Ăn quân: quân bị ăn `scale(1)→scale(0)` + fade 180ms.
- Lật quân (cờ úp): rotateY(180°) 400ms cubic-bezier.
- Chiếu hết: zoom + flash gold 600ms.

### 10.4. Sound (tuỳ chọn, có nút mute)
- `move.mp3` — nước thường (gõ nhẹ).
- `capture.mp3` — ăn quân (gỗ va mạnh).
- `check.mp3` — bị chiếu (chuông).
- `win.mp3` — thắng (gong + cheer).

### 10.5. Responsive
- Desktop: bàn cờ trái, panel phải (timer, lịch sử nước, chat).
- Tablet: bàn cờ trên, panel dưới (tabs).
- Mobile: bàn cờ full width (giữ tỷ lệ 9:10), panel collapse thành bottom sheet.

---

## 10A. Đa ngôn ngữ — i18n (EN / VN, đã chốt)

Hỗ trợ **2 ngôn ngữ ngay từ launch**: Tiếng Việt (`vi`, default) và Tiếng Anh (`en`).

### 10A.1. Cấu trúc dictionary

```
scripts/i18n/
├── i18n.js              # core, t() function
├── locales/
│   ├── vi.json          # nguồn chính
│   └── en.json
└── fallback.js          # fallback chain: en → vi
```

Mỗi key dùng namespace flat:

```json
// vi.json (một phần)
{
  "nav.home": "Trang chủ",
  "nav.leaderboard": "Xếp hạng",
  "mode.quick": "Chơi nhanh",
  "mode.ranked": "Đấu xếp hạng",
  "mode.bot": "Đấu Bot",
  "rank.tap_su": "Tập Sự",
  "rank.bac": "Bạc",
  "result.checkmate": "Chiếu hết",
  "ai.level": "Cấp độ {level} — {name}",
  "chat.placeholder": "Gõ tin nhắn… (cấm spam, fairplay)",
  "elo.provisional": "Đang xác định trình độ",
  "blind.flip_hint": "Chạm 1 quân úp để lật"
}
```

```json
// en.json
{
  "nav.home": "Home",
  "nav.leaderboard": "Leaderboard",
  "mode.quick": "Quick Play",
  "mode.ranked": "Ranked",
  "mode.bot": "Vs Bot",
  "rank.tap_su": "Apprentice",
  "rank.bac": "Silver",
  "result.checkmate": "Checkmate",
  "ai.level": "Level {level} — {name}",
  "chat.placeholder": "Type a message… (no spam, play fair)",
  "elo.provisional": "Calibrating",
  "blind.flip_hint": "Tap a face-down piece to flip"
}
```

### 10A.2. API client-side

```js
import { t, setLang, getLang, onChange } from './i18n.js';
t('nav.home');                                  // → "Trang chủ"
t('ai.level', { level: 7, name: t('ai.lv7') });
setLang('en');                                  // persist localStorage + PATCH /api/me
```

### 10A.3. Phạm vi dịch
- Toàn bộ UI: nav, button, label, modal, toast, tutorial.
- Notation nước đi: thêm option `notation: 'vi' | 'en' | 'cn'` (Việt P2-5 / English ICCS h2e2 / Chinese 炮二平五) — độc lập với ngôn ngữ giao diện.
- Tên rank, badge, achievement.
- Tooltip, error message.
- Email transactional (welcome, daily reset, badge unlocked).

### 10A.4. Không dịch
- Tên người dùng (display_name).
- Chat của user (raw).
- Chữ Hán trên quân cờ — luôn giữ ký tự gốc 帥/將/俥/車...

### 10A.5. Logic phát hiện ngôn ngữ
1. Nếu user đã đăng nhập → `users.lang` từ DB.
2. Nếu chưa → `localStorage.xq_lang`.
3. Fallback → `navigator.language` (`vi-*` → `vi`, ngược lại → `en`).
4. Switcher ở topbar (🌐 VN / EN) đổi ngay realtime, không cần reload.

---

## 10B. Theme — Sáng / Tối / Auto (đã chốt)

Có 3 chế độ:
- **Tối** (`dark`) — mặc định cho người dùng mới (đẹp, đỡ chói).
- **Sáng** (`light`) — phong cách giấy gỗ truyền thống.
- **Tự động** (`auto`) — theo `prefers-color-scheme` của OS.

### 10B.1. Cơ chế kỹ thuật

Mọi màu định nghĩa qua **CSS custom properties** trong `:root` (dark) và override trong `[data-theme="light"]`.

```css
:root {
  --bg-deep: #0a0e1a;
  --bg-surface: #131a2b;
  --text: #e9ecef;
  /* ... */
}
[data-theme="light"] {
  --bg-deep: #f5e9d4;
  --bg-surface: #fdf6e7;
  --bg-elevated: #fff;
  --bg-glass: rgba(0,0,0,0.03);
  --text: #2a1f12;
  --text-mute: #6b5d49;
  --border: rgba(0,0,0,0.08);
  /* accent-red, accent-gold, accent-jade giữ nguyên (đậm hơn 1 chút) */
  --accent-red: #c81d2c;
  --accent-jade: #058861;
}
```

JS toggle:
```js
function applyTheme(mode) {
  const real = mode === 'auto'
    ? (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
    : mode;
  document.documentElement.dataset.theme = real;
  localStorage.setItem('xq_theme', mode);
  // sync up nếu đã login
  fetch('/api/me', { method:'PATCH', body: JSON.stringify({ theme: mode }), ... });
}
```

### 10B.2. Theme cho bàn cờ
- **Dark**: nền gỗ trầm `#d4a373` đỡ chói trên trang dark.
- **Light**: nền giấy `#f0d9a8` đậm hơn, viền `#5c3a1e` rõ.
- Quân cờ: cùng SVG, chữ Hán đỏ `#b00020` cho Đỏ, đen `#06302a` cho Đen — đủ contrast trên cả 2 theme.

### 10B.3. Theme cho components đặc biệt
- Eval bar, hint card: cùng tông accent đỏ-vàng-jade nhưng saturation cao hơn ở light mode.
- Modal backdrop: dark mode `rgba(5,8,15,0.7)`, light mode `rgba(50,30,15,0.4)`.
- Shadow ở light mode dùng `rgba(40,20,5,0.15)` thay vì pure black.

### 10B.4. Animation chuyển theme
- Toggle ở topbar có animation mặt trời ↔ mặt trăng 0.3s.
- Body có `transition: background-color 0.25s ease` để tránh flash.
- Tôn trọng `prefers-reduced-motion`: tắt transition.

---

## 11. Accessibility (a11y)
- Tab navigation đầy đủ, nước đi bằng bàn phím (chọn ô bằng arrow + Enter).
- Aria-label cho mỗi quân ("Pháo đỏ ở cột 2 hàng 8").
- Mode "high contrast" — viền quân dày hơn.
- Mode "no animation" — tôn trọng `prefers-reduced-motion`.

---

## 12. Roadmap & milestones

| Tuần | Mốc | Sản phẩm |
|---|---|---|
| 1   | Engine cốt lõi   | rules.js + moves.js + bàn render SVG, 2 người cùng máy |
| 2   | AI lv1–5         | Worker, eval cơ bản, minimax depth 3 |
| 3   | UI / UX          | Home, Modal AI, Replay, History local |
| 4   | ELO local        | ELO calc, rank UI, lưu localStorage |
| 5   | Online MVP       | WebSocket matchmaking, sync lưu backend |
| 6   | AI lv6–10        | TT, opening book, iterative deep, killer |
| 7   | Cờ Úp            | Variant blind + animation lật |
| 8   | Tournament + Challenge code |
| 9   | Daily challenge + Siêu AI weekly limit |
| 10  | Polish, sound, a11y, hardening |

---

## 13. Risks & quyết định đã chốt

### 13.1. Rủi ro

| Rủi ro | Mức | Giải pháp |
|---|---|---|
| AI lv10 chậm trên mobile cũ | Cao | Giảm depth động theo CPU benchmark, hoặc dồn về server |
| Anti-cheat khó với engine bên ngoài | Trung | Chỉ flag soft, review thủ công khi đủ report |
| Thiết kế cờ úp dễ rối với người mới | Trung | Tutorial 30s + tooltip ở quân úp |
| Bandwidth WS với chat + realtime | Thấp | Mỗi nước ~80B, chat ~120B, lazy reconnect, msg/s rate limit |
| Moderation chat khi launch quốc tế (EN) | Trung | Profanity filter VI + EN ngay v1, queue review thủ công cho ngôn ngữ khác |
| Backend từ con số 0 chậm timeline | Cao | Phase 1 chỉ làm auth + games + elo (3 tuần), Phase 2 thêm tournament/chat (2 tuần) |

### 13.2. Quyết định đã chốt với product owner

| # | Hạng mục | Quyết định |
|---|---|---|
| 1 | Backend & Auth | **Dựng mới hoàn toàn** — Node 20 + TS + Postgres + Redis. Auth = Email/Password (Argon2id) + Google OAuth. JWT 30 ngày + refresh cookie. |
| 2 | ELO khởi điểm | **1200** (10 ván đầu hiển thị nhãn "Đang xác định trình độ", K=40) |
| 3 | Luật cờ úp | Xáo random **toàn bộ 30 quân trừ 2 Tướng** (Tướng giữ nguyên ở cung). Seed sinh server, hash công bố ngay đầu ván, reveal sau ván. |
| 4 | Chat realtime trong ván | **Có** — qua WebSocket. Profanity filter VI + EN. Lưu 30 ngày. Auto-mute khi ≥3 report/7 ngày. Người dùng có thể tắt chat ván hiện tại. |
| 5 | Đa ngôn ngữ | **EN + VN ngay từ launch**. Detect theo OS lang (vi-*→vi, else→en) cho user mới, sau đó persist `users.lang`. Switcher ở topbar đổi không cần reload. |
| 6 | Theme | **Dark + Light + Auto**. Mặc định Dark. Auto theo `prefers-color-scheme`. Persist `users.theme`. Toggle ở topbar có animation 🌙↔☀️. |
