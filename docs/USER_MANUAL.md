# Cờ Tướng Vương — Hướng dẫn người dùng

> Phiên bản: Design draft | Ngày: 2026-05-08

---

## Mục lục
1. Bắt đầu nhanh
2. Giao diện chính
3. Luật cờ tướng cơ bản
4. Cách di chuyển từng quân
5. Các chế độ chơi
6. Cờ Tướng Úp — luật riêng
7. Đấu với Bot — chọn cấp độ
8. Đấu Online — matchmaking & thách đấu
9. ELO & xếp hạng
10. Lịch sử & Replay
11. Giải đấu, Daily Challenge, Siêu AI
12. Cài đặt & cá nhân hoá
13. Phím tắt
14. Câu hỏi thường gặp

---

## 1. Bắt đầu nhanh

1. Mở `https://allin1site.com/games/xiangqi/` (hoặc bấm vào lobby tổng).
2. Bấm **CHƠI NGAY** → game đề xuất chế độ phù hợp dựa trên trình độ (ngầm phát hiện).
3. Người mới: chọn **Vs Bot — Tập Sự (Lv 1)** để học luật.
4. Người đã biết: chọn **Quick Play (Online)** để ghép trận theo ELO.

> Có thể chơi mà không cần đăng nhập — tiến trình lưu local. Đăng nhập để đồng bộ ELO/lịch sử lên cloud.

---

## 2. Giao diện chính

Khi vào game bạn sẽ thấy:

- **Bàn cờ** ở giữa, kích thước tự co theo màn hình.
- **Đồng hồ** mỗi bên (góc trên/dưới với mobile, hai bên với desktop).
- **Bảng nước đi** liệt kê từng nước (ICCS hoặc tiếng Việt — đổi trong Cài đặt).
- **Thanh hành động**: ⚙️ Cài đặt · 🤝 Xin hoà · 🚩 Đầu hàng · 💬 Chat (online) · 🔁 Xoay bàn.
- **Đèn lượt**: viền sáng đỏ hoặc xanh ngọc cho biết bên nào đang đi.

Trên mobile, panel phải chuyển thành bottom sheet — vuốt lên để xem nước đi / chat.

---

## 3. Luật cờ tướng cơ bản

- Bàn cờ **9 cột × 10 hàng**, có **sông** ngang giữa (giữa hàng 5 và 6).
- Mỗi bên có **cung 3×3** ở giữa hàng cuối — Tướng và Sĩ chỉ đi trong cung.
- Mục tiêu: **chiếu hết** Tướng đối phương, hoặc khiến đối phương không còn nước đi hợp lệ.
- **Đỏ đi trước**, sau đó luân phiên.
- **Lộ Tướng**: hai Tướng không được nhìn thẳng nhau qua đường dọc rỗng.
- **Tam điệp bại**: chiếu lặp đi lặp lại 3 lần — bên chiếu xử thua.
- **60 nước không bắt quân** → hoà.

Game tự động phát hiện chiếu, chiếu hết, hoà, lộ tướng — bạn không cần lo nhớ luật, hệ thống sẽ chặn nước đi sai.

---

## 4. Cách di chuyển từng quân

| Quân | Hán | Cách đi |
|---|---|---|
| **Tướng** (帥/將) | 1 ô dọc/ngang **trong cung**. Không lộ tướng. |
| **Sĩ** (仕/士)   | 1 ô **chéo** trong cung. |
| **Tượng** (相/象) | **田** (chéo 2 ô). Không qua sông. Bị cản nếu giữa có quân. |
| **Mã** (傌/馬)   | **日** (1 dọc/ngang + 1 chéo). Bị cản chân nếu ô kề có quân. |
| **Xe** (俥/車)    | Dọc/ngang bao xa cũng được. |
| **Pháo** (炮/砲)  | Đi như Xe khi **không** ăn. Khi **ăn** phải nhảy qua **đúng 1** quân (gọi là "ngòi"). |
| **Tốt** (兵/卒)   | 1 ô tiến. Khi qua sông được đi ngang. Không lùi. |

