# Cờ Tướng Vương — Function List

Liệt kê các module / hàm chính. Đây là blueprint cho phase code, mỗi mục có:
**chữ ký gợi ý → mô tả → file dự kiến**.

Tổng cộng ~140 function trải trên 9 nhóm module.

---

## 1. CORE — Game state & rules

### 1.1. `core/board.js` — Trạng thái bàn cờ

```js
createInitialBoard(variant)          // → Board state. variant: 'standard' | 'blind'
cloneBoard(board)                    // → deep clone
boardAt(board, file, rank)           // → piece | null
setBoardAt(board, file, rank, p)     // mutate (cẩn trọng)
applyMove(board, move)               // → newBoard (immutable)
undoMove(board, move, capturedPiece) // → newBoard (cho replay back)
getMoveHistory(board)                // → Move[]
getCurrentSide(board)                // → 'r' | 'b'
isInsidePalace(file, rank, side)     // → bool (cung 3×3)
isAcrossRiver(file, rank, side)      // → bool
toFEN(board)                         // → "FEN-Xiangqi" string (lưu/load)
fromFEN(fen)                         // → Board
```

### 1.2. `core/rules.js` — Luật cờ

```js
isLegalMove(board, move)             // → bool. Bao gồm check-after, lộ tướng, cấm chiếu lặp
isCheck(board, side)                 // → bool. Tướng `side` đang bị chiếu?
isCheckmate(board, side)             // → bool. side hết nước hợp lệ + đang bị chiếu
isStalemate(board, side)             // → bool. hết nước hợp lệ + KHÔNG bị chiếu (cờ tướng = thua bên đi)
isFacingGenerals(board)              // → bool. Lộ tướng (2 Tướng nhìn nhau)
isPerpetualCheck(history, depth)     // → bool. Tam điệp bại — chiếu lặp 3 lần
isThreefoldRepetition(history)       // → bool
is60MoveDraw(history)                // → bool. 60 nước không bắt quân
detectGameResult(board, history)     // → 'red-win' | 'black-win' | 'draw' | 'ongoing'
```

### 1.3. `core/moves.js` — Sinh nước đi

```js
generatePseudoLegalMoves(board, side)         // → Move[] không kiểm tra check
generateLegalMoves(board, side)               // → Move[] đã lọc
generateMovesForPiece(board, piece, file, rank)
movesForGeneral(board, file, rank)            // Tướng: 1 ô trong cung, không lộ tướng
movesForAdvisor(board, file, rank)            // Sĩ: chéo trong cung
movesForElephant(board, file, rank)           // Tượng: 田, không qua sông, không bị cản mắt
movesForHorse(board, file, rank)              // Mã: 日, kiểm tra cản chân
movesForChariot(board, file, rank)            // Xe: dọc/ngang
movesForCannon(board, file, rank)             // Pháo: đi như Xe khi không ăn, ăn cần 1 ngòi
movesForPawn(board, file, rank)               // Tốt: thẳng, sau sông được ngang
```

### 1.4. `core/notation.js` — Ký pháp

```js
moveToICCS(move)             // → "h2e2"  (file-rank-file-rank, chuẩn quốc tế)
iccsToMove(s, board)         // → Move
moveToWXF(move, board)       // → "炮二平五" (Vietnam/China text)
moveToVN(move, board)        // → "P2-5" (Vietnam ngắn)
formatMoveLog(move, side)    // → string hiển thị bảng nước đi
parsePGN(pgn)                // → { meta, moves[] }
toPGN(game)                  // → string
```

### 1.5. `core/zobrist.js` — Hash thế cờ

```js
initZobristTable(seed)       // sinh table 14 piece × 90 squares = 1260 random64
hashBoard(board)             // → BigInt
incrementalHash(prev, move)  // cập nhật hash sau 1 nước (XOR)
```

---

## 2. AI — Engine & search

### 2.1. `ai/ai.worker.js` — Web Worker entry

```js
// Chạy trong worker, lắng nghe postMessage
onMessage(e) {
  switch (e.data.cmd) {
    case 'config':   configEngine(e.data.opts);
    case 'search':   searchBestMove(e.data.fen, e.data.timeMs);
    case 'stop':     stopSearch();
    case 'eval':     postEval(e.data.fen);
  }
}
```

