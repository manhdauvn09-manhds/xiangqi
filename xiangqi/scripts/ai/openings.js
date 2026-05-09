// Cờ Tướng Vương — Opening book đơn giản
// Format: từng "line" là chuỗi ICCS moves từ đầu ván.
// Khi tìm thấy thế cờ khớp prefix, bot chọn nước tiếp theo trong line (random với weight).
//
// Lý do hardcode trong .js thay vì .json: tránh fetch CORS khi chạy file://.

const LINES = [
  // ────────── PHÁO ĐẦU (Central Cannon) ──────────
  // 1. Pháo 2 bình 5 — kinh điển
  { name: 'Pháo Đầu', moves: ['h2e2'] },
  { name: 'Pháo Đầu vs Bình Phong Mã', moves: ['h2e2', 'h9g7'] },
  { name: 'Pháo Đầu — Mã 2 tiến 3', moves: ['h2e2', 'h9g7', 'h0g2'] },
  { name: 'Pháo Đầu — Xe 1 bình 2', moves: ['h2e2', 'h9g7', 'h0g2', 'i9h9'] },
  { name: 'Pháo Đầu — Pháo 8 bình 7', moves: ['h2e2', 'h9g7', 'h0g2', 'i9h9', 'i0h0'] },
  // Biến thể đối Pháo Đầu — Pháo Đối Bình
  { name: 'Pháo Đối Bình', moves: ['h2e2', 'b7e7'] },
  { name: 'Pháo Đối Bình — Mã hai tiến', moves: ['h2e2', 'b7e7', 'h0g2'] },

  // ────────── BÌNH PHONG MÃ (Screen Horses) ──────────
  // Đen lên cả 2 Mã trước (g7 + c7) đỡ trục giữa
  { name: 'Bình Phong Mã (Đen)', moves: ['h2e2', 'h9g7'] }, // overlap
  { name: 'Bình Phong Mã đầy đủ', moves: ['h2e2', 'h9g7', 'h0g2', 'b9c7'] },
  { name: 'BPM — Tốt 7 tiến', moves: ['h2e2', 'h9g7', 'h0g2', 'b9c7', 'g3g4'] },

  // ────────── TIÊN NHÂN CHỈ LỘ (Pawn Opening) ──────────
  { name: 'Tiên Nhân Chỉ Lộ', moves: ['c3c4'] },
  { name: 'TNCL — Đen Mã đối', moves: ['c3c4', 'h9g7'] },
  { name: 'TNCL — Pháo 2 bình 5', moves: ['c3c4', 'h9g7', 'h2e2'] },

  // ────────── KHỞI MÃ CỤC (Opening with Horse) ──────────
  { name: 'Khởi Mã Cục', moves: ['h0g2'] },
  { name: 'Khởi Mã Cục — Đen Pháo bình', moves: ['h0g2', 'h7e7'] },

  // ────────── PHÁO QUÁ CUNG (Cannon over palace) ──────────
  { name: 'Pháo Quá Cung', moves: ['h2g2'] },
  { name: 'Pháo Quá Cung — Đen Mã đối', moves: ['h2g2', 'h9g7'] },

  // ────────── SHIFT VARIANTS — bên Đen mở ──────────
  // (Chỉ dùng nếu Đỏ đi nước lạ và Đen còn trong book)
  { name: 'Đen Pháo Đầu Đáp', moves: ['c3c4', 'h7e7'] },
];

/**
 * Tìm nước đi theo book.
 * @param {string[]} historyICCS — chuỗi nước đã đánh (ICCS)
 * @returns {string | null} nước tiếp theo (ICCS) hoặc null nếu out of book
 */
export function findBookMove(historyICCS) {
  const matches = [];
  for (const line of LINES) {
    if (line.moves.length <= historyICCS.length) continue;
    let match = true;
    for (let i = 0; i < historyICCS.length; i++) {
      if (line.moves[i] !== historyICCS[i]) { match = false; break; }
    }
    if (match) {
      matches.push(line.moves[historyICCS.length]);
    }
  }
  if (matches.length === 0) return null;
  return matches[Math.floor(Math.random() * matches.length)];
}

export const OPENING_LINES_COUNT = LINES.length;