### Cách thực hiện 1 nước
- **Desktop**: bấm vào quân của mình → các ô đến hợp lệ sáng lên (chấm xanh ngọc) → bấm ô đến.
- **Mobile**: chạm 1 lần để chọn, chạm lần 2 để đi. Có thể kéo-thả.
- **Bàn phím**: dùng arrow để di highlight, Enter để chọn / xác nhận.

---

## 5. Các chế độ chơi

| Chế độ | Mô tả | Ảnh hưởng ELO |
|---|---|---|
| **Quick Play** | Ghép trận online trong ~10s, time 10+5 | ✅ |
| **Ranked** | Time control bạn chọn, ghép theo ELO ±150 | ✅ |
| **Custom** | Mã phòng 6 ký tự, mời bạn | ❌ |
| **Vs Bot** | 10 cấp độ AI | ❌ |
| **Vs Siêu AI** | Bot Lv10+, giới hạn 3 ván/tuần | ✅ (bonus) |
| **Daily Challenge** | 1 puzzle/ngày | ❌ (có streak) |
| **Tournament** | Swiss / Knockout / Arena | ✅ + cup |

---

## 6. Cờ Tướng Úp — luật riêng

Cờ Tướng Úp là biến thể giải trí phổ biến tại Việt Nam. Trong game của chúng tôi:

### 6.1. Setup ban đầu
- **30 quân** (toàn bộ trừ 2 Tướng) được **xáo ngẫu nhiên hoàn toàn** rồi đặt **úp xuống** (không thấy mặt) ở 30 ô của bàn cờ tiêu chuẩn.
- **2 Tướng** (Đỏ + Đen) **giữ nguyên** ở cung trung tâm — luôn công khai từ đầu ván.
- Seed xáo do server sinh, **hash SHA-256 công bố ngay đầu ván** cho cả 2 người chơi. Sau khi ván kết thúc, server reveal seed gốc — bạn có thể tự xáo lại để verify (chống tố cáo gian lận).
- Khi ván bắt đầu, cả hai bên chỉ thấy: 30 ô úp + 2 Tướng ở cung.

### 6.2. Đến lượt mình, được làm 1 trong 2 việc
1. **Lật một quân úp bất kỳ** trên bàn.
   - Quân lật ra **đứng yên tại ô đó**, hiện rõ chủng loại + màu.
   - Nếu lật được quân **cùng màu mình**: đó là quân của bạn — sau này được đi theo luật cờ tướng.
   - Nếu lật được quân **màu đối phương**: đó là quân của đối phương — bạn không sở hữu.
2. **Đi một quân đã được lật** của bạn — theo đúng luật cờ tướng chuẩn (Mã đi nhật, Pháo cần ngòi…).

### 6.3. Mục tiêu
**Chiếu hết Tướng đối phương** giống cờ ngửa. Tướng vẫn lộ ra ngay từ đầu nên ván cờ úp tập trung vào việc lật được quân tốt và bảo vệ Tướng.

### 6.4. Mẹo cho người mới
- Lật quân ở **gần Tướng đối phương** trước → tăng khả năng có quân tấn công.
- Tránh lật quân **gần Tướng mình** quá sớm (nếu lật ra Tốt thì lãng phí khả năng phòng thủ).
- Pháo và Xe rất mạnh — nếu lật được, nên giữ lại đánh sau.

### 6.5. Khác cờ ngửa
- Không có khái niệm khai cuộc cố định.
- Tam điệp bại + 60 nước **vẫn áp dụng**.
- Lộ Tướng vẫn áp dụng.

---

## 7. Đấu với Bot — chọn cấp độ

Khi bấm **Vs Bot**, modal cấu hình AI mở ra:

### 7.1. Slider cấp độ (1–10)
Mỗi cấp hiển thị:
- Tên (Tập Sự, Tân Binh, …, Siêu AI)
- ELO ước tính
- Time tối đa cho mỗi nước

Khuyến nghị:
- **Lv 1–2**: Học luật.
- **Lv 3–5**: Người mới chơi.
- **Lv 6–7**: Người chơi giải trí thường xuyên.
- **Lv 8–9**: Cao thủ / luyện tập trước giải.
- **Lv 10**: Test trình độ tối đa — bot suy nghĩ tới 6 nước, có opening book + endgame heuristics.

### 7.2. Cá tính bot
- **Cân bằng** (mặc định): chơi vững.
- **Tấn công**: ưu tiên đe dọa Tướng, đổi quân khi có lợi vị trí.
- **Phòng thủ**: cố thủ, đợi sai sót.

### 7.3. Phong cách khai cuộc (Lv7+)
- **Pháo Đầu** — khai cuộc cổ điển.
- **Bình Phong Mã** — phòng ngự cổ điển.
- **Tiên Nhân Chỉ Lộ** — phá thế.
- **Ngẫu nhiên** — bot tự chọn từ kho.

### 7.4. Time Control
- **Tức thời**: bot trả lời <500ms (rebate vài cấp depth).
- **Suy nghĩ chậm** (mặc định): bot dùng full thời gian theo bảng cấu hình.

### 7.5. Hint cho người chơi
- Bật để game gợi ý nước đi tốt khi bạn bí (chỉ dùng được khi không xếp hạng).
- Hiển thị 1–3 nước ứng cử với mức điểm ước tính.

---

## 8. Đấu Online

### 8.1. Quick Play
Bấm **CHƠI NGAY → Quick Play**. Ghép trận sau 5–30 giây.
- Time control mặc định: **10+5** (10 phút khởi điểm, mỗi nước +5s).
- Đối thủ ELO trong khoảng ±150.

### 8.2. Ranked
Tương tự Quick Play nhưng:
- Bạn chọn được time control (1+0 / 3+2 / 10+5 / 30+30).
- Kết quả **ảnh hưởng ELO**.
- Cấm chế độ Đầu Hàng nhanh: nếu thoát ván, vẫn tính thua.

### 8.3. Custom — chơi với bạn

#### 8.3.1. Tạo phòng
1. Bấm **Tạo phòng** ở Home hoặc trang Tournaments → mở modal cấu hình.
2. Cấu hình các tuỳ chọn:
   - **Time control**: chọn preset có sẵn (Bullet 1+0, Blitz 3+2, Rapid 10+5 — mặc định, Classical 30+30, Không giờ) hoặc tuỳ chỉnh slider 30s–60p và increment 0–60s.
   - **Biến thể**: Cờ ngửa (mặc định) / Cờ úp.
   - **Bên cầm Đỏ**: Tôi đi trước / Đối thủ đi trước / Random.
   - **Mật khẩu phòng** *(tuỳ chọn, mặc định **trống**)*: nếu để trống, ai có mã đều vào được. Nếu đặt, tối thiểu 4 ký tự — đối phương phải nhập đúng mới vào được.
   - **TTL phòng**: phòng tự huỷ sau bao lâu nếu không ai vào (15p / 30p / 1h / 24h).
   - **Ghi chú** *(optional)*: text ngắn ≤200 ký tự hiện cho người vào, ví dụ "Trận tập tuần ABC".
3. Bấm **Tạo** → game hiện **mã 6 ký tự**, ví dụ `XQ4F2K`, kèm 3 nút:
   - 📋 **Copy mã** — copy 6 ký tự vào clipboard.
   - 🔗 **Copy link** — link dạng `https://allin1site.com/games/xiangqi/#/join/XQ4F2K`. Link **không bao giờ** chứa mật khẩu — đối thủ nhập tay.
   - 📱 **QR** — quét bằng điện thoại để vào phòng.