### 2.2. `ai/eval.js` — Hàm đánh giá

```js
evaluate(board, side)               // → centipawn từ góc nhìn `side`
materialScore(board)
positionScore(board)                // PST sum
mobilityScore(board, side)
kingSafetyScore(board, side)
pawnStructureScore(board, side)
threatScore(board, side)            // bonus khi đe dọa Tướng/quân giá trị
endgameScale(board)                 // 0..1, càng tàn càng cao → trọng số khác
```

### 2.3. `ai/search.js` — Tìm kiếm

```js
searchBestMove(board, depth, timeMs, opts)   // → { move, eval, pv[] }
minimax(board, depth, alpha, beta, side)
quiescenceSearch(board, alpha, beta, side)   // mở rộng các nước ăn quân/chiếu
iterativeDeepening(board, maxDepth, timeMs)
orderMoves(moves, ttMove, killers, history)  // sắp xếp để cắt α-β tốt
isQuietPosition(board)
```

### 2.4. `ai/tt.js` — Transposition table

```js
TT.get(hash)               // → entry | null
TT.put(hash, depth, eval, flag, bestMove)   // flag: EXACT|LOWER|UPPER
TT.clear()
TT.size()
```

### 2.5. `ai/openings/*.json`

Format mỗi file:
```json
{
  "name": "Pháo Đầu",
  "lines": [
    { "moves": ["h2e2"], "weight": 100, "name": "Pháo đầu" },
    { "moves": ["h2e2","b9c7"], "weight": 80, "name": "Pháo đầu vs Bình phong mã" }
  ]
}
```

```js
loadOpeningBook()                            // → OpeningBook
findBookMove(book, history, style)           // → move | null
```

### 2.6. `ai/personality.js`

```js
applyPersonality(weights, mode)
// mode: 'attack' | 'defense' | 'balanced'
// → điều chỉnh trọng số king-safety, mobility, threat
```

---

## 3. VARIANTS

### 3.1. `variants/standard.js`
Wrapper gọi rules + moves chuẩn — không có gì đặc biệt.

### 3.2. `variants/blind.js` — Cờ Tướng Úp

```js
shuffleHiddenPieces(seed)            // xáo toàn bộ trừ 2 Tướng
revealPiece(board, file, rank)       // lật 1 quân úp, đánh dấu revealed=true
canMovePiece(board, piece)           // chỉ quân đã lật mới đi được
generateBlindMoves(board, side)      // gồm cả nước "lật quân tại (f,r)"
applyReveal(board, file, rank)
```

---

## 4. ELO

### 4.1. `elo/elo.js`

```js
calculateExpectedScore(myRating, opRating)    // → 0..1
calculateNewRating(rating, expected, actual, kFactor)
getKFactor(rating, gamesPlayed)               // 40 / 24 / 16
getRank(rating)                               // → { name, icon, color, range }
isProvisional(gamesPlayed)                    // → bool (10 ván đầu)
ratingChangeBlock(myR, opR, k, result)        // → +ΔR / -ΔR cho hiển thị
```

---

## 5. UI — Màn hình & component

### 5.1. `ui/home.js`

```js
renderHome()
showQuickPlayPanel()
showRankedPanel()
showCustomGameModal()
showVariantToggle()           // Ngửa / Úp
ctaPlay(mode, options)        // route → matching/AI
```

### 5.2. `ui/game.js`

```js
mountGameView(opts)
renderBoardSVG(board)
selectSquare(file, rank)
highlightLegalMoves(moves)
playMoveAnim(move, captured)
playCheckAnim()
playCheckmateAnim(winner)
showEndGameDialog(result, eloDelta)
toggleAnalysisHints(on)
```

### 5.3. `ui/ai-modal.js`

```js
openAIModal()
renderLevelSlider(level)
renderPersonalitySelect(value)
renderOpeningStyle(value)        // chỉ visible khi level>=7
renderTimeControl(value)
applyAndStart(config)
```

### 5.4. `ui/replay.js`

```js
mountReplay(gameRecord)
seekToMove(index)
playReplay(speed)
pauseReplay()
toggleAnalysis()
exportPGN(game)
```

### 5.5. `ui/history.js`

```js
mountHistory()
loadGames(filter)            // filter: { mode, variant, result, opponent }
renderGameRow(game)
openGameDetail(id)
deleteGameLocal(id)
```