4. Đợi đối thủ vào — bạn sẽ nhận thông báo + tự bắt đầu ván.

> Lưu ý: Custom = **không tính ELO**. Nếu muốn ranked, dùng Quick Play hoặc Ranked.

#### 8.3.2. Vào phòng
1. Bấm **Vào phòng** ở Home → nhập mã 6 ký tự (không phân biệt hoa thường).
2. Hệ thống lookup phòng:
   - Nếu phòng public (không có pass) → vào ngay.
   - Nếu có mật khẩu → form nhập password mở ra. Nhập sai 5 lần/phút sẽ bị khoá IP 10 phút.
   - Nếu phòng đã hết hạn → thông báo "Phòng không còn".
   - Nếu đã có người vào → thông báo "Phòng đã đầy".

#### 8.3.3. Quản lý phòng đang mở
Vào **Hồ sơ → Phòng đang mở** để xem các phòng bạn đã tạo nhưng chưa có ai vào. Có thể **Huỷ** thủ công hoặc đợi tự huỷ theo TTL.

### 8.4. Đầu hàng / Xin hoà / Hoà tự động
- 🚩 **Đầu hàng**: cần xác nhận. Đối phương thắng.
- 🤝 **Xin hoà**: gửi đề nghị — đối phương có 30 giây để chấp nhận hoặc từ chối.
- ⏱️ **Hết giờ**: ai hết giờ trước thì thua. Nếu bên còn lại không đủ quân chiếu hết (chỉ còn Tướng), kết quả là hoà.

---

## 9. ELO & Xếp hạng

### 9.1. ELO khởi điểm
Tài khoản mới bắt đầu với **1200 ELO** (mức ngang Đồng — vừa đủ để được match với cả người mới và người đã chơi vài ván). 10 ván Ranked đầu là "**ván xếp hạng**" — ELO biến động lớn (K=40), hiển thị nhãn "Đang xác định trình độ" thay vì con số chính xác.

### 9.2. Cấp bậc

| Rank | ELO | Icon |
|---|---|---|
| Tập Sự       | < 1000   | 🪵 |
| Tân Binh     | 1000–1199 | 🥉 |
| Đồng         | 1200–1399 | 🟫 |
| Bạc          | 1400–1599 | 🥈 |
| Vàng         | 1600–1799 | 🥇 |
| Bạch Kim     | 1800–1999 | 💎 |
| Cao Thủ      | 2000–2199 | 🛡️ |
| Đại Sư       | 2200–2399 | ⚔️ |
| Tông Sư      | 2400+    | 👑 |

### 9.3. ELO không thay đổi khi
- Đấu vs Bot
- Custom (chơi với bạn)
- Daily Challenge / Puzzle
- Khi mất kết nối < 30s và quay lại — không bị xử thua

---

## 10. Lịch sử & Replay

### 10.1. Xem lại ván cũ
Vào **Hồ Sơ → Lịch Sử**. Mặc định hiển thị 20 ván gần nhất, sắp xếp theo thời gian.

Lọc được theo:
- Chế độ (Ranked / Custom / vs Bot / Daily).
- Biến thể (Ngửa / Úp).
- Kết quả (Thắng / Thua / Hoà).
- Đối thủ (gõ tên).

### 10.2. Trình replay
Bấm vào 1 ván → mở Replay Viewer:
- Thanh trượt timeline.
- ⏮ ⏪ ▶ ⏩ ⏭ và tốc độ 0.5x – 4x.
- Hiển thị từng nước với highlight + thời gian suy nghĩ.
- (Phase 4) Nút **🔍 Phân tích** — AI Lv9 chỉ ra nước nào đi chưa tốt.

### 10.3. Xuất / chia sẻ
- **PGN-Xiangqi**: chuẩn để import vào phần mềm phân tích khác.
- **Link share**: tạo URL public, người khác mở xem được (không cần đăng nhập).
- **GIF**: xuất 1 phần ván thành GIF 10 giây (Phase 4).

---

## 11. Giải đấu, Daily, Siêu AI

### 11.1. Giải đấu
Vào **Tab Giải đấu** xem các giải sắp/đang diễn ra. Có 3 thể thức:

- **Swiss 5 vòng** (~50 phút) — không bị loại, cuối cùng tính tổng điểm.
- **Knockout 8/16/32** — 1 thua là về.
- **Arena 1 giờ** — chơi liên tục, ai thắng nhiều nhất ăn cup.

Phần thưởng: Cup, badge gắn vĩnh viễn, +ELO bonus, hiển thị ở Profile.

### 11.2. Daily Challenge
Mỗi ngày 1 puzzle (vị trí giữa ván) — đề bài: "Đỏ chiếu hết trong N nước".
- Hoàn thành để giữ **streak**.
- Thời gian giải nhanh nhất lên bảng leaderboard ngày.
- Streak 7 / 30 / 100 ngày → badge.

### 11.3. Đấu Siêu AI
Mỗi tài khoản có **3 lượt thách Siêu AI / tuần** (reset thứ Hai).
- Siêu AI = bot Lv10 với time control 30s/nước (cao hơn lv10 thường).
- **Thắng** = +50 ELO bonus + badge "Đả bại Siêu AI".
- **Hoà** = +20 ELO.
- **Thua** = không mất ELO (cho thoải mái thử thách).

---

## 11A. Chat realtime trong ván

Khi đấu online (Quick Play / Ranked / Custom / Tournament), bạn có thể trò chuyện với đối thủ qua khung chat ở góc phải bàn cờ.

### Quy tắc fairplay
- Tự động lọc từ ngữ thô tục (Việt + Anh).
- Spam quá 30 tin/phút sẽ bị tạm khoá chat 5 phút.
- Bị **báo cáo 3 lần trong 7 ngày** → hệ thống tự mute chat 24 giờ.
- Tin nhắn được lưu 30 ngày để moderation, sau đó xoá.

### Tắt chat tạm thời
- Bấm 🔕 ở header khung chat → chỉ ván hiện tại không nhận tin nhắn từ đối thủ.
- Vẫn nhận: xin hoà, đề nghị take-back, thông báo kết quả.
- Tắt chat vĩnh viễn cho mọi ván: vào **⚙️ Cài đặt → Chat trong ván → Off**.

### Quick reactions
Có 5 emoji nhanh không cần gõ: 👋 (chào), 👍 (good move), 🎉 (chúc mừng), 🤝 (xin hoà), 🙏 (cảm ơn). Click 1 lần để gửi.

### Báo cáo
Click vào tên người gửi → menu Report → chọn lý do (spam, ngôn từ thù địch, trêu chọc, gian lận). Đội ngũ moderation review trong 24h.

---

## 12. Cài đặt & cá nhân hoá

Trong **⚙️ Cài đặt**:

- **Theme**: Tối (mặc định) / Sáng / Tự động theo hệ thống.
  - Switch nhanh ngay ở topbar bằng nút 🌙 / ☀️ — đổi không cần reload, hiệu lực ngay.
  - Chế độ Tự động sẽ theo OS (sáng ban ngày, tối ban đêm nếu OS có lịch).
- **Ngôn ngữ giao diện**: Tiếng Việt (mặc định cho user khu vực VN) / English.
  - Switch nhanh ở topbar bằng nút 🌐 VN/EN.
  - Khi đăng nhập, ngôn ngữ được đồng bộ với tài khoản trên cloud.