### 5.6. `ui/leaderboard.js`

```js
mountLeaderboard(scope)      // global | week | friends
fetchAndRender(scope)
renderRow(rank, user)
showProfilePopup(userId)
```

### 5.7. `ui/tournament.js`

```js
mountTournamentList()
renderTournamentCard(t)
openTournamentDetail(id)
joinTournament(id)
renderBracket(t)
renderSwissPairings(round)
```

### 5.8. `ui/profile.js`

```js
mountProfile(userId)
renderEloChart(history)
renderStats(stats)            // win/loss/draw, by variant, by opponent type
renderBadges(badges)
renderRecentGames(games)
```

### 5.9. `ui/toast.js`

```js
toast(message, type)          // type: info|success|warn|error
confirm(opts)                 // → Promise<bool>
modal({title, body, actions}) // generic modal
```

---

## 6. NETWORKING

### 6.1. `net/api.js`

```js
api.get(path, opts)
api.post(path, body, opts)
api.del(path)
api.profile()
api.history(cursor)
api.saveGame(record)
api.leaderboard(scope)
api.daily()
```

### 6.2. `net/ws-client.js`

```js
WS.connect(token)
WS.onMessage(handler)
WS.send(type, payload)
WS.disconnect()
WS.onReconnect(handler)
// Message types: join, joined, move, moved, chat, resign, draw_offer, draw_response, end
```

### 6.3. `net/matchmaker.js`

```js
findMatch({ mode, variant, time, eloRange })   // → Promise<MatchInfo>
cancelMatch()

// Custom rooms — có password optional
createChallengeRoom({
  variant,                  // 'standard' | 'blind'
  timeInitialMs,            // 60_000..3_600_000
  timeIncMs,                // 0..60_000
  creatorSide,              // 'red' | 'black' | 'random'
  password,                 // string | null  (default null = phòng public)
  ttlMinutes,               // 15 | 30 | 60 | 1440
  notes                     // string | null
})
// → { code, expiresAt, hasPassword, shareUrl }

lookupChallengeRoom(code)
// → { variant, time, creator:{id,name,elo,rank}, hasPassword, expiresAt }
// → throw NotFoundError | ExpiredError | OccupiedError

joinChallengeRoom(code, password = null)
// → { gameId } khi pass đúng / phòng public
// → throw WrongPasswordError (kèm `attemptsLeft`)
// → throw RateLimitError (sau 5 lần sai)

cancelChallengeRoom(code)                       // chỉ creator
listMyOpenRooms()                               // → ChallengeRoom[]
```

### 6.4. `ui/create-room.js`

```js
openCreateRoomModal()
renderTimePresets(selected)                     // 8 preset + custom
renderCustomTimeSliders(initial, inc)
validatePassword(s)                             // null = OK; '' = no pass; min 4 ký tự nếu set
onSubmit(formData)                              // gọi matchmaker.createChallengeRoom
showShareDialog({ code, shareUrl, hasPassword })
copyToClipboard(text)
generateQR(text)                                // dùng qrcode-svg để render inline SVG, không cần thư viện ngoài
```

### 6.5. `ui/join-room.js`

```js
openJoinRoomModal(prefillCode = null)           // prefill khi đến từ deep link #/join/CODE
renderCodeInput()                               // 6 ô single-char auto-focus
onCodeSubmit(code)                              // gọi lookupChallengeRoom
renderPasswordPrompt(roomInfo)                  // chỉ hiện nếu hasPassword
shakeOnWrongPassword(attemptsLeft)
onJoinSuccess(gameId)                           // route → /game/:id
```

---

## 7. STORAGE

### 7.1. `storage/local.js`

```js
LS.getProfile()
LS.setProfile(p)
LS.appendGame(g)              // history local
LS.listGames(filter)
LS.getGame(id)
LS.deleteGame(id)
LS.getSettings()              // theme, sound, hint, lang
LS.setSettings(s)
```

### 7.2. `storage/sync.js`

```js
sync.syncProfile()            // pull/push
sync.syncGames()              // upload pending
sync.queuePending(game)       // offline queue
sync.flush()
```

---

## 8. HỖ TRỢ — Helpers / Util