- **Bộ quân**: Truyền thống chữ Hán / Hiện đại có icon / Tinh giản.
- **Bộ bàn**: Gỗ trầm / Đá / Glass tối / Giấy sáng (auto đổi theo theme).
- **Ký pháp nước đi**: ICCS (h2e2) / Tiếng Việt (P2-5) / Trung (炮二平五) — độc lập với ngôn ngữ giao diện.
- **Hiệu ứng âm thanh**: On / Off / Chỉ tiếng chiếu.
- **Chat trong ván**: On / Off (tắt sẽ không nhận tin nhắn từ đối thủ — vẫn nhận thông báo xin hoà / kết quả).
- **Hint khi chơi vs Bot**: On / Off.
- **Animation**: Mượt / Giảm (theo `prefers-reduced-motion`).
- **Tài khoản**: Đổi mật khẩu / Liên kết Google / Xoá tài khoản / Đăng xuất.

---

## 13. Phím tắt (desktop)

| Phím | Chức năng |
|---|---|
| ←/→/↑/↓ | Di chuyển ô được chọn |
| Enter   | Xác nhận chọn / xác nhận đi |
| Esc     | Bỏ chọn quân |
| F       | Lật quân (cờ úp) |
| H       | Hiện gợi ý (nếu bật) |
| R       | Xoay bàn |
| , .     | Lùi/tiến 1 nước trong replay |
| Space   | Play/Pause replay |
| Ctrl+Z  | Take-back (chỉ vs Bot, off-ranked) |

---

## 14. FAQ

**Q: Tôi mất kết nối khi đang đấu Ranked, có bị xử thua không?**
A: Có 30 giây grace period để quay lại. Sau đó hệ thống đếm thời gian đối phương, nếu bạn không còn thời gian thì bị xử thua hết giờ.

**Q: Bot có gian lận / lén tăng độ khó không?**
A: Không. Bot chỉ dùng cấu hình bạn chọn. Nếu thấy bot lv5 đi quá khó, có thể bạn đang mắc lỗi cơ bản — bật Hint để học.

**Q: Tôi quên đăng ký, ván cũ có mất không?**
A: Không, lưu ở localStorage máy bạn. Nếu đăng ký sau, có thể đẩy lên cloud.

**Q: Cờ úp xáo ngẫu nhiên có công bằng không?**
A: Có. Seed xáo dùng `crypto.getRandomValues`, hash seed lưu trong record ván — sau khi xong ván có thể audit.

**Q: Có thể đấu offline không?**
A: Có cho mode vs Bot, 2-người-cùng-máy, Replay. Online cần mạng.

**Q: Sao bot lv 10 đôi khi đi nhanh, đôi khi chậm?**
A: Lv10 dùng iterative deepening — nếu position đơn giản, depth 5 đã đủ và xong nhanh; thế cờ tactical phức tạp sẽ đào sâu depth 6 hơn → chậm hơn nhưng mạnh hơn.

**Q: Có bản mobile app không?**
A: Đây là Web App có thể "Add to Home Screen" — chạy như app native (PWA).

**Q: Tôi muốn đổi giao diện sang tiếng Anh / English version?**
A: Bấm nút 🌐 VN/EN ở topbar (trên cùng bên phải) — đổi ngay, không cần reload. Nếu đã đăng nhập, lựa chọn ngôn ngữ được lưu trên tài khoản, đăng nhập máy khác cũng giữ nguyên.

**Q: Theme tối làm tôi mỏi mắt buổi sáng. Có sáng không?**
A: Có. Bấm nút 🌙/☀️ ở topbar để đổi sáng/tối ngay. Hoặc chọn "Tự động" trong Cài đặt — game sẽ theo theme của hệ điều hành (Mac/Windows tự đổi sáng/tối theo giờ).

**Q: Đối thủ chat thô tục, tôi nên làm gì?**
A: Click vào tên họ → "Báo cáo" → chọn lý do. Hoặc bấm 🔕 để tắt chat trong ván hiện tại (vẫn nhận thông báo xin hoà / kết quả). Sau ván có thể block họ vĩnh viễn trong Profile.