### 8.1. `util/seed.js`

```js
hashStringToSeed(str)
mulberry32(seed)              // PRNG ổn định
shuffle(arr, prng)
```

### 8.2. `util/time.js`

```js
formatClockMs(ms)             // "12:34"
formatRelative(ts)            // "3 phút trước"
parseDuration("3+2")          // → { initialMs, incMs }
```

### 8.3. `util/event.js`

```js
EventBus.on(name, h)
EventBus.off(name, h)
EventBus.emit(name, payload)
```

### 8.4. `util/dom.js`

```js
$(sel, root)
$$(sel, root)
el(tag, attrs, ...children)
on(node, event, handler, opts)
```

---

## 8A. AUTH — Đăng nhập / đăng ký (backend + client)

### 8A.1. `auth/auth-client.js`

```js
auth.register({ email, password, displayName, captcha })   // → { jwt }
auth.login({ email, password })                            // → { jwt, refreshSet }
auth.loginGoogle(idToken)                                  // → { jwt }
auth.refresh()                                             // → { jwt }; dùng cookie HttpOnly
auth.logout()
auth.getJwt()                                              // → string | null
auth.getUser()                                             // → User | null
auth.onAuthChange(handler)                                 // event: login/logout
auth.requireAuth(redirect = '#/home')                      // guard route
```

### 8A.2. Server endpoints (Node + TS)

```ts
POST /api/auth/register      // body: { email, password, displayName, captcha }
POST /api/auth/login         // body: { email, password }
POST /api/auth/google        // body: { code | idToken }
POST /api/auth/refresh       // cookie-only
POST /api/auth/logout
GET  /api/me
PATCH /api/me                // body: { lang?, theme?, displayName?, avatarUrl? }
```

Kèm middleware:
```ts
authMiddleware(req)           // verify JWT → req.user
rateLimiter(scope, limit)     // redis-cell
captchaCheck(token)
```

---

## 8B. CHAT — Realtime trong ván

### 8B.1. `chat/chat.js` (client)

```js
Chat.mount(gameId, panelEl)                  // bind UI
Chat.send(text)                              // qua WS
Chat.sendQuickReaction(code)                 // 👋👍🎉🤝🙏
Chat.toggleMute(on)                          // tắt nhận trong ván hiện tại
Chat.report(messageId, reason)
Chat.onMessage(handler)                      // gọi khi WS push
Chat.onTyping(handler)
Chat.flushOnDisconnect()                     // queue offline
```

### 8B.2. `chat/profanity.js` (client soft filter)

```js
softMaskProfanity(text, lang)                // → text với từ tục bị thay ***
hasProfanity(text, lang)                     // bool — chỉ để UI cảnh báo trước khi gửi
```

### 8B.3. Server-side (Node)

```ts
ChatModerator.scan(text, lang) → {
  blocked: boolean,
  reason?: 'profanity'|'spam'|'phishing',
  cleanedText?: string
}
ChatModerator.recordReport(messageId, reporterId, reason)
ChatModerator.checkAutoMute(userId)          // nếu ≥3 report/7d → mute 24h
```

---

## 8C. I18N — Đa ngôn ngữ

### 8C.1. `i18n/i18n.js`

```js
i18n.init({ defaultLang: 'vi', supported: ['vi','en'] })
i18n.t(key, params)                          // → string
i18n.tn(key, count, params)                  // pluralization
i18n.setLang(lang)                           // đổi ngay + persist
i18n.getLang()
i18n.detect()                                // navigator.language → 'vi'|'en'
i18n.onChange(handler)                       // gọi khi đổi lang
i18n.format.date(d, opts)                    // theo locale
i18n.format.time(d)
i18n.format.relative(d)                      // "3 phút trước" / "3 minutes ago"
i18n.format.number(n)
```

### 8C.2. `i18n/locales/{vi|en}.json`

Flat-key. ~600 keys ở v1. Namespace bằng dấu `.`:
- `nav.*`, `mode.*`, `rank.*`, `result.*`, `error.*`, `chat.*`, `tutorial.*`, `tournament.*`, `daily.*`, `replay.*`, `ai.*`, `setting.*`, `auth.*`

### 8C.3. CI script

```bash
node scripts/i18n-check.mjs
# - báo lỗi nếu vi.json có key thiếu trong en.json (hoặc ngược lại)
# - báo lỗi nếu placeholder {x} không khớp giữa 2 file
# - báo warning nếu giá trị en === vi (chưa dịch)
```

---

## 8D. THEME — Dark / Light / Auto

### 8D.1. `theme/theme.js`

```js
Theme.init()                                 // đọc localStorage + apply ngay (chống flash)
Theme.set(mode)                              // 'dark'|'light'|'auto' → cập nhật document, persist, sync server
Theme.get()                                  // → mode đã chọn
Theme.getEffective()                         // → 'dark'|'light' (auto đã resolve)
Theme.onChange(handler)                      // pub/sub
Theme.matchOSChange()                        // listen prefers-color-scheme
```

### 8D.2. CSS structure

`styles/theme.css` chứa cả 2 bộ token:

```css
:root            { /* dark tokens (mặc định) */ }
[data-theme=light] { /* override tokens */ }
```

`theme.js` chỉ set `document.documentElement.dataset.theme = effective`.

### 8D.3. Boot ordering

Để tránh "flash of wrong theme":
1. Trong `<head>` chèn inline script đọc `localStorage.xq_theme` rồi set `dataset.theme` **trước khi** stylesheet load xong.
2. `Theme.init()` chạy lại sau khi DOM ready để lắng nghe OS change.

---

## 9. ENTRY POINT — `main.js`

```js
boot()                                   // gọi sau DOMContentLoaded
detectAuth()                             // dùng game-platform.js (Google SSO)
loadSettings()
mountRouter()                            // hash router: #/home, #/game/:id, #/replay/:id, #/history, #/leaderboard, #/tournament, #/profile
registerServiceWorker()                  // offline cache (PWA optional)
warmUpAIWorker()                         // load worker sẵn để bắt đầu nhanh
```

---

## 10. Đầu vào / đầu ra dữ liệu

### 10.1. Move object

```ts
type Move = {
  from: { file: 0..8, rank: 0..9 },
  to:   { file: 0..8, rank: 0..9 },
  piece: 'K'|'A'|'E'|'H'|'R'|'C'|'P', // King/Advisor/Elephant/Horse/Rook/Cannon/Pawn
  side: 'r'|'b',
  captured?: Piece,
  reveal?: { file, rank, piece },     // chỉ cho cờ úp
  check?: bool,
  checkmate?: bool,
  iccs?: string,
  san?: string,
  tsMs?: number,                       // ms tiêu tốn cho nước này
}
```

### 10.2. Piece object

```ts
type Piece = {
  type: 'K'|'A'|'E'|'H'|'R'|'C'|'P',
  side: 'r'|'b',
  hidden?: bool,                       // chỉ cờ úp
}
```

### 10.3. Board state

```ts
type Board = {
  squares: (Piece|null)[][],   // 9 cols × 10 rows; squares[file][rank]
  side: 'r'|'b',               // ai đi tiếp
  variant: 'standard'|'blind',
  history: Move[],
  fullmove: number,
  halfmoveSinceCapture: number, // dùng cho luật 60 nước
  zobrist?: bigint,
}
```

---

## 11. Tổng kết

- **Module count**: 13 nhóm (core, ai, variants, elo, ui, net, storage, util, auth, chat, i18n, theme, main), ~38 file source.
- **Function count**: ~180 hàm (đã tính auth + chat + i18n + theme).
- **Test priority**:
  - `core/rules.js` + `core/moves.js` + `elo/elo.js` (unit test 100% coverage).
  - `auth/*` (security paths: rate-limit bypass, JWT forgery).
  - `chat/profanity.js` + server `ChatModerator` (snapshot test các từ phổ biến VI + EN).
  - `i18n/i18n.js` (placeholder, plural, fallback chain).
- **Performance budget**:
  - `generateLegalMoves` < 0.5ms ở thế cờ giữa game.
  - AI lv10 search depth 5 < 6s trên CPU mid-tier (M1 / Ryzen 5 đời mới).
  - `renderBoardSVG` first paint < 100ms.
  - `Theme.init()` chạy < 5ms (inline script ở `<head>`, chống flash).
  - `i18n.t()` < 0.05ms — chỉ object lookup.
  - WS RTT P95 < 120ms từ VN, < 250ms quốc tế.
